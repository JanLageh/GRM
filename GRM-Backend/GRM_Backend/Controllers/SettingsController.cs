using System.Security.Claims;
using GRM_Backend.Data;
using GRM_Backend.DTOs;
using GRM_Backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace GRM_Backend.Controllers;

[ApiController]
[Route("api/settings")]
[Authorize]
public class SettingsController : ControllerBase
{
    private readonly AppDbContext _context;

    public SettingsController(AppDbContext context)
    {
        _context = context;
    }

    private int CurrentUserId =>
        int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    private static BusinessSettingsDto ToDto(BusinessSettings s) => new()
    {
        MaxStaffDiscountPercent = s.MaxStaffDiscountPercent,
        DefaultQuotationValidityDays = s.DefaultQuotationValidityDays,
        UpdatedAt = s.UpdatedAt,
        UpdatedByUserId = s.UpdatedByUserId,
        UpdatedByName = s.UpdatedBy?.FullName ?? s.UpdatedBy?.Username
    };

    private async Task<BusinessSettings> GetOrCreateSettingsAsync()
    {
        var settings = await _context.BusinessSettings
            .Include(s => s.UpdatedBy)
            .OrderBy(s => s.Id)
            .FirstOrDefaultAsync();

        if (settings != null)
            return settings;

        settings = new BusinessSettings
        {
            MaxStaffDiscountPercent = 15m,
            DefaultQuotationValidityDays = 7,
            UpdatedAt = DateTime.UtcNow
        };
        _context.BusinessSettings.Add(settings);
        await _context.SaveChangesAsync();
        return settings;
    }

    // GET /api/settings  — Staff / Admin: view quotation discount ceiling & validity defaults
    [HttpGet]
    [Authorize(Roles = "Staff,Admin")]
    [ProducesResponseType(typeof(BusinessSettingsDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> Get()
    {
        var settings = await GetOrCreateSettingsAsync();
        return Ok(ToDto(settings));
    }

    // PUT /api/settings  — Admin: update staff discount limit and quotation validity days
    [HttpPut]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(BusinessSettingsDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(MessageResponse), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Update([FromBody] UpdateBusinessSettingsRequest request)
    {
        if (!request.MaxStaffDiscountPercent.HasValue && !request.DefaultQuotationValidityDays.HasValue)
            return BadRequest(new MessageResponse
            {
                Message = "Provide at least MaxStaffDiscountPercent or DefaultQuotationValidityDays."
            });

        var settings = await GetOrCreateSettingsAsync();

        if (request.MaxStaffDiscountPercent.HasValue)
            settings.MaxStaffDiscountPercent = request.MaxStaffDiscountPercent.Value;

        if (request.DefaultQuotationValidityDays.HasValue)
            settings.DefaultQuotationValidityDays = request.DefaultQuotationValidityDays.Value;

        settings.UpdatedAt = DateTime.UtcNow;
        settings.UpdatedByUserId = CurrentUserId;

        await _context.SaveChangesAsync();
        await _context.Entry(settings).Reference(s => s.UpdatedBy).LoadAsync();

        return Ok(ToDto(settings));
    }
}
