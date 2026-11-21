import React, { useState } from 'react';
import { View } from 'react-native';
import { useSystem, peso, totals, fmtDate, isExpired, Payment } from '../../context/SystemContext';
import { Screen, Card, H1, Muted, T, Btn, Row, Chips, StatusBadge, Table } from '../../components/ui';
import { useRouter } from 'expo-router';

export default function MyQuotations() {
  const { db, user, acceptQuotation, declineQuotation, flash } = useSystem();
  const router = useRouter();
  const [pay, setPay] = useState<Payment>('Cash on Delivery');
  const mine = db.quotations.filter((q) => q.customerId === user?.id).slice().reverse();
  const accept = (id: string) => { const r = acceptQuotation(id, pay); if (r.ok) { flash(`Quotation converted to Sales Order ${r.data.id}`); router.push('/customer/orders'); } else flash(r.error, 'err'); };
  const decline = (id: string) => { const r = declineQuotation(id); flash(r.ok ? 'Quotation declined' : r.error, r.ok ? 'ok' : 'err'); };
  return (
    <Screen max={950}>
      <H1>My Quotations</H1>
      <Chips label="Payment method when accepting" options={['Cash on Delivery', 'Manual Bank Transfer'] as const} value={pay as any} onChange={(v) => setPay(v)} />
      {mine.length === 0 && <Card><Muted>No quotations yet. Add items to your cart and choose “Request Quotation”.</Muted></Card>}
      {mine.map((q) => {
        const exp = isExpired(q);
        const t = totals(q.lines, q.discountPercent);
        return (
          <Card key={q.id} title={q.id} right={<StatusBadge s={exp ? 'Expired' : q.status} />}>
            <Table head={['SKU', 'Item', 'Qty', 'Unit', 'Amount']} widths={[1, 2.4, 0.5, 1, 1]} rows={q.lines.map((l) => [l.sku, l.name, String(l.qty), peso(l.unitPrice), peso(l.unitPrice * l.qty)])} />
            <Row style={{ justifyContent: 'space-between' }}>
              <View>
                <Muted>Requested {fmtDate(q.createdAt)} · Prepared by {q.preparedBy ?? 'awaiting Staff'}</Muted>
                <T>Valid until: <T bold>{q.validUntil ? fmtDate(q.validUntil) : '—'}</T> · Discount applied: <T bold>{q.discountPercent}%</T></T>
                {q.orderId ? <Muted>Converted to order {q.orderId}</Muted> : null}
              </View>
              <View style={{ alignItems: 'flex-end' }}><Muted>Subtotal {peso(t.subtotal)}</Muted><T bold style={{ fontSize: 20 }}>{peso(t.total)}</T></View>
            </Row>
            {q.status === 'Quoted' && !exp && <Row><Btn kind="ok" title="Accept Quotation" onPress={() => accept(q.id)} testID={`accept-${q.id}`} /><Btn kind="ghost" title="Decline" onPress={() => decline(q.id)} /></Row>}
            {q.status === 'Requested' && <Muted>Waiting for Staff to prepare your formal quote.</Muted>}
          </Card>
        );
      })}
    </Screen>
  );
}

