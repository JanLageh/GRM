import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSystem, peso, fmtDT } from '../../context/SystemContext';
import { Screen, Card, H1, Muted, Btn, Row, StatusBadge, Table } from '../../components/ui';

export default function StaffOrders() {
  const { db, role, advanceOrder, cancelOrder, generateInvoice, markPaid, flash } = useSystem();
  const router = useRouter();
  const act = async (p: Promise<any>, msg: string) => {
    const r = await p;
    flash(r.ok ? msg : r.error, r.ok ? 'ok' : 'err');
  };
  return (
    <Screen>
      <H1>Orders & Invoice Processing</H1>
      <Card>
        <Table head={['Order', 'Customer', 'Channel', 'Total', 'Status', 'Invoice', 'Actions']} widths={[0.9, 1.3, 0.8, 1, 0.9, 1.2, 3]}
          rows={db.orders.slice().reverse().map((o) => {
            const inv = db.invoices.find((i) => i.id === o.invoiceId);
            return [o.id, o.customerName, o.channel, peso(o.total), <StatusBadge s={o.status} />,
              inv ? <View style={{ gap: 3 }}><Muted>{inv.id}</Muted><StatusBadge s={inv.status} /></View> : <Muted>none</Muted>,
              <Row style={{ alignItems: 'center' }}>
                {(o.status === 'Pending' || o.status === 'Processing') && <Btn small title={o.status === 'Pending' ? '→ Processing' : '→ Completed'} onPress={() => act(advanceOrder(o.id), `${o.id} advanced`)} testID={`adv-${o.id}`} />}
                {(!inv || inv.status === 'Voided') && o.status !== 'Cancelled' && <Btn small kind="ghost" title="Generate Invoice" onPress={() => act(generateInvoice(o.id), `Invoice generated for ${o.id}`)} testID={`gen-${o.id}`} />}
                {inv?.status === 'Unpaid' && <Btn small kind="ok" title="Mark Paid" onPress={() => act(markPaid(inv.id), `${inv.id} marked Paid`)} testID={`paid-${inv.id}`} />}
                {inv && <Btn small kind="ghost" title="View" onPress={() => router.push(`/invoice/${inv.id}` as any)} />}
                {role === 'Admin' && o.status !== 'Completed' && o.status !== 'Cancelled' && <Btn small kind="danger" title="Cancel" onPress={() => act(cancelOrder(o.id), `${o.id} cancelled`)} />}
              </Row>];
          })} />
      </Card>
      <Muted>Online orders and walk-in sales draw from the same stock pool. Cancelling returns stock and logs a Cancel-Restock movement.</Muted>
    </Screen>
  );
}

