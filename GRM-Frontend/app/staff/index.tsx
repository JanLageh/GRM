import React from 'react';
import { View } from 'react-native';
import { useSystem, peso, velocityOf, thresholdOf, variantLabel, isLow } from '../../context/SystemContext';
import { Screen, H1, Card, Kpi, Row, Table, Badge, Muted } from '../../components/ui';

export const isToday = (iso: string) => new Date(iso).toDateString() === new Date().toDateString();

export default function StaffDashboard() {
  const { db } = useSystem();
  const today = db.orders.filter((o) => isToday(o.createdAt) && o.status !== 'Cancelled');
  const low = db.variants.filter((v) => v.active && isLow(v));
  const rows = (vs: typeof db.variants) => vs.map((v) => [variantLabel(db, v), v.sku, String(v.stock), velocityOf(v).toFixed(2) + '/day', String(thresholdOf(v)), isLow(v) ? <Badge text="LOW" tone="warn" /> : <Badge text="OK" tone="ok" />]);
  return (
    <Screen>
      <H1>Staff Dashboard</H1>
      <Row style={{ alignItems: 'stretch' }}>
        <Kpi label="Today's sales" value={peso(today.reduce((a, o) => a + o.total, 0))} tone="ok" />
        <Kpi label="Orders today" value={String(today.length)} />
        <Kpi label="Open orders" value={String(db.orders.filter((o) => o.status === 'Pending' || o.status === 'Processing').length)} />
        <Kpi label="Low-stock alerts" value={String(low.length)} tone={low.length ? 'err' : undefined} />
      </Row>
      <Card title="Low-Stock Alerts (StockCount ≤ ReorderThreshold)">
        {low.length === 0 ? <Muted>All variants above their reorder thresholds.</Muted> : <Table head={['Variant', 'SKU', 'Stock', 'Velocity', 'Threshold', 'Status']} widths={[2.2, 1, 0.6, 1, 0.8, 0.8]} rows={rows(low)} />}
      </Card>
      <Card title="Real-time variant stock levels">
        <Table head={['Variant', 'SKU', 'Stock', 'Velocity', 'Threshold', 'Status']} widths={[2.2, 1, 0.6, 1, 0.8, 0.8]} rows={rows(db.variants)} />
      </Card>
    </Screen>
  );
}

