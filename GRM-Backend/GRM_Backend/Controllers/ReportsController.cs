using GRM_Backend.Data;
using GRM_Backend.DTOs;
using GRM_Backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace GRM_Backend.Controllers;

[ApiController]
[Route("api/reports")]
[Authorize]
public class ReportsController : ControllerBase
{
    private readonly AppDbContext _context;

    public ReportsController(AppDbContext context)
    {
        _context = context;
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private static DateTime ToUtc(DateTime dt) =>
        dt.Kind == DateTimeKind.Unspecified
            ? DateTime.SpecifyKind(dt, DateTimeKind.Utc)
            : dt.ToUniversalTime();

    private static bool TryNormalizeRange(
        DateTime? from,
        DateTime? to,
        out DateTime? fromUtc,
        out DateTime? toUtcExclusive,
        out DateTime? toDisplayUtc,
        out string? error)
    {
        fromUtc = from.HasValue ? ToUtc(from.Value) : null;
        toUtcExclusive = null;
        toDisplayUtc = null;
        error = null;

        if (to.HasValue)
        {
            var toUtc = ToUtc(to.Value);
            toDisplayUtc = toUtc;
            toUtcExclusive = toUtc.TimeOfDay == TimeSpan.Zero
                ? toUtc.AddDays(1)
                : toUtc.AddTicks(1);
        }

        if (fromUtc.HasValue && toUtcExclusive.HasValue && fromUtc.Value >= toUtcExclusive.Value)
        {
            error = "'from' date must be earlier than or equal to 'to' date.";
            return false;
        }

        return true;
    }

    private async Task<Dictionary<int, decimal>> GetAverageUnitCostsAsync()
    {
        var poItems = await _context.PurchaseOrderItems
            .Include(i => i.PurchaseOrder)
            .Where(i => i.PurchaseOrder != null && i.PurchaseOrder.Status != PurchaseOrderStatus.Draft)
            .ToListAsync();

        var costs = new Dictionary<int, decimal>();
        foreach (var group in poItems.GroupBy(i => i.VariantId))
        {
            var receivedQty = group.Sum(x => x.QuantityReceived);
            if (receivedQty > 0)
            {
                costs[group.Key] = Math.Round(group.Sum(x => x.UnitCost * x.QuantityReceived) / receivedQty, 2);
                continue;
            }

            var orderedQty = group.Sum(x => x.QuantityOrdered);
            if (orderedQty > 0)
            {
                costs[group.Key] = Math.Round(group.Sum(x => x.UnitCost * x.QuantityOrdered) / orderedQty, 2);
            }
        }

        return costs;
    }

    private static List<OrderStatusSummaryDto> BuildStatusSummary(List<SalesOrder> orders)
    {
        var statuses = new[]
        {
            OrderStatus.Pending,
            OrderStatus.Processing,
            OrderStatus.Completed,
            OrderStatus.Cancelled
        };

        return statuses.Select(st =>
        {
            var matching = orders.Where(o => o.Status == st).ToList();
            return new OrderStatusSummaryDto
            {
                Status = st,
                OrderCount = matching.Count,
                TotalAmount = matching.Sum(o => o.Total)
            };
        }).ToList();
    }

    // ── Endpoints ────────────────────────────────────────────────────────────

    // GET /api/reports/today  — Staff / Admin: limited daily summary
    [HttpGet("today")]
    [Authorize(Roles = "Staff,Admin")]
    [ProducesResponseType(typeof(DailySummaryReportDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> Today()
    {
        var todayStart = DateTime.UtcNow.Date;
        var tomorrowStart = todayStart.AddDays(1);

        var allTodayOrders = await _context.SalesOrders
            .Include(o => o.Items)
            .Where(o => o.CreatedAt >= todayStart && o.CreatedAt < tomorrowStart)
            .ToListAsync();

        var activeOrders = allTodayOrders.Where(o => o.Status != OrderStatus.Cancelled).ToList();
        var cancelledOrders = allTodayOrders.Where(o => o.Status == OrderStatus.Cancelled).ToList();
        var onlineOrders = activeOrders.Where(o => o.Channel == OrderChannel.Online).ToList();
        var walkInOrders = activeOrders.Where(o => o.Channel == OrderChannel.WalkIn).ToList();

        var invoicesIssuedCount = await _context.Invoices
            .CountAsync(i => !i.IsVoided && i.IssuedAt >= todayStart && i.IssuedAt < tomorrowStart);

        var paidInvoicesToday = await _context.Invoices
            .Where(i => !i.IsVoided
                        && i.PaymentStatus == InvoiceStatus.Paid
                        && i.PaidAt.HasValue
                        && i.PaidAt.Value >= todayStart
                        && i.PaidAt.Value < tomorrowStart)
            .ToListAsync();

        var lowStockAlertsCount = await _context.Variants
            .Include(v => v.Product)
            .CountAsync(v => (v.Product == null || v.Product.IsActive) && v.Stock <= v.ReorderThreshold);

        return Ok(new DailySummaryReportDto
        {
            Date = todayStart,
            OrdersCount = activeOrders.Count,
            CancelledOrdersCount = cancelledOrders.Count,
            OnlineOrdersCount = onlineOrders.Count,
            OnlineSalesTotal = onlineOrders.Sum(o => o.Total),
            WalkInOrdersCount = walkInOrders.Count,
            WalkInSalesTotal = walkInOrders.Sum(o => o.Total),
            TotalSales = activeOrders.Sum(o => o.Total),
            TotalDiscounts = activeOrders.Sum(o => o.DiscountAmount),
            UnitsSold = activeOrders.SelectMany(o => o.Items).Sum(i => i.Quantity),
            InvoicesIssuedCount = invoicesIssuedCount,
            InvoicesPaidCount = paidInvoicesToday.Count,
            PaymentsCollectedToday = paidInvoicesToday.Sum(i => i.AmountPaid),
            LowStockAlertsCount = lowStockAlertsCount,
            ByStatus = BuildStatusSummary(allTodayOrders)
        });
    }

    // GET /api/reports/sales?from=&to=  — Admin: revenue and profit
    [HttpGet("sales")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(SalesReportDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(MessageResponse), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Sales([FromQuery] DateTime? from, [FromQuery] DateTime? to)
    {
        var effectiveFrom = from ?? DateTime.UtcNow.Date.AddDays(-29);
        var effectiveTo = to ?? DateTime.UtcNow.Date;

        if (!TryNormalizeRange(effectiveFrom, effectiveTo, out var fromUtc, out var toUtcExclusive, out var toDisplayUtc, out var error))
            return BadRequest(new MessageResponse { Message = error! });

        var orders = await _context.SalesOrders
            .Include(o => o.Items)
            .Where(o => o.CreatedAt >= fromUtc!.Value && o.CreatedAt < toUtcExclusive!.Value)
            .ToListAsync();

        var activeOrders = orders.Where(o => o.Status != OrderStatus.Cancelled).ToList();
        var cancelledOrders = orders.Where(o => o.Status == OrderStatus.Cancelled).ToList();

        var unitCosts = await GetAverageUnitCostsAsync();

        var grossRevenue = activeOrders.Sum(o => o.Subtotal);
        var totalDiscounts = activeOrders.Sum(o => o.DiscountAmount);
        var netRevenue = activeOrders.Sum(o => o.Total);
        var unitsSold = activeOrders.SelectMany(o => o.Items).Sum(i => i.Quantity);
        var cogs = Math.Round(
            activeOrders.SelectMany(o => o.Items)
                .Sum(i => unitCosts.GetValueOrDefault(i.VariantId, 0m) * i.Quantity),
            2);
        var grossProfit = netRevenue - cogs;
        var grossMarginPercent = netRevenue > 0m ? Math.Round(grossProfit / netRevenue * 100m, 2) : 0m;

        var invoices = await _context.Invoices
            .Where(i => i.IssuedAt >= fromUtc!.Value && i.IssuedAt < toUtcExclusive!.Value)
            .ToListAsync();

        var activeInvoices = invoices.Where(i => !i.IsVoided).ToList();
        var voidedInvoices = invoices.Where(i => i.IsVoided).ToList();

        var byChannel = new[] { OrderChannel.Online, OrderChannel.WalkIn }
            .Select(ch =>
            {
                var chOrders = activeOrders.Where(o => o.Channel == ch).ToList();
                return new ChannelSalesSummaryDto
                {
                    Channel = ch,
                    OrderCount = chOrders.Count,
                    UnitsSold = chOrders.SelectMany(o => o.Items).Sum(i => i.Quantity),
                    Revenue = chOrders.Sum(o => o.Total)
                };
            })
            .ToList();

        var dailyTrend = activeOrders
            .GroupBy(o => o.CreatedAt.Date)
            .OrderBy(g => g.Key)
            .Select(g =>
            {
                var dayRevenue = g.Sum(o => o.Total);
                var dayCogs = Math.Round(
                    g.SelectMany(o => o.Items)
                        .Sum(i => unitCosts.GetValueOrDefault(i.VariantId, 0m) * i.Quantity),
                    2);
                return new DailySalesPointDto
                {
                    Date = g.Key.ToString("yyyy-MM-dd"),
                    OrderCount = g.Count(),
                    UnitsSold = g.SelectMany(o => o.Items).Sum(i => i.Quantity),
                    Revenue = dayRevenue,
                    CostOfGoodsSold = dayCogs,
                    Profit = dayRevenue - dayCogs
                };
            })
            .ToList();

        return Ok(new SalesReportDto
        {
            From = fromUtc!.Value,
            To = toDisplayUtc!.Value,
            OrderCount = activeOrders.Count,
            CancelledOrderCount = cancelledOrders.Count,
            CancelledOrderTotal = cancelledOrders.Sum(o => o.Total),
            UnitsSold = unitsSold,
            GrossRevenue = grossRevenue,
            TotalDiscounts = totalDiscounts,
            NetRevenue = netRevenue,
            CostOfGoodsSold = cogs,
            GrossProfit = grossProfit,
            GrossMarginPercent = grossMarginPercent,
            CollectedRevenue = activeInvoices.Sum(i => i.AmountPaid),
            UnpaidReceivables = activeInvoices.Sum(i => Math.Max(0m, i.TotalAmount - i.AmountPaid)),
            VoidedInvoicesTotal = voidedInvoices.Sum(i => i.TotalAmount),
            ByChannel = byChannel,
            ByStatus = BuildStatusSummary(orders),
            DailyTrend = dailyTrend
        });
    }

    // GET /api/reports/best-sellers  — Admin: top-selling items
    [HttpGet("best-sellers")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(BestSellersReportDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(MessageResponse), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> BestSellers(
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        [FromQuery] int limit = 10)
    {
        if (limit is < 1 or > 100)
            return BadRequest(new MessageResponse { Message = "Limit must be between 1 and 100." });

        if (!TryNormalizeRange(from, to, out var fromUtc, out var toUtcExclusive, out var toDisplayUtc, out var error))
            return BadRequest(new MessageResponse { Message = error! });

        var query = _context.SalesOrders
            .Include(o => o.Items).ThenInclude(i => i.Variant).ThenInclude(v => v!.Product)
            .Where(o => o.Status != OrderStatus.Cancelled);

        if (fromUtc.HasValue)
            query = query.Where(o => o.CreatedAt >= fromUtc.Value);
        if (toUtcExclusive.HasValue)
            query = query.Where(o => o.CreatedAt < toUtcExclusive.Value);

        var orders = await query.ToListAsync();

        var items = orders
            .SelectMany(o => o.Items.Select(i => new { Order = o, Item = i }))
            .GroupBy(x => x.Item.VariantId)
            .Select(g =>
            {
                var variant = g.First().Item.Variant;
                return new BestSellerItemDto
                {
                    VariantId = g.Key,
                    ProductId = variant?.ProductId ?? 0,
                    ProductName = variant?.Product?.Name ?? string.Empty,
                    Model = variant?.Model ?? string.Empty,
                    Sku = variant?.Sku ?? string.Empty,
                    Category = variant?.Product?.Category ?? string.Empty,
                    CurrentStock = variant?.Stock ?? 0,
                    UnitPrice = variant?.Price ?? 0m,
                    UnitsSold = g.Sum(x => x.Item.Quantity),
                    OrderCount = g.Select(x => x.Order.Id).Distinct().Count(),
                    GrossSales = g.Sum(x => x.Item.UnitPrice * x.Item.Quantity),
                    NetSales = Math.Round(
                        g.Sum(x => x.Item.UnitPrice * x.Item.Quantity * (1m - x.Order.DiscountPercent / 100m)),
                        2)
                };
            })
            .OrderByDescending(i => i.UnitsSold)
            .ThenByDescending(i => i.NetSales)
            .ThenBy(i => i.VariantId)
            .Take(limit)
            .ToList();

        return Ok(new BestSellersReportDto
        {
            From = fromUtc,
            To = toDisplayUtc,
            Limit = limit,
            Items = items
        });
    }

    // GET /api/reports/dead-stock  — Admin: slow-moving or zero-sale in-stock variants
    [HttpGet("dead-stock")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(DeadStockReportDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(MessageResponse), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> DeadStock([FromQuery] int days = 30, [FromQuery] int maxUnitsSold = 0)
    {
        if (days is < 1 or > 3650)
            return BadRequest(new MessageResponse { Message = "Days must be between 1 and 3650." });

        if (maxUnitsSold < 0)
            return BadRequest(new MessageResponse { Message = "MaxUnitsSold must be 0 or greater." });

        var windowStart = DateTime.UtcNow.AddDays(-days);

        var variants = await _context.Variants
            .Include(v => v.Product)
            .Where(v => v.Stock > 0 && (v.Product == null || v.Product.IsActive))
            .ToListAsync();

        var soldItems = await _context.SalesOrderItems
            .Include(i => i.SalesOrder)
            .Where(i => i.SalesOrder != null && i.SalesOrder.Status != OrderStatus.Cancelled)
            .ToListAsync();

        var soldByVariant = soldItems
            .GroupBy(i => i.VariantId)
            .ToDictionary(
                g => g.Key,
                g => new
                {
                    UnitsInWindow = g.Where(x => x.SalesOrder!.CreatedAt >= windowStart).Sum(x => x.Quantity),
                    LastSoldAt = (DateTime?)g.Max(x => x.SalesOrder!.CreatedAt)
                });

        var deadItems = variants
            .Select(v =>
            {
                var found = soldByVariant.TryGetValue(v.Id, out var stats);
                var unitsInWindow = found ? stats!.UnitsInWindow : 0;
                var lastSoldAt = found ? stats!.LastSoldAt : null;

                return new DeadStockItemDto
                {
                    VariantId = v.Id,
                    ProductId = v.ProductId,
                    ProductName = v.Product?.Name ?? string.Empty,
                    Model = v.Model,
                    Sku = v.Sku,
                    Category = v.Product?.Category ?? string.Empty,
                    CurrentStock = v.Stock,
                    UnitPrice = v.Price,
                    TiedUpValue = v.Stock * v.Price,
                    UnitsSoldInWindow = unitsInWindow,
                    LastSoldAt = lastSoldAt,
                    Classification = unitsInWindow == 0 ? "Dead" : "Slow"
                };
            })
            .Where(i => i.UnitsSoldInWindow <= maxUnitsSold)
            .OrderBy(i => i.UnitsSoldInWindow)
            .ThenByDescending(i => i.TiedUpValue)
            .ThenBy(i => i.VariantId)
            .ToList();

        return Ok(new DeadStockReportDto
        {
            LookbackDays = days,
            MaxUnitsSold = maxUnitsSold,
            ItemCount = deadItems.Count,
            TotalDeadStockUnits = deadItems.Sum(i => i.CurrentStock),
            TotalTiedUpValue = deadItems.Sum(i => i.TiedUpValue),
            Items = deadItems
        });
    }

    // GET /api/reports/inventory-valuation  — Admin: total stock value
    [HttpGet("inventory-valuation")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(InventoryValuationReportDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> InventoryValuation(
        [FromQuery] string? category,
        [FromQuery] bool includeInactive = false)
    {
        var query = _context.Variants
            .Include(v => v.Product)
            .AsQueryable();

        if (!includeInactive)
            query = query.Where(v => v.Product == null || v.Product.IsActive);

        if (!string.IsNullOrWhiteSpace(category))
        {
            var c = category.Trim().ToLowerInvariant();
            query = query.Where(v => v.Product != null && v.Product.Category.ToLower() == c);
        }

        var variants = await query.ToListAsync();
        var unitCosts = await GetAverageUnitCostsAsync();

        var items = variants
            .Select(v =>
            {
                decimal? avgCost = unitCosts.TryGetValue(v.Id, out var c) ? c : null;
                decimal? costVal = avgCost.HasValue ? Math.Round(v.Stock * avgCost.Value, 2) : null;
                return new InventoryValuationItemDto
                {
                    VariantId = v.Id,
                    ProductId = v.ProductId,
                    ProductName = v.Product?.Name ?? string.Empty,
                    Model = v.Model,
                    Sku = v.Sku,
                    Category = v.Product?.Category ?? string.Empty,
                    IsActive = v.Product?.IsActive ?? true,
                    Stock = v.Stock,
                    UnitPrice = v.Price,
                    RetailValue = v.Stock * v.Price,
                    AverageUnitCost = avgCost,
                    CostValue = costVal
                };
            })
            .OrderByDescending(i => i.RetailValue)
            .ThenBy(i => i.VariantId)
            .ToList();

        var byCategory = items
            .GroupBy(i => string.IsNullOrWhiteSpace(i.Category) ? "Uncategorized" : i.Category)
            .Select(g => new CategoryValuationDto
            {
                Category = g.Key,
                VariantCount = g.Count(),
                TotalUnits = g.Sum(x => x.Stock),
                TotalRetailValue = g.Sum(x => x.RetailValue)
            })
            .OrderByDescending(c => c.TotalRetailValue)
            .ThenBy(c => c.Category)
            .ToList();

        return Ok(new InventoryValuationReportDto
        {
            GeneratedAt = DateTime.UtcNow,
            TotalVariants = items.Count,
            TotalUnitsInStock = items.Sum(i => i.Stock),
            TotalRetailValue = items.Sum(i => i.RetailValue),
            TotalCostValue = items.Sum(i => i.CostValue ?? 0m),
            ByCategory = byCategory,
            Items = items
        });
    }

    // GET /api/reports/quote-conversion  — Admin: quotes accepted versus sent
    [HttpGet("quote-conversion")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(QuoteConversionReportDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(MessageResponse), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> QuoteConversion([FromQuery] DateTime? from, [FromQuery] DateTime? to)
    {
        if (!TryNormalizeRange(from, to, out var fromUtc, out var toUtcExclusive, out var toDisplayUtc, out var error))
            return BadRequest(new MessageResponse { Message = error! });

        var query = _context.Quotations
            .Include(q => q.Items)
            .AsQueryable();

        if (fromUtc.HasValue)
            query = query.Where(q => q.CreatedAt >= fromUtc.Value);
        if (toUtcExclusive.HasValue)
            query = query.Where(q => q.CreatedAt < toUtcExclusive.Value);

        var quotes = await query.ToListAsync();

        var draftCount = quotes.Count(q => q.Status == QuotationStatus.Draft);
        var sentQuotes = quotes.Where(q => q.Status != QuotationStatus.Draft).ToList();
        var expiredCount = sentQuotes.Count(q => q.IsExpired);
        var awaitingCount = sentQuotes.Count(q => q.Status == QuotationStatus.Sent && !q.IsExpired);
        var acceptedQuotes = sentQuotes.Where(q => q.Status is QuotationStatus.Accepted or QuotationStatus.Converted).ToList();
        var convertedQuotes = sentQuotes.Where(q => q.Status == QuotationStatus.Converted).ToList();
        var declinedQuotes = sentQuotes.Where(q => q.Status == QuotationStatus.Declined).ToList();

        var sentCount = sentQuotes.Count;
        var acceptedCount = acceptedQuotes.Count;
        var convertedCount = convertedQuotes.Count;

        var responded = quotes.Where(q => q.SentAt.HasValue && q.RespondedAt.HasValue).ToList();
        double? avgResponseHours = responded.Count > 0
            ? Math.Round(responded.Average(q => (q.RespondedAt!.Value - q.SentAt!.Value).TotalHours), 2)
            : null;

        return Ok(new QuoteConversionReportDto
        {
            From = fromUtc,
            To = toDisplayUtc,
            TotalQuotations = quotes.Count,
            DraftCount = draftCount,
            SentCount = sentCount,
            AwaitingResponseCount = awaitingCount,
            ExpiredCount = expiredCount,
            AcceptedCount = acceptedCount,
            ConvertedCount = convertedCount,
            DeclinedCount = declinedQuotes.Count,
            AcceptanceRatePercent = sentCount > 0 ? Math.Round((decimal)acceptedCount / sentCount * 100m, 2) : 0m,
            ConversionRatePercent = sentCount > 0 ? Math.Round((decimal)convertedCount / sentCount * 100m, 2) : 0m,
            TotalSentValue = sentQuotes.Sum(q => q.Total),
            TotalAcceptedValue = acceptedQuotes.Sum(q => q.Total),
            TotalConvertedValue = convertedQuotes.Sum(q => q.Total),
            TotalDeclinedValue = declinedQuotes.Sum(q => q.Total),
            AverageResponseHours = avgResponseHours
        });
    }
}
