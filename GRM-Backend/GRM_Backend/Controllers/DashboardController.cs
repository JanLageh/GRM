using System.Security.Claims;
using GRM_Backend.Data;
using GRM_Backend.DTOs;
using GRM_Backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace GRM_Backend.Controllers;

[ApiController]
[Route("api/dashboard")]
[Authorize(Roles = "Staff,Admin")]
public class DashboardController : ControllerBase
{
    private readonly AppDbContext _context;

    public DashboardController(AppDbContext context)
    {
        _context = context;
    }

    private int CurrentUserId =>
        int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    private string CurrentRole =>
        User.FindFirstValue(ClaimTypes.Role) ?? string.Empty;

    // GET /api/dashboard  — Staff / Admin: today's sales and low-stock alerts
    [HttpGet]
    [ProducesResponseType(typeof(DashboardDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> Get()
    {
        var todayStart = DateTime.UtcNow.Date;
        var tomorrowStart = todayStart.AddDays(1);

        var todayOrders = await _context.SalesOrders
            .Include(o => o.Items)
            .Where(o => o.Status != OrderStatus.Cancelled
                        && o.CreatedAt >= todayStart
                        && o.CreatedAt < tomorrowStart)
            .ToListAsync();

        var todayPaidRevenue = await _context.Invoices
            .Where(i => !i.IsVoided
                        && i.PaymentStatus == InvoiceStatus.Paid
                        && i.PaidAt.HasValue
                        && i.PaidAt.Value >= todayStart
                        && i.PaidAt.Value < tomorrowStart)
            .SumAsync(i => i.AmountPaid);

        var pendingOrdersCount = await _context.SalesOrders
            .CountAsync(o => o.Status == OrderStatus.Pending);
        var processingOrdersCount = await _context.SalesOrders
            .CountAsync(o => o.Status == OrderStatus.Processing);

        var variants = await _context.Variants
            .Include(v => v.Product)
            .Where(v => v.Product == null || v.Product.IsActive)
            .ToListAsync();

        var lowStockAlerts = variants
            .Where(v => v.Stock <= v.ReorderThreshold)
            .OrderBy(v => v.Stock - v.ReorderThreshold)
            .ThenBy(v => v.Id)
            .Select(v => new LowStockAlertDto
            {
                VariantId = v.Id,
                ProductId = v.ProductId,
                ProductName = v.Product?.Name ?? string.Empty,
                Model = v.Model,
                Sku = v.Sku,
                CurrentStock = v.Stock,
                ReorderThreshold = v.ReorderThreshold,
                Shortage = Math.Max(0, v.ReorderThreshold - v.Stock),
                SalesVelocity = v.SalesVelocity,
                Status = v.Stock <= 0 ? "OutOfStock" : "LowStock"
            })
            .ToList();

        var draftPoCount = await _context.PurchaseOrders
            .CountAsync(po => po.Status == PurchaseOrderStatus.Draft);

        var pendingRequisitionsCount = CurrentRole == "Admin"
            ? await _context.PurchaseRequisitions.CountAsync(r => r.Status == RequisitionStatus.Pending)
            : await _context.PurchaseRequisitions.CountAsync(r => r.Status == RequisitionStatus.Pending && r.RequestedByUserId == CurrentUserId);

        decimal? totalPaidRevenue = CurrentRole == "Admin"
            ? await _context.Invoices.Where(i => !i.IsVoided).SumAsync(i => i.AmountPaid)
            : null;

        return Ok(new DashboardDto
        {
            Date = todayStart,
            TodaySalesRevenue = todayOrders.Sum(o => o.Total),
            TodayOrdersCount = todayOrders.Count,
            TodayOnlineOrdersCount = todayOrders.Count(o => o.Channel == OrderChannel.Online),
            TodayWalkInOrdersCount = todayOrders.Count(o => o.Channel == OrderChannel.WalkIn),
            TodayUnitsSold = todayOrders.SelectMany(o => o.Items).Sum(i => i.Quantity),
            TodayPaidRevenue = todayPaidRevenue,
            OpenOrdersCount = pendingOrdersCount + processingOrdersCount,
            PendingOrdersCount = pendingOrdersCount,
            ProcessingOrdersCount = processingOrdersCount,
            LowStockCount = lowStockAlerts.Count,
            OutOfStockCount = lowStockAlerts.Count(a => a.CurrentStock <= 0),
            PendingRequisitionsCount = pendingRequisitionsCount,
            DraftPurchaseOrdersCount = draftPoCount,
            TotalPaidRevenue = totalPaidRevenue,
            LowStockAlerts = lowStockAlerts
        });
    }
}
