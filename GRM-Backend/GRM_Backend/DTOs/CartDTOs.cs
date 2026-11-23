using System.ComponentModel.DataAnnotations;

namespace GRM_Backend.DTOs;

public class AddCartItemRequest
{
    [Required] public int VariantId { get; set; }
    [Range(1, int.MaxValue)] public int Quantity { get; set; }
}

public class UpdateCartItemRequest
{
    [Range(1, int.MaxValue)] public int Quantity { get; set; }
}

public class AddCartBundleRequest
{
    [Required] public int BundleId { get; set; }
    [Range(1, int.MaxValue)] public int Quantity { get; set; } = 1;
}

public class UpdateCartBundleRequest
{
    [Range(1, int.MaxValue)] public int Quantity { get; set; }
}

public class CartItemDto
{
    public int VariantId { get; set; }
    public int ProductId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public string Model { get; set; } = string.Empty;
    public string Sku { get; set; } = string.Empty;
    public string? ImageUrl { get; set; }
    public decimal UnitPrice { get; set; }
    public int Quantity { get; set; }
    public int Stock { get; set; }
    public decimal LineTotal { get; set; }
}

public class CartBundleItemDto
{
    public int BundleId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? ImageUrl { get; set; }
    public decimal UnitPrice { get; set; }
    public int Quantity { get; set; }
    public int AvailableStock { get; set; }
    public decimal LineTotal { get; set; }
    public List<BundleItemDto> Components { get; set; } = new();
}

public class CartDto
{
    public List<CartItemDto> Items { get; set; } = new();
    public List<CartBundleItemDto> Bundles { get; set; } = new();
    public int TotalQuantity { get; set; }
    public decimal Total { get; set; }
}
