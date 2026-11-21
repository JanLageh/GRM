using GRM_Backend.Data;
using GRM_Backend.DTOs;
using GRM_Backend.Models;
using Microsoft.EntityFrameworkCore;

namespace GRM_Backend.Services;

public class ReorderService : IReorderService
{
    private readonly AppDbContext _context;

    public ReorderService(AppDbContext context)
    {
        _context = context;
    }

    private sealed class VariantEval
    {
        public ProductVariant Variant { get; init; } = null!;
        public int UnitsSold { get; init; }
        public decimal DailyVelocity { get; init; }
        public int ComputedThreshold { get; init; }
        public int EffectiveThreshold { get; init; }
        public bool NeedsReorder { get; init; }
        public int SuggestedQuantity { get; init; }
        public int OpenPoQty { get; set; }
        public DateTime? LastCalculatedAt { get; set; }

        public ReorderSuggestionDto ToDto(int lookbackDays) => new()
        {
            VariantId = Variant.Id,
            ProductId = Variant.ProductId,
            ProductName = Variant.Product?.Name ?? string.Empty,
            Model = Variant.Model,
            Sku = Variant.Sku,
            CurrentStock = Variant.Stock,
            ReorderThreshold = Variant.ReorderThreshold,
            ComputedThreshold = ComputedThreshold,
            EffectiveThreshold = EffectiveThreshold,
            DefaultReorderQuantity = Variant.DefaultReorderQuantity,
            LeadTimeDays = Variant.LeadTimeDays,
            SafetyStock = Variant.SafetyStock,
            UseDynamicThreshold = Variant.UseDynamicThreshold,
            UnitsSoldInWindow = UnitsSold,
            LookbackDays = lookbackDays,
            DailySalesVelocity = DailyVelocity,
            NeedsReorder = NeedsReorder,
            SuggestedQuantity = SuggestedQuantity,
            OpenPurchaseOrderQuantity = OpenPoQty,
            HasOpenPurchaseOrder = OpenPoQty > 0,
            LastCalculatedAt = LastCalculatedAt
        };
    }

    private async Task<List<VariantEval>> EvaluateAllAsync(int lookbackDays, DateTime now)
    {
        var variants = await _context.Variants
            .Include(v => v.Product)
            .Where(v => v.Product == null || v.Product.IsActive)
            .OrderBy(v => v.Id)
            .ToListAsync();

        var windowStart = now.AddDays(-lookbackDays);

        var salesByVariant = await _context.SalesOrderItems
            .Where(i => i.SalesOrder != null
                        && i.SalesOrder.Status != OrderStatus.Cancelled
                        && i.SalesOrder.CreatedAt >= windowStart)
            .GroupBy(i => i.VariantId)
            .Select(g => new { VariantId = g.Key, Qty = g.Sum(x => x.Quantity) })
            .ToDictionaryAsync(x => x.VariantId, x => x.Qty);

        var openPoByVariant = await _context.PurchaseOrderItems
            .Where(i => i.PurchaseOrder != null
                        && i.PurchaseOrder.Status != PurchaseOrderStatus.Received
                        && i.QuantityOrdered > i.QuantityReceived)
            .GroupBy(i => i.VariantId)
            .Select(g => new { VariantId = g.Key, Qty = g.Sum(x => x.QuantityOrdered - x.QuantityReceived) })
            .ToDictionaryAsync(x => x.VariantId, x => x.Qty);

        var results = new List<VariantEval>(variants.Count);
        foreach (var v in variants)
        {
            var unitsSold = salesByVariant.GetValueOrDefault(v.Id, 0);
            var dailyVelocity = Math.Round((decimal)unitsSold / lookbackDays, 2);
            var computedThreshold = (int)Math.Ceiling(dailyVelocity * v.LeadTimeDays) + v.SafetyStock;
            var effectiveThreshold = (v.UseDynamicThreshold && unitsSold > 0)
                ? computedThreshold
                : v.ReorderThreshold;
            var needsReorder = v.Stock <= effectiveThreshold;
            var velocityTarget = (int)Math.Ceiling(dailyVelocity * (v.LeadTimeDays * 3)) + v.SafetyStock;
            var suggestedQty = needsReorder
                ? Math.Max(velocityTarget - v.Stock, v.DefaultReorderQuantity ?? 5)
                : 0;
            var openPoQty = openPoByVariant.GetValueOrDefault(v.Id, 0);

            results.Add(new VariantEval
            {
                Variant = v,
                UnitsSold = unitsSold,
                DailyVelocity = dailyVelocity,
                ComputedThreshold = computedThreshold,
                EffectiveThreshold = effectiveThreshold,
                NeedsReorder = needsReorder,
                SuggestedQuantity = suggestedQty,
                OpenPoQty = openPoQty,
                LastCalculatedAt = v.LastReorderCalculatedAt
            });
        }

        return results;
    }

    public async Task<List<ReorderSuggestionDto>> GetSuggestionsAsync(int lookbackDays = 7, bool includeAll = false)
    {
        var now = DateTime.UtcNow;
        var evals = await EvaluateAllAsync(lookbackDays, now);

        return evals
            .Where(e => includeAll || e.NeedsReorder)
            .OrderBy(e => e.Variant.Stock - e.EffectiveThreshold)
            .ThenBy(e => e.Variant.Id)
            .Select(e => e.ToDto(lookbackDays))
            .ToList();
    }

    public async Task<RecalculateReorderResponse> RecalculateAsync(
        int lookbackDays = 7,
        bool generateDraftPurchaseOrders = true,
        int? triggeredByUserId = null)
    {
        var now = DateTime.UtcNow;
        var evals = await EvaluateAllAsync(lookbackDays, now);

        await using var tx = _context.Database.IsRelational()
            ? await _context.Database.BeginTransactionAsync()
            : null;

        foreach (var e in evals)
        {
            e.Variant.SalesVelocity = e.DailyVelocity;
            e.Variant.LastReorderCalculatedAt = now;
            e.LastCalculatedAt = now;

            if (e.Variant.UseDynamicThreshold && e.UnitsSold > 0)
                e.Variant.ReorderThreshold = e.ComputedThreshold;
        }

        var createdDrafts = new List<(PurchaseOrder Po, VariantEval Eval)>();
        if (generateDraftPurchaseOrders)
        {
            var defaultSupplier = await _context.Suppliers
                .Where(s => s.IsActive)
                .OrderBy(s => s.Id)
                .FirstOrDefaultAsync();

            foreach (var e in evals.Where(x => x.NeedsReorder && x.OpenPoQty == 0 && x.SuggestedQuantity > 0))
            {
                var po = new PurchaseOrder
                {
                    PoNumber = $"TMP-{Guid.NewGuid():N}",
                    SupplierId = defaultSupplier?.Id,
                    Status = PurchaseOrderStatus.Draft,
                    Source = PurchaseOrderSource.System,
                    CreatedByUserId = triggeredByUserId,
                    Notes = $"Auto-generated: {e.Variant.Sku} stock {e.Variant.Stock} <= reorder threshold {e.EffectiveThreshold} (velocity {e.DailyVelocity:F2}/day)",
                    CreatedAt = now,
                    Items =
                    {
                        new PurchaseOrderItem
                        {
                            VariantId = e.Variant.Id,
                            QuantityOrdered = e.SuggestedQuantity,
                            QuantityReceived = 0,
                            UnitCost = e.Variant.Price
                        }
                    }
                };
                _context.PurchaseOrders.Add(po);
                createdDrafts.Add((po, e));
            }
        }

        await _context.SaveChangesAsync();

        if (createdDrafts.Count > 0)
        {
            foreach (var (po, eval) in createdDrafts)
            {
                po.PoNumber = $"PO-{po.Id:D6}";
                eval.OpenPoQty += eval.SuggestedQuantity;
            }
            await _context.SaveChangesAsync();
        }

        if (tx != null) await tx.CommitAsync();

        var suggestions = evals
            .Where(e => e.NeedsReorder)
            .OrderBy(e => e.Variant.Stock - e.EffectiveThreshold)
            .ThenBy(e => e.Variant.Id)
            .Select(e => e.ToDto(lookbackDays))
            .ToList();

        return new RecalculateReorderResponse
        {
            CalculatedAt = now,
            LookbackDays = lookbackDays,
            VariantsEvaluated = evals.Count,
            LowStockCount = suggestions.Count,
            DraftPurchaseOrdersCreated = createdDrafts.Count,
            CreatedPurchaseOrderIds = createdDrafts.Select(x => x.Po.Id).ToList(),
            Suggestions = suggestions
        };
    }
}
