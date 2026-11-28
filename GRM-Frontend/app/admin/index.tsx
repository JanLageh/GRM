import React from 'react';
import { useRouter } from 'expo-router';
import { useSystem, peso, variantLabel, velocityOf, thresholdOf, isLow } from '../../context/SystemContext';
import { Screen, H1, Card, Kpi, Row, Table, Btn, Muted } from '../../components/ui';

export default function AdminDashboard() {
  const { db, recalculateReorder, flash } = useSystem();
  const router = useRouter();
  const revenue = db.invoices.filter((i) => i.status === 'Paid').reduce((a, i) => a + i.amount, 0);
  const active = db.orders.filter((o) => o.status === 'Pending' || o.status === 'Processing').length;
  const reqs = db.requisitions.filter((r) => r.status === 'Pending').length;
  const drafts = db.pos.filter((p) => p.status === 'Draft').length;
  const low = db.variants.filter((v) => v.active && isLow(v));
  const recalc = async () => {
    const r = await recalculateReorder();
    flash(r.ok ? `Reorder recalculated (${r.data.draftPurchaseOrdersCreated} draft POs created)` : r.error, r.ok ? 'ok' : 'err');
  };
  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between', alignItems: 'center' }}><H1>Executive Dashboard</H1><Btn small kind="ghost" title="Recalculate Reorder" onPress={recalc} /></Row>
      <Row style={{ alignItems: 'stretch' }}>
        <Kpi label="Total revenue (paid)" value={peso(revenue)} tone="ok" />
        <Kpi label="Active orders" value={String(active)} />
        <Kpi label="Pending requisitions" value={String(reqs)} />
        <Kpi label="Draft POs" value={String(drafts)} />
        <Kpi label="Low-stock alerts" value={String(low.length)} tone={low.length ? 'err' : undefined} />
      </Row>
      <Card title="Low-stock alerts" right={<Btn small title="Review Draft POs" onPress={() => router.push('/admin/purchasing')} />}>
        {low.length === 0 ? <Muted>No variants at or below reorder threshold.</Muted> :
          <Table head={['Variant', 'SKU', 'Stock', 'Velocity', 'Reorder at']} widths={[2.2, 1, 0.6, 1, 1]} rows={low.map((v) => [variantLabel(db, v), v.sku, String(v.stock), velocityOf(v).toFixed(2) + '/day', String(thresholdOf(v))])} />}
      </Card>
    </Screen>
  );
}

