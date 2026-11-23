using System.ComponentModel.DataAnnotations;

namespace GRM_Backend.DTOs;

// ── Suppliers ────────────────────────────────────────────────────────────────

public class SupplierRequest
{
    [Required, StringLength(200)]
    public string Name { get; set; } = string.Empty;

    [StringLength(200)]
    public string? ContactPerson { get; set; }

    [StringLength(50)]
    public string? Phone { get; set; }

    [EmailAddress, StringLength(200)]
    public string? Email { get; set; }

    [StringLength(500)]
    public string? Address { get; set; }

    public bool IsActive { get; set; } = true;
}

public class SupplierDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? ContactPerson { get; set; }
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? Address { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

// ── Requisitions ─────────────────────────────────────────────────────────────

public class CreateRequisitionRequest
{
    [Required]
    public int VariantId { get; set; }

    [Range(1, int.MaxValue)]
    public int Quantity { get; set; }

    [Required, MinLength(1), StringLength(500)]
    public string Reason { get; set; } = string.Empty;
}

public class ReviewRequisitionRequest
{
    [StringLength(500)]
    public string? Reason { get; set; }

    [StringLength(500)]
    public string? Notes { get; set; }

    public int? SupplierId { get; set; }

    public bool CreatePurchaseOrder { get; set; } = false;
}

public class RequisitionDto
{
    public int Id { get; set; }
    public int VariantId { get; set; }
    public string Sku { get; set; } = string.Empty;
    public string ProductName { get; set; } = string.Empty;
    public string Model { get; set; } = string.Empty;
    public int CurrentStock { get; set; }
    public int Quantity { get; set; }
    public string Reason { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public int RequestedByUserId { get; set; }
    public string RequestedByName { get; set; } = string.Empty;
    public int? ReviewedByUserId { get; set; }
    public string? ReviewedByName { get; set; }
    public string? ReviewNotes { get; set; }
    public DateTime? ReviewedAt { get; set; }
    public int? PurchaseOrderId { get; set; }
    public string? PoNumber { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

// ── Reorder ──────────────────────────────────────────────────────────────────

public class UpdateReorderSettingsRequest
{
    [Range(0, int.MaxValue)]
    public int? ReorderThreshold { get; set; }

    [Range(1, int.MaxValue)]
    public int? DefaultReorderQuantity { get; set; }

    public bool ClearDefaultReorderQuantity { get; set; } = false;

    [Range(1, 365)]
    public int? LeadTimeDays { get; set; }

    [Range(0, 100000)]
    public int? SafetyStock { get; set; }

    public bool? UseDynamicThreshold { get; set; }
}

public class ReorderSettingsDto
{
    public int VariantId { get; set; }
    public string Sku { get; set; } = string.Empty;
    public string ProductName { get; set; } = string.Empty;
    public string Model { get; set; } = string.Empty;
    public int Stock { get; set; }
    public int ReorderThreshold { get; set; }
    public int? DefaultReorderQuantity { get; set; }
    public int LeadTimeDays { get; set; }
    public int SafetyStock { get; set; }
    public bool UseDynamicThreshold { get; set; }
    public decimal SalesVelocity { get; set; }
    public DateTime? LastReorderCalculatedAt { get; set; }
}

public class ReorderSuggestionDto
{
    public int VariantId { get; set; }
    public int ProductId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public string Model { get; set; } = string.Empty;
    public string Sku { get; set; } = string.Empty;
    public int CurrentStock { get; set; }
    public int ReorderThreshold { get; set; }
    public int ComputedThreshold { get; set; }
    public int EffectiveThreshold { get; set; }
    public int? DefaultReorderQuantity { get; set; }
    public int LeadTimeDays { get; set; }
    public int SafetyStock { get; set; }
    public bool UseDynamicThreshold { get; set; }
    public int UnitsSoldInWindow { get; set; }
    public int LookbackDays { get; set; }
    public decimal DailySalesVelocity { get; set; }
    public bool NeedsReorder { get; set; }
    public int SuggestedQuantity { get; set; }
    public int OpenPurchaseOrderQuantity { get; set; }
    public bool HasOpenPurchaseOrder { get; set; }
    public DateTime? LastCalculatedAt { get; set; }
}

public class RecalculateReorderRequest
{
    [Range(1, 365)]
    public int LookbackDays { get; set; } = 7;

    public bool GenerateDraftPurchaseOrders { get; set; } = true;
}

public class RecalculateReorderResponse
{
    public DateTime CalculatedAt { get; set; }
    public int LookbackDays { get; set; }
    public int VariantsEvaluated { get; set; }
    public int LowStockCount { get; set; }
    public int DraftPurchaseOrdersCreated { get; set; }
    public List<int> CreatedPurchaseOrderIds { get; set; } = new();
    public List<ReorderSuggestionDto> Suggestions { get; set; } = new();
}

// ── Purchase Orders ──────────────────────────────────────────────────────────

public class PurchaseOrderItemRequest
{
    [Required]
    public int VariantId { get; set; }

    [Range(1, int.MaxValue)]
    public int QuantityOrdered { get; set; }

    [Range(0, 100000000)]
    public decimal? UnitCost { get; set; }
}

public class CreatePurchaseOrderRequest
{
    public int? RequisitionId { get; set; }

    public int? SupplierId { get; set; }

    public List<PurchaseOrderItemRequest>? Items { get; set; }

    [StringLength(1000)]
    public string? Notes { get; set; }

    public string? Status { get; set; }
}

public class UpdatePurchaseOrderRequest
{
    public int? SupplierId { get; set; }

    public bool ClearSupplier { get; set; } = false;

    public List<PurchaseOrderItemRequest>? Items { get; set; }

    [StringLength(1000)]
    public string? Notes { get; set; }
}

public class ApprovePurchaseOrderRequest
{
    public int? SupplierId { get; set; }

    [StringLength(1000)]
    public string? Notes { get; set; }
}

public class ReceivePurchaseOrderItemRequest
{
    [Required]
    public int VariantId { get; set; }

    [Range(1, int.MaxValue)]
    public int QuantityReceived { get; set; }
}

public class ReceivePurchaseOrderRequest
{
    [Required, MinLength(1)]
    public List<ReceivePurchaseOrderItemRequest> Items { get; set; } = new();

    [StringLength(500)]
    public string? Notes { get; set; }
}

public class PurchaseOrderItemDto
{
    public int Id { get; set; }
    public int VariantId { get; set; }
    public string Sku { get; set; } = string.Empty;
    public string ProductName { get; set; } = string.Empty;
    public string Model { get; set; } = string.Empty;
    public int CurrentStock { get; set; }
    public int QuantityOrdered { get; set; }
    public int QuantityReceived { get; set; }
    public int QuantityRemaining { get; set; }
    public decimal UnitCost { get; set; }
    public decimal LineTotal { get; set; }
}

public class PurchaseOrderDto
{
    public int Id { get; set; }
    public string PoNumber { get; set; } = string.Empty;
    public int? SupplierId { get; set; }
    public string? SupplierName { get; set; }
    public string? SupplierContact { get; set; }
    public string? SupplierPhone { get; set; }
    public int? RequisitionId { get; set; }
    public string Status { get; set; } = string.Empty;
    public string Source { get; set; } = string.Empty;
    public string? Notes { get; set; }
    public int? CreatedByUserId { get; set; }
    public string? CreatedByName { get; set; }
    public int? ApprovedByUserId { get; set; }
    public string? ApprovedByName { get; set; }
    public DateTime? ApprovedAt { get; set; }
    public DateTime? SentAt { get; set; }
    public DateTime? ReceivedAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public int TotalQuantityOrdered { get; set; }
    public int TotalQuantityReceived { get; set; }
    public decimal TotalCost { get; set; }
    public List<PurchaseOrderItemDto> Items { get; set; } = new();
}
