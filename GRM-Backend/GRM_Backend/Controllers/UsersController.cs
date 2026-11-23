using System.Security.Claims;
using GRM_Backend.Data;
using GRM_Backend.DTOs;
using GRM_Backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace GRM_Backend.Controllers;

[ApiController]
[Route("api/users")]
[Authorize(Roles = "Admin")]
public class UsersController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IPasswordHasher<User> _passwordHasher;

    public UsersController(AppDbContext context, IPasswordHasher<User> passwordHasher)
    {
        _context = context;
        _passwordHasher = passwordHasher;
    }

    private int CurrentUserId =>
        int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    private static AdminUserDto ToDto(User u) => new()
    {
        Id = u.Id,
        Username = u.Username,
        Email = u.Email,
        Role = u.Role,
        FullName = u.FullName,
        PhoneNumber = u.PhoneNumber,
        Address = u.Address,
        IsActive = u.IsActive,
        CreatedAt = u.CreatedAt,
        UpdatedAt = u.UpdatedAt
    };

    // GET /api/users?role=  — Admin: list staff and customers
    [HttpGet]
    [ProducesResponseType(typeof(List<AdminUserDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> List(
        [FromQuery] string? role,
        [FromQuery] bool? isActive,
        [FromQuery] string? search)
    {
        var query = _context.Users.AsQueryable();

        if (!string.IsNullOrWhiteSpace(role))
        {
            var r = role.Trim().ToLowerInvariant();
            query = query.Where(u => u.Role.ToLower() == r);
        }

        if (isActive.HasValue)
            query = query.Where(u => u.IsActive == isActive.Value);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLowerInvariant();
            query = query.Where(u =>
                u.Username.ToLower().Contains(term) ||
                u.Email.ToLower().Contains(term) ||
                (u.FullName != null && u.FullName.ToLower().Contains(term)));
        }

        var users = await query.OrderBy(u => u.Id).ToListAsync();
        return Ok(users.Select(ToDto).ToList());
    }

    // GET /api/users/{id}  — Admin: view user details
    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(AdminUserDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById(int id)
    {
        var user = await _context.Users.FindAsync(id);
        if (user == null)
            return NotFound(new MessageResponse { Message = "User not found." });

        return Ok(ToDto(user));
    }

    // POST /api/users  — Admin: create a staff (or customer) account
    [HttpPost]
    [ProducesResponseType(typeof(AdminUserDto), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(MessageResponse), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(MessageResponse), StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Create([FromBody] CreateUserRequest request)
    {
        var resolvedRole = "Staff";
        if (!string.IsNullOrWhiteSpace(request.Role))
        {
            resolvedRole = request.Role.Trim().ToLowerInvariant() switch
            {
                "staff" => "Staff",
                "customer" => "Customer",
                _ => string.Empty
            };

            if (string.IsNullOrEmpty(resolvedRole))
                return BadRequest(new MessageResponse { Message = "Role must be Staff or Customer." });
        }

        var normalizedEmail = request.Email.Trim().ToLowerInvariant();
        var normalizedUsername = request.Username.Trim();

        var exists = await _context.Users.AnyAsync(u =>
            u.Email.ToLower() == normalizedEmail ||
            u.Username.ToLower() == normalizedUsername.ToLower());

        if (exists)
            return Conflict(new MessageResponse { Message = "A user with the specified email or username already exists." });

        var user = new User
        {
            Username = normalizedUsername,
            Email = normalizedEmail,
            Role = resolvedRole,
            FullName = request.FullName?.Trim(),
            PhoneNumber = request.PhoneNumber?.Trim(),
            Address = request.Address?.Trim(),
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };
        user.PasswordHash = _passwordHasher.HashPassword(user, request.Password);

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = user.Id }, ToDto(user));
    }

    // PATCH /api/users/{id}/status  — Admin: activate or deactivate a user account
    [HttpPatch("{id:int}/status")]
    [ProducesResponseType(typeof(AdminUserDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(MessageResponse), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> SetStatus(int id, [FromBody] UpdateUserStatusRequest request)
    {
        var user = await _context.Users.FindAsync(id);
        if (user == null)
            return NotFound(new MessageResponse { Message = "User not found." });

        if (user.Id == CurrentUserId && !request.IsActive)
            return BadRequest(new MessageResponse { Message = "You cannot deactivate your own account." });

        user.IsActive = request.IsActive;
        user.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return Ok(ToDto(user));
    }
}
