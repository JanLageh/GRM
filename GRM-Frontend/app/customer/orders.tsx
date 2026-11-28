import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSystem, peso, fmtDT } from '../../context/SystemContext';
import { Screen, Card, H1, Muted, T, Btn, Row, StatusBadge, Table } from '../../components/ui';

export default function MyOrders() {
  const { db, user, cancelOrder, flash } = useSystem();
  const router = useRouter();
  const mine = db.orders.filter((o) => o.customerId === user?.id).slice().reverse();
  const cancel = async (id: string) => { const r = await cancelOrder(id); flash(r.ok ? `Order ${id} cancelled — stock restored` : r.error, r.ok ? 'ok' : 'err'); };
  return (
    <Screen max={950}>
      <H1>My Orders & Invoices</H1>
      {mine.length === 0 && <Card><Muted>No orders yet.</Muted></Card>}
      {mine.map((o) => {
        const inv = db.invoices.find((i) => i.id === o.invoiceId);
        const step = ['Pending', 'Processing', 'Completed'].indexOf(o.status);
        return (
          <Card key={o.id} title={o.id} right={<StatusBadge s={o.status} />}>
            <Row style={{ alignItems: 'center' }}>
              {['Pending', 'Processing', 'Completed'].map((s, i) => <View key={s} style={{ flex: 1, minWidth: 90 }}><View style={{ height: 4, borderRadius: 2, backgroundColor: o.status !== 'Cancelled' && i <= step ? '#10B981' : '#E5E7EB' }} /><Muted>{s}</Muted></View>)}
            </Row>
            <Table head={['SKU', 'Item', 'Qty', 'Amount']} widths={[1, 2.4, 0.5, 1]} rows={o.lines.map((l) => [l.sku, l.name, String(l.qty), peso(l.unitPrice * l.qty)])} />
            <Row style={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <View><Muted>Placed {fmtDT(o.createdAt)} · {o.payment}{o.quotationId ? ` · from ${o.quotationId}` : ''}</Muted>
                <Muted>Invoice: {inv ? `${inv.id} (${inv.status})` : 'not yet issued'}</Muted></View>
              <T bold style={{ fontSize: 20 }}>{peso(o.total)}</T>
            </Row>
            <Row>
              {inv && <Btn small title="View / Print Invoice" onPress={() => router.push(`/invoice/${inv.id}` as any)} testID={`inv-${o.id}`} />}
              {o.status === 'Pending' && <Btn small kind="danger" title="Cancel Order" onPress={() => cancel(o.id)} testID={`cancel-${o.id}`} />}
            </Row>
          </Card>
        );
      })}
    </Screen>
  );
}

