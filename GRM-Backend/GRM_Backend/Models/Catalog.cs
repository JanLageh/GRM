namespace GRM_Backend.Models;

public class Product
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Category { get; set; } = string.Empty;
    public string? ImageUrl { get; set; }
    public bool IsFeatured { get; set; } = false;
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
    public List<ProductVariant> Variants { get; set; } = new();
}

public class ProductVariant
{
    public int Id { get; set; }
    public int ProductId { get; set; }
    public Product? Product { get; set; }
    public string Model { get; set; } = string.Empty;
    public string Sku { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public int Stock { get; set; }
    public string? ImageUrl { get; set; }
    public int ReorderThreshold { get; set; } = 5;
    public int? DefaultReorderQuantity { get; set; }
    public int LeadTimeDays { get; set; } = 7;
    public int SafetyStock { get; set; } = 2;
    public bool UseDynamicThreshold { get; set; } = true;
    public decimal SalesVelocity { get; set; } = 0m;
    public DateTime? LastReorderCalculatedAt { get; set; }
}

public class StockMovement
{
    public int Id { get; set; }
    public int VariantId { get; set; }
    public ProductVariant? Variant { get; set; }
    public string Type { get; set; } = string.Empty; // StockIn, StockOut, Adjustment
    public int QuantityChange { get; set; }
    public int StockAfter { get; set; }
    public string? Reason { get; set; }
    public int? UserId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class Bundle
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public decimal Price { get; set; }
    public string? ImageUrl { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
    public List<BundleItem> Items { get; set; } = new();
}

public class BundleItem
{
    public int Id { get; set; }
    public int BundleId { get; set; }
    public int VariantId { get; set; }
    public ProductVariant? Variant { get; set; }
    public int Quantity { get; set; } = 1;
}
