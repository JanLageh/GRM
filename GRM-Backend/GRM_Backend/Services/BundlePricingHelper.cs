using GRM_Backend.Models;

namespace GRM_Backend.Services;

public record AllocatedBundleLine(int VariantId, int Quantity, decimal UnitPrice, int BundleId, string BundleName);

/// <summary>Computes bundle availability and proportionally allocates bundle pricing across component variants.</summary>
public static class BundlePricingHelper
{
    public static int GetAvailableStock(Bundle bundle)
    {
        if (bundle.Items.Count == 0)
            return 0;

        var min = int.MaxValue;
        foreach (var item in bundle.Items)
        {
            if (item.Quantity <= 0 || item.Variant == null || item.Variant.Product is { IsActive: false })
                return 0;

            var possible = item.Variant.Stock / item.Quantity;
            if (possible < min)
                min = possible;
        }

        return min == int.MaxValue ? 0 : Math.Max(0, min);
    }

    public static List<AllocatedBundleLine> ExpandBundle(Bundle bundle, int bundleQuantity)
    {
        var items = bundle.Items.OrderBy(i => i.Id).ToList();
        if (items.Count == 0 || bundleQuantity <= 0)
            return new List<AllocatedBundleLine>();

        var retailTotal = items.Sum(i => (i.Variant?.Price ?? 0m) * i.Quantity);

        // Pick an absorber item (prefer Quantity == 1 with positive price) so per-bundle line totals sum cleanly to bundle.Price
        var absorberIdx = -1;
        for (var i = items.Count - 1; i >= 0; i--)
        {
            if (items[i].Quantity == 1 && (items[i].Variant?.Price ?? 0m) > 0m)
            {
                absorberIdx = i;
                break;
            }
        }
        if (absorberIdx == -1)
        {
            for (var i = items.Count - 1; i >= 0; i--)
            {
                if (items[i].Quantity == 1)
                {
                    absorberIdx = i;
                    break;
                }
            }
        }
        if (absorberIdx == -1)
        {
            var minQty = items.Min(x => x.Quantity);
            for (var i = items.Count - 1; i >= 0; i--)
            {
                if (items[i].Quantity == minQty)
                {
                    absorberIdx = i;
                    break;
                }
            }
        }

        var unitPrices = new decimal[items.Count];
        var totalUnits = items.Sum(x => x.Quantity);
        var allocatedForOne = 0m;

        for (var i = 0; i < items.Count; i++)
        {
            if (i == absorberIdx) continue;

            decimal unitPrice;
            if (retailTotal > 0m)
                unitPrice = Math.Round(bundle.Price * ((items[i].Variant?.Price ?? 0m) / retailTotal), 2, MidpointRounding.AwayFromZero);
            else
                unitPrice = totalUnits > 0 ? Math.Round(bundle.Price / totalUnits, 2, MidpointRounding.AwayFromZero) : 0m;

            unitPrices[i] = unitPrice;
            allocatedForOne += unitPrice * items[i].Quantity;
        }

        var remaining = Math.Max(0m, bundle.Price - allocatedForOne);
        unitPrices[absorberIdx] = items[absorberIdx].Quantity > 0
            ? Math.Round(remaining / items[absorberIdx].Quantity, 2, MidpointRounding.AwayFromZero)
            : 0m;

        var result = new List<AllocatedBundleLine>(items.Count);
        for (var i = 0; i < items.Count; i++)
        {
            result.Add(new AllocatedBundleLine(
                VariantId: items[i].VariantId,
                Quantity: items[i].Quantity * bundleQuantity,
                UnitPrice: unitPrices[i],
                BundleId: bundle.Id,
                BundleName: bundle.Name));
        }

        return result;
    }
}
