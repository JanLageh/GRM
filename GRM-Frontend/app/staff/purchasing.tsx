import React, { useState } from 'react';
import { View } from 'react-native';
import { useSystem, variantLabel, fmtDate, PurchaseOrder } from '../../context/SystemContext';
import { SkuChips } from './stock';
import { Screen, Card, H1, Muted, Btn, Row, Field, Table, StatusBadge, T } from '../../components/ui';

export function ReceiveBox({ po }: { po: PurchaseOrder }) {
  const { db, receivePO, flash } = useSystem();
  const [rec, setRec] = useState<Record<number, string>>({});
  const go = async () => {
    const m: Record<number, number> = {};
    Object.entries(rec).forEach(([k, v]) => (m[Number(k)] = Number(v) || 0));
    const r = await receivePO(po.id, m);
    if (r.ok) { flash(`Stock received against ${po.id}`); setRec({}); } else flash(r.error, 'err');
  };
  return (
    <View style={{ gap: 8 }}>
      {po.lines.map((l, i) => {
        const v = db.variants.find((x) => x.id === l.variantId);
        const sku = v?.sku ?? l.sku ?? '?';
        const lbl = v ? variantLabel(db, v) : `${l.productName ?? '?'} — ${l.model ?? ''}`;
        return (
          <Row key={i} style={{ alignItems: 'center' }}>
            <View style={{ flex: 2, minWidth: 180 }}><T bold>{sku}</T><Muted>{lbl} · ordered {l.qty} · received {l.received}</Muted></View>
            <Field label="Receive now" value={rec[i] ?? ''} onChangeText={(t) => setRec({ ...rec, [i]: t })} keyboardType="numeric" placeholder={String(l.qty - l.received)} testID={`recv-${po.id}-${i}`} />
          </Row>
        );
      })}
      <View style={{ alignSelf: 'flex-start' }}><Btn kind="ok" title="Record Delivery (Stock-In)" onPress={go} testID={`receive-${po.id}`} /></View>
    </View>
  );
}

export default function StaffPurchasing() {
  const { db, createRequisition, flash } = useSystem();
  const [vid, setVid] = useState('');
  const [qty, setQty] = useState('10');
  const [why, setWhy] = useState('Low stock');
  const submit = async () => {
    const r = await createRequisition({ variantId: vid, qty: Number(qty), reason: why });
    if (r.ok) flash('Purchase requisition submitted to Admin'); else flash(r.error, 'err');
  };
  const receivable = db.pos.filter((p) => p.status === 'Approved' || p.status === 'Sent');
  return (
    <Screen>
      <H1>Purchasing</H1>
      <Card title="Submit Purchase Requisition">
        <SkuChips value={vid} onChange={setVid} />
        <Row><Field label="Quantity needed" value={qty} onChangeText={setQty} keyboardType="numeric" /><Field label="Reason" value={why} onChangeText={setWhy} /></Row>
        <View style={{ alignSelf: 'flex-start' }}><Btn title="Submit Requisition" onPress={submit} disabled={!vid} testID="req-submit" /></View>
      </Card>
      <Card title="My requisitions">
        <Table head={['ID', 'Variant', 'Qty', 'Reason', 'Status', 'PO']} widths={[0.8, 2, 0.5, 1.6, 0.9, 0.8]}
          rows={db.requisitions.slice().reverse().map((r) => {
            const v = db.variants.find((x) => x.id === r.variantId);
            const lbl = v ? variantLabel(db, v) : `${r.productName ?? '?'} — ${r.model ?? r.sku ?? ''}`;
            return [r.id, lbl, String(r.qty), r.reason, <StatusBadge s={r.status} />, r.poId ?? '—'];
          })} />
      </Card>
      <Card title="Receive Stock (Approved / Sent Purchase Orders)">
        {receivable.length === 0 && <Muted>No Approved or Sent purchase orders awaiting delivery.</Muted>}
        {receivable.map((po) => (
          <View key={po.id} style={{ gap: 8, borderTopWidth: 1, borderTopColor: '#E5E7EB', paddingTop: 10 }}>
            <Row style={{ alignItems: 'center' }}><T bold>{po.id}</T><StatusBadge s={po.status} /><Muted>{po.supplierName ?? db.suppliers.find((s) => s.id === po.supplierId)?.name ?? 'No supplier'} · {fmtDate(po.createdAt)}</Muted></Row>
            <ReceiveBox po={po} />
          </View>
        ))}
      </Card>
    </Screen>
  );
}

