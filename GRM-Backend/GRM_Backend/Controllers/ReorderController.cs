using System.Security.Claims;
using GRM_Backend.Data;
using GRM_Backend.DTOs;
using GRM_Backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.EntityFrameworkCore;

namespace GRM_Backend.Controllers;

[ApiController]
[Route("api/reorder")]
[Authorize(Roles = "Admin")]
public class ReorderController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IReorderService _reorderService;

    public ReorderController(AppDbContext context, IReorderService reorderService)
    {
        _context = context;
        _reorderService = reorderService;
    }

    private int? CurrentUserId =>
        int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var uid) ? uid : null;

    // GET /api/reorder/suggestions  — Admin: suggested reorder quantities from sales velocity
    [HttpGet("suggestions")]
    [ProducesResponseType(typeof(List<ReorderSuggestionDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(MessageResponse), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Suggestions([FromQuery] int lookbackDays = 7, [FromQuery] bool includeAll = false)
    {
        if (lookbackDays is < 1 or > 365)
            return BadRequest(new MessageResponse { Message = "LookbackDays must be between 1 and 365." });

        var suggestions = await _reorderService.GetSuggestionsAsync(lookbackDays, includeAll);
        return Ok(suggestions);
    }

    // PUT /api/reorder/settings/{variantId}  — Admin: set threshold or default level
    [HttpPut("settings/{variantId:int}")]
    [ProducesResponseType(typeof(ReorderSettingsDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateSettings(int variantId, [FromBody] UpdateReorderSettingsRequest request)
    {
        var variant = await _context.Variants
            .Include(v => v.Product)
            .FirstOrDefaultAsync(v => v.Id == variantId);

        if (variant == null)
            return NotFound(new MessageResponse { Message = "Variant not found." });

        if (request.ReorderThreshold.HasValue)
        {
            variant.ReorderThreshold = request.ReorderThreshold.Value;
            if (!request.UseDynamicThreshold.HasValue)
                variant.UseDynamicThreshold = false;
        }

        if (request.UseDynamicThreshold.HasValue)
            variant.UseDynamicThreshold = request.UseDynamicThreshold.Value;

        if (request.ClearDefaultReorderQuantity)
            variant.DefaultReorderQuantity = null;
        else if (request.DefaultReorderQuantity.HasValue)
            variant.DefaultReorderQuantity = request.DefaultReorderQuantity.Value;

        if (request.LeadTimeDays.HasValue)
            variant.LeadTimeDays = request.LeadTimeDays.Value;

        if (request.SafetyStock.HasValue)
            variant.SafetyStock = request.SafetyStock.Value;

        await _context.SaveChangesAsync();

        return Ok(new ReorderSettingsDto
        {
            VariantId = variant.Id,
            Sku = variant.Sku,
            ProductName = variant.Product?.Name ?? string.Empty,
            Model = variant.Model,
            Stock = variant.Stock,
            ReorderThreshold = variant.ReorderThreshold,
            DefaultReorderQuantity = variant.DefaultReorderQuantity,
            LeadTimeDays = variant.LeadTimeDays,
            SafetyStock = variant.SafetyStock,
            UseDynamicThreshold = variant.UseDynamicThreshold,
            SalesVelocity = variant.SalesVelocity,
            LastReorderCalculatedAt = variant.LastReorderCalculatedAt
        });
    }

    // POST /api/reorder/recalculate  — Admin: recompute velocity/thresholds & auto-draft POs on demand
    [HttpPost("recalculate")]
    [ProducesResponseType(typeof(RecalculateReorderResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> Recalculate(
        [FromBody(EmptyBodyBehavior = EmptyBodyBehavior.Allow)] RecalculateReorderRequest? request = null)
    {
        var lookbackDays = request?.LookbackDays ?? 7;
        var generateDrafts = request?.GenerateDraftPurchaseOrders ?? true;

        var result = await _reorderService.RecalculateAsync(lookbackDays, generateDrafts, CurrentUserId);
        return Ok(result);
    }
}
