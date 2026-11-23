namespace GRM_Backend.Models;

/// <summary>Singleton business configuration managed by Admin.</summary>
public class BusinessSettings
{
    public int Id { get; set; }

    /// <summary>Maximum discount percentage (0–100) Staff members may grant on quotations and walk-in orders.</summary>
    public decimal MaxStaffDiscountPercent { get; set; } = 15m;

    /// <summary>Default number of days a newly sent quotation remains valid.</summary>
    public int DefaultQuotationValidityDays { get; set; } = 7;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public int? UpdatedByUserId { get; set; }
    public User? UpdatedBy { get; set; }
}
