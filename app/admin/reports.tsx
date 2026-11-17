import React from 'react';
import { useSystem, peso, variantLabel } from '../../context/SystemContext';
import { Screen, Card, H1, Muted, Row, Kpi, Table, T } from '../../components/ui';

export default function Reports() {
  const { db } = useSystem();
  const sold = (vid: string) => -db.movements.filter((m) => m.variantId === vid && (m.type === 'Sale' || m.type === 'Cancel-Restock')).reduce((a, m) => a + m.qty, 0);
  const stats = db.variants.map((v) => ({ v, sold: sold(v.id) })).sort((a, b) => b.sold - a.sold);
  const best = stats.filter((s) => s.sold > 0).slice(0, 5);
  const dead = stats.filter((s) => s.sold === 0 && s.v.stock > 0);
  const slow = stats.filter((s) => s.sold > 0).slice(-3).reverse();
  const paid = db.invoices.filter((i) => i.status === 'Paid').reduce((a, i) => a + i.amount, 0);
  const unpaid = db.invoices.filter((i) => i.status === 'Unpaid').reduce((a, i) => a + i.amount, 0);
  const voided = db.invoices.filter((i) => i.status === 'Voided').reduce((a, i) => a + i.amount, 0);
  const val = db.variants.reduce((a, v) => a + v.stock * v.price, 0);
  const qs = db.quotations.filter((q) => q.status !== 'Requested');
  const acc = qs.filter((q) => q.status === 'Accepted').length;
  const rate = qs.length ? Math.round((acc / qs.length) * 100) : 0;
  const lbl = (s: (typeof stats)[number]) => `${s.v.sku} · ${variantLabel(db, s.v)}`;
  return (
    <Screen>
      <H1>Analytical Reports</H1>
      <Row style={{ alignItems: 'stretch' }}>
        <Kpi label="Revenue collected" value={peso(paid)} tone="ok" /><Kpi label="Unpaid receivables" value={peso(unpaid)} /><Kpi label="Voided" value={peso(voided)} />
        <Kpi label="Inventory valuation" value={peso(val)} /><Kpi label="Quotation conversion" value={`${rate}% (${acc}/${qs.length})`} />
      </Row>
      <Card title="Best-selling variants"><Table head={['Variant', 'Units sold']} widths={[3, 1]} rows={best.map((s) => [lbl(s), String(s.sold)])} /></Card>
      <Card title="Slow-moving & dead stock">
        <Muted>Dead stock = in stock with zero sales recorded. Slow-moving = lowest sellers with sales.</Muted>
        <Table head={['Variant', 'Class', 'Stock', 'Tied-up value']} widths={[3, 1, 0.6, 1.2]}
          rows={[...dead.map((s) => [lbl(s), 'Dead', String(s.v.stock), peso(s.v.stock * s.v.price)]), ...slow.map((s) => [lbl(s), 'Slow', String(s.v.stock), peso(s.v.stock * s.v.price)])]} />
      </Card>
      <Card title="Revenue summary by order status">
        <Table head={['Status', 'Orders', 'Total']} rows={(['Pending', 'Processing', 'Completed', 'Cancelled'] as const).map((st) => { const o = db.orders.filter((x) => x.status === st); return [st, String(o.length), peso(o.reduce((a, x) => a + x.total, 0))]; })} />
      </Card>
      <Card title="Inventory valuation (Stock × Price)">
        <Table head={['Variant', 'Stock', 'Price', 'Value']} widths={[3, 0.6, 1, 1.2]} rows={[...db.variants.map((v) => [`${v.sku} · ${variantLabel(db, v)}`, String(v.stock), peso(v.price), peso(v.stock * v.price)]), ['TOTAL', '', '', <T bold>{peso(val)}</T>]]} />
      </Card>
    </Screen>
  );
}

