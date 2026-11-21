using GRM_Backend.Data;
using GRM_Backend.DTOs;
using GRM_Backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace GRM_Backend.Controllers;

[ApiController]
[Route("api/contact")]
public class ContactController : ControllerBase
{
    private readonly AppDbContext _context;

    public ContactController(AppDbContext context)
    {
        _context = context;
    }

    private static ContactInquiryDto ToDto(ContactInquiry c) => new()
    {
        Id = c.Id,
        Name = c.Name,
        Email = c.Email,
        PhoneNumber = c.PhoneNumber,
        Subject = c.Subject,
        Message = c.Message,
        CreatedAt = c.CreatedAt
    };

    // POST /api/contact  — Public: submit an inquiry
    [HttpPost]
    [AllowAnonymous]
    [ProducesResponseType(typeof(ContactInquiryDto), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(MessageResponse), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Submit([FromBody] ContactInquiryRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
            return BadRequest(new MessageResponse { Message = "Name is required." });

        if (string.IsNullOrWhiteSpace(request.Message))
            return BadRequest(new MessageResponse { Message = "Message is required." });

        var inquiry = new ContactInquiry
        {
            Name = request.Name.Trim(),
            Email = request.Email.Trim(),
            PhoneNumber = request.PhoneNumber?.Trim(),
            Subject = request.Subject?.Trim(),
            Message = request.Message.Trim(),
            CreatedAt = DateTime.UtcNow
        };

        _context.ContactInquiries.Add(inquiry);
        await _context.SaveChangesAsync();

        return StatusCode(StatusCodes.Status201Created, ToDto(inquiry));
    }

    // GET /api/contact  — Admin: list submitted inquiries
    [HttpGet]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(List<ContactInquiryDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> List()
    {
        var inquiries = await _context.ContactInquiries
            .OrderByDescending(c => c.CreatedAt)
            .ThenByDescending(c => c.Id)
            .ToListAsync();

        return Ok(inquiries.Select(ToDto).ToList());
    }
}
