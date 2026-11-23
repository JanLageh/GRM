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
[Authorize]
public class InvoicesController : ControllerBase
{
    private readonly AppDbContext _context;

    public InvoicesController(AppDbContext context)
    {
        _context = context;
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private int CurrentUserId =>
        int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    private string CurrentRole =>
        User.FindFirstValue(ClaimTypes.Role) ?? string.Empty;

    private IQueryable<Invoice> QueryWithDetails() =>
        _context.Invoices
            .Include(i => i.Order)
            .Include(i => i.Customer)
            .Include(i => i.IssuedBy)
            .Include(i => i.VoidedBy)
            .Include(i => i.Items);

    private static InvoiceDto ToDto(Invoice i) => new()
    {
        Id = i.Id,
        InvoiceNumber = i.InvoiceNumber,
        OrderId = i.OrderId,
        OrderChannel = i.Order?.Channel ?? string.Empty,
        OrderStatus = i.Order?.Status ?? string.Empty,
        CustomerId = i.CustomerId,
        CustomerName = !string.IsNullOrWhiteSpace(i.CustomerName)
            ? i.CustomerName
            : (i.Customer?.FullName ?? i.Customer?.Username ?? string.Empty),
        BillingAddress = i.BillingAddress,
        IssuedByUserId = i.IssuedByUserId,
        IssuedByName = i.IssuedBy?.FullName ?? i.IssuedBy?.Username ?? string.Empty,
        PaymentStatus = i.PaymentStatus,
        PaymentMethod = i.PaymentMethod,
        Subtotal = i.Subtotal,
        DiscountPercent = i.DiscountPercent,
        DiscountAmount = i.DiscountAmount,
        TotalAmount = i.TotalAmount,
        AmountPaid = i.AmountPaid,
        BalanceDue = i.IsVoided ? 0m : Math.Max(0m, i.TotalAmount - i.AmountPaid),
        Notes = i.Notes,
        IssuedAt = i.IssuedAt,
        DueDate = i.DueDate,
        PaidAt = i.PaidAt,
        UpdatedAt = i.UpdatedAt,
        IsVoided = i.IsVoided,
        VoidedAt = i.VoidedAt,
        VoidedByUserId = i.VoidedByUserId,
        VoidedByName = i.VoidedBy?.FullName ?? i.VoidedBy?.Username,
        VoidReason = i.VoidReason,
        Items = i.Items
            .OrderBy(it => it.Id)
            .Select(it => new InvoiceItemDto
            {
                Id = it.Id,
                VariantId = it.VariantId,
                Sku = it.Sku,
                ProductName = it.ProductName,
                Model = it.Model,
                BundleName = it.BundleName,
                Quantity = it.Quantity,
                UnitPrice = it.UnitPrice,
                LineTotal = it.LineTotal
            })
            .ToList()
    };

    private static string? NormalizePaymentStatus(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;
        var key = new string(value.Trim().Where(c => !char.IsWhiteSpace(c) && c != '-' && c != '_').ToArray())
            .ToLowerInvariant();
        return key switch
        {
            "unpaid" => InvoiceStatus.Unpaid,
            "partiallypaid" => InvoiceStatus.PartiallyPaid,
            "paid" => InvoiceStatus.Paid,
            "voided" or "void" => InvoiceStatus.Voided,
            _ => null
        };
    }

    private static bool ValidateAndResolvePayment(
        string targetStatus,
        decimal? requestedAmountPaid,
        decimal totalAmount,
        decimal currentAmountPaid,
        DateTime? currentPaidAt,
        out decimal resolvedAmountPaid,
        out DateTime? resolvedPaidAt,
        out string? error)
    {
        resolvedAmountPaid = 0m;
        resolvedPaidAt = null;
        error = null;

        switch (targetStatus)
        {
            case InvoiceStatus.Unpaid:
                if (requestedAmountPaid is > 0m)
                {
                    error = "AmountPaid must be 0 when PaymentStatus is Unpaid.";
                    return false;
                }
                resolvedAmountPaid = 0m;
                resolvedPaidAt = null;
                return true;

            case InvoiceStatus.PartiallyPaid:
                if (totalAmount <= 0m)
                {
                    error = "An invoice with a zero total cannot be marked Partially Paid.";
                    return false;
                }
                if (requestedAmountPaid.HasValue && (requestedAmountPaid.Value <= 0m || requestedAmountPaid.Value >= totalAmount))
                {
                    error = $"For Partially Paid invoices, AmountPaid must be greater than 0 and less than the invoice total ({totalAmount:F2}).";
                    return false;
                }
                resolvedAmountPaid = requestedAmountPaid ?? (currentAmountPaid > 0m && currentAmountPaid < totalAmount ? currentAmountPaid : 0m);
                resolvedPaidAt = null;
                return true;

            case InvoiceStatus.Paid:
                if (requestedAmountPaid.HasValue && requestedAmountPaid.Value < totalAmount)
                {
                    error = $"For Paid invoices, AmountPaid must cover the full invoice total ({totalAmount:F2}).";
                    return false;
                }
                resolvedAmountPaid = totalAmount;
                resolvedPaidAt = currentPaidAt ?? DateTime.UtcNow;
                return true;

            default:
                error = "PaymentStatus must be one of: Unpaid, Partially Paid, Paid.";
                return false;
        }
    }

    // ── Endpoints ────────────────────────────────────────────────────────────

    // POST /api/orders/{id}/invoice  — Staff / Admin: generate an invoice from an order
    [HttpPost("api/orders/{id:int}/invoice")]
    [Authorize(Roles = "Staff,Admin")]
    [ProducesResponseType(typeof(InvoiceDto), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(MessageResponse), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(MessageResponse), StatusCodes.Status409Conflict)]
    public async Task<IActionResult> GenerateFromOrder(
        int id,
        [FromBody(EmptyBodyBehavior = EmptyBodyBehavior.Allow)] GenerateInvoiceRequest? request = null)
    {
        var order = await _context.SalesOrders
            .Include(o => o.Customer)
            .Include(o => o.Items).ThenInclude(i => i.Variant).ThenInclude(v => v!.Product)
            .FirstOrDefaultAsync(o => o.Id == id);

        if (order == null)
            return NotFound(new MessageResponse { Message = "Order not found." });

        if (order.Status == OrderStatus.Cancelled)
            return BadRequest(new MessageResponse { Message = "Cannot generate an invoice for a Cancelled order." });

        if (await _context.Invoices.AnyAsync(i => i.OrderId == id && !i.IsVoided))
            return Conflict(new MessageResponse { Message = "An active invoice already exists for this order." });

        var targetStatus = InvoiceStatus.Unpaid;
        if (!string.IsNullOrWhiteSpace(request?.PaymentStatus))
        {
            var normalized = NormalizePaymentStatus(request.PaymentStatus);
            if (normalized is not (InvoiceStatus.Unpaid or InvoiceStatus.PartiallyPaid or InvoiceStatus.Paid))
                return BadRequest(new MessageResponse { Message = "PaymentStatus must be one of: Unpaid, Partially Paid, Paid." });
            targetStatus = normalized;
        }

        if (!ValidateAndResolvePayment(
                targetStatus,
                request?.AmountPaid,
                order.Total,
                0m,
                null,
                out var resolvedAmountPaid,
                out var resolvedPaidAt,
                out var paymentError))
        {
            return BadRequest(new MessageResponse { Message = paymentError! });
        }

        DateTime? normalizedDueDate = null;
        if (request?.DueDate.HasValue == true)
        {
            var d = request.DueDate.Value;
            normalizedDueDate = d.Kind == DateTimeKind.Unspecified
                ? DateTime.SpecifyKind(d, DateTimeKind.Utc)
                : d.ToUniversalTime();
        }

        var now = DateTime.UtcNow;
        var invoice = new Invoice
        {
            InvoiceNumber = $"TMP-{Guid.NewGuid():N}",
            OrderId = order.Id,
            CustomerId = order.CustomerId,
            CustomerName = !string.IsNullOrWhiteSpace(order.CustomerName)
                ? order.CustomerName
                : (order.Customer?.FullName ?? order.Customer?.Username ?? "Walk-in Customer"),
            BillingAddress = order.ShippingAddress,
            IssuedByUserId = CurrentUserId,
            PaymentStatus = targetStatus,
            PaymentMethod = string.IsNullOrWhiteSpace(request?.PaymentMethod)
                ? (order.PaymentMethod ?? "Cash on Delivery")
                : request.PaymentMethod.Trim(),
            Subtotal = order.Subtotal,
            DiscountPercent = order.DiscountPercent,
            DiscountAmount = order.DiscountAmount,
            TotalAmount = order.Total,
            AmountPaid = resolvedAmountPaid,
            Notes = request?.Notes != null ? request.Notes.Trim() : order.Notes,
            IssuedAt = now,
            DueDate = normalizedDueDate,
            PaidAt = resolvedPaidAt,
            Items = order.Items
                .OrderBy(i => i.Id)
                .Select(i => new InvoiceItem
                {
                    VariantId = i.VariantId,
                    Sku = i.Variant?.Sku ?? string.Empty,
                    ProductName = i.Variant?.Product?.Name ?? string.Empty,
                    Model = i.Variant?.Model ?? string.Empty,
                    BundleName = i.BundleName,
                    Quantity = i.Quantity,
                    UnitPrice = i.UnitPrice
                })
                .ToList()
        };

        await using var tx = _context.Database.IsRelational()
            ? await _context.Database.BeginTransactionAsync()
            : null;

        _context.Invoices.Add(invoice);
        await _context.SaveChangesAsync();

        invoice.InvoiceNumber = $"INV-{invoice.Id:D6}";
        await _context.SaveChangesAsync();

        if (tx != null) await tx.CommitAsync();

        var loaded = await QueryWithDetails().FirstAsync(i => i.Id == invoice.Id);
        return CreatedAtAction(nameof(GetById), new { id = invoice.Id }, ToDto(loaded));
    }

    // GET /api/invoices  — Staff / Admin: list invoices
    [HttpGet("api/invoices")]
    [Authorize(Roles = "Staff,Admin")]
    [ProducesResponseType(typeof(List<InvoiceDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAll(
        [FromQuery] string? paymentStatus,
        [FromQuery] string? status,
        [FromQuery] int? orderId)
    {
        var query = QueryWithDetails();

        var effectiveStatus = !string.IsNullOrWhiteSpace(paymentStatus) ? paymentStatus : status;
        if (!string.IsNullOrWhiteSpace(effectiveStatus))
        {
            var s = (NormalizePaymentStatus(effectiveStatus) ?? effectiveStatus.Trim()).ToLowerInvariant();
            query = query.Where(i => i.PaymentStatus.ToLower() == s);
        }

        if (orderId.HasValue)
            query = query.Where(i => i.OrderId == orderId.Value);

        var list = await query
            .OrderByDescending(i => i.IssuedAt)
            .ThenByDescending(i => i.Id)
            .ToListAsync();

        return Ok(list.Select(ToDto).ToList());
    }

    // GET /api/invoices/my  — Customer: own invoices
    [HttpGet("api/invoices/my")]
    [Authorize(Roles = "Customer")]
    [ProducesResponseType(typeof(List<InvoiceDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetMy(
        [FromQuery] string? paymentStatus,
        [FromQuery] string? status)
    {
        var uid = CurrentUserId;
        var query = QueryWithDetails().Where(i => i.CustomerId == uid);

        var effectiveStatus = !string.IsNullOrWhiteSpace(paymentStatus) ? paymentStatus : status;
        if (!string.IsNullOrWhiteSpace(effectiveStatus))
        {
            var s = (NormalizePaymentStatus(effectiveStatus) ?? effectiveStatus.Trim()).ToLowerInvariant();
            query = query.Where(i => i.PaymentStatus.ToLower() == s);
        }

        var list = await query
            .OrderByDescending(i => i.IssuedAt)
            .ThenByDescending(i => i.Id)
            .ToListAsync();

        return Ok(list.Select(ToDto).ToList());
    }

    // GET /api/invoices/{id}  — Owner, Staff, Admin: view invoice
    [HttpGet("api/invoices/{id:int}")]
    [ProducesResponseType(typeof(InvoiceDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById(int id)
    {
        var invoice = await QueryWithDetails().FirstOrDefaultAsync(i => i.Id == id);
        if (invoice == null)
            return NotFound(new MessageResponse { Message = "Invoice not found." });

        if (CurrentRole == "Customer" && invoice.CustomerId != CurrentUserId)
            return Forbid();

        return Ok(ToDto(invoice));
    }

    // GET /api/invoices/{id}/pdf  — Owner, Staff, Admin: printable HTML invoice
    [HttpGet("api/invoices/{id:int}/pdf")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Pdf(int id)
    {
        var invoice = await QueryWithDetails().FirstOrDefaultAsync(i => i.Id == id);
        if (invoice == null)
            return NotFound(new MessageResponse { Message = "Invoice not found." });

        if (CurrentRole == "Customer" && invoice.CustomerId != CurrentUserId)
            return Forbid();

        var html = BuildPdfHtml(ToDto(invoice));
        return Content(html, "text/html", Encoding.UTF8);
    }

    // PATCH /api/invoices/{id}/payment-status  — Staff / Admin: Unpaid, Partially Paid, Paid
    [HttpPatch("api/invoices/{id:int}/payment-status")]
    [Authorize(Roles = "Staff,Admin")]
    [ProducesResponseType(typeof(InvoiceDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(MessageResponse), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdatePaymentStatus(int id, [FromBody] UpdateInvoicePaymentStatusRequest request)
    {
        var targetStatus = NormalizePaymentStatus(request.PaymentStatus);
        if (targetStatus == InvoiceStatus.Voided)
            return BadRequest(new MessageResponse { Message = "Use POST /api/invoices/{id}/void to void an invoice." });

        if (targetStatus is not (InvoiceStatus.Unpaid or InvoiceStatus.PartiallyPaid or InvoiceStatus.Paid))
            return BadRequest(new MessageResponse { Message = "PaymentStatus must be one of: Unpaid, Partially Paid, Paid." });

        var invoice = await QueryWithDetails().FirstOrDefaultAsync(i => i.Id == id);
        if (invoice == null)
            return NotFound(new MessageResponse { Message = "Invoice not found." });

        if (invoice.IsVoided || invoice.PaymentStatus == InvoiceStatus.Voided)
            return BadRequest(new MessageResponse { Message = "Cannot update payment status of a voided invoice." });

        if (!ValidateAndResolvePayment(
                targetStatus,
                request.AmountPaid,
                invoice.TotalAmount,
                invoice.AmountPaid,
                invoice.PaidAt,
                out var resolvedAmountPaid,
                out var resolvedPaidAt,
                out var paymentError))
        {
            return BadRequest(new MessageResponse { Message = paymentError! });
        }

        invoice.PaymentStatus = targetStatus;
        invoice.AmountPaid = resolvedAmountPaid;
        invoice.PaidAt = resolvedPaidAt;
        if (request.PaymentMethod != null)
            invoice.PaymentMethod = request.PaymentMethod.Trim();
        if (request.Notes != null)
            invoice.Notes = request.Notes.Trim();
        invoice.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        var loaded = await QueryWithDetails().FirstAsync(i => i.Id == id);
        return Ok(ToDto(loaded));
    }

    // POST /api/invoices/{id}/void  — Admin: void an invoice
    [HttpPost("api/invoices/{id:int}/void")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(InvoiceDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(MessageResponse), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Void(int id, [FromBody] VoidInvoiceRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Reason))
            return BadRequest(new MessageResponse { Message = "A reason is required to void an invoice." });

        var invoice = await QueryWithDetails().FirstOrDefaultAsync(i => i.Id == id);
        if (invoice == null)
            return NotFound(new MessageResponse { Message = "Invoice not found." });

        if (invoice.IsVoided || invoice.PaymentStatus == InvoiceStatus.Voided)
            return BadRequest(new MessageResponse { Message = "Invoice is already voided." });

        var now = DateTime.UtcNow;
        invoice.IsVoided = true;
        invoice.PaymentStatus = InvoiceStatus.Voided;
        invoice.VoidedAt = now;
        invoice.VoidedByUserId = CurrentUserId;
        invoice.VoidReason = request.Reason.Trim();
        invoice.UpdatedAt = now;

        await _context.SaveChangesAsync();

        var loaded = await QueryWithDetails().FirstAsync(i => i.Id == id);
        return Ok(ToDto(loaded));
    }

    // ── Printable HTML builder ───────────────────────────────────────────────

    private static string BuildPdfHtml(InvoiceDto inv)
    {
        static string H(string? s) => WebUtility.HtmlEncode(s ?? string.Empty);

        var rows = new StringBuilder();
        foreach (var item in inv.Items)
        {
            var label = string.IsNullOrWhiteSpace(item.Model)
                ? H(item.ProductName)
                : $"{H(item.ProductName)} – {H(item.Model)}";
            if (!string.IsNullOrWhiteSpace(item.BundleName))
                label += $" <small>[{H(item.BundleName)}]</small>";
            rows.Append(
                $"<tr>" +
                $"<td>{H(item.Sku)}</td>" +
                $"<td>{label}</td>" +
                $"<td style=\"text-align:right\">{item.Quantity}</td>" +
                $"<td style=\"text-align:right\">{item.UnitPrice:F2}</td>" +
                $"<td style=\"text-align:right\">{item.LineTotal:F2}</td>" +
                $"</tr>");
        }

        var voidBanner = inv.IsVoided
            ? $"<div class=\"void-banner\">VOIDED" +
              (string.IsNullOrWhiteSpace(inv.VoidReason) ? "" : $" — {H(inv.VoidReason)}") +
              $"</div>"
            : string.Empty;

        var billingRow = !string.IsNullOrWhiteSpace(inv.BillingAddress)
            ? $"<p><span>Address:</span> {H(inv.BillingAddress)}</p>"
            : string.Empty;
        var dueRow = inv.DueDate.HasValue
            ? $"<p><span>Due Date:</span> {inv.DueDate:yyyy-MM-dd HH:mm} UTC</p>"
            : string.Empty;
        var paidRow = inv.PaidAt.HasValue
            ? $"<p><span>Paid At:</span> {inv.PaidAt:yyyy-MM-dd HH:mm} UTC</p>"
            : string.Empty;
        var notesRow = !string.IsNullOrWhiteSpace(inv.Notes)
            ? $"<p><span>Notes:</span> {H(inv.Notes)}</p>"
            : string.Empty;

        var totalStyle = inv.IsVoided ? "text-decoration:line-through;color:#b91c1c;" : string.Empty;

        return "<!DOCTYPE html>" +
               "<html lang=\"en\"><head><meta charset=\"utf-8\"/>" +
               $"<title>Invoice {H(inv.InvoiceNumber)}</title>" +
               "<style>" +
               "body{font-family:Arial,sans-serif;margin:40px;color:#222;}" +
               ".header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;}" +
               "h1{color:#1a56a0;margin:0;}" +
               ".badge{display:inline-block;padding:4px 10px;border-radius:4px;font-weight:bold;background:#f0f4fa;color:#1a56a0;}" +
               ".void-banner{background:#fee2e2;color:#b91c1c;border:2px solid #b91c1c;padding:10px 14px;font-weight:bold;margin-bottom:18px;}" +
               ".meta{margin-bottom:20px;}" +
               ".meta span{display:inline-block;min-width:140px;color:#555;}" +
               "table{width:100%;border-collapse:collapse;margin-top:16px;}" +
               "th,td{border:1px solid #ccc;padding:8px 12px;}" +
               "th{background:#f0f4fa;text-align:left;}" +
               ".totals td{font-weight:bold;}" +
               "</style></head><body>" +
               voidBanner +
               "<div class=\"header\">" +
               "<div><h1>SALES INVOICE</h1><p>Garry's Smartlock and Solar</p></div>" +
               $"<div style=\"text-align:right\"><div style=\"font-size:20px;font-weight:bold;\">{H(inv.InvoiceNumber)}</div>" +
               $"<div class=\"badge\">{H(inv.PaymentStatus)}</div></div>" +
               "</div>" +
               "<div class=\"meta\">" +
               $"<p><span>Customer:</span> {H(inv.CustomerName)}</p>" +
               billingRow +
               $"<p><span>Order Ref:</span> #{inv.OrderId} ({H(inv.OrderChannel)})</p>" +
               $"<p><span>Payment Method:</span> {H(inv.PaymentMethod ?? "—")}</p>" +
               $"<p><span>Issued By:</span> {H(inv.IssuedByName)}</p>" +
               $"<p><span>Issued At:</span> {inv.IssuedAt:yyyy-MM-dd HH:mm} UTC</p>" +
               dueRow + paidRow + notesRow +
               "</div>" +
               "<table><thead><tr>" +
               "<th>SKU</th><th>Product / Model</th><th style=\"text-align:right\">Qty</th><th style=\"text-align:right\">Unit Price</th><th style=\"text-align:right\">Line Total</th>" +
               "</tr></thead><tbody>" +
               rows +
               "</tbody><tfoot class=\"totals\">" +
               $"<tr><td colspan=\"4\" style=\"text-align:right\">Subtotal</td><td style=\"text-align:right\">{inv.Subtotal:F2}</td></tr>" +
               $"<tr><td colspan=\"4\" style=\"text-align:right\">Discount ({inv.DiscountPercent:F2}%)</td><td style=\"text-align:right\">-{inv.DiscountAmount:F2}</td></tr>" +
               $"<tr><td colspan=\"4\" style=\"text-align:right\"><strong>Total Amount</strong></td><td style=\"text-align:right;{totalStyle}\"><strong>{inv.TotalAmount:F2}</strong></td></tr>" +
               $"<tr><td colspan=\"4\" style=\"text-align:right\">Amount Paid</td><td style=\"text-align:right\">{inv.AmountPaid:F2}</td></tr>" +
               $"<tr><td colspan=\"4\" style=\"text-align:right\">Balance Due</td><td style=\"text-align:right\">{inv.BalanceDue:F2}</td></tr>" +
               "</tfoot></table></body></html>";
    }
}
