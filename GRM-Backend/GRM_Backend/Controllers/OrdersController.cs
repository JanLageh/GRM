using System.Security.Claims;
using GRM_Backend.Data;
using GRM_Backend.DTOs;
using GRM_Backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.EntityFrameworkCore;

namespace GRM_Backend.Controllers;

[ApiController]
[Route("api/orders")]
[Authorize]
public class OrdersController : ControllerBase
{
    private const decimal StaffMaxDiscount = 15m;

    private readonly AppDbContext _context;

    public OrdersController(AppDbContext context)
    {
        _context = context;
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private int CurrentUserId =>
        int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    private string CurrentRole =>
        User.FindFirstValue(ClaimTypes.Role) ?? string.Empty;

    private IQueryable<SalesOrder> QueryWithDetails() =>
        _context.SalesOrders
            .Include(o => o.Customer)
            .Include(o => o.Staff)
            .Include(o => o.CorrectedBy)
            .Include(o => o.Items).ThenInclude(i => i.Variant).ThenInclude(v => v!.Product)
            .Include(o => o.Corrections).ThenInclude(c => c.CorrectedBy);

    private static OrderDto ToDto(SalesOrder o) => new()
    {
        Id = o.Id,
        QuotationId = o.QuotationId,
        CustomerId = o.CustomerId,
        CustomerName = !string.IsNullOrWhiteSpace(o.CustomerName)
            ? o.CustomerName
            : (o.Customer?.FullName ?? o.Customer?.Username ?? string.Empty),
        StaffId = o.StaffId,
        StaffName = o.Staff?.FullName ?? o.Staff?.Username,
        Channel = o.Channel,
        Status = o.Status,
        PaymentMethod = o.PaymentMethod,
        ShippingAddress = o.ShippingAddress,
        Notes = o.Notes,
        DiscountPercent = o.DiscountPercent,
        Subtotal = o.Subtotal,
        DiscountAmount = o.DiscountAmount,
        Total = o.Total,
        CreatedAt = o.CreatedAt,
        UpdatedAt = o.UpdatedAt,
        CompletedAt = o.CompletedAt,
        CancelledAt = o.CancelledAt,
        CancelReason = o.CancelReason,
        IsCorrected = o.IsCorrected,
        CorrectedAt = o.CorrectedAt,
        CorrectedByUserId = o.CorrectedByUserId,
        CorrectedByName = o.CorrectedBy?.FullName ?? o.CorrectedBy?.Username,
        CorrectionReason = o.CorrectionReason,
        Items = o.Items
            .OrderBy(i => i.Id)
            .Select(i => new OrderItemDto
            {
                Id = i.Id,
                VariantId = i.VariantId,
                Sku = i.Variant?.Sku ?? string.Empty,
                ProductName = i.Variant?.Product?.Name ?? string.Empty,
                Model = i.Variant?.Model ?? string.Empty,
                Quantity = i.Quantity,
                UnitPrice = i.UnitPrice,
                LineTotal = i.LineTotal
            })
            .ToList(),
        Corrections = o.Corrections
            .OrderBy(c => c.CorrectedAt)
            .ThenBy(c => c.Id)
            .Select(c => new OrderCorrectionDto
            {
                Id = c.Id,
                CorrectedByUserId = c.CorrectedByUserId,
                CorrectedByName = c.CorrectedBy?.FullName ?? c.CorrectedBy?.Username ?? string.Empty,
                Reason = c.Reason,
                PreviousTotal = c.PreviousTotal,
                NewTotal = c.NewTotal,
                CorrectedAt = c.CorrectedAt
            })
            .ToList()
    };

    private static string? NormalizeStatus(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;
        return value.Trim().ToLowerInvariant() switch
        {
            "pending" => OrderStatus.Pending,
            "processing" => OrderStatus.Processing,
            "completed" => OrderStatus.Completed,
            "cancelled" => OrderStatus.Cancelled,
            _ => null
        };
    }

    private static string? NormalizeChannel(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;
        var key = new string(value.Trim().Where(c => !char.IsWhiteSpace(c) && c != '-' && c != '_').ToArray())
            .ToLowerInvariant();
        return key switch
        {
            "online" => OrderChannel.Online,
            "walkin" => OrderChannel.WalkIn,
            _ => null
        };
    }

    // ── Endpoints ────────────────────────────────────────────────────────────

    // POST /api/orders  — Customer: checkout the cart (online order)
    [HttpPost]
    [Authorize(Roles = "Customer")]
    [ProducesResponseType(typeof(OrderDto), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(MessageResponse), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Checkout(
        [FromBody(EmptyBodyBehavior = EmptyBodyBehavior.Allow)] CheckoutOrderRequest? request = null)
    {
        var uid = CurrentUserId;
        var customer = await _context.Users.FindAsync(uid);
        if (customer == null)
            return Unauthorized(new MessageResponse { Message = "Customer account not found." });

        var cartItems = await _context.CartItems
            .Include(c => c.Variant).ThenInclude(v => v!.Product)
            .Where(c => c.UserId == uid)
            .OrderBy(c => c.Id)
            .ToListAsync();

        if (!cartItems.Any())
            return BadRequest(new MessageResponse { Message = "Your cart is empty." });

        foreach (var item in cartItems)
        {
            if (item.Variant == null || item.Variant.Product is { IsActive: false })
                return BadRequest(new MessageResponse { Message = $"Variant {item.VariantId} is unavailable or inactive." });
            if (item.Quantity <= 0)
                return BadRequest(new MessageResponse { Message = $"Invalid quantity for SKU '{item.Variant.Sku}'." });
            if (item.Variant.Stock < item.Quantity)
                return BadRequest(new MessageResponse
                {
                    Message = $"Insufficient stock for SKU '{item.Variant.Sku}'. Available: {item.Variant.Stock}, requested: {item.Quantity}."
                });
        }

        var orderItems = cartItems.Select(c => new SalesOrderItem
        {
            VariantId = c.VariantId,
            Quantity = c.Quantity,
            UnitPrice = c.Variant!.Price
        }).ToList();

        var subtotal = orderItems.Sum(i => i.UnitPrice * i.Quantity);

        var order = new SalesOrder
        {
            CustomerId = customer.Id,
            CustomerName = !string.IsNullOrWhiteSpace(customer.FullName) ? customer.FullName : customer.Username,
            Channel = OrderChannel.Online,
            Status = OrderStatus.Pending,
            PaymentMethod = string.IsNullOrWhiteSpace(request?.PaymentMethod) ? "Cash on Delivery" : request.PaymentMethod.Trim(),
            ShippingAddress = !string.IsNullOrWhiteSpace(request?.ShippingAddress) ? request.ShippingAddress.Trim() : customer.Address,
            Notes = request?.Notes?.Trim(),
            DiscountPercent = 0m,
            Subtotal = subtotal,
            DiscountAmount = 0m,
            Total = subtotal,
            Items = orderItems
        };

        await using var tx = _context.Database.IsRelational()
            ? await _context.Database.BeginTransactionAsync()
            : null;

        foreach (var item in cartItems)
            item.Variant!.Stock -= item.Quantity;

        _context.SalesOrders.Add(order);
        _context.CartItems.RemoveRange(cartItems);
        await _context.SaveChangesAsync();

        foreach (var item in cartItems)
        {
            _context.StockMovements.Add(new StockMovement
            {
                VariantId = item.VariantId,
                Type = "StockOut",
                QuantityChange = -item.Quantity,
                StockAfter = item.Variant!.Stock,
                Reason = $"Order #{order.Id} — Online checkout",
                UserId = uid
            });
        }

        await _context.SaveChangesAsync();
        if (tx != null) await tx.CommitAsync();

        var loaded = await QueryWithDetails().FirstAsync(o => o.Id == order.Id);
        return CreatedAtAction(nameof(GetById), new { id = order.Id }, ToDto(loaded));
    }

    // POST /api/orders/walk-in  — Staff / Admin: record an in-store sale
    [HttpPost("walk-in")]
    [Authorize(Roles = "Staff,Admin")]
    [ProducesResponseType(typeof(OrderDto), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(MessageResponse), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CreateWalkIn([FromBody] CreateWalkInOrderRequest request)
    {
        if (CurrentRole == "Staff" && request.DiscountPercent > StaffMaxDiscount)
            return BadRequest(new MessageResponse
            {
                Message = $"Staff members may not apply a discount greater than {StaffMaxDiscount}%."
            });

        string resolvedStatus;
        if (string.IsNullOrWhiteSpace(request.Status))
        {
            resolvedStatus = OrderStatus.Completed;
        }
        else
        {
            var normalized = NormalizeStatus(request.Status);
            if (normalized is not (OrderStatus.Pending or OrderStatus.Processing or OrderStatus.Completed))
                return BadRequest(new MessageResponse
                {
                    Message = "Walk-in order status must be one of: Pending, Processing, Completed."
                });
            resolvedStatus = normalized;
        }

        User? customer = null;
        if (request.CustomerId.HasValue)
        {
            customer = await _context.Users.FindAsync(request.CustomerId.Value);
            if (customer == null || customer.Role != "Customer")
                return BadRequest(new MessageResponse { Message = "CustomerId must reference a valid Customer account." });
        }

        var groupedItems = request.Items
            .GroupBy(i => i.VariantId)
            .Select(g => new { VariantId = g.Key, Quantity = g.Sum(x => x.Quantity) })
            .ToList();

        var variantIds = groupedItems.Select(i => i.VariantId).ToList();
        var variants = await _context.Variants
            .Include(v => v.Product)
            .Where(v => variantIds.Contains(v.Id))
            .ToDictionaryAsync(v => v.Id);

        foreach (var item in groupedItems)
        {
            if (!variants.TryGetValue(item.VariantId, out var variant) || variant.Product is { IsActive: false })
                return BadRequest(new MessageResponse { Message = $"Variant {item.VariantId} not found or inactive." });
            if (variant.Stock < item.Quantity)
                return BadRequest(new MessageResponse
                {
                    Message = $"Insufficient stock for SKU '{variant.Sku}'. Available: {variant.Stock}, requested: {item.Quantity}."
                });
        }

        var orderItems = groupedItems.Select(i => new SalesOrderItem
        {
            VariantId = i.VariantId,
            Quantity = i.Quantity,
            UnitPrice = variants[i.VariantId].Price
        }).ToList();

        var subtotal = orderItems.Sum(i => i.UnitPrice * i.Quantity);
        var discountAmount = Math.Round(subtotal * request.DiscountPercent / 100m, 2);
        var total = subtotal - discountAmount;
        var now = DateTime.UtcNow;

        var order = new SalesOrder
        {
            CustomerId = customer?.Id,
            CustomerName = !string.IsNullOrWhiteSpace(request.CustomerName)
                ? request.CustomerName.Trim()
                : (customer != null
                    ? (!string.IsNullOrWhiteSpace(customer.FullName) ? customer.FullName : customer.Username)
                    : "Walk-in Customer"),
            StaffId = CurrentUserId,
            Channel = OrderChannel.WalkIn,
            Status = resolvedStatus,
            PaymentMethod = string.IsNullOrWhiteSpace(request.PaymentMethod) ? "Cash (Walk-in)" : request.PaymentMethod.Trim(),
            ShippingAddress = "In-store",
            Notes = request.Notes?.Trim(),
            DiscountPercent = request.DiscountPercent,
            Subtotal = subtotal,
            DiscountAmount = discountAmount,
            Total = total,
            CreatedAt = now,
            CompletedAt = resolvedStatus == OrderStatus.Completed ? now : null,
            Items = orderItems
        };

        await using var tx = _context.Database.IsRelational()
            ? await _context.Database.BeginTransactionAsync()
            : null;

        foreach (var item in groupedItems)
            variants[item.VariantId].Stock -= item.Quantity;

        _context.SalesOrders.Add(order);
        await _context.SaveChangesAsync();

        foreach (var item in groupedItems)
        {
            var variant = variants[item.VariantId];
            _context.StockMovements.Add(new StockMovement
            {
                VariantId = item.VariantId,
                Type = "StockOut",
                QuantityChange = -item.Quantity,
                StockAfter = variant.Stock,
                Reason = $"Order #{order.Id} — Walk-in sale",
                UserId = CurrentUserId
            });
        }

        await _context.SaveChangesAsync();
        if (tx != null) await tx.CommitAsync();

        var loaded = await QueryWithDetails().FirstAsync(o => o.Id == order.Id);
        return CreatedAtAction(nameof(GetById), new { id = order.Id }, ToDto(loaded));
    }

    // GET /api/orders  — Staff / Admin: all orders, filter by status or channel
    [HttpGet]
    [Authorize(Roles = "Staff,Admin")]
    [ProducesResponseType(typeof(List<OrderDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAll([FromQuery] string? status, [FromQuery] string? channel)
    {
        var query = QueryWithDetails();

        if (!string.IsNullOrWhiteSpace(status))
        {
            var s = (NormalizeStatus(status) ?? status.Trim()).ToLowerInvariant();
            query = query.Where(o => o.Status.ToLower() == s);
        }

        if (!string.IsNullOrWhiteSpace(channel))
        {
            var c = (NormalizeChannel(channel) ?? channel.Trim()).ToLowerInvariant();
            query = query.Where(o => o.Channel.ToLower() == c);
        }

        var list = await query
            .OrderByDescending(o => o.CreatedAt)
            .ThenByDescending(o => o.Id)
            .ToListAsync();

        return Ok(list.Select(ToDto).ToList());
    }

    // GET /api/orders/my  — Customer: own order history
    [HttpGet("my")]
    [Authorize(Roles = "Customer")]
    [ProducesResponseType(typeof(List<OrderDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetMy([FromQuery] string? status)
    {
        var uid = CurrentUserId;
        var query = QueryWithDetails().Where(o => o.CustomerId == uid);

        if (!string.IsNullOrWhiteSpace(status))
        {
            var s = (NormalizeStatus(status) ?? status.Trim()).ToLowerInvariant();
            query = query.Where(o => o.Status.ToLower() == s);
        }

        var list = await query
            .OrderByDescending(o => o.CreatedAt)
            .ThenByDescending(o => o.Id)
            .ToListAsync();

        return Ok(list.Select(ToDto).ToList());
    }

    // GET /api/orders/{id}  — Owner, Staff, Admin: order details and status
    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(OrderDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById(int id)
    {
        var order = await QueryWithDetails().FirstOrDefaultAsync(o => o.Id == id);
        if (order == null)
            return NotFound(new MessageResponse { Message = "Order not found." });

        if (CurrentRole == "Customer" && order.CustomerId != CurrentUserId)
            return Forbid();

        return Ok(ToDto(order));
    }

    // PATCH /api/orders/{id}/status  — Staff / Admin: Pending, Processing, Completed
    [HttpPatch("{id:int}/status")]
    [Authorize(Roles = "Staff,Admin")]
    [ProducesResponseType(typeof(OrderDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(MessageResponse), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateStatus(int id, [FromBody] UpdateOrderStatusRequest request)
    {
        var targetStatus = NormalizeStatus(request.Status);
        if (targetStatus == OrderStatus.Cancelled)
            return BadRequest(new MessageResponse { Message = "Use POST /api/orders/{id}/cancel to cancel an order." });

        if (targetStatus is not (OrderStatus.Pending or OrderStatus.Processing or OrderStatus.Completed))
            return BadRequest(new MessageResponse { Message = "Status must be one of: Pending, Processing, Completed." });

        var order = await QueryWithDetails().FirstOrDefaultAsync(o => o.Id == id);
        if (order == null)
            return NotFound(new MessageResponse { Message = "Order not found." });

        if (order.Status == OrderStatus.Cancelled)
            return BadRequest(new MessageResponse { Message = "Cannot change status of a Cancelled order." });

        if (order.Status == OrderStatus.Completed)
            return BadRequest(new MessageResponse { Message = "Completed orders are finalized and cannot have their status changed." });

        if (order.Status == OrderStatus.Processing && targetStatus == OrderStatus.Pending)
            return BadRequest(new MessageResponse { Message = "Cannot revert an order from Processing back to Pending." });

        if (order.Status == targetStatus)
            return Ok(ToDto(order));

        var now = DateTime.UtcNow;
        order.Status = targetStatus;
        order.UpdatedAt = now;
        order.StaffId ??= CurrentUserId;
        if (targetStatus == OrderStatus.Completed)
            order.CompletedAt = now;

        await _context.SaveChangesAsync();

        var loaded = await QueryWithDetails().FirstAsync(o => o.Id == id);
        return Ok(ToDto(loaded));
    }

    // POST /api/orders/{id}/cancel  — Customer (Pending only), Admin
    [HttpPost("{id:int}/cancel")]
    [Authorize(Roles = "Customer,Admin")]
    [ProducesResponseType(typeof(OrderDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(MessageResponse), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Cancel(
        int id,
        [FromBody(EmptyBodyBehavior = EmptyBodyBehavior.Allow)] CancelOrderRequest? request = null)
    {
        var order = await QueryWithDetails().FirstOrDefaultAsync(o => o.Id == id);
        if (order == null)
            return NotFound(new MessageResponse { Message = "Order not found." });

        if (CurrentRole == "Customer")
        {
            if (order.CustomerId != CurrentUserId)
                return Forbid();
            if (order.Status == OrderStatus.Cancelled)
                return BadRequest(new MessageResponse { Message = "Order is already cancelled." });
            if (order.Status != OrderStatus.Pending)
                return BadRequest(new MessageResponse { Message = "Customers can only cancel Pending orders." });
        }
        else
        {
            if (order.Status == OrderStatus.Cancelled)
                return BadRequest(new MessageResponse { Message = "Order is already cancelled." });
            if (order.Status == OrderStatus.Completed)
                return BadRequest(new MessageResponse
                {
                    Message = "Completed orders are finalized and cannot be cancelled. Use PUT /api/orders/{id}/correction to correct a finalized order."
                });
        }

        await using var tx = _context.Database.IsRelational()
            ? await _context.Database.BeginTransactionAsync()
            : null;

        foreach (var item in order.Items)
        {
            if (item.Variant != null)
            {
                item.Variant.Stock += item.Quantity;
                _context.StockMovements.Add(new StockMovement
                {
                    VariantId = item.VariantId,
                    Type = "StockIn",
                    QuantityChange = item.Quantity,
                    StockAfter = item.Variant.Stock,
                    Reason = string.IsNullOrWhiteSpace(request?.Reason)
                        ? $"Order #{order.Id} cancelled"
                        : $"Order #{order.Id} cancelled: {request.Reason.Trim()}",
                    UserId = CurrentUserId
                });
            }
        }

        var now = DateTime.UtcNow;
        order.Status = OrderStatus.Cancelled;
        order.CancelledAt = now;
        order.CancelReason = request?.Reason?.Trim();
        order.UpdatedAt = now;

        await _context.SaveChangesAsync();
        if (tx != null) await tx.CommitAsync();

        var loaded = await QueryWithDetails().FirstAsync(o => o.Id == id);
        return Ok(ToDto(loaded));
    }

    // PUT /api/orders/{id}/correction  — Admin: correct a finalized order
    [HttpPut("{id:int}/correction")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(OrderDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(MessageResponse), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Correct(int id, [FromBody] CorrectOrderRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Reason))
            return BadRequest(new MessageResponse { Message = "A correction reason is required." });

        var order = await QueryWithDetails().FirstOrDefaultAsync(o => o.Id == id);
        if (order == null)
            return NotFound(new MessageResponse { Message = "Order not found." });

        if (order.Status != OrderStatus.Completed)
            return BadRequest(new MessageResponse { Message = "Only finalized (Completed) orders can be corrected." });

        var previousTotal = order.Total;
        var trimmedReason = request.Reason.Trim();

        Dictionary<int, int>? stockDeltas = null;
        Dictionary<int, ProductVariant>? variants = null;
        Dictionary<int, decimal>? oldPriceByVariant = null;

        if (request.Items != null)
        {
            if (request.Items.Count == 0)
                return BadRequest(new MessageResponse { Message = "An order must have at least one item." });

            if (request.Items.Select(i => i.VariantId).Distinct().Count() != request.Items.Count)
                return BadRequest(new MessageResponse
                {
                    Message = "Duplicate variants in correction items. Combine quantities into a single line per variant."
                });

            var oldQtyByVariant = order.Items
                .GroupBy(i => i.VariantId)
                .ToDictionary(g => g.Key, g => g.Sum(x => x.Quantity));

            oldPriceByVariant = order.Items
                .GroupBy(i => i.VariantId)
                .ToDictionary(g => g.Key, g => g.First().UnitPrice);

            var newQtyByVariant = request.Items.ToDictionary(i => i.VariantId, i => i.Quantity);
            var allVariantIds = oldQtyByVariant.Keys.Union(newQtyByVariant.Keys).ToList();

            variants = await _context.Variants
                .Include(v => v.Product)
                .Where(v => allVariantIds.Contains(v.Id))
                .ToDictionaryAsync(v => v.Id);

            foreach (var reqItem in request.Items)
            {
                if (!variants.TryGetValue(reqItem.VariantId, out var variant))
                    return BadRequest(new MessageResponse { Message = $"Variant {reqItem.VariantId} not found." });

                if (!oldQtyByVariant.ContainsKey(reqItem.VariantId) && variant.Product is { IsActive: false })
                    return BadRequest(new MessageResponse { Message = $"Variant {reqItem.VariantId} is inactive." });
            }

            stockDeltas = new Dictionary<int, int>();
            foreach (var vid in allVariantIds)
            {
                var oldQty = oldQtyByVariant.GetValueOrDefault(vid, 0);
                var newQty = newQtyByVariant.GetValueOrDefault(vid, 0);
                var stockDelta = oldQty - newQty;

                if (stockDelta < 0 && variants.TryGetValue(vid, out var variant) && variant.Stock < -stockDelta)
                    return BadRequest(new MessageResponse
                    {
                        Message = $"Insufficient stock for SKU '{variant.Sku}'. Available: {variant.Stock}, additional required: {-stockDelta}."
                    });

                if (stockDelta != 0)
                    stockDeltas[vid] = stockDelta;
            }
        }

        await using var tx = _context.Database.IsRelational()
            ? await _context.Database.BeginTransactionAsync()
            : null;

        if (request.Items != null && stockDeltas != null && variants != null && oldPriceByVariant != null)
        {
            foreach (var (vid, stockDelta) in stockDeltas)
            {
                if (!variants.TryGetValue(vid, out var variant)) continue;
                variant.Stock += stockDelta;
                _context.StockMovements.Add(new StockMovement
                {
                    VariantId = vid,
                    Type = "Adjustment",
                    QuantityChange = stockDelta,
                    StockAfter = variant.Stock,
                    Reason = $"Order #{order.Id} correction: {trimmedReason}",
                    UserId = CurrentUserId
                });
            }

            _context.SalesOrderItems.RemoveRange(order.Items);
            var newItems = request.Items.Select(reqItem => new SalesOrderItem
            {
                SalesOrderId = order.Id,
                VariantId = reqItem.VariantId,
                Quantity = reqItem.Quantity,
                UnitPrice = reqItem.UnitPrice
                    ?? (oldPriceByVariant.TryGetValue(reqItem.VariantId, out var prevPrice)
                        ? prevPrice
                        : variants[reqItem.VariantId].Price)
            }).ToList();

            _context.SalesOrderItems.AddRange(newItems);
            order.Items = newItems;
        }

        if (request.DiscountPercent.HasValue)
            order.DiscountPercent = request.DiscountPercent.Value;

        if (request.CustomerName != null)
            order.CustomerName = request.CustomerName.Trim();

        if (request.PaymentMethod != null)
            order.PaymentMethod = request.PaymentMethod.Trim();

        if (request.ShippingAddress != null)
            order.ShippingAddress = request.ShippingAddress.Trim();

        if (request.Notes != null)
            order.Notes = request.Notes.Trim();

        order.Subtotal = order.Items.Sum(i => i.UnitPrice * i.Quantity);
        order.DiscountAmount = Math.Round(order.Subtotal * order.DiscountPercent / 100m, 2);
        order.Total = order.Subtotal - order.DiscountAmount;

        var now = DateTime.UtcNow;
        order.IsCorrected = true;
        order.CorrectedAt = now;
        order.CorrectedByUserId = CurrentUserId;
        order.CorrectionReason = trimmedReason;
        order.UpdatedAt = now;

        _context.OrderCorrections.Add(new OrderCorrection
        {
            SalesOrderId = order.Id,
            CorrectedByUserId = CurrentUserId,
            Reason = trimmedReason,
            PreviousTotal = previousTotal,
            NewTotal = order.Total,
            CorrectedAt = now
        });

        await _context.SaveChangesAsync();
        if (tx != null) await tx.CommitAsync();

        var loaded = await QueryWithDetails().FirstAsync(o => o.Id == id);
        return Ok(ToDto(loaded));
    }
}
