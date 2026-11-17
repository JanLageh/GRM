import React, { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSystem, variantLabel, velocityOf, thresholdOf, isLow, fmtDate, PurchaseOrder } from '../../context/SystemContext';
import { ReceiveBox } from '../staff/purchasing';
import { Screen, Card, H1, Muted, T, Btn, Row, Field, Table, StatusBadge, Badge } from '../../components/ui';

function SupplierChips({ value, onChange }: { value: string | null; onChange: (id: string) => void }) {
  const { db } = useSystem();
  return <Row style={{ alignItems: 'center' }}>{db.suppliers.map((s) => <Btn key={s.id} small kind={value === s.id ? 'primary' : 'ghost'} title={s.name} onPress={() => onChange(s.id)} />)}</Row>;
}

function POCard({ po }: { po: PurchaseOrder }) {
  const { db, updatePO, setPOStatus, discardPO, flash } = useSystem();
  const router = useRouter();
  const [qty, setQty] = useState(po.lines.map((l) => String(l.qty)));
  const act = (r: any, m: string) => flash(r.ok ? m : r.error, r.ok ? 'ok' : 'err');
  const editable = po.status === 'Draft' || po.status === 'Approved';
  const saveQty = () => act(updatePO(po.id, { lines: po.lines.map((l, i) => ({ ...l, qty: Number(qty[i]) })) }), `${po.id} updated`);
  return (
    <View testID={`po-${po.id}`} style={{ gap: 8, borderTopWidth: 1, borderTopColor: '#E5E7EB', paddingTop: 12 }}>
      <Row style={{ alignItems: 'center' }}><T bold>{po.id}</T><StatusBadge s={po.status} /><Badge text={po.source} /><Muted>{fmtDate(po.createdAt)}</Muted></Row>
      <Muted>{po.note}</Muted>
      {po.lines.map((l, i) => {
        const v = db.variants.find((x) => x.id === l.variantId)!;
        return (
          <Row key={i} style={{ alignItems: 'center' }}>
            <View style={{ flex: 2, minWidth: 200 }}><T bold>{v.sku}</T><Muted>{variantLabel(db, v)} · stock {v.stock} · received {l.received}</Muted></View>
            {editable ? <Field label="Order qty" value={qty[i]} onChangeText={(t) => setQty(qty.map((x, k) => (k === i ? t : x)))} keyboardType="numeric" testID={`poqty-${po.id}`} /> : <T bold>Qty {l.qty}</T>}
          </Row>
        );
      })}
      <Muted>Supplier: {db.suppliers.find((s) => s.id === po.supplierId)?.name ?? 'unassigned'}</Muted>
      {editable && <SupplierChips value={po.supplierId} onChange={(id) => act(updatePO(po.id, { supplierId: id }), 'Supplier assigned')} />}
      <Row>
        {editable && <Btn small kind="ghost" title="Save quantities" onPress={saveQty} />}
        {po.status === 'Draft' && <Btn small kind="ok" title="Approve → Official PO" onPress={() => { saveQty(); act(setPOStatus(po.id, 'Approved'), `${po.id} approved`); }} testID={`approve-${po.id}`} />}
        {po.status === 'Approved' && <Btn small title="Mark Sent to Supplier" onPress={() => act(setPOStatus(po.id, 'Sent'), `${po.id} sent`)} testID={`send-${po.id}`} />}
        {po.status === 'Draft' && <Btn small kind="danger" title="Discard" onPress={() => act(discardPO(po.id), 'Draft discarded')} />}
        <Btn small kind="ghost" title="Print PO" onPress={() => router.push(`/admin/po/${po.id}` as any)} />
      </Row>
      {(po.status === 'Approved' || po.status === 'Sent') && <ReceiveBox po={po} />}
    </View>
  );
}

export default function AdminPurchasing() {
  const { db, decideRequisition, flash } = useSystem();
  const [sup, setSup] = useState<Record<string, string>>({});
  const decide = (id: string, ok: boolean) => { const r = decideRequisition(id, ok, sup[id] ?? db.suppliers[0]?.id); flash(r.ok ? (ok ? 'Requisition approved → PO created' : 'Requisition declined') : r.error, r.ok ? 'ok' : 'err'); };
  const drafts = db.pos.filter((p) => p.status === 'Draft');
  const rest = db.pos.filter((p) => p.status !== 'Draft').slice().reverse();
  return (
    <Screen>
      <H1>Purchasing, Reorder & Purchase Orders</H1>
      <Card title="Dynamic reorder settings (7-day moving average)">
        <Muted>ReorderThreshold = ceil(SalesVelocity × 7-day lead time) + 2 safety units. It recalculates after every sale.</Muted>
        <Table head={['Variant', 'SKU', 'Stock', 'Velocity (units/day)', 'Reorder threshold', 'Status']} widths={[2.2, 1, 0.6, 1.2, 1.1, 0.8]}
          rows={db.variants.map((v) => [variantLabel(db, v), v.sku, String(v.stock), velocityOf(v).toFixed(2), String(thresholdOf(v)), isLow(v) ? <Badge text="REORDER" tone="warn" /> : <Badge text="OK" tone="ok" />])} />
      </Card>
      <Card title={`System Draft Purchase Orders (${drafts.length})`}>
        {drafts.length === 0 && <Muted>No drafts. They appear automatically when a variant hits its reorder threshold.</Muted>}
        {drafts.map((p) => <POCard key={p.id + p.lines[0]?.qty + p.supplierId} po={p} />)}
      </Card>
      <Card title="Staff Purchase Requisitions">
        {db.requisitions.length === 0 && <Muted>No requisitions.</Muted>}
        {db.requisitions.slice().reverse().map((r) => {
          const v = db.variants.find((x) => x.id === r.variantId)!;
          return (
            <View key={r.id} style={{ gap: 6, borderTopWidth: 1, borderTopColor: '#E5E7EB', paddingTop: 10 }}>
              <Row style={{ alignItems: 'center' }}><T bold>{r.id}</T><StatusBadge s={r.status} /><T>{r.qty} × {v.sku}</T><Muted>by {r.requestedBy} — {r.reason}</Muted></Row>
              {r.status === 'Pending' && (<>
                <Row style={{ alignItems: 'center' }}>{db.suppliers.map((s) => <Btn key={s.id} small kind={(sup[r.id] ?? db.suppliers[0]?.id) === s.id ? 'primary' : 'ghost'} title={s.name} onPress={() => setSup({ ...sup, [r.id]: s.id })} />)}</Row>
                <Row><Btn small kind="ok" title="Approve → create PO" onPress={() => decide(r.id, true)} testID={`req-approve-${r.id}`} /><Btn small kind="danger" title="Decline" onPress={() => decide(r.id, false)} /></Row>
              </>)}
            </View>
          );
        })}
      </Card>
      <Card title="Purchase Orders (Approved · Sent · Received)">
        {rest.length === 0 && <Muted>No official purchase orders yet.</Muted>}
        {rest.map((p) => <POCard key={p.id + p.status + p.lines.map((l) => l.received).join()} po={p} />)}
      </Card>
    </Screen>
  );
}

