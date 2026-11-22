using System.Net;
using System.Security.Claims;
using System.Text;
using GRM_Backend.Data;
using GRM_Backend.DTOs;
using GRM_Backend.Models;
using GRM_Backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.EntityFrameworkCore;

namespace GRM_Backend.Controllers;

[ApiController]
[Route("api/quotations")]
[Authorize]
public class QuotationsController : ControllerBase
{
    private readonly AppDbContext _context;

    public QuotationsController(AppDbContext context)
    {
        _context = context;
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private int CurrentUserId =>
        int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    private string CurrentRole =>
        User.FindFirstValue(ClaimTypes.Role) ?? string.Empty;

    private async Task<decimal> GetMaxStaffDiscountAsync() =>
        await _context.BusinessSettings.AsNoTracking()
            .Select(s => (decimal?)s.MaxStaffDiscountPercent)
            .FirstOrDefaultAsync() ?? 15m;

    private async Task<int> GetDefaultValidityDaysAsync() =>
        await _context.BusinessSettings.AsNoTracking()
            .Select(s => (int?)s.DefaultQuotationValidityDays)
            .FirstOrDefaultAsync() ?? 7;

    private static DateTime NormalizeUtc(DateTime dt) =>
        dt.Kind == DateTimeKind.Unspecified
            ? DateTime.SpecifyKind(dt, DateTimeKind.Utc)
            : dt.ToUniversalTime();

    /// <summary>Projects a Quotation entity to its DTO (items must be loaded).</summary>
    private static QuotationDto ToDto(Quotation q) => new()
    {
        Id             = q.Id,
        CustomerId     = q.CustomerId,
        CustomerName   = q.Customer?.FullName ?? q.Customer?.Username ?? string.Empty,
        StaffId        = q.StaffId,
        StaffName      = q.Staff?.FullName ?? q.Staff?.Username,
        Status         = q.Status,
        Notes          = q.Notes,
        DiscountPercent  = q.DiscountPercent,
        Subtotal       = q.Subtotal,
        DiscountAmount = q.DiscountAmount,
        Total          = q.Total,
        CreatedAt      = q.CreatedAt,
        UpdatedAt      = q.UpdatedAt,
        SentAt         = q.SentAt,
        ExpiresAt      = q.ExpiresAt,
        IsExpired      = q.IsExpired,
        RespondedAt    = q.RespondedAt,
        DeclineReason  = q.DeclineReason,
        Items = q.Items.Select(i => new QuotationItemDto
        {
            Id          = i.Id,
            VariantId   = i.VariantId,
            BundleId    = i.BundleId,
            BundleName  = i.BundleName,
            Sku         = i.Variant?.Sku ?? string.Empty,
            ProductName = i.Variant?.Product?.Name ?? string.Empty,
            Model       = i.Variant?.Model ?? string.Empty,
            Quantity    = i.Quantity,
            UnitPrice   = i.UnitPrice,
            LineTotal   = i.LineTotal
        }).ToList()
    };

    /// <summary>Loads a quotation with all navigation properties.</summary>
    private async Task<Quotation?> FindQuotation(int id) =>
        await _context.Quotations
            .Include(q => q.Customer)
            .Include(q => q.Staff)
            .Include(q => q.Items).ThenInclude(i => i.Variant).ThenInclude(v => v!.Product)
            .FirstOrDefaultAsync(q => q.Id == id);

    /// <summary>Validates and builds QuotationItem list from variant items and/or bundles.
    /// Returns null and populates ModelState if validation fails.</summary>
    private async Task<List<QuotationItem>?> BuildItems(
        List<QuoteItemRequest>? requests,
        List<OrderBundleRequest>? bundles)
    {
        var hasVariants = requests is { Count: > 0 };
        var hasBundles = bundles is { Count: > 0 };
        if (!hasVariants && !hasBundles)
        {
            ModelState.AddModelError("items", "At least one item or bundle is required.");
            return null;
        }

        var items = new List<QuotationItem>();
        foreach (var r in requests ?? new())
        {
            var variant = await _context.Variants
                .Include(v => v.Product)
                .FirstOrDefaultAsync(v => v.Id == r.VariantId);

            if (variant == null || variant.Product is { IsActive: false })
            {
                ModelState.AddModelError("items", $"Variant {r.VariantId} not found or inactive.");
                return null;
            }

            items.Add(new QuotationItem
            {
                VariantId = variant.Id,
                Quantity  = r.Quantity,
                UnitPrice = variant.Price
            });
        }

        foreach (var bReq in bundles ?? new())
        {
            var bundle = await _context.Bundles
                .Include(b => b.Items).ThenInclude(i => i.Variant).ThenInclude(v => v!.Product)
                .FirstOrDefaultAsync(b => b.Id == bReq.BundleId);

            if (bundle == null || bundle.Items.Count == 0)
            {
                ModelState.AddModelError("bundles", $"Bundle {bReq.BundleId} not found or empty.");
                return null;
            }

            foreach (var bi in bundle.Items)
            {
                if (bi.Variant == null || bi.Variant.Product is { IsActive: false })
                {
                    ModelState.AddModelError("bundles", $"Variant {bi.VariantId} in bundle '{bundle.Name}' is unavailable or inactive.");
                    return null;
                }
            }

            foreach (var line in BundlePricingHelper.ExpandBundle(bundle, bReq.Quantity))
            {
                items.Add(new QuotationItem
                {
                    VariantId  = line.VariantId,
                    BundleId   = line.BundleId,
                    BundleName = line.BundleName,
                    Quantity   = line.Quantity,
                    UnitPrice  = line.UnitPrice
                });
            }
        }

        return items;
    }

    // ── Endpoints ─────────────────────────────────────────────────────────────

    // POST /api/quotations/requests  — Customer submits a quote request
    [HttpPost("requests")]
    [Authorize(Roles = "Customer")]
    public async Task<IActionResult> RequestQuote([FromBody] QuoteRequestBody body)
    {
        var items = await BuildItems(body.Items, body.Bundles);
        if (items == null) return ValidationProblem(ModelState);

        var quotation = new Quotation
        {
            CustomerId = CurrentUserId,
            Notes      = body.Notes?.Trim(),
            Status     = QuotationStatus.Draft,
            Items      = items
        };

        _context.Quotations.Add(quotation);
        await _context.SaveChangesAsync();

        var loaded = (await FindQuotation(quotation.Id))!;
        return CreatedAtAction(nameof(GetById), new { id = quotation.Id }, ToDto(loaded));
    }

    // POST /api/quotations  — Staff / Admin creates a quote directly
    [HttpPost]
    [Authorize(Roles = "Staff,Admin")]
    public async Task<IActionResult> Create([FromBody] CreateQuotationRequest request)
    {
        var maxStaffDiscount = await GetMaxStaffDiscountAsync();
        if (CurrentRole == "Staff" && request.DiscountPercent > maxStaffDiscount)
            return BadRequest(new MessageResponse
            {
                Message = $"Staff members may not apply a discount greater than {maxStaffDiscount}%."
            });

        DateTime? normalizedExpiresAt = null;
        if (request.ExpiresAt.HasValue)
        {
            normalizedExpiresAt = NormalizeUtc(request.ExpiresAt.Value);
            if (normalizedExpiresAt <= DateTime.UtcNow)
                return BadRequest(new MessageResponse { Message = "ExpiresAt must be in the future." });
        }

        var customer = await _context.Users.FindAsync(request.CustomerId);
        if (customer == null || customer.Role != "Customer")
            return BadRequest(new MessageResponse { Message = "CustomerId must reference a valid Customer account." });

        var items = await BuildItems(request.Items, request.Bundles);
        if (items == null) return ValidationProblem(ModelState);

        var quotation = new Quotation
        {
            CustomerId      = request.CustomerId,
            StaffId         = CurrentUserId,
            DiscountPercent = request.DiscountPercent,
            ExpiresAt       = normalizedExpiresAt,
            Notes           = request.Notes?.Trim(),
            Status          = QuotationStatus.Draft,
            Items           = items
        };

        _context.Quotations.Add(quotation);
        await _context.SaveChangesAsync();

        var loaded = (await FindQuotation(quotation.Id))!;
        return CreatedAtAction(nameof(GetById), new { id = quotation.Id }, ToDto(loaded));
    }

    // GET /api/quotations  — Staff / Admin: all quotes
    [HttpGet]
    [Authorize(Roles = "Staff,Admin")]
    public async Task<IActionResult> GetAll()
    {
        var quotes = await _context.Quotations
            .Include(q => q.Customer)
            .Include(q => q.Staff)
            .Include(q => q.Items).ThenInclude(i => i.Variant).ThenInclude(v => v!.Product)
            .OrderByDescending(q => q.CreatedAt)
            .ToListAsync();

        return Ok(quotes.Select(ToDto));
    }

    // GET /api/quotations/my  — Customer: own quotes only
    [HttpGet("my")]
    [Authorize(Roles = "Customer")]
    public async Task<IActionResult> GetMy()
    {
        var uid = CurrentUserId;
        var quotes = await _context.Quotations
            .Include(q => q.Customer)
            .Include(q => q.Staff)
            .Include(q => q.Items).ThenInclude(i => i.Variant).ThenInclude(v => v!.Product)
            .Where(q => q.CustomerId == uid)
            .OrderByDescending(q => q.CreatedAt)
            .ToListAsync();

        return Ok(quotes.Select(ToDto));
    }

    // GET /api/quotations/{id}  — Staff/Admin or the owning Customer
    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var quotation = await FindQuotation(id);
        if (quotation == null) return NotFound(new MessageResponse { Message = "Quotation not found." });

        // Customers can only see their own quotations
        if (CurrentRole == "Customer" && quotation.CustomerId != CurrentUserId)
            return Forbid();

        return Ok(ToDto(quotation));
    }

    // PUT /api/quotations/{id}  — Staff / Admin: edit a draft
    [HttpPut("{id:int}")]
    [Authorize(Roles = "Staff,Admin")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateQuotationRequest request)
    {
        var quotation = await FindQuotation(id);
        if (quotation == null) return NotFound(new MessageResponse { Message = "Quotation not found." });

        if (quotation.Status != QuotationStatus.Draft)
            return BadRequest(new MessageResponse { Message = "Only Draft quotations can be edited." });

        // Discount ceiling
        if (request.DiscountPercent.HasValue)
        {
            var maxStaffDiscount = await GetMaxStaffDiscountAsync();
            if (CurrentRole == "Staff" && request.DiscountPercent.Value > maxStaffDiscount)
                return BadRequest(new MessageResponse
                {
                    Message = $"Staff members may not apply a discount greater than {maxStaffDiscount}%."
                });
            quotation.DiscountPercent = request.DiscountPercent.Value;
        }

        if (request.ExpiresAt.HasValue)
        {
            var normalized = NormalizeUtc(request.ExpiresAt.Value);
            if (normalized <= DateTime.UtcNow)
                return BadRequest(new MessageResponse { Message = "ExpiresAt must be in the future." });
            quotation.ExpiresAt = normalized;
        }

        if (request.Notes != null)
            quotation.Notes = request.Notes.Trim();

        if (request.Items != null || request.Bundles != null)
        {
            var newItems = await BuildItems(request.Items, request.Bundles);
            if (newItems == null) return ValidationProblem(ModelState);
            _context.QuotationItems.RemoveRange(quotation.Items);
            foreach (var item in newItems) item.QuotationId = quotation.Id;
            _context.QuotationItems.AddRange(newItems);
            quotation.Items = newItems;
        }

        quotation.UpdatedAt = DateTime.UtcNow;
        quotation.StaffId   = CurrentUserId;
        await _context.SaveChangesAsync();

        var loaded = (await FindQuotation(id))!;
        return Ok(ToDto(loaded));
    }

    // POST /api/quotations/{id}/send  — Staff / Admin: mark as Sent
    [HttpPost("{id:int}/send")]
    [Authorize(Roles = "Staff,Admin")]
    public async Task<IActionResult> Send(
        int id,
        [FromBody(EmptyBodyBehavior = EmptyBodyBehavior.Allow)] SendQuotationRequest? request = null)
    {
        var quotation = await FindQuotation(id);
        if (quotation == null) return NotFound(new MessageResponse { Message = "Quotation not found." });

        if (quotation.Status != QuotationStatus.Draft)
            return BadRequest(new MessageResponse { Message = "Only Draft quotations can be sent." });

        if (!quotation.Items.Any())
            return BadRequest(new MessageResponse { Message = "Cannot send an empty quotation." });

        var now = DateTime.UtcNow;
        DateTime resolvedExpiresAt;
        if (request?.ExpiresAt.HasValue == true)
        {
            resolvedExpiresAt = NormalizeUtc(request.ExpiresAt.Value);
            if (resolvedExpiresAt <= now)
                return BadRequest(new MessageResponse { Message = "ExpiresAt must be in the future." });
        }
        else if (request?.ValidDays.HasValue == true)
        {
            resolvedExpiresAt = now.AddDays(request.ValidDays.Value);
        }
        else if (quotation.ExpiresAt.HasValue)
        {
            if (quotation.ExpiresAt.Value <= now)
                return BadRequest(new MessageResponse { Message = "Quotation expiration date has already passed. Set a future ExpiresAt before sending." });
            resolvedExpiresAt = quotation.ExpiresAt.Value;
        }
        else
        {
            var defaultDays = await GetDefaultValidityDaysAsync();
            resolvedExpiresAt = now.AddDays(defaultDays);
        }

        quotation.Status    = QuotationStatus.Sent;
        quotation.SentAt    = now;
        quotation.ExpiresAt = resolvedExpiresAt;
        quotation.UpdatedAt = now;
        quotation.StaffId ??= CurrentUserId;

        await _context.SaveChangesAsync();
        return Ok(ToDto(quotation));
    }

    // POST /api/quotations/{id}/accept  — Customer responds
    [HttpPost("{id:int}/accept")]
    [Authorize(Roles = "Customer")]
    public async Task<IActionResult> Accept(int id, [FromBody] RespondQuotationRequest? body)
    {
        var quotation = await FindQuotation(id);
        if (quotation == null) return NotFound(new MessageResponse { Message = "Quotation not found." });

        if (quotation.CustomerId != CurrentUserId)
            return Forbid();

        if (quotation.Status != QuotationStatus.Sent)
            return BadRequest(new MessageResponse { Message = "Only Sent quotations can be accepted." });

        if (quotation.IsExpired)
            return BadRequest(new MessageResponse { Message = "This quotation has expired and can no longer be accepted." });

        quotation.Status      = QuotationStatus.Accepted;
        quotation.RespondedAt = DateTime.UtcNow;
        quotation.UpdatedAt   = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return Ok(ToDto(quotation));
    }

    // POST /api/quotations/{id}/decline  — Customer declines
    [HttpPost("{id:int}/decline")]
    [Authorize(Roles = "Customer")]
    public async Task<IActionResult> Decline(int id, [FromBody] RespondQuotationRequest? body)
    {
        var quotation = await FindQuotation(id);
        if (quotation == null) return NotFound(new MessageResponse { Message = "Quotation not found." });

        if (quotation.CustomerId != CurrentUserId)
            return Forbid();

        if (quotation.Status != QuotationStatus.Sent)
            return BadRequest(new MessageResponse { Message = "Only Sent quotations can be declined." });

        if (quotation.IsExpired)
            return BadRequest(new MessageResponse { Message = "This quotation has expired and can no longer be declined." });

        quotation.Status        = QuotationStatus.Declined;
        quotation.DeclineReason = body?.Reason?.Trim();
        quotation.RespondedAt   = DateTime.UtcNow;
        quotation.UpdatedAt     = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return Ok(ToDto(quotation));
    }

    // POST /api/quotations/{id}/convert  — Staff / Admin: convert Accepted quote to SalesOrder
    [HttpPost("{id:int}/convert")]
    [Authorize(Roles = "Staff,Admin")]
    public async Task<IActionResult> Convert(int id)
    {
        var quotation = await FindQuotation(id);
        if (quotation == null) return NotFound(new MessageResponse { Message = "Quotation not found." });

        if (quotation.Status != QuotationStatus.Accepted)
            return BadRequest(new MessageResponse { Message = "Only Accepted quotations can be converted." });

        // Guard: prevent double conversion
        var alreadyConverted = await _context.SalesOrders.AnyAsync(o => o.QuotationId == id);
        if (alreadyConverted)
            return Conflict(new MessageResponse { Message = "This quotation has already been converted to a sales order." });

        // Validate variant existence & stock for all quoted items before mutating state
        foreach (var group in quotation.Items.GroupBy(i => i.VariantId))
        {
            var variant = group.First().Variant;
            var requiredQty = group.Sum(i => i.Quantity);
            if (variant == null)
                return BadRequest(new MessageResponse { Message = $"Variant {group.Key} not found." });
            if (variant.Stock < requiredQty)
                return BadRequest(new MessageResponse
                {
                    Message = $"Insufficient stock for SKU '{variant.Sku}'. Available: {variant.Stock}, required: {requiredQty}."
                });
        }

        var order = new SalesOrder
        {
            QuotationId     = quotation.Id,
            CustomerId      = quotation.CustomerId,
            CustomerName    = !string.IsNullOrWhiteSpace(quotation.Customer?.FullName)
                ? quotation.Customer.FullName
                : (quotation.Customer?.Username ?? string.Empty),
            StaffId         = CurrentUserId,
            Channel         = OrderChannel.Online,
            Status          = OrderStatus.Pending,
            PaymentMethod   = "Cash on Delivery",
            ShippingAddress = quotation.Customer?.Address,
            Notes           = quotation.Notes,
            DiscountPercent = quotation.DiscountPercent,
            Subtotal        = quotation.Subtotal,
            DiscountAmount  = quotation.DiscountAmount,
            Total           = quotation.Total,
            Items = quotation.Items.Select(i => new SalesOrderItem
            {
                VariantId  = i.VariantId,
                BundleId   = i.BundleId,
                BundleName = i.BundleName,
                Quantity   = i.Quantity,
                UnitPrice  = i.UnitPrice
            }).ToList()
        };

        var stockRunning = quotation.Items
            .GroupBy(i => i.VariantId)
            .ToDictionary(g => g.Key, g => g.First().Variant!.Stock);

        foreach (var item in quotation.Items)
            item.Variant!.Stock -= item.Quantity;

        foreach (var item in quotation.Items)
        {
            stockRunning[item.VariantId] -= item.Quantity;
            _context.StockMovements.Add(new StockMovement
            {
                VariantId      = item.VariantId,
                Type           = "StockOut",
                QuantityChange = -item.Quantity,
                StockAfter     = stockRunning[item.VariantId],
                Reason         = item.BundleName != null
                    ? $"Quotation #{quotation.Id} converted to SalesOrder (Bundle: {item.BundleName})"
                    : $"Quotation #{quotation.Id} converted to SalesOrder",
                UserId         = CurrentUserId
            });
        }

        quotation.Status    = QuotationStatus.Converted;
        quotation.UpdatedAt = DateTime.UtcNow;

        _context.SalesOrders.Add(order);
        await _context.SaveChangesAsync();

        // Reload customer name for the response
        await _context.Entry(order).Reference(o => o.Customer).LoadAsync();

        return Ok(new SalesOrderDto
        {
            Id           = order.Id,
            QuotationId  = order.QuotationId!.Value,
            CustomerId   = order.CustomerId!.Value,
            CustomerName = order.Customer?.FullName ?? order.Customer?.Username ?? string.Empty,
            Total        = order.Total,
            CreatedAt    = order.CreatedAt
        });
    }

    // GET /api/quotations/{id}/pdf  — Owner / Staff / Admin: printable version
    [HttpGet("{id:int}/pdf")]
    public async Task<IActionResult> Pdf(int id)
    {
        var quotation = await FindQuotation(id);
        if (quotation == null) return NotFound(new MessageResponse { Message = "Quotation not found." });

        // Customers can only retrieve their own quote's PDF
        if (CurrentRole == "Customer" && quotation.CustomerId != CurrentUserId)
            return Forbid();

        var dto = ToDto(quotation);
        var html = BuildPdfHtml(dto);

        // Return the HTML as an inline document; in production a headless renderer
        // (e.g. PuppeteerSharp, WkHtmlToPdf) would convert this to actual PDF bytes.
        return Content(html, "text/html", Encoding.UTF8);
    }

    // ── PDF builder (simple HTML template) ───────────────────────────────────

    private static string BuildPdfHtml(QuotationDto q)
    {
        var rows = new StringBuilder();
        foreach (var item in q.Items)
        {
            var bundleTag = !string.IsNullOrWhiteSpace(item.BundleName)
                ? $" ({WebUtility.HtmlEncode(item.BundleName)})"
                : "";
            rows.Append(
                $"<tr>" +
                $"<td>{WebUtility.HtmlEncode(item.ProductName)} – {WebUtility.HtmlEncode(item.Model)}{bundleTag}</td>" +
                $"<td>{WebUtility.HtmlEncode(item.Sku)}</td>" +
                $"<td style=\"text-align:right\">{item.Quantity}</td>" +
                $"<td style=\"text-align:right\">{item.UnitPrice:F2}</td>" +
                $"<td style=\"text-align:right\">{item.LineTotal:F2}</td>" +
                $"</tr>");
        }

        var sentRow    = q.SentAt.HasValue ? $"<p><span>Sent:</span> {q.SentAt:yyyy-MM-dd HH:mm} UTC</p>" : "";
        var expiresRow = q.ExpiresAt.HasValue
            ? $"<p><span>Valid Until:</span> {q.ExpiresAt:yyyy-MM-dd HH:mm} UTC{(q.IsExpired ? " (EXPIRED)" : "")}</p>"
            : "";
        var notesRow   = !string.IsNullOrWhiteSpace(q.Notes) ? $"<p><span>Notes:</span> {WebUtility.HtmlEncode(q.Notes)}</p>" : "";
        var staffName  = q.StaffName ?? "—";

        return "<!DOCTYPE html>" +
               "<html lang=\"en\"><head><meta charset=\"utf-8\"/>" +
               $"<title>Quotation #{q.Id}</title>" +
               "<style>" +
               "body{font-family:Arial,sans-serif;margin:40px;color:#222;}" +
               "h1{color:#1a56a0;}" +
               "table{width:100%;border-collapse:collapse;margin-top:20px;}" +
               "th,td{border:1px solid #ccc;padding:8px 12px;}" +
               "th{background:#f0f4fa;}" +
               ".totals td{font-weight:bold;}" +
               ".meta{margin-bottom:20px;}" +
               ".meta span{display:inline-block;min-width:140px;color:#555;}" +
               "</style></head><body>" +
               $"<h1>Quotation #{q.Id}</h1>" +
               "<div class=\"meta\">" +
               $"<p><span>Customer:</span> {WebUtility.HtmlEncode(q.CustomerName)}</p>" +
               $"<p><span>Handled by:</span> {WebUtility.HtmlEncode(staffName)}</p>" +
               $"<p><span>Status:</span> {WebUtility.HtmlEncode(q.Status)}</p>" +
               $"<p><span>Created:</span> {q.CreatedAt:yyyy-MM-dd HH:mm} UTC</p>" +
               sentRow + expiresRow + notesRow +
               "</div>" +
               "<table><thead><tr>" +
               "<th>Product / Model</th><th>SKU</th><th>Qty</th><th>Unit Price</th><th>Line Total</th>" +
               "</tr></thead><tbody>" +
               rows +
               "</tbody><tfoot class=\"totals\">" +
               $"<tr><td colspan=\"4\" style=\"text-align:right\">Subtotal</td><td style=\"text-align:right\">{q.Subtotal:F2}</td></tr>" +
               $"<tr><td colspan=\"4\" style=\"text-align:right\">Discount ({q.DiscountPercent}%)</td><td style=\"text-align:right\">-{q.DiscountAmount:F2}</td></tr>" +
               $"<tr><td colspan=\"4\" style=\"text-align:right\"><strong>Total</strong></td><td style=\"text-align:right\"><strong>{q.Total:F2}</strong></td></tr>" +
               "</tfoot></table></body></html>";
    }
}
