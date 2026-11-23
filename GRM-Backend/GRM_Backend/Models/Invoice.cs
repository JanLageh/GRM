namespace GRM_Backend.Models;

/// <summary>Valid payment status values for an Invoice.</summary>
public static class InvoiceStatus
{
    public const string Unpaid        = "Unpaid";
    public const string PartiallyPaid = "Partially Paid";
    public const string Paid          = "Paid";
    public const string Voided        = "Voided";
}

public class Invoice
{
    public int Id { get; set; }
    public string InvoiceNumber { get; set; } = string.Empty;

    public int OrderId { get; set; }
    public SalesOrder? Order { get; set; }

    public int? CustomerId { get; set; }
    public User? Customer { get; set; }

    public string CustomerName { get; set; } = string.Empty;
    public string? BillingAddress { get; set; }

    public int IssuedByUserId { get; set; }
    public User? IssuedBy { get; set; }

    public string PaymentStatus { get; set; } = InvoiceStatus.Unpaid;
    public string? PaymentMethod { get; set; }

    public decimal Subtotal { get; set; }
    public decimal DiscountPercent { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal TotalAmount { get; set; }
    public decimal AmountPaid { get; set; } = 0m;

    public string? Notes { get; set; }

    public DateTime IssuedAt { get; set; } = DateTime.UtcNow;
    public DateTime? DueDate { get; set; }
    public DateTime? PaidAt { get; set; }
    public DateTime? UpdatedAt { get; set; }

    public bool IsVoided { get; set; } = false;
    public DateTime? VoidedAt { get; set; }
    public int? VoidedByUserId { get; set; }
    public User? VoidedBy { get; set; }
    public string? VoidReason { get; set; }

    public List<InvoiceItem> Items { get; set; } = new();
}

public class InvoiceItem
{
    public int Id { get; set; }

    public int InvoiceId { get; set; }
    public Invoice? Invoice { get; set; }

    public int VariantId { get; set; }
    public ProductVariant? Variant { get; set; }

    public string Sku { get; set; } = string.Empty;
    public string ProductName { get; set; } = string.Empty;
    public string Model { get; set; } = string.Empty;
    public string? BundleName { get; set; }

    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }

    public decimal LineTotal => UnitPrice * Quantity;
}
