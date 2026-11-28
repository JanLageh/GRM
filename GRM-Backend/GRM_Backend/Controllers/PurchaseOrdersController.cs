using System.Net;
using System.Security.Claims;
using System.Text;
using GRM_Backend.Data;
using GRM_Backend.DTOs;
using GRM_Backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.EntityFrameworkCore;

namespace GRM_Backend.Controllers;

[ApiController]
[Route("api/purchase-orders")]
[Authorize]
public class PurchaseOrdersController : ControllerBase
{
    private readonly AppDbContext _context;

    public PurchaseOrdersController(AppDbContext context)
    {
        _context = context;
    }

    private int CurrentUserId =>
        int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    private IQueryable<PurchaseOrder> QueryWithDetails() =>
        _context.PurchaseOrders
            .Include(po => po.Supplier)
            .Include(po => po.CreatedBy)
            .Include(po => po.ApprovedBy)
            .Include(po => po.Items).ThenInclude(i => i.Variant).ThenInclude(v => v!.Product);

    private static PurchaseOrderDto ToDto(PurchaseOrder po) => new()
    {
        Id = po.Id,
        PoNumber = po.PoNumber,
        SupplierId = po.SupplierId,
        SupplierName = po.Supplier?.Name,
        SupplierContact = po.Supplier?.ContactPerson,
        SupplierPhone = po.Supplier?.Phone,
        RequisitionId = po.RequisitionId,
        Status = po.Status,
        Source = po.Source,
        Notes = po.Notes,
        CreatedByUserId = po.CreatedByUserId,
        CreatedByName = po.CreatedBy?.FullName ?? po.CreatedBy?.Username,
        ApprovedByUserId = po.ApprovedByUserId,
        ApprovedByName = po.ApprovedBy?.FullName ?? po.ApprovedBy?.Username,
        ApprovedAt = po.ApprovedAt,
        SentAt = po.SentAt,
        ReceivedAt = po.ReceivedAt,
        CreatedAt = po.CreatedAt,
        UpdatedAt = po.UpdatedAt,
        TotalQuantityOrdered = po.Items.Sum(i => i.QuantityOrdered),
        TotalQuantityReceived = po.Items.Sum(i => i.QuantityReceived),
        TotalCost = po.Items.Sum(i => i.LineTotal),
        Items = po.Items
            .OrderBy(i => i.Id)
            .Select(i => new PurchaseOrderItemDto
            {
                Id = i.Id,
                VariantId = i.VariantId,
                Sku = i.Variant?.Sku ?? string.Empty,
                ProductName = i.Variant?.Product?.Name ?? string.Empty,
                Model = i.Variant?.Model ?? string.Empty,
                CurrentStock = i.Variant?.Stock ?? 0,
                QuantityOrdered = i.QuantityOrdered,
                QuantityReceived = i.QuantityReceived,
                QuantityRemaining = Math.Max(0, i.QuantityOrdered - i.QuantityReceived),
                UnitCost = i.UnitCost,
                LineTotal = i.LineTotal
            })
            .ToList()
    };

    private static string? NormalizeStatus(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;
        return value.Trim().ToLowerInvariant() switch
        {
            "draft" => PurchaseOrderStatus.Draft,
            "approved" => PurchaseOrderStatus.Approved,
            "sent" => PurchaseOrderStatus.Sent,
            "received" => PurchaseOrderStatus.Received,
            _ => null
        };
    }

    private static string? NormalizeSource(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;
        return value.Trim().ToLowerInvariant() switch
        {
            "system" => PurchaseOrderSource.System,
            "requisition" => PurchaseOrderSource.Requisition,
            "manual" => PurchaseOrderSource.Manual,
            _ => null
        };
    }

    // GET /api/purchase-orders  — Staff (read), Admin: list POs, including auto-drafts
    [HttpGet]
    [Authorize(Roles = "Staff,Admin")]
    [ProducesResponseType(typeof(List<PurchaseOrderDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> List(
        [FromQuery] string? status,
        [FromQuery] int? supplierId,
        [FromQuery] string? source)
    {
        var query = QueryWithDetails();

        if (!string.IsNullOrWhiteSpace(status))
        {
            var s = (NormalizeStatus(status) ?? status.Trim()).ToLowerInvariant();
            query = query.Where(po => po.Status.ToLower() == s);
        }

        if (supplierId.HasValue)
            query = query.Where(po => po.SupplierId == supplierId.Value);

        if (!string.IsNullOrWhiteSpace(source))
        {
            var src = (NormalizeSource(source) ?? source.Trim()).ToLowerInvariant();
            query = query.Where(po => po.Source.ToLower() == src);
        }

        var list = await query
            .OrderByDescending(po => po.CreatedAt)
            .ThenByDescending(po => po.Id)
            .ToListAsync();

        return Ok(list.Select(ToDto).ToList());
    }

    // GET /api/purchase-orders/{id}  — Staff (read), Admin
    [HttpGet("{id:int}")]
    [Authorize(Roles = "Staff,Admin")]
    [ProducesResponseType(typeof(PurchaseOrderDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById(int id)
    {
        var po = await QueryWithDetails().FirstOrDefaultAsync(x => x.Id == id);
        if (po == null)
            return NotFound(new MessageResponse { Message = "Purchase order not found." });

        return Ok(ToDto(po));
    }

    // POST /api/purchase-orders  — Admin: create from a requisition or manual/draft
    [HttpPost]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(PurchaseOrderDto), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(MessageResponse), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(MessageResponse), StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Create([FromBody] CreatePurchaseOrderRequest request)
    {
        var resolvedStatus = PurchaseOrderStatus.Draft;
        if (!string.IsNullOrWhiteSpace(request.Status))
        {
            var normalized = NormalizeStatus(request.Status);
            if (normalized is not (PurchaseOrderStatus.Draft or PurchaseOrderStatus.Approved))
                return BadRequest(new MessageResponse { Message = "Initial purchase order status must be Draft or Approved." });
            resolvedStatus = normalized;
        }

        Supplier? supplier = null;
        if (request.SupplierId.HasValue)
        {
            supplier = await _context.Suppliers.FindAsync(request.SupplierId.Value);
            if (supplier == null || !supplier.IsActive)
                return BadRequest(new MessageResponse { Message = "Supplier not found or inactive." });
        }

        if (resolvedStatus == PurchaseOrderStatus.Approved && supplier == null)
            return BadRequest(new MessageResponse { Message = "Assign a supplier before creating an Approved purchase order." });

        string source;
        List<PurchaseOrderItemRequest> requestedItems;
        string? defaultNotes = null;

        if (request.RequisitionId.HasValue)
        {
            var req = await _context.PurchaseRequisitions
                .Include(r => r.Variant).ThenInclude(v => v!.Product)
                .FirstOrDefaultAsync(r => r.Id == request.RequisitionId.Value);

            if (req == null)
                return NotFound(new MessageResponse { Message = "Requisition not found." });

            if (req.Status != RequisitionStatus.Approved)
                return BadRequest(new MessageResponse { Message = "Only Approved requisitions can be converted to a purchase order." });

            if (await _context.PurchaseOrders.AnyAsync(po => po.RequisitionId == req.Id))
                return Conflict(new MessageResponse { Message = "A purchase order already exists for this requisition." });

            source = PurchaseOrderSource.Requisition;
            defaultNotes = $"From Requisition #{req.Id}: {req.Reason}";
            requestedItems = request.Items is { Count: > 0 }
                ? request.Items
                : new List<PurchaseOrderItemRequest>
                {
                    new()
                    {
                        VariantId = req.VariantId,
                        QuantityOrdered = req.Quantity,
                        UnitCost = req.Variant?.Price ?? 0m
                    }
                };
        }
        else
        {
            source = PurchaseOrderSource.Manual;
            if (request.Items == null || request.Items.Count == 0)
                return BadRequest(new MessageResponse { Message = "At least one item is required when creating a purchase order without a requisition." });

            requestedItems = request.Items;
        }

        if (requestedItems.Select(i => i.VariantId).Distinct().Count() != requestedItems.Count)
            return BadRequest(new MessageResponse { Message = "Duplicate variants in purchase order items. Combine quantities into a single line per variant." });

        var variantIds = requestedItems.Select(i => i.VariantId).ToList();
        var variants = await _context.Variants
            .Include(v => v.Product)
            .Where(v => variantIds.Contains(v.Id))
            .ToDictionaryAsync(v => v.Id);

        foreach (var item in requestedItems)
        {
            if (!variants.TryGetValue(item.VariantId, out var variant) || variant.Product is { IsActive: false })
                return BadRequest(new MessageResponse { Message = $"Variant {item.VariantId} not found or inactive." });
        }

        var now = DateTime.UtcNow;
        var po = new PurchaseOrder
        {
            PoNumber = $"TMP-{Guid.NewGuid():N}",
            SupplierId = supplier?.Id,
            RequisitionId = request.RequisitionId,
            Status = resolvedStatus,
            Source = source,
            Notes = request.Notes != null ? request.Notes.Trim() : defaultNotes,
            CreatedByUserId = CurrentUserId,
            ApprovedByUserId = resolvedStatus == PurchaseOrderStatus.Approved ? CurrentUserId : null,
            ApprovedAt = resolvedStatus == PurchaseOrderStatus.Approved ? now : null,
            CreatedAt = now,
            Items = requestedItems.Select(i => new PurchaseOrderItem
            {
                VariantId = i.VariantId,
                QuantityOrdered = i.QuantityOrdered,
                QuantityReceived = 0,
                UnitCost = i.UnitCost ?? variants[i.VariantId].Price
            }).ToList()
        };

        await using var tx = _context.Database.IsRelational()
            ? await _context.Database.BeginTransactionAsync()
            : null;

        _context.PurchaseOrders.Add(po);
        await _context.SaveChangesAsync();

        po.PoNumber = $"PO-{po.Id:D6}";
        await _context.SaveChangesAsync();

        if (tx != null) await tx.CommitAsync();

        var loaded = await QueryWithDetails().FirstAsync(x => x.Id == po.Id);
        return CreatedAtAction(nameof(GetById), new { id = po.Id }, ToDto(loaded));
    }

    // PUT /api/purchase-orders/{id}  — Admin: edit quantities or supplier
    [HttpPut("{id:int}")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(PurchaseOrderDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(MessageResponse), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Update(int id, [FromBody] UpdatePurchaseOrderRequest request)
    {
        var po = await QueryWithDetails().FirstOrDefaultAsync(x => x.Id == id);
        if (po == null)
            return NotFound(new MessageResponse { Message = "Purchase order not found." });

        if (po.Status is not (PurchaseOrderStatus.Draft or PurchaseOrderStatus.Approved))
            return BadRequest(new MessageResponse { Message = "Only Draft or Approved purchase orders can be edited." });

        if (request.ClearSupplier)
        {
            if (po.Status == PurchaseOrderStatus.Approved)
                return BadRequest(new MessageResponse { Message = "Cannot remove supplier from an Approved purchase order." });
            po.SupplierId = null;
        }
        else if (request.SupplierId.HasValue)
        {
            var supplier = await _context.Suppliers.FindAsync(request.SupplierId.Value);
            if (supplier == null || !supplier.IsActive)
                return BadRequest(new MessageResponse { Message = "Supplier not found or inactive." });
            po.SupplierId = supplier.Id;
        }

        if (request.Items != null)
        {
            if (request.Items.Count == 0)
                return BadRequest(new MessageResponse { Message = "A purchase order must have at least one item." });

            if (request.Items.Select(i => i.VariantId).Distinct().Count() != request.Items.Count)
                return BadRequest(new MessageResponse { Message = "Duplicate variants in purchase order items. Combine quantities into a single line per variant." });

            var variantIds = request.Items.Select(i => i.VariantId).ToList();
            var variants = await _context.Variants
                .Include(v => v.Product)
                .Where(v => variantIds.Contains(v.Id))
                .ToDictionaryAsync(v => v.Id);

            foreach (var item in request.Items)
            {
                if (!variants.TryGetValue(item.VariantId, out var variant) || variant.Product is { IsActive: false })
                    return BadRequest(new MessageResponse { Message = $"Variant {item.VariantId} not found or inactive." });
            }

            var existingByVariant = po.Items.ToDictionary(i => i.VariantId);
            var incomingVariantSet = variantIds.ToHashSet();

            foreach (var existing in po.Items)
            {
                if (existing.QuantityReceived > 0 && !incomingVariantSet.Contains(existing.VariantId))
                    return BadRequest(new MessageResponse { Message = "Cannot remove a line item that already has received quantities." });
            }

            foreach (var item in request.Items)
            {
                if (existingByVariant.TryGetValue(item.VariantId, out var existing) &&
                    item.QuantityOrdered < existing.QuantityReceived)
                {
                    return BadRequest(new MessageResponse
                    {
                        Message = $"Ordered quantity for SKU '{existing.Variant?.Sku ?? variants[item.VariantId].Sku}' cannot be less than already received quantity ({existing.QuantityReceived})."
                    });
                }
            }

            _context.PurchaseOrderItems.RemoveRange(po.Items);
            var newItems = request.Items.Select(i =>
            {
                existingByVariant.TryGetValue(i.VariantId, out var existing);
                return new PurchaseOrderItem
                {
                    PurchaseOrderId = po.Id,
                    VariantId = i.VariantId,
                    QuantityOrdered = i.QuantityOrdered,
                    QuantityReceived = existing?.QuantityReceived ?? 0,
                    UnitCost = i.UnitCost ?? existing?.UnitCost ?? variants[i.VariantId].Price
                };
            }).ToList();

            _context.PurchaseOrderItems.AddRange(newItems);
            po.Items = newItems;
        }

        if (request.Notes != null)
            po.Notes = request.Notes.Trim();

        po.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        var loaded = await QueryWithDetails().FirstAsync(x => x.Id == id);
        return Ok(ToDto(loaded));
    }

    // POST /api/purchase-orders/{id}/approve  — Admin: approve a Draft PO
    [HttpPost("{id:int}/approve")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(PurchaseOrderDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(MessageResponse), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Approve(
        int id,
        [FromBody(EmptyBodyBehavior = EmptyBodyBehavior.Allow)] ApprovePurchaseOrderRequest? request = null)
    {
        var po = await QueryWithDetails().FirstOrDefaultAsync(x => x.Id == id);
        if (po == null)
            return NotFound(new MessageResponse { Message = "Purchase order not found." });

        if (po.Status != PurchaseOrderStatus.Draft)
            return BadRequest(new MessageResponse { Message = "Only Draft purchase orders can be approved." });

        if (request?.SupplierId.HasValue == true)
        {
            var supplier = await _context.Suppliers.FindAsync(request.SupplierId.Value);
            if (supplier == null || !supplier.IsActive)
                return BadRequest(new MessageResponse { Message = "Supplier not found or inactive." });
            po.SupplierId = supplier.Id;
        }

        if (!po.SupplierId.HasValue)
            return BadRequest(new MessageResponse { Message = "Assign a supplier before approving a purchase order." });

        if (po.Items.Count == 0)
            return BadRequest(new MessageResponse { Message = "Cannot approve an empty purchase order." });

        if (request?.Notes != null)
            po.Notes = request.Notes.Trim();

        var now = DateTime.UtcNow;
        po.Status = PurchaseOrderStatus.Approved;
        po.ApprovedByUserId = CurrentUserId;
        po.ApprovedAt = now;
        po.UpdatedAt = now;

        await _context.SaveChangesAsync();

        var loaded = await QueryWithDetails().FirstAsync(x => x.Id == id);
        return Ok(ToDto(loaded));
    }

    // POST /api/purchase-orders/{id}/send  — Admin: mark an Approved PO as Sent
    [HttpPost("{id:int}/send")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(PurchaseOrderDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(MessageResponse), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Send(int id)
    {
        var po = await QueryWithDetails().FirstOrDefaultAsync(x => x.Id == id);
        if (po == null)
            return NotFound(new MessageResponse { Message = "Purchase order not found." });

        if (po.Status != PurchaseOrderStatus.Approved)
            return BadRequest(new MessageResponse { Message = "Only Approved purchase orders can be marked as Sent." });

        var now = DateTime.UtcNow;
        po.Status = PurchaseOrderStatus.Sent;
        po.SentAt = now;
        po.UpdatedAt = now;

        await _context.SaveChangesAsync();

        var loaded = await QueryWithDetails().FirstAsync(x => x.Id == id);
        return Ok(ToDto(loaded));
    }

    // POST /api/purchase-orders/{id}/receive  — Staff / Admin: record received quantity, increases stock
    [HttpPost("{id:int}/receive")]
    [Authorize(Roles = "Staff,Admin")]
    [ProducesResponseType(typeof(PurchaseOrderDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(MessageResponse), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Receive(int id, [FromBody] ReceivePurchaseOrderRequest request)
    {
        var po = await QueryWithDetails().FirstOrDefaultAsync(x => x.Id == id);
        if (po == null)
            return NotFound(new MessageResponse { Message = "Purchase order not found." });

        if (po.Status is not (PurchaseOrderStatus.Approved or PurchaseOrderStatus.Sent))
            return BadRequest(new MessageResponse { Message = "Only Approved or Sent purchase orders can receive stock." });

        var grouped = request.Items
            .GroupBy(i => i.VariantId)
            .Select(g => new { VariantId = g.Key, QuantityReceived = g.Sum(x => x.QuantityReceived) })
            .ToList();

        var poItemsByVariant = po.Items.ToDictionary(i => i.VariantId);
        foreach (var entry in grouped)
        {
            if (!poItemsByVariant.TryGetValue(entry.VariantId, out var poItem))
                return BadRequest(new MessageResponse { Message = $"Variant {entry.VariantId} is not part of this purchase order." });

            if (poItem.Variant == null)
                return BadRequest(new MessageResponse { Message = $"Variant {entry.VariantId} not found." });

            var remaining = poItem.QuantityOrdered - poItem.QuantityReceived;
            if (entry.QuantityReceived > remaining)
                return BadRequest(new MessageResponse
                {
                    Message = $"Cannot receive {entry.QuantityReceived} units for SKU '{poItem.Variant.Sku}'. Remaining ordered quantity is {remaining}."
                });
        }

        await using var tx = _context.Database.IsRelational()
            ? await _context.Database.BeginTransactionAsync()
            : null;

        var uid = CurrentUserId;
        var noteSuffix = string.IsNullOrWhiteSpace(request.Notes) ? string.Empty : $": {request.Notes.Trim()}";

        foreach (var entry in grouped)
        {
            var poItem = poItemsByVariant[entry.VariantId];
            poItem.QuantityReceived += entry.QuantityReceived;
            poItem.Variant!.Stock += entry.QuantityReceived;

            _context.StockMovements.Add(new StockMovement
            {
                VariantId = poItem.VariantId,
                Type = "StockIn",
                QuantityChange = entry.QuantityReceived,
                StockAfter = poItem.Variant.Stock,
                Reason = $"Received against {po.PoNumber}{noteSuffix}",
                UserId = uid
            });
        }

        var now = DateTime.UtcNow;
        po.UpdatedAt = now;
        if (po.Items.All(i => i.QuantityReceived >= i.QuantityOrdered))
        {
            po.Status = PurchaseOrderStatus.Received;
            po.ReceivedAt = now;
        }

        await _context.SaveChangesAsync();
        if (tx != null) await tx.CommitAsync();

        var loaded = await QueryWithDetails().FirstAsync(x => x.Id == id);
        return Ok(ToDto(loaded));
    }

    // DELETE /api/purchase-orders/{id}  — Admin: discard a Draft PO
    [HttpDelete("{id:int}")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(MessageResponse), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(int id)
    {
        var po = await _context.PurchaseOrders
            .Include(p => p.Items)
            .FirstOrDefaultAsync(p => p.Id == id);
        if (po == null)
            return NotFound(new MessageResponse { Message = "Purchase order not found." });

        if (po.Status != PurchaseOrderStatus.Draft)
            return BadRequest(new MessageResponse { Message = "Only Draft purchase orders can be discarded." });

        _context.PurchaseOrders.Remove(po);
        await _context.SaveChangesAsync();

        return NoContent();
    }

    // GET /api/purchase-orders/{id}/pdf  — Admin: printable version
    [HttpGet("{id:int}/pdf")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Pdf(int id)
    {
        var po = await QueryWithDetails().FirstOrDefaultAsync(x => x.Id == id);
        if (po == null)
            return NotFound(new MessageResponse { Message = "Purchase order not found." });

        var html = BuildPdfHtml(ToDto(po));
        return Content(html, "text/html", Encoding.UTF8);
    }

    private static string BuildPdfHtml(PurchaseOrderDto po)
    {
        static string H(string? s) => WebUtility.HtmlEncode(s ?? string.Empty);

        var rows = new StringBuilder();
        foreach (var item in po.Items)
        {
            var label = string.IsNullOrWhiteSpace(item.Model)
                ? H(item.ProductName)
                : $"{H(item.ProductName)} – {H(item.Model)}";
            rows.Append(
                $"<tr>" +
                $"<td>{H(item.Sku)}</td>" +
                $"<td>{label}</td>" +
                $"<td style=\"text-align:right\">{item.QuantityOrdered}</td>" +
                $"<td style=\"text-align:right\">{item.QuantityReceived}</td>" +
                $"<td style=\"text-align:right\">{item.UnitCost:F2}</td>" +
                $"<td style=\"text-align:right\">{item.LineTotal:F2}</td>" +
                $"</tr>");
        }

        var supplierLine = string.IsNullOrWhiteSpace(po.SupplierName)
            ? "Unassigned"
            : H(po.SupplierName);
        var supplierSub = string.Join(" · ",
            new[] { po.SupplierContact, po.SupplierPhone }.Where(x => !string.IsNullOrWhiteSpace(x)).Select(H));
        var reqRow = po.RequisitionId.HasValue
            ? $"<p><span>Requisition:</span> #{po.RequisitionId.Value}</p>"
            : string.Empty;
        var approvedRow = po.ApprovedAt.HasValue
            ? $"<p><span>Approved:</span> {po.ApprovedAt:yyyy-MM-dd HH:mm} UTC" +
              (string.IsNullOrWhiteSpace(po.ApprovedByName) ? "" : $" by {H(po.ApprovedByName)}") + "</p>"
            : string.Empty;
        var sentRow = po.SentAt.HasValue
            ? $"<p><span>Sent:</span> {po.SentAt:yyyy-MM-dd HH:mm} UTC</p>"
            : string.Empty;
        var receivedRow = po.ReceivedAt.HasValue
            ? $"<p><span>Received:</span> {po.ReceivedAt:yyyy-MM-dd HH:mm} UTC</p>"
            : string.Empty;
        var notesRow = !string.IsNullOrWhiteSpace(po.Notes)
            ? $"<p><span>Notes:</span> {H(po.Notes)}</p>"
            : string.Empty;

        return "<!DOCTYPE html>" +
               "<html lang=\"en\"><head><meta charset=\"utf-8\"/>" +
               $"<title>Purchase Order {H(po.PoNumber)}</title>" +
               "<style>" +
               "body{font-family:Arial,sans-serif;margin:40px;color:#222;}" +
               ".header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;}" +
               "h1{color:#1a56a0;margin:0;}" +
               ".badge{display:inline-block;padding:4px 10px;border-radius:4px;font-weight:bold;background:#f0f4fa;color:#1a56a0;}" +
               ".meta{margin-bottom:20px;}" +
               ".meta span{display:inline-block;min-width:140px;color:#555;}" +
               "table{width:100%;border-collapse:collapse;margin-top:16px;}" +
               "th,td{border:1px solid #ccc;padding:8px 12px;}" +
               "th{background:#f0f4fa;text-align:left;}" +
               ".totals td{font-weight:bold;}" +
               "</style></head><body>" +
               "<div class=\"header\">" +
               "<div><h1>PURCHASE ORDER</h1><p>Garry's Smartlock and Solar</p></div>" +
               $"<div style=\"text-align:right\"><div style=\"font-size:20px;font-weight:bold;\">{H(po.PoNumber)}</div>" +
               $"<div class=\"badge\">{H(po.Status)}</div></div>" +
               "</div>" +
               "<div class=\"meta\">" +
               $"<p><span>Supplier:</span> {supplierLine}" + (string.IsNullOrEmpty(supplierSub) ? "" : $" ({supplierSub})") + "</p>" +
               $"<p><span>Source:</span> {H(po.Source)}</p>" +
               reqRow +
               $"<p><span>Created:</span> {po.CreatedAt:yyyy-MM-dd HH:mm} UTC</p>" +
               approvedRow + sentRow + receivedRow + notesRow +
               "</div>" +
               "<table><thead><tr>" +
               "<th>SKU</th><th>Product / Model</th><th style=\"text-align:right\">Ordered</th><th style=\"text-align:right\">Received</th><th style=\"text-align:right\">Unit Cost</th><th style=\"text-align:right\">Line Total</th>" +
               "</tr></thead><tbody>" +
               rows +
               "</tbody><tfoot class=\"totals\">" +
               $"<tr><td colspan=\"2\" style=\"text-align:right\">Totals</td><td style=\"text-align:right\">{po.TotalQuantityOrdered}</td><td style=\"text-align:right\">{po.TotalQuantityReceived}</td><td></td><td style=\"text-align:right\">{po.TotalCost:F2}</td></tr>" +
               "</tfoot></table></body></html>";
    }
}
