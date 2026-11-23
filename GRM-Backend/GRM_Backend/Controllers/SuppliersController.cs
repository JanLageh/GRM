using GRM_Backend.Data;
using GRM_Backend.DTOs;
using GRM_Backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace GRM_Backend.Controllers;

[ApiController]
[Route("api/suppliers")]
[Authorize(Roles = "Admin")]
public class SuppliersController : ControllerBase
{
    private readonly AppDbContext _context;

    public SuppliersController(AppDbContext context)
    {
        _context = context;
    }

    private static SupplierDto ToDto(Supplier s) => new()
    {
        Id = s.Id,
        Name = s.Name,
        ContactPerson = s.ContactPerson,
        Phone = s.Phone,
        Email = s.Email,
        Address = s.Address,
        IsActive = s.IsActive,
        CreatedAt = s.CreatedAt,
        UpdatedAt = s.UpdatedAt
    };

    // GET /api/suppliers
    [HttpGet]
    [ProducesResponseType(typeof(List<SupplierDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> List([FromQuery] bool? activeOnly, [FromQuery] string? search)
    {
        var query = _context.Suppliers.AsQueryable();

        if (activeOnly == true)
            query = query.Where(s => s.IsActive);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLowerInvariant();
            query = query.Where(s =>
                s.Name.ToLower().Contains(term) ||
                (s.ContactPerson != null && s.ContactPerson.ToLower().Contains(term)) ||
                (s.Email != null && s.Email.ToLower().Contains(term)));
        }

        var list = await query.OrderBy(s => s.Name).ThenBy(s => s.Id).ToListAsync();
        return Ok(list.Select(ToDto).ToList());
    }

    // GET /api/suppliers/{id}
    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(SupplierDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById(int id)
    {
        var supplier = await _context.Suppliers.FindAsync(id);
        if (supplier == null)
            return NotFound(new MessageResponse { Message = "Supplier not found." });

        return Ok(ToDto(supplier));
    }

    // POST /api/suppliers
    [HttpPost]
    [ProducesResponseType(typeof(SupplierDto), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(MessageResponse), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(MessageResponse), StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Create([FromBody] SupplierRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
            return BadRequest(new MessageResponse { Message = "Supplier name is required." });

        var trimmedName = request.Name.Trim();
        var exists = await _context.Suppliers.AnyAsync(s => s.Name.ToLower() == trimmedName.ToLower());
        if (exists)
            return Conflict(new MessageResponse { Message = $"Supplier '{trimmedName}' already exists." });

        var supplier = new Supplier
        {
            Name = trimmedName,
            ContactPerson = request.ContactPerson?.Trim(),
            Phone = request.Phone?.Trim(),
            Email = request.Email?.Trim(),
            Address = request.Address?.Trim(),
            IsActive = request.IsActive
        };

        _context.Suppliers.Add(supplier);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = supplier.Id }, ToDto(supplier));
    }

    // PUT /api/suppliers/{id}
    [HttpPut("{id:int}")]
    [ProducesResponseType(typeof(SupplierDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(MessageResponse), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(MessageResponse), StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Update(int id, [FromBody] SupplierRequest request)
    {
        var supplier = await _context.Suppliers.FindAsync(id);
        if (supplier == null)
            return NotFound(new MessageResponse { Message = "Supplier not found." });

        if (string.IsNullOrWhiteSpace(request.Name))
            return BadRequest(new MessageResponse { Message = "Supplier name is required." });

        var trimmedName = request.Name.Trim();
        var exists = await _context.Suppliers.AnyAsync(s => s.Id != id && s.Name.ToLower() == trimmedName.ToLower());
        if (exists)
            return Conflict(new MessageResponse { Message = $"Supplier '{trimmedName}' already exists." });

        supplier.Name = trimmedName;
        supplier.ContactPerson = request.ContactPerson?.Trim();
        supplier.Phone = request.Phone?.Trim();
        supplier.Email = request.Email?.Trim();
        supplier.Address = request.Address?.Trim();
        supplier.IsActive = request.IsActive;
        supplier.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return Ok(ToDto(supplier));
    }

    // DELETE /api/suppliers/{id}
    [HttpDelete("{id:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(MessageResponse), StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Delete(int id)
    {
        var supplier = await _context.Suppliers.FindAsync(id);
        if (supplier == null)
            return NotFound(new MessageResponse { Message = "Supplier not found." });

        var inUse = await _context.PurchaseOrders.AnyAsync(po => po.SupplierId == id);
        if (inUse)
            return Conflict(new MessageResponse { Message = "Cannot delete a supplier referenced by purchase orders. Deactivate it instead." });

        _context.Suppliers.Remove(supplier);
        await _context.SaveChangesAsync();
        return NoContent();
    }
}
