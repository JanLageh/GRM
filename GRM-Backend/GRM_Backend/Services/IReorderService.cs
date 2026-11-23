using GRM_Backend.DTOs;

namespace GRM_Backend.Services;

public interface IReorderService
{
    Task<List<ReorderSuggestionDto>> GetSuggestionsAsync(int lookbackDays = 7, bool includeAll = false);
    Task<RecalculateReorderResponse> RecalculateAsync(int lookbackDays = 7, bool generateDraftPurchaseOrders = true, int? triggeredByUserId = null);
}
