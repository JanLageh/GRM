import React from 'react';
import { View, Text, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSystem, peso, fmtDT } from '../../context/SystemContext';
import Guard from '../../components/Guard';
import { Screen, Card, H1, Muted, T, Btn, NoPrint, Row, StatusBadge, Table, C } from '../../components/ui';

export default function InvoiceView() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { db, role, user } = useSystem();
  const router = useRouter();
  const inv = db.invoices.find((i) => i.id === id);
  const order = db.orders.find((o) => o.id === inv?.orderId);
  const allowed = !!inv && !!order && (role === 'Staff' || role === 'Admin' || (role === 'Customer' && order.customerId === user?.id));
  return (
    <Guard roles={['Customer', 'Staff', 'Admin']}>
      {!allowed || !inv || !order ? (
        <Screen max={560}><Card><H1>Invoice not found</H1><Muted>It does not exist or you are not allowed to view it.</Muted></Card></Screen>
      ) : (
        <Screen max={820}>
          <NoPrint><Row><Btn title="Print / Export PDF" onPress={() => Platform.OS === 'web' && window.print()} testID="print" /><Btn kind="ghost" title="Back" onPress={() => router.back()} /></Row></NoPrint>
          <Card style={{ padding: 28, gap: 16 }}>
            <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View><Text style={{ fontSize: 22, fontWeight: '800' }}>SALES INVOICE</Text><Muted>Garry's Smartlock and Solar{'\n'}Mahayahay, Bankal, Lapu-Lapu City</Muted></View>
              <View style={{ alignItems: 'flex-end', gap: 4 }}><T bold style={{ fontSize: 18 }}>{inv.id}</T><StatusBadge s={inv.status} /><Muted>Issued {fmtDT(inv.issuedAt)}</Muted></View>
            </Row>
            <Row><View style={{ flex: 1, minWidth: 200 }}><Muted>BILL TO</Muted><T bold>{order.customerName}</T><Muted>{order.address}</Muted></View>
              <View style={{ flex: 1, minWidth: 200 }}><Muted>ORDER / PAYMENT</Muted><T bold>{order.id} · {order.channel}</T><Muted>{inv.payment}</Muted></View></Row>
            <Table head={['SKU', 'Item', 'Qty', 'Unit', 'Amount']} widths={[1, 2.4, 0.5, 1, 1]}
              rows={order.lines.map((l) => [l.sku, l.name, String(l.qty), peso(l.unitPrice), peso(l.unitPrice * l.qty)])} />
            <View style={{ alignItems: 'flex-end', gap: 3 }}>
              <T>Subtotal: {peso(order.subtotal)}</T>
              <T>Discount ({order.discountPercent}%): −{peso(order.subtotal - order.total)}</T>
              <Text style={{ fontSize: 22, fontWeight: '800', color: inv.status === 'Voided' ? C.err : C.ink, textDecorationLine: inv.status === 'Voided' ? 'line-through' : 'none' }}>TOTAL: {peso(inv.amount)}</Text>
              {inv.status === 'Paid' && <Muted>Paid on {fmtDT(inv.paidAt)}</Muted>}
              {inv.status === 'Voided' && <T style={{ color: C.err }} bold>VOIDED — {inv.voidReason}</T>}
            </View>
            <Muted>Payment is recorded manually (Cash on Delivery or Manual Bank Transfer confirmation). Thank you for your business.</Muted>
          </Card>
        </Screen>
      )}
    </Guard>
  );
}

