using System.ComponentModel.DataAnnotations;

namespace GRM_Backend.DTOs;

// ── Request bodies ────────────────────────────────────────────────────────────

/// <summary>POST /api/orders/{id}/invoice  (Staff / Admin)</summary>
public class GenerateInvoiceRequest
{
    [StringLength(100)]
    public string? PaymentMethod { get; set; }

    public string? PaymentStatus { get; set; }

    [Range(0, 100000000)]
    public decimal? AmountPaid { get; set; }

    public DateTime? DueDate { get; set; }

    [StringLength(1000)]
    public string? Notes { get; set; }
}

/// <summary>PATCH /api/invoices/{id}/payment-status  (Staff / Admin)</summary>
public class UpdateInvoicePaymentStatusRequest
{
    [Required]
    public string PaymentStatus { get; set; } = string.Empty;

    [Range(0, 100000000)]
    public decimal? AmountPaid { get; set; }

    [StringLength(100)]
    public string? PaymentMethod { get; set; }

    [StringLength(1000)]
    public string? Notes { get; set; }
}

/// <summary>POST /api/invoices/{id}/void  (Admin)</summary>
public class VoidInvoiceRequest
{
    [Required, MinLength(1), StringLength(500)]
    public string Reason { get; set; } = string.Empty;
}

// ── Response DTOs ─────────────────────────────────────────────────────────────

public class InvoiceItemDto
{
    public int Id { get; set; }
    public int VariantId { get; set; }
    public string Sku { get; set; } = string.Empty;
    public string ProductName { get; set; } = string.Empty;
    public string Model { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal LineTotal { get; set; }
}

public class InvoiceDto
{
    public int Id { get; set; }
    public string InvoiceNumber { get; set; } = string.Empty;
    public int OrderId { get; set; }
    public string OrderChannel { get; set; } = string.Empty;
    public string OrderStatus { get; set; } = string.Empty;
    public int? CustomerId { get; set; }
    public string CustomerName { get; set; } = string.Empty;
    public string? BillingAddress { get; set; }
    public int IssuedByUserId { get; set; }
    public string IssuedByName { get; set; } = string.Empty;
    public string PaymentStatus { get; set; } = string.Empty;
    public string? PaymentMethod { get; set; }
    public decimal Subtotal { get; set; }
    public decimal DiscountPercent { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal TotalAmount { get; set; }
    public decimal AmountPaid { get; set; }
    public decimal BalanceDue { get; set; }
    public string? Notes { get; set; }
    public DateTime IssuedAt { get; set; }
    public DateTime? DueDate { get; set; }
    public DateTime? PaidAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public bool IsVoided { get; set; }
    public DateTime? VoidedAt { get; set; }
    public int? VoidedByUserId { get; set; }
    public string? VoidedByName { get; set; }
    public string? VoidReason { get; set; }
    public List<InvoiceItemDto> Items { get; set; } = new();
}
