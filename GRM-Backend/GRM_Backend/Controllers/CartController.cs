using System.Security.Claims;
using GRM_Backend.Data;
using GRM_Backend.DTOs;
using GRM_Backend.Models;
using GRM_Backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace GRM_Backend.Controllers;

[ApiController]
[Route("api/cart")]
[Authorize(Roles = "Customer")]
public class CartController : ControllerBase
{
    private readonly AppDbContext _context;

    public CartController(AppDbContext context)
    {
        _context = context;
    }

    private int UserId => int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

    private async Task<CartDto> BuildCart()
    {
        var uid = UserId;
        var items = await _context.CartItems
            .Include(c => c.Variant).ThenInclude(v => v!.Product)
            .Where(c => c.UserId == uid)
            .OrderBy(c => c.Id)
            .ToListAsync();

        var bundleItems = await _context.CartBundleItems
            .Include(cb => cb.Bundle!).ThenInclude(b => b.Items).ThenInclude(i => i.Variant).ThenInclude(v => v!.Product)
            .Where(cb => cb.UserId == uid)
            .OrderBy(cb => cb.Id)
            .ToListAsync();

        var dto = new CartDto();
        foreach (var c in items)
        {
            var v = c.Variant!;
            dto.Items.Add(new CartItemDto
            {
                VariantId = v.Id,
                ProductId = v.ProductId,
                ProductName = v.Product?.Name ?? string.Empty,
                Model = v.Model,
                Sku = v.Sku,
                ImageUrl = v.ImageUrl ?? v.Product?.ImageUrl,
                UnitPrice = v.Price,
                Quantity = c.Quantity,
                Stock = v.Stock,
                LineTotal = v.Price * c.Quantity
            });
        }

        foreach (var cb in bundleItems)
        {
            var b = cb.Bundle;
            if (b == null) continue;
            dto.Bundles.Add(new CartBundleItemDto
            {
                BundleId = b.Id,
                Name = b.Name,
                Description = b.Description,
                ImageUrl = b.ImageUrl,
                UnitPrice = b.Price,
                Quantity = cb.Quantity,
                AvailableStock = BundlePricingHelper.GetAvailableStock(b),
                LineTotal = b.Price * cb.Quantity,
                Components = b.Items.OrderBy(i => i.Id).Select(i => new BundleItemDto
                {
                    VariantId = i.VariantId,
                    ProductName = i.Variant?.Product?.Name ?? string.Empty,
                    Sku = i.Variant?.Sku ?? string.Empty,
                    Model = i.Variant?.Model ?? string.Empty,
                    Quantity = i.Quantity,
                    Stock = i.Variant?.Stock ?? 0
                }).ToList()
            });
        }

        dto.TotalQuantity = dto.Items.Sum(i => i.Quantity) + dto.Bundles.Sum(b => b.Quantity);
        dto.Total = dto.Items.Sum(i => i.LineTotal) + dto.Bundles.Sum(b => b.LineTotal);
        return dto;
    }

    private async Task<string?> ValidateCombinedCartStockAsync(
        int uid,
        int? overrideVariantId = null,
        int? overrideVariantQty = null,
        int? overrideBundleId = null,
        int? overrideBundleQty = null,
        Bundle? preloadedOverrideBundle = null)
    {
        var requiredByVariant = new Dictionary<int, int>();

        var existingItems = await _context.CartItems.Where(c => c.UserId == uid).ToListAsync();
        foreach (var c in existingItems)
        {
            if (overrideVariantId.HasValue && c.VariantId == overrideVariantId.Value) continue;
            requiredByVariant[c.VariantId] = requiredByVariant.GetValueOrDefault(c.VariantId, 0) + c.Quantity;
        }
        if (overrideVariantId.HasValue && overrideVariantQty is > 0)
            requiredByVariant[overrideVariantId.Value] = requiredByVariant.GetValueOrDefault(overrideVariantId.Value, 0) + overrideVariantQty.Value;

        var existingBundles = await _context.CartBundleItems
            .Include(cb => cb.Bundle!).ThenInclude(b => b.Items)
            .Where(cb => cb.UserId == uid)
            .ToListAsync();

        foreach (var cb in existingBundles)
        {
            if (overrideBundleId.HasValue && cb.BundleId == overrideBundleId.Value) continue;
            if (cb.Bundle == null) continue;
            foreach (var bi in cb.Bundle.Items)
                requiredByVariant[bi.VariantId] = requiredByVariant.GetValueOrDefault(bi.VariantId, 0) + bi.Quantity * cb.Quantity;
        }

        if (overrideBundleId.HasValue && overrideBundleQty is > 0 && preloadedOverrideBundle != null)
        {
            foreach (var bi in preloadedOverrideBundle.Items)
                requiredByVariant[bi.VariantId] = requiredByVariant.GetValueOrDefault(bi.VariantId, 0) + bi.Quantity * overrideBundleQty.Value;
        }

        if (requiredByVariant.Count == 0)
            return null;

        var variantIds = requiredByVariant.Keys.ToList();
        var variants = await _context.Variants
            .Include(v => v.Product)
            .Where(v => variantIds.Contains(v.Id))
            .ToDictionaryAsync(v => v.Id);

        foreach (var (vid, reqQty) in requiredByVariant)
        {
            if (!variants.TryGetValue(vid, out var variant) || variant.Product is { IsActive: false })
                return $"Variant {vid} is unavailable or inactive.";

            if (variant.Stock < reqQty)
                return $"Requested quantity exceeds available stock for SKU '{variant.Sku}'. Available: {variant.Stock}, needed: {reqQty}.";
        }

        return null;
    }

    [HttpGet]
    public async Task<IActionResult> Get() => Ok(await BuildCart());

    [HttpPost("items")]
    public async Task<IActionResult> Add([FromBody] AddCartItemRequest request)
    {
        var variant = await _context.Variants.Include(v => v.Product).FirstOrDefaultAsync(v => v.Id == request.VariantId);
        if (variant == null || variant.Product is { IsActive: false })
            return NotFound(new MessageResponse { Message = "Variant not found." });

        var uid = UserId;
        var item = await _context.CartItems.FirstOrDefaultAsync(c => c.UserId == uid && c.VariantId == request.VariantId);
        var newQty = (item?.Quantity ?? 0) + request.Quantity;

        var stockError = await ValidateCombinedCartStockAsync(uid, overrideVariantId: request.VariantId, overrideVariantQty: newQty);
        if (stockError != null)
            return BadRequest(new MessageResponse { Message = stockError });

        if (item == null)
            _context.CartItems.Add(new CartItem { UserId = uid, VariantId = request.VariantId, Quantity = newQty });
        else
            item.Quantity = newQty;
        await _context.SaveChangesAsync();
        return Ok(await BuildCart());
    }

    [HttpPut("items/{variantId}")]
    public async Task<IActionResult> Update(int variantId, [FromBody] UpdateCartItemRequest request)
    {
        var uid = UserId;
        var item = await _context.CartItems.Include(c => c.Variant)
            .FirstOrDefaultAsync(c => c.UserId == uid && c.VariantId == variantId);
        if (item == null) return NotFound(new MessageResponse { Message = "Item not in cart." });

        var stockError = await ValidateCombinedCartStockAsync(uid, overrideVariantId: variantId, overrideVariantQty: request.Quantity);
        if (stockError != null)
            return BadRequest(new MessageResponse { Message = stockError });

        item.Quantity = request.Quantity;
        await _context.SaveChangesAsync();
        return Ok(await BuildCart());
    }

    [HttpDelete("items/{variantId}")]
    public async Task<IActionResult> Remove(int variantId)
    {
        var uid = UserId;
        var item = await _context.CartItems.FirstOrDefaultAsync(c => c.UserId == uid && c.VariantId == variantId);
        if (item == null) return NotFound(new MessageResponse { Message = "Item not in cart." });
        _context.CartItems.Remove(item);
        await _context.SaveChangesAsync();
        return Ok(await BuildCart());
    }

    [HttpPost("bundles")]
    public async Task<IActionResult> AddBundle([FromBody] AddCartBundleRequest request)
    {
        var bundle = await _context.Bundles
            .Include(b => b.Items).ThenInclude(i => i.Variant).ThenInclude(v => v!.Product)
            .FirstOrDefaultAsync(b => b.Id == request.BundleId);
        if (bundle == null)
            return NotFound(new MessageResponse { Message = "Bundle not found." });

        if (bundle.Items.Count == 0)
            return BadRequest(new MessageResponse { Message = "Bundle contains no items." });

        foreach (var bi in bundle.Items)
        {
            if (bi.Variant == null || bi.Variant.Product is { IsActive: false })
                return BadRequest(new MessageResponse { Message = $"Bundle component variant {bi.VariantId} is unavailable or inactive." });
        }

        var uid = UserId;
        var existing = await _context.CartBundleItems.FirstOrDefaultAsync(cb => cb.UserId == uid && cb.BundleId == request.BundleId);
        var newQty = (existing?.Quantity ?? 0) + request.Quantity;

        var stockError = await ValidateCombinedCartStockAsync(
            uid,
            overrideBundleId: request.BundleId,
            overrideBundleQty: newQty,
            preloadedOverrideBundle: bundle);
        if (stockError != null)
            return BadRequest(new MessageResponse { Message = stockError });

        if (existing == null)
            _context.CartBundleItems.Add(new CartBundleItem { UserId = uid, BundleId = request.BundleId, Quantity = newQty });
        else
            existing.Quantity = newQty;

        await _context.SaveChangesAsync();
        return Ok(await BuildCart());
    }

    [HttpPut("bundles/{bundleId:int}")]
    public async Task<IActionResult> UpdateBundle(int bundleId, [FromBody] UpdateCartBundleRequest request)
    {
        var uid = UserId;
        var existing = await _context.CartBundleItems
            .Include(cb => cb.Bundle!).ThenInclude(b => b.Items)
            .FirstOrDefaultAsync(cb => cb.UserId == uid && cb.BundleId == bundleId);
        if (existing == null || existing.Bundle == null)
            return NotFound(new MessageResponse { Message = "Bundle not in cart." });

        var stockError = await ValidateCombinedCartStockAsync(
            uid,
            overrideBundleId: bundleId,
            overrideBundleQty: request.Quantity,
            preloadedOverrideBundle: existing.Bundle);
        if (stockError != null)
            return BadRequest(new MessageResponse { Message = stockError });

        existing.Quantity = request.Quantity;
        await _context.SaveChangesAsync();
        return Ok(await BuildCart());
    }

    [HttpDelete("bundles/{bundleId:int}")]
    public async Task<IActionResult> RemoveBundle(int bundleId)
    {
        var uid = UserId;
        var existing = await _context.CartBundleItems.FirstOrDefaultAsync(cb => cb.UserId == uid && cb.BundleId == bundleId);
        if (existing == null)
            return NotFound(new MessageResponse { Message = "Bundle not in cart." });

        _context.CartBundleItems.Remove(existing);
        await _context.SaveChangesAsync();
        return Ok(await BuildCart());
    }

    [HttpDelete]
    public async Task<IActionResult> Clear()
    {
        var uid = UserId;
        _context.CartItems.RemoveRange(_context.CartItems.Where(c => c.UserId == uid));
        _context.CartBundleItems.RemoveRange(_context.CartBundleItems.Where(cb => cb.UserId == uid));
        await _context.SaveChangesAsync();
        return NoContent();
    }
}
