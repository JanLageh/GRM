import React, { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSystem, peso, fmtDT } from '../../context/SystemContext';
import { SkuChips } from '../staff/stock';
import { Screen, Card, H1, Muted, T, Btn, Row, Field, Table, StatusBadge } from '../../components/ui';

function InvoiceRow({ id }: { id: string }) {
  const { db, voidInvoice, markPaid, flash } = useSystem();
  const router = useRouter();
  const [reason, setReason] = useState('');
  const i = db.invoices.find((x) => x.id === id)!;
  const act = (r: any, m: string) => flash(r.ok ? m : r.error, r.ok ? 'ok' : 'err');
  return (
    <Row style={{ alignItems: 'center', borderTopWidth: 1, borderTopColor: '#E5E7EB', paddingTop: 8 }}>
      <View style={{ minWidth: 150 }}><T bold>{i.id}</T><Muted>{i.orderId} · {peso(i.amount)}</Muted></View>
      <StatusBadge s={i.status} />
      {i.status === 'Unpaid' && <Btn small kind="ok" title="Mark Paid" onPress={() => act(markPaid(i.id), `${i.id} Paid`)} />}
      {i.status !== 'Voided' && (<>
        <Field label="Void reason" value={reason} onChangeText={setReason} testID={`void-reason-${i.id}`} />
        <Btn small kind="danger" title="Void Invoice" onPress={() => act(voidInvoice(i.id, reason), `${i.id} voided`)} testID={`void-${i.id}`} />
      </>)}
      {i.voidReason ? <Muted>Reason: {i.voidReason}</Muted> : null}
      <Btn small kind="ghost" title="View" onPress={() => router.push(`/invoice/${i.id}` as any)} />
    </Row>
  );
}

export default function Inventory() {
  const { db, adjustStock, flash } = useSystem();
  const [vid, setVid] = useState('');
  const [count, setCount] = useState('');
  const [reason, setReason] = useState('');
  const go = () => { const r = adjustStock({ variantId: vid, newCount: Number(count), reason }); if (r.ok) { flash('Stock adjusted & audited'); setReason(''); setCount(''); } else flash(r.error, 'err'); };
  return (
    <Screen>
      <H1>Stock Adjustments & Invoice Control</H1>
      <Card title="Override / correct stock count (audited)">
        <SkuChips value={vid} onChange={setVid} />
        <Row><Field label="Correct stock count" value={count} onChangeText={setCount} keyboardType="numeric" testID="adj-count" /><Field label="Audit reason (required)" value={reason} onChangeText={setReason} testID="adj-reason" /></Row>
        <View style={{ alignSelf: 'flex-start' }}><Btn title="Apply Adjustment" onPress={go} disabled={!vid} testID="adj-submit" /></View>
      </Card>
      <Card title="Invoices — correct finalized transactions / void">
        {db.invoices.length === 0 && <Muted>No invoices.</Muted>}
        {db.invoices.slice().reverse().map((i) => <InvoiceRow key={i.id + i.status} id={i.id} />)}
      </Card>
      <Card title="Audit trail (latest movements)">
        <Table head={['When', 'SKU', 'Type', 'Qty', 'Reason', 'By']} widths={[1.4, 1, 1, 0.5, 2.4, 1]}
          rows={db.movements.slice().reverse().slice(0, 40).map((m) => [fmtDT(m.at), db.variants.find((v) => v.id === m.variantId)?.sku ?? '?', m.type, String(m.qty), m.reason, m.by])} />
      </Card>
    </Screen>
  );
}

