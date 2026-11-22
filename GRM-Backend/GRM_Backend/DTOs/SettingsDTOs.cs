using System.ComponentModel.DataAnnotations;

namespace GRM_Backend.DTOs;

public class BusinessSettingsDto
{
    public decimal MaxStaffDiscountPercent { get; set; }
    public int DefaultQuotationValidityDays { get; set; }
    public DateTime UpdatedAt { get; set; }
    public int? UpdatedByUserId { get; set; }
    public string? UpdatedByName { get; set; }
}

public class UpdateBusinessSettingsRequest
{
    [Range(0, 100)]
    public decimal? MaxStaffDiscountPercent { get; set; }

    [Range(1, 365)]
    public int? DefaultQuotationValidityDays { get; set; }
}
