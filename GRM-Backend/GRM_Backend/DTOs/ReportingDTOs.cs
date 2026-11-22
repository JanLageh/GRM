namespace GRM_Backend.DTOs;

// ── Dashboard ────────────────────────────────────────────────────────────────

public class LowStockAlertDto
{
    public int VariantId { get; set; }
    public int ProductId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public string Model { get; set; } = string.Empty;
    public string Sku { get; set; } = string.Empty;
    public int CurrentStock { get; set; }
    public int ReorderThreshold { get; set; }
    public int Shortage { get; set; }
    public decimal SalesVelocity { get; set; }
    public string Status { get; set; } = string.Empty;
}

public class DashboardDto
{
    public DateTime Date { get; set; }
    public decimal TodaySalesRevenue { get; set; }
    public int TodayOrdersCount { get; set; }
    public int TodayOnlineOrdersCount { get; set; }
    public int TodayWalkInOrdersCount { get; set; }
    public int TodayUnitsSold { get; set; }
    public decimal TodayPaidRevenue { get; set; }
    public int OpenOrdersCount { get; set; }
    public int PendingOrdersCount { get; set; }
    public int ProcessingOrdersCount { get; set; }
    public int LowStockCount { get; set; }
    public int OutOfStockCount { get; set; }
    public int PendingRequisitionsCount { get; set; }
    public int DraftPurchaseOrdersCount { get; set; }
    public decimal? TotalPaidRevenue { get; set; }
    public List<LowStockAlertDto> LowStockAlerts { get; set; } = new();
}

// ── Daily Summary Report ─────────────────────────────────────────────────────

public class OrderStatusSummaryDto
{
    public string Status { get; set; } = string.Empty;
    public int OrderCount { get; set; }
    public decimal TotalAmount { get; set; }
}

public class DailySummaryReportDto
{
    public DateTime Date { get; set; }
    public int OrdersCount { get; set; }
    public int CancelledOrdersCount { get; set; }
    public int OnlineOrdersCount { get; set; }
    public decimal OnlineSalesTotal { get; set; }
    public int WalkInOrdersCount { get; set; }
    public decimal WalkInSalesTotal { get; set; }
    public decimal TotalSales { get; set; }
    public decimal TotalDiscounts { get; set; }
    public int UnitsSold { get; set; }
    public int InvoicesIssuedCount { get; set; }
    public int InvoicesPaidCount { get; set; }
    public decimal PaymentsCollectedToday { get; set; }
    public int LowStockAlertsCount { get; set; }
    public List<OrderStatusSummaryDto> ByStatus { get; set; } = new();
}

// ── Sales Revenue & Profit Report ────────────────────────────────────────────

public class ChannelSalesSummaryDto
{
    public string Channel { get; set; } = string.Empty;
    public int OrderCount { get; set; }
    public int UnitsSold { get; set; }
    public decimal Revenue { get; set; }
}

public class DailySalesPointDto
{
    public string Date { get; set; } = string.Empty;
    public int OrderCount { get; set; }
    public int UnitsSold { get; set; }
    public decimal Revenue { get; set; }
    public decimal CostOfGoodsSold { get; set; }
    public decimal Profit { get; set; }
}

public class SalesReportDto
{
    public DateTime From { get; set; }
    public DateTime To { get; set; }
    public int OrderCount { get; set; }
    public int CancelledOrderCount { get; set; }
    public decimal CancelledOrderTotal { get; set; }
    public int UnitsSold { get; set; }
    public decimal GrossRevenue { get; set; }
    public decimal TotalDiscounts { get; set; }
    public decimal NetRevenue { get; set; }
    public decimal CostOfGoodsSold { get; set; }
    public decimal GrossProfit { get; set; }
    public decimal GrossMarginPercent { get; set; }
    public decimal CollectedRevenue { get; set; }
    public decimal UnpaidReceivables { get; set; }
    public decimal VoidedInvoicesTotal { get; set; }
    public List<ChannelSalesSummaryDto> ByChannel { get; set; } = new();
    public List<OrderStatusSummaryDto> ByStatus { get; set; } = new();
    public List<DailySalesPointDto> DailyTrend { get; set; } = new();
}

// ── Best Sellers & Dead Stock ────────────────────────────────────────────────

public class BestSellerItemDto
{
    public int VariantId { get; set; }
    public int ProductId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public string Model { get; set; } = string.Empty;
    public string Sku { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public int CurrentStock { get; set; }
    public decimal UnitPrice { get; set; }
    public int UnitsSold { get; set; }
    public int OrderCount { get; set; }
    public decimal GrossSales { get; set; }
    public decimal NetSales { get; set; }
}

public class BestSellersReportDto
{
    public DateTime? From { get; set; }
    public DateTime? To { get; set; }
    public int Limit { get; set; }
    public List<BestSellerItemDto> Items { get; set; } = new();
}

public class DeadStockItemDto
{
    public int VariantId { get; set; }
    public int ProductId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public string Model { get; set; } = string.Empty;
    public string Sku { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public int CurrentStock { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal TiedUpValue { get; set; }
    public int UnitsSoldInWindow { get; set; }
    public DateTime? LastSoldAt { get; set; }
    public string Classification { get; set; } = string.Empty;
}

public class DeadStockReportDto
{
    public int LookbackDays { get; set; }
    public int MaxUnitsSold { get; set; }
    public int ItemCount { get; set; }
    public int TotalDeadStockUnits { get; set; }
    public decimal TotalTiedUpValue { get; set; }
    public List<DeadStockItemDto> Items { get; set; } = new();
}

// ── Inventory Valuation ──────────────────────────────────────────────────────

public class CategoryValuationDto
{
    public string Category { get; set; } = string.Empty;
    public int VariantCount { get; set; }
    public int TotalUnits { get; set; }
    public decimal TotalRetailValue { get; set; }
}

public class InventoryValuationItemDto
{
    public int VariantId { get; set; }
    public int ProductId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public string Model { get; set; } = string.Empty;
    public string Sku { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public int Stock { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal RetailValue { get; set; }
    public decimal? AverageUnitCost { get; set; }
    public decimal? CostValue { get; set; }
}

public class InventoryValuationReportDto
{
    public DateTime GeneratedAt { get; set; }
    public int TotalVariants { get; set; }
    public int TotalUnitsInStock { get; set; }
    public decimal TotalRetailValue { get; set; }
    public decimal TotalCostValue { get; set; }
    public List<CategoryValuationDto> ByCategory { get; set; } = new();
    public List<InventoryValuationItemDto> Items { get; set; } = new();
}

// ── Quote Conversion ─────────────────────────────────────────────────────────

public class QuoteConversionReportDto
{
    public DateTime? From { get; set; }
    public DateTime? To { get; set; }
    public int TotalQuotations { get; set; }
    public int DraftCount { get; set; }
    public int SentCount { get; set; }
    public int AwaitingResponseCount { get; set; }
    public int ExpiredCount { get; set; }
    public int AcceptedCount { get; set; }
    public int ConvertedCount { get; set; }
    public int DeclinedCount { get; set; }
    public decimal AcceptanceRatePercent { get; set; }
    public decimal ConversionRatePercent { get; set; }
    public decimal TotalSentValue { get; set; }
    public decimal TotalAcceptedValue { get; set; }
    public decimal TotalConvertedValue { get; set; }
    public decimal TotalDeclinedValue { get; set; }
    public double? AverageResponseHours { get; set; }
}
