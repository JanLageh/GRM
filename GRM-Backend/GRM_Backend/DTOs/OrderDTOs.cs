using System.ComponentModel.DataAnnotations;

namespace GRM_Backend.DTOs;

// ── Request bodies ────────────────────────────────────────────────────────────

/// <summary>POST /api/orders  (Customer cart checkout)</summary>
public class CheckoutOrderRequest
{
    [StringLength(100)]
    public string? PaymentMethod { get; set; }

    [StringLength(500)]
    public string? ShippingAddress { get; set; }

    [StringLength(1000)]
    public string? Notes { get; set; }
}

public class OrderItemRequest
{
    [Required]
    public int VariantId { get; set; }

    [Range(1, int.MaxValue)]
    public int Quantity { get; set; }
}

/// <summary>POST /api/orders/walk-in  (Staff / Admin)</summary>
public class CreateWalkInOrderRequest
{
    public int? CustomerId { get; set; }

    [StringLength(200)]
    public string? CustomerName { get; set; }

    [Required, MinLength(1)]
    public List<OrderItemRequest> Items { get; set; } = new();

    [Range(0, 100)]
    public decimal DiscountPercent { get; set; } = 0m;

    [StringLength(100)]
    public string? PaymentMethod { get; set; }

    [StringLength(1000)]
    public string? Notes { get; set; }

    public string? Status { get; set; }
}

/// <summary>PATCH /api/orders/{id}/status  (Staff / Admin)</summary>
public class UpdateOrderStatusRequest
{
    [Required]
    public string Status { get; set; } = string.Empty;
}

/// <summary>POST /api/orders/{id}/cancel  (Customer Pending only / Admin)</summary>
public class CancelOrderRequest
{
    [StringLength(500)]
    public string? Reason { get; set; }
}

public class CorrectOrderItemRequest
{
    [Required]
    public int VariantId { get; set; }

    [Range(1, int.MaxValue)]
    public int Quantity { get; set; }

    [Range(0, 100000000)]
    public decimal? UnitPrice { get; set; }
}

/// <summary>PUT /api/orders/{id}/correction  (Admin)</summary>
public class CorrectOrderRequest
{
    [Required, MinLength(1), StringLength(500)]
    public string Reason { get; set; } = string.Empty;

    public List<CorrectOrderItemRequest>? Items { get; set; }

    [Range(0, 100)]
    public decimal? DiscountPercent { get; set; }

    [StringLength(200)]
    public string? CustomerName { get; set; }

    [StringLength(100)]
    public string? PaymentMethod { get; set; }

    [StringLength(500)]
    public string? ShippingAddress { get; set; }

    [StringLength(1000)]
    public string? Notes { get; set; }
}

// ── Response DTOs ─────────────────────────────────────────────────────────────

public class OrderItemDto
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

public class OrderCorrectionDto
{
    public int Id { get; set; }
    public int CorrectedByUserId { get; set; }
    public string CorrectedByName { get; set; } = string.Empty;
    public string Reason { get; set; } = string.Empty;
    public decimal PreviousTotal { get; set; }
    public decimal NewTotal { get; set; }
    public DateTime CorrectedAt { get; set; }
}

public class OrderDto
{
    public int Id { get; set; }
    public int? QuotationId { get; set; }
    public int? CustomerId { get; set; }
    public string CustomerName { get; set; } = string.Empty;
    public int? StaffId { get; set; }
    public string? StaffName { get; set; }
    public string Channel { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string? PaymentMethod { get; set; }
    public string? ShippingAddress { get; set; }
    public string? Notes { get; set; }
    public decimal DiscountPercent { get; set; }
    public decimal Subtotal { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal Total { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public DateTime? CancelledAt { get; set; }
    public string? CancelReason { get; set; }
    public bool IsCorrected { get; set; }
    public DateTime? CorrectedAt { get; set; }
    public int? CorrectedByUserId { get; set; }
    public string? CorrectedByName { get; set; }
    public string? CorrectionReason { get; set; }
    public List<OrderItemDto> Items { get; set; } = new();
    public List<OrderCorrectionDto> Corrections { get; set; } = new();
}
