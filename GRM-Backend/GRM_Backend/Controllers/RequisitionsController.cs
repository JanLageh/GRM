using System.Security.Claims;
using GRM_Backend.Data;
using GRM_Backend.DTOs;
using GRM_Backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.EntityFrameworkCore;

namespace GRM_Backend.Controllers;

[ApiController]
[Route("api/requisitions")]
[Authorize]
public class RequisitionsController : ControllerBase
{
    private readonly AppDbContext _context;

    public RequisitionsController(AppDbContext context)
    {
        _context = context;
    }

    private int CurrentUserId =>
        int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    private string CurrentRole =>
        User.FindFirstValue(ClaimTypes.Role) ?? string.Empty;

    private IQueryable<PurchaseRequisition> QueryWithDetails() =>
        _context.PurchaseRequisitions
            .Include(r => r.Variant).ThenInclude(v => v!.Product)
            .Include(r => r.RequestedBy)
            .Include(r => r.ReviewedBy)
            .Include(r => r.PurchaseOrder);

    private static RequisitionDto ToDto(PurchaseRequisition r) => new()
    {
        Id = r.Id,
        VariantId = r.VariantId,
        Sku = r.Variant?.Sku ?? string.Empty,
        ProductName = r.Variant?.Product?.Name ?? string.Empty,
        Model = r.Variant?.Model ?? string.Empty,
        CurrentStock = r.Variant?.Stock ?? 0,
        Quantity = r.Quantity,
        Reason = r.Reason,
        Status = r.Status,
        RequestedByUserId = r.RequestedByUserId,
        RequestedByName = r.RequestedBy?.FullName ?? r.RequestedBy?.Username ?? string.Empty,
        ReviewedByUserId = r.ReviewedByUserId,
        ReviewedByName = r.ReviewedBy?.FullName ?? r.ReviewedBy?.Username,
        ReviewNotes = r.ReviewNotes,
        ReviewedAt = r.ReviewedAt,
        PurchaseOrderId = r.PurchaseOrder?.Id,
        PoNumber = r.PurchaseOrder?.PoNumber,
        CreatedAt = r.CreatedAt,
        UpdatedAt = r.UpdatedAt
    };

    private static string? NormalizeStatus(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;
        return value.Trim().ToLowerInvariant() switch
        {
            "pending" => RequisitionStatus.Pending,
            "approved" => RequisitionStatus.Approved,
            "declined" => RequisitionStatus.Declined,
            _ => null
        };
    }

    // POST /api/requisitions  — Staff: submit a restock request
    [HttpPost]
    [Authorize(Roles = "Staff")]
    [ProducesResponseType(typeof(RequisitionDto), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(MessageResponse), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Create([FromBody] CreateRequisitionRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Reason))
            return BadRequest(new MessageResponse { Message = "A reason is required." });

        var variant = await _context.Variants
            .Include(v => v.Product)
            .FirstOrDefaultAsync(v => v.Id == request.VariantId);

        if (variant == null)
            return NotFound(new MessageResponse { Message = "Variant not found." });

        if (variant.Product is { IsActive: false })
            return BadRequest(new MessageResponse { Message = "Cannot submit a requisition for an inactive product." });

        var requisition = new PurchaseRequisition
        {
            VariantId = variant.Id,
            Quantity = request.Quantity,
            Reason = request.Reason.Trim(),
            Status = RequisitionStatus.Pending,
            RequestedByUserId = CurrentUserId
        };

        _context.PurchaseRequisitions.Add(requisition);
        await _context.SaveChangesAsync();

        var loaded = await QueryWithDetails().FirstAsync(r => r.Id == requisition.Id);
        return CreatedAtAction(nameof(GetById), new { id = requisition.Id }, ToDto(loaded));
    }

    // GET /api/requisitions  — Staff (own), Admin (all)
    [HttpGet]
    [Authorize(Roles = "Staff,Admin")]
    [ProducesResponseType(typeof(List<RequisitionDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> List([FromQuery] string? status)
    {
        var query = QueryWithDetails();

        if (CurrentRole == "Staff")
        {
            var uid = CurrentUserId;
            query = query.Where(r => r.RequestedByUserId == uid);
        }

        if (!string.IsNullOrWhiteSpace(status))
        {
            var s = (NormalizeStatus(status) ?? status.Trim()).ToLowerInvariant();
            query = query.Where(r => r.Status.ToLower() == s);
        }

        var list = await query
            .OrderByDescending(r => r.CreatedAt)
            .ThenByDescending(r => r.Id)
            .ToListAsync();

        return Ok(list.Select(ToDto).ToList());
    }

    // GET /api/requisitions/{id}  — Staff (own), Admin (any)
    [HttpGet("{id:int}")]
    [Authorize(Roles = "Staff,Admin")]
    [ProducesResponseType(typeof(RequisitionDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById(int id)
    {
        var req = await QueryWithDetails().FirstOrDefaultAsync(r => r.Id == id);
        if (req == null)
            return NotFound(new MessageResponse { Message = "Requisition not found." });

        if (CurrentRole == "Staff" && req.RequestedByUserId != CurrentUserId)
            return Forbid();

        return Ok(ToDto(req));
    }

    // POST /api/requisitions/{id}/approve  — Admin: approve a pending requisition
    [HttpPost("{id:int}/approve")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(RequisitionDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(MessageResponse), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Approve(
        int id,
        [FromBody(EmptyBodyBehavior = EmptyBodyBehavior.Allow)] ReviewRequisitionRequest? request = null)
    {
        var req = await QueryWithDetails().FirstOrDefaultAsync(r => r.Id == id);
        if (req == null)
            return NotFound(new MessageResponse { Message = "Requisition not found." });

        if (req.Status != RequisitionStatus.Pending)
            return BadRequest(new MessageResponse { Message = $"Requisition is already {req.Status}." });

        Supplier? supplier = null;
        if (request?.CreatePurchaseOrder == true && request.SupplierId.HasValue)
        {
            supplier = await _context.Suppliers.FindAsync(request.SupplierId.Value);
            if (supplier == null || !supplier.IsActive)
                return BadRequest(new MessageResponse { Message = "Supplier not found or inactive." });
        }

        var now = DateTime.UtcNow;
        req.Status = RequisitionStatus.Approved;
        req.ReviewedByUserId = CurrentUserId;
        req.ReviewedAt = now;
        req.ReviewNotes = (request?.Notes ?? request?.Reason)?.Trim();
        req.UpdatedAt = now;

        if (request?.CreatePurchaseOrder == true)
        {
            var hasExistingPo = req.PurchaseOrder != null ||
                                await _context.PurchaseOrders.AnyAsync(po => po.RequisitionId == req.Id);
            if (hasExistingPo)
                return Conflict(new MessageResponse { Message = "A purchase order already exists for this requisition." });

            var po = new PurchaseOrder
            {
                PoNumber = $"TMP-{Guid.NewGuid():N}",
                SupplierId = supplier?.Id,
                RequisitionId = req.Id,
                Status = supplier != null ? PurchaseOrderStatus.Approved : PurchaseOrderStatus.Draft,
                Source = PurchaseOrderSource.Requisition,
                Notes = $"From Requisition #{req.Id}: {req.Reason}",
                CreatedByUserId = CurrentUserId,
                ApprovedByUserId = supplier != null ? CurrentUserId : null,
                ApprovedAt = supplier != null ? now : null,
                CreatedAt = now,
                Items =
                {
                    new PurchaseOrderItem
                    {
                        VariantId = req.VariantId,
                        QuantityOrdered = req.Quantity,
                        QuantityReceived = 0,
                        UnitCost = req.Variant?.Price ?? 0m
                    }
                }
            };

            await using var tx = _context.Database.IsRelational()
                ? await _context.Database.BeginTransactionAsync()
                : null;

            _context.PurchaseOrders.Add(po);
            await _context.SaveChangesAsync();

            po.PoNumber = $"PO-{po.Id:D6}";
            await _context.SaveChangesAsync();

            if (tx != null) await tx.CommitAsync();
        }
        else
        {
            await _context.SaveChangesAsync();
        }

        var loaded = await QueryWithDetails().FirstAsync(r => r.Id == id);
        return Ok(ToDto(loaded));
    }

    // POST /api/requisitions/{id}/decline  — Admin: decline a pending requisition
    [HttpPost("{id:int}/decline")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(RequisitionDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(MessageResponse), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Decline(
        int id,
        [FromBody(EmptyBodyBehavior = EmptyBodyBehavior.Allow)] ReviewRequisitionRequest? request = null)
    {
        var req = await QueryWithDetails().FirstOrDefaultAsync(r => r.Id == id);
        if (req == null)
            return NotFound(new MessageResponse { Message = "Requisition not found." });

        if (req.Status != RequisitionStatus.Pending)
            return BadRequest(new MessageResponse { Message = $"Requisition is already {req.Status}." });

        var now = DateTime.UtcNow;
        req.Status = RequisitionStatus.Declined;
        req.ReviewedByUserId = CurrentUserId;
        req.ReviewedAt = now;
        req.ReviewNotes = (request?.Reason ?? request?.Notes)?.Trim();
        req.UpdatedAt = now;

        await _context.SaveChangesAsync();

        var loaded = await QueryWithDetails().FirstAsync(r => r.Id == id);
        return Ok(ToDto(loaded));
    }
}
