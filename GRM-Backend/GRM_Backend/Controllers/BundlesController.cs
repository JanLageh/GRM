using GRM_Backend.Data;
using GRM_Backend.DTOs;
using GRM_Backend.Models;
using GRM_Backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace GRM_Backend.Controllers;

[ApiController]
[Route("api/bundles")]
[Authorize(Roles = "Admin")]
public class BundlesController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IWebHostEnvironment _env;

    public BundlesController(AppDbContext context, IWebHostEnvironment env)
    {
        _context = context;
        _env = env;
    }

    private static BundleDto ToDto(Bundle b) => new()
    {
        Id = b.Id,
        Name = b.Name,
        Description = b.Description,
        Price = b.Price,
        ImageUrl = b.ImageUrl,
        AvailableStock = BundlePricingHelper.GetAvailableStock(b),
        Items = b.Items.OrderBy(i => i.Id).Select(i => new BundleItemDto
        {
            VariantId = i.VariantId,
            ProductName = i.Variant?.Product?.Name ?? string.Empty,
            Sku = i.Variant?.Sku ?? string.Empty,
            Model = i.Variant?.Model ?? string.Empty,
            Quantity = i.Quantity,
            Stock = i.Variant?.Stock ?? 0
        }).ToList()
    };

    private IQueryable<Bundle> Query() =>
        _context.Bundles.Include(b => b.Items).ThenInclude(i => i.Variant).ThenInclude(v => v!.Product);

    private async Task<string?> ValidateItems(BundleRequest r)
    {
        if (r.Items.Select(i => i.VariantId).Distinct().Count() != r.Items.Count)
            return "Duplicate variants in bundle.";
        var ids = r.Items.Select(i => i.VariantId).ToList();
        var found = await _context.Variants.CountAsync(v => ids.Contains(v.Id));
        return found != ids.Count ? "One or more variants do not exist." : null;
    }

    [HttpGet]
    [AllowAnonymous] // storefront (Guests/Customers) must be able to list bundles; writes stay Admin-only
    [ProducesResponseType(typeof(List<BundleDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> List() =>
        Ok((await Query().OrderBy(b => b.Id).ToListAsync()).Select(ToDto).ToList());

    [HttpGet("{id:int}")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(BundleDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Get(int id)
    {
        var bundle = await Query().FirstOrDefaultAsync(b => b.Id == id);
        if (bundle == null) return NotFound(new MessageResponse { Message = "Bundle not found." });
        return Ok(ToDto(bundle));
    }

    [HttpPost]
    [ProducesResponseType(typeof(BundleDto), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(MessageResponse), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Create([FromBody] BundleRequest request)
    {
        var error = await ValidateItems(request);
        if (error != null) return BadRequest(new MessageResponse { Message = error });

        var bundle = new Bundle
        {
            Name = request.Name.Trim(),
            Description = request.Description?.Trim(),
            Price = request.Price,
            ImageUrl = string.IsNullOrWhiteSpace(request.ImageUrl) ? null : request.ImageUrl.Trim(),
            Items = request.Items.Select(i => new BundleItem { VariantId = i.VariantId, Quantity = i.Quantity }).ToList()
        };
        _context.Bundles.Add(bundle);
        await _context.SaveChangesAsync();
        var created = await Query().FirstAsync(b => b.Id == bundle.Id);
        return CreatedAtAction(nameof(Get), new { id = created.Id }, ToDto(created));
    }

    [HttpPut("{id:int}")]
    [ProducesResponseType(typeof(BundleDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Update(int id, [FromBody] BundleRequest request)
    {
        var bundle = await Query().FirstOrDefaultAsync(b => b.Id == id);
        if (bundle == null) return NotFound(new MessageResponse { Message = "Bundle not found." });
        var error = await ValidateItems(request);
        if (error != null) return BadRequest(new MessageResponse { Message = error });

        bundle.Name = request.Name.Trim();
        bundle.Description = request.Description?.Trim();
        bundle.Price = request.Price;
        if (request.ImageUrl != null)
            bundle.ImageUrl = string.IsNullOrWhiteSpace(request.ImageUrl) ? null : request.ImageUrl.Trim();
        bundle.UpdatedAt = DateTime.UtcNow;
        _context.BundleItems.RemoveRange(bundle.Items);
        bundle.Items = request.Items.Select(i => new BundleItem { BundleId = id, VariantId = i.VariantId, Quantity = i.Quantity }).ToList();
        await _context.SaveChangesAsync();
        var updated = await Query().FirstAsync(b => b.Id == id);
        return Ok(ToDto(updated));
    }

    [HttpPost("{id:int}/image")]
    [ProducesResponseType(typeof(BundleDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(MessageResponse), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UploadBundleImage(int id, IFormFile? file)
    {
        var bundle = await Query().FirstOrDefaultAsync(b => b.Id == id);
        if (bundle == null) return NotFound(new MessageResponse { Message = "Bundle not found." });

        var (imageUrl, error) = await ProductsController.SaveImageAsync(_env, file);
        if (error != null) return BadRequest(new MessageResponse { Message = error });

        bundle.ImageUrl = imageUrl;
        bundle.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return Ok(ToDto(bundle));
    }

    [HttpDelete("{id:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(int id)
    {
        var bundle = await Query().FirstOrDefaultAsync(b => b.Id == id);
        if (bundle == null) return NotFound(new MessageResponse { Message = "Bundle not found." });
        _context.Bundles.Remove(bundle);
        await _context.SaveChangesAsync();
        return NoContent();
    }
}
