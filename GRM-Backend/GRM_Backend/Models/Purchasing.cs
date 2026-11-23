namespace GRM_Backend.Models;

/// <summary>Valid status values for a PurchaseRequisition.</summary>
public static class RequisitionStatus
{
    public const string Pending  = "Pending";
    public const string Approved = "Approved";
    public const string Declined = "Declined";
}

/// <summary>Valid status values for a PurchaseOrder.</summary>
public static class PurchaseOrderStatus
{
    public const string Draft    = "Draft";
    public const string Approved = "Approved";
    public const string Sent     = "Sent";
    public const string Received = "Received";
}

/// <summary>Valid origin sources for a PurchaseOrder.</summary>
public static class PurchaseOrderSource
{
    public const string System      = "System";
    public const string Requisition = "Requisition";
    public const string Manual      = "Manual";
}

public class Supplier
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? ContactPerson { get; set; }
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? Address { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
}

public class PurchaseRequisition
{
    public int Id { get; set; }

    public int VariantId { get; set; }
    public ProductVariant? Variant { get; set; }

    public int Quantity { get; set; }
    public string Reason { get; set; } = string.Empty;
    public string Status { get; set; } = RequisitionStatus.Pending;

    public int RequestedByUserId { get; set; }
    public User? RequestedBy { get; set; }

    public int? ReviewedByUserId { get; set; }
    public User? ReviewedBy { get; set; }
    public string? ReviewNotes { get; set; }
    public DateTime? ReviewedAt { get; set; }

    public PurchaseOrder? PurchaseOrder { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
}

public class PurchaseOrder
{
    public int Id { get; set; }
    public string PoNumber { get; set; } = string.Empty;

    public int? SupplierId { get; set; }
    public Supplier? Supplier { get; set; }

    public int? RequisitionId { get; set; }
    public PurchaseRequisition? Requisition { get; set; }

    public string Status { get; set; } = PurchaseOrderStatus.Draft;
    public string Source { get; set; } = PurchaseOrderSource.Manual;
    public string? Notes { get; set; }

    public int? CreatedByUserId { get; set; }
    public User? CreatedBy { get; set; }

    public int? ApprovedByUserId { get; set; }
    public User? ApprovedBy { get; set; }
    public DateTime? ApprovedAt { get; set; }

    public DateTime? SentAt { get; set; }
    public DateTime? ReceivedAt { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    public List<PurchaseOrderItem> Items { get; set; } = new();
}

public class PurchaseOrderItem
{
    public int Id { get; set; }

    public int PurchaseOrderId { get; set; }
    public PurchaseOrder? PurchaseOrder { get; set; }

    public int VariantId { get; set; }
    public ProductVariant? Variant { get; set; }

    public int QuantityOrdered { get; set; }
    public int QuantityReceived { get; set; } = 0;
    public decimal UnitCost { get; set; }

    public decimal LineTotal => UnitCost * QuantityOrdered;
}
