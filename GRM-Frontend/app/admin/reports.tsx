import React, { useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import { useSystem, peso, variantLabel } from '../../context/SystemContext';
import { grmApi, ApiSalesReportDto } from '../../services/grmApi';
import { Screen, Card, H1, Muted, Row, Kpi, Table, T, Chips, Btn, Badge, noPrint } from '../../components/ui';

type ReportPeriod = 'Weekly' | 'Monthly' | 'Yearly' | 'All Time';

const PERIODS: ReportPeriod[] = ['Weekly', 'Monthly', 'Yearly', 'All Time'];

function formatDateISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getDateRange(period: ReportPeriod): { fromDate: Date | null; toDate: Date; fromStr?: string; toStr: string; label: string } {
  const now = new Date();
  const toDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  const toStr = formatDateISO(toDate);

  if (period === 'Weekly') {
    const fromDate = new Date(toDate);
    fromDate.setDate(fromDate.getDate() - 6);
    fromDate.setHours(0, 0, 0, 0);
    const fromStr = formatDateISO(fromDate);
    return { fromDate, toDate, fromStr, toStr, label: `Last 7 days (${fromStr} → ${toStr})` };
  }
  if (period === 'Monthly') {
    const fromDate = new Date(toDate);
    fromDate.setDate(fromDate.getDate() - 29);
    fromDate.setHours(0, 0, 0, 0);
    const fromStr = formatDateISO(fromDate);
    return { fromDate, toDate, fromStr, toStr, label: `Last 30 days (${fromStr} → ${toStr})` };
  }
  if (period === 'Yearly') {
    const fromDate = new Date(toDate.getFullYear() - 1, toDate.getMonth(), toDate.getDate() + 1, 0, 0, 0, 0);
    const fromStr = formatDateISO(fromDate);
    return { fromDate, toDate, fromStr, toStr, label: `Last 12 months (${fromStr} → ${toStr})` };
  }
  return { fromDate: null, toDate, toStr, label: 'All recorded history' };
}

function bucketKeyForDate(isoDate: string, period: ReportPeriod): string {
  const d = new Date(isoDate.length === 10 ? `${isoDate}T00:00:00` : isoDate);
  if (Number.isNaN(d.getTime())) return isoDate.slice(0, 10);
  if (period === 'Weekly') {
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }
  if (period === 'Monthly') {
    // Group by ISO week start (Monday)
    const copy = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const day = copy.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    copy.setDate(copy.getDate() + diff);
    return `Week of ${copy.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  }
  // Yearly or All Time -> group by Month (e.g. Nov 2026)
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

export default function Reports() {
  const { db, apiOnline } = useSystem();
  const [period, setPeriod] = useState<ReportPeriod>('Monthly');
  const [apiReport, setApiReport] = useState<ApiSalesReportDto | null>(null);
  const [loading, setLoading] = useState(false);

  const range = useMemo(() => getDateRange(period), [period]);

  useEffect(() => {
    let cancelled = false;
    if (!apiOnline) {
      setApiReport(null);
      return;
    }
    setLoading(true);
    const fromArg = period === 'All Time' ? '2020-01-01' : range.fromStr;
    grmApi.reports
      .sales(fromArg, range.toStr)
      .then((res) => {
        if (!cancelled) setApiReport(res);
      })
      .catch(() => {
        if (!cancelled) setApiReport(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [apiOnline, period, range.fromStr, range.toStr]);

  const inRange = (iso?: string | null) => {
    if (!range.fromDate) return true;
    if (!iso) return false;
    const t = new Date(iso).getTime();
    return t >= range.fromDate.getTime() && t <= range.toDate.getTime();
  };

  // Local filtered metrics (used as fallback or alongside API metrics)
  const filteredOrders = db.orders.filter((o) => inRange(o.createdAt));
  const filteredInvoices = db.invoices.filter((i) => inRange(i.issuedAt));
  const filteredMovements = db.movements.filter((m) => inRange(m.at));
  const filteredQuotes = db.quotations.filter((q) => q.status !== 'Requested' && inRange(q.createdAt));

  const sold = (vid: string) =>
    -filteredMovements
      .filter((m) => m.variantId === vid && (m.type === 'Sale' || m.type === 'Cancel-Restock'))
      .reduce((a, m) => a + m.qty, 0);

  const stats = db.variants.map((v) => ({ v, sold: sold(v.id) })).sort((a, b) => b.sold - a.sold);
  const best = stats.filter((s) => s.sold > 0).slice(0, 5);
  const dead = stats.filter((s) => s.sold === 0 && s.v.stock > 0);
  const slow = stats.filter((s) => s.sold > 0).slice(-3).reverse();

  const paid = apiReport ? Number(apiReport.collectedRevenue) : filteredInvoices.filter((i) => i.status === 'Paid').reduce((a, i) => a + i.amount, 0);
  const unpaid = apiReport ? Number(apiReport.unpaidReceivables) : filteredInvoices.filter((i) => i.status === 'Unpaid').reduce((a, i) => a + i.amount, 0);
  const voided = apiReport ? Number(apiReport.voidedInvoicesTotal) : filteredInvoices.filter((i) => i.status === 'Voided').reduce((a, i) => a + i.amount, 0);
  const netSales = apiReport ? Number(apiReport.netRevenue) : filteredOrders.filter((o) => o.status !== 'Cancelled').reduce((a, o) => a + o.total, 0);
  const totalOrders = apiReport ? apiReport.orderCount : filteredOrders.filter((o) => o.status !== 'Cancelled').length;
  const totalUnits = apiReport
    ? apiReport.unitsSold
    : filteredOrders
      .filter((o) => o.status !== 'Cancelled')
      .reduce((a, o) => a + o.lines.reduce((s, l) => s + l.qty, 0), 0);

  const val = db.variants.reduce((a, v) => a + v.stock * v.price, 0);
  const acc = filteredQuotes.filter((q) => q.status === 'Accepted').length;
  const rate = filteredQuotes.length ? Math.round((acc / filteredQuotes.length) * 100) : 0;
  const lbl = (s: (typeof stats)[number]) => `${s.v.sku} · ${variantLabel(db, s.v)}`;

  // Period Breakdown Rows (Daily for Weekly, Weekly for Monthly, Monthly for Yearly/All Time)
  const breakdownRows = useMemo(() => {
    const map = new Map<string, { orders: number; units: number; revenue: number }>();

    if (apiReport && apiReport.dailyTrend.length > 0) {
      for (const pt of apiReport.dailyTrend) {
        const key = bucketKeyForDate(pt.date, period);
        const cur = map.get(key) ?? { orders: 0, units: 0, revenue: 0 };
        cur.orders += pt.orderCount;
        cur.units += pt.unitsSold;
        cur.revenue += Number(pt.revenue);
        map.set(key, cur);
      }
    } else {
      const activeOrders = filteredOrders
        .filter((o) => o.status !== 'Cancelled')
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      for (const o of activeOrders) {
        const key = bucketKeyForDate(o.createdAt, period);
        const cur = map.get(key) ?? { orders: 0, units: 0, revenue: 0 };
        cur.orders += 1;
        cur.units += o.lines.reduce((s, l) => s + l.qty, 0);
        cur.revenue += o.total;
        map.set(key, cur);
      }
    }

    return Array.from(map.entries()).map(([bucket, m]) => [
      bucket,
      String(m.orders),
      String(m.units),
      peso(m.revenue),
    ]);
  }, [apiReport, filteredOrders, period]);

  const statusRows = useMemo(() => {
    if (apiReport && apiReport.byStatus.length > 0) {
      return apiReport.byStatus.map((s) => [s.status, String(s.orderCount), peso(Number(s.totalAmount))]);
    }
    return (['Pending', 'Processing', 'Completed', 'Cancelled'] as const).map((st) => {
      const o = filteredOrders.filter((x) => x.status === st);
      return [st, String(o.length), peso(o.reduce((a, x) => a + x.total, 0))];
    });
  }, [apiReport, filteredOrders]);

  const channelRows = useMemo(() => {
    if (apiReport && apiReport.byChannel.length > 0) {
      return apiReport.byChannel.map((c) => [c.channel, String(c.orderCount), String(c.unitsSold), peso(Number(c.revenue))]);
    }
    return (['Online', 'WalkIn'] as const).map((ch) => {
      const o = filteredOrders.filter((x) => x.status !== 'Cancelled' && x.channel === ch);
      const u = o.reduce((a, x) => a + x.lines.reduce((s, l) => s + l.qty, 0), 0);
      return [ch, String(o.length), String(u), peso(o.reduce((a, x) => a + x.total, 0))];
    });
  }, [apiReport, filteredOrders]);

  const breakdownTitle =
    period === 'Weekly'
      ? 'Weekly Report — Daily Breakdown'
      : period === 'Monthly'
        ? 'Monthly Report — Weekly Breakdown'
        : period === 'Yearly'
          ? 'Yearly Report — Monthly Breakdown'
          : 'All-Time Report — Monthly Breakdown';

  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <H1>Analytical Reports</H1>
        <Row {...noPrint} style={{ alignItems: 'center' }}>
          <Badge text={range.label} tone="neutral" />
          {Platform.OS === 'web' && (
            <Btn small kind="ghost" title="Print Report" onPress={() => typeof window !== 'undefined' && window.print()} />
          )}
        </Row>
      </Row>

      <Card title="Report Period" {...noPrint}>
        <Row style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <Chips options={PERIODS} value={period} onChange={setPeriod} />
          {loading ? <Muted>Refreshing from PostgreSQL...</Muted> : <Muted>{apiReport ? 'Live from PostgreSQL' : 'Local summary'}</Muted>}
        </Row>
      </Card>

      <Row style={{ alignItems: 'stretch' }}>
        <Kpi label={`${period} Net Sales (${totalOrders} orders)`} value={peso(netSales)} tone="ok" />
        <Kpi label="Revenue collected" value={peso(paid)} tone="ok" />
        <Kpi label="Unpaid receivables" value={peso(unpaid)} />
        <Kpi label="Voided" value={peso(voided)} />
        <Kpi label="Inventory valuation" value={peso(val)} />
        <Kpi label="Quotation conversion" value={`${rate}% (${acc}/${filteredQuotes.length})`} />
      </Row>

      <Card title={breakdownTitle}>
        {breakdownRows.length === 0 ? (
          <Muted>No completed or active sales recorded in this period.</Muted>
        ) : (
          <Table
            head={[period === 'Weekly' ? 'Day' : period === 'Monthly' ? 'Week' : 'Month', 'Orders', 'Units sold', 'Net sales']}
            widths={[2.2, 0.8, 0.9, 1.3]}
            rows={[
              ...breakdownRows,
              [<T bold>TOTAL</T>, <T bold>{String(totalOrders)}</T>, <T bold>{String(totalUnits)}</T>, <T bold>{peso(netSales)}</T>],
            ]}
          />
        )}
      </Card>

      <Card title={`Sales by channel (${period})`}>
        <Table head={['Channel', 'Orders', 'Units sold', 'Net sales']} widths={[1.6, 0.8, 1, 1.3]} rows={channelRows} />
      </Card>

      <Card title={`Revenue summary by order status (${period})`}>
        <Table head={['Status', 'Orders', 'Total']} rows={statusRows} />
      </Card>

      <Card title={`Best-selling variants (${period})`}>
        {best.length === 0 ? (
          <Muted>No variant sales recorded in this period.</Muted>
        ) : (
          <Table head={['Variant', 'Units sold']} widths={[3, 1]} rows={best.map((s) => [lbl(s), String(s.sold)])} />
        )}
      </Card>

      <Card title="Slow-moving & dead stock">
        <Muted>Dead stock = in stock with zero sales recorded in this period. Slow-moving = lowest sellers with sales.</Muted>
        <Table
          head={['Variant', 'Class', 'Stock', 'Tied-up value']}
          widths={[3, 1, 0.6, 1.2]}
          rows={[
            ...dead.map((s) => [lbl(s), 'Dead', String(s.v.stock), peso(s.v.stock * s.v.price)]),
            ...slow.map((s) => [lbl(s), 'Slow', String(s.v.stock), peso(s.v.stock * s.v.price)]),
          ]}
        />
      </Card>

      <Card title="Inventory valuation (Stock × Price)">
        <Table
          head={['Variant', 'Stock', 'Price', 'Value']}
          widths={[3, 0.6, 1, 1.2]}
          rows={[
            ...db.variants.map((v) => [`${v.sku} · ${variantLabel(db, v)}`, String(v.stock), peso(v.price), peso(v.stock * v.price)]),
            ['TOTAL', '', '', <T bold>{peso(val)}</T>],
          ]}
        />
      </Card>
    </Screen>
  );
}
