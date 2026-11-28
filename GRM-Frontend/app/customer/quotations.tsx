import React from 'react';
import { View } from 'react-native';
import { useSystem, peso, totals, fmtDate, isExpired } from '../../context/SystemContext';
import { Screen, Card, H1, Muted, T, Btn, Row, StatusBadge, Table } from '../../components/ui';

export default function MyQuotations() {
  const { db, user, acceptQuotation, declineQuotation, flash } = useSystem();
  const mine = db.quotations.filter((q) => q.customerId === user?.id).slice().reverse();
  const accept = async (id: string) => { const r = await acceptQuotation(id); flash(r.ok ? 'Quotation accepted — Staff will convert it to an order' : r.error, r.ok ? 'ok' : 'err'); };
  const decline = async (id: string) => { const r = await declineQuotation(id); flash(r.ok ? 'Quotation declined' : r.error, r.ok ? 'ok' : 'err'); };
  return (
    <Screen max={950}>
      <H1>My Quotations</H1>
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

