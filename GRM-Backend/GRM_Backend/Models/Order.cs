namespace GRM_Backend.Models;

/// <summary>Valid status values for a SalesOrder.</summary>
public static class OrderStatus
{
    public const string Pending    = "Pending";
    public const string Processing = "Processing";
    public const string Completed  = "Completed";
    public const string Cancelled  = "Cancelled";
}

/// <summary>Valid sales channels for a SalesOrder.</summary>
public static class OrderChannel
{
    public const string Online = "Online";
    public const string WalkIn = "WalkIn";
}

public class SalesOrder
{
    public int Id { get; set; }

    public int? QuotationId { get; set; }
    public Quotation? Quotation { get; set; }

    public int? CustomerId { get; set; }
    public User? Customer { get; set; }

    public string CustomerName { get; set; } = string.Empty;

    public int? StaffId { get; set; }
    public User? Staff { get; set; }

    public string Channel { get; set; } = OrderChannel.Online;
    public string Status { get; set; } = OrderStatus.Pending;

    public string? PaymentMethod { get; set; }
    public string? ShippingAddress { get; set; }
    public string? Notes { get; set; }

    public decimal DiscountPercent { get; set; } = 0m;
    public decimal Subtotal { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal Total { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public DateTime? CancelledAt { get; set; }
    public string? CancelReason { get; set; }

    public bool IsCorrected { get; set; } = false;
    public DateTime? CorrectedAt { get; set; }
    public int? CorrectedByUserId { get; set; }
    public User? CorrectedBy { get; set; }
    public string? CorrectionReason { get; set; }

    public List<SalesOrderItem> Items { get; set; } = new();
    public List<OrderCorrection> Corrections { get; set; } = new();
}

public class SalesOrderItem
{
    public int Id { get; set; }

    public int SalesOrderId { get; set; }
    public SalesOrder? SalesOrder { get; set; }

    public int VariantId { get; set; }
    public ProductVariant? Variant { get; set; }

    public int? BundleId { get; set; }
    public Bundle? Bundle { get; set; }
    public string? BundleName { get; set; }

    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }

    public decimal LineTotal => UnitPrice * Quantity;
}

public class OrderCorrection
{
    public int Id { get; set; }

    public int SalesOrderId { get; set; }
    public SalesOrder? SalesOrder { get; set; }

    public int CorrectedByUserId { get; set; }
    public User? CorrectedBy { get; set; }

    public string Reason { get; set; } = string.Empty;
    public decimal PreviousTotal { get; set; }
    public decimal NewTotal { get; set; }
    public DateTime CorrectedAt { get; set; } = DateTime.UtcNow;
}
