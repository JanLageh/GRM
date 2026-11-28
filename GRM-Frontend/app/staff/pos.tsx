import React, { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSystem, CartItem, Payment, totals, peso, buildListings } from '../../context/SystemContext';
import LineBuilder from '../../components/LineBuilder';
import { Screen, Card, H1, Muted, T, Btn, Row, Field, Chips, useWide } from '../../components/ui';

export default function POS() {
  const { db, listings, walkInSale, flash, role } = useSystem();
  const router = useRouter();
  const wide = useWide();
  const [items, setItems] = useState<CartItem[]>([]);
  const [name, setName] = useState('');
  const [disc, setDisc] = useState('0');
  const [pay, setPay] = useState<Payment>('Cash (Walk-in)');
  const [paid, setPaid] = useState<'Paid' | 'Unpaid'>('Paid');
  const pct = Number(disc) || 0;
  const cap = db.settings.maxStaffDiscountPercent;
  const over = role === 'Staff' && pct > cap;
  const t = totals(items.map((i) => ({ unitPrice: listings.find((l) => l.kind === i.kind && l.id === i.refId)?.price ?? 0, qty: i.qty })), pct);
  const done = async () => {
    const r = await walkInSale({ customerName: name, items, discountPercent: pct, payment: pay, paid: paid === 'Paid' });
    if (r.ok) { flash(`Walk-in sale recorded: ${r.data.orderId} · ${r.data.invoiceId}`); setItems([]); setName(''); setDisc('0'); router.push(`/invoice/${r.data.invoiceId}` as any); } else flash(r.error, 'err');
  };
  return (
    <Screen>
      <H1>Walk-In Sales POS</H1>
      <View style={{ flexDirection: wide ? 'row' : 'column', gap: 16, alignItems: 'flex-start' }}>
        <Card title="1 · Select items" style={{ flex: 1.4, width: '100%' }}><LineBuilder items={items} setItems={setItems} /></Card>
        <Card title="2 · Payment & completion" style={{ flex: 1, width: '100%' }}>
          <Field label="Customer name (optional)" value={name} onChangeText={setName} placeholder="Walk-in Customer" />
          <Field label={`Discount % (Staff max ${cap}%)`} value={disc} onChangeText={setDisc} keyboardType="numeric" testID="pos-discount" />
          {over && <T style={{ color: '#DC2626' }} bold>⚠ Discount exceeds the Admin limit of {cap}% — submission blocked.</T>}
          <Chips label="Payment" options={['Cash (Walk-in)', 'Manual Bank Transfer'] as const} value={pay as any} onChange={(v) => setPay(v)} />
          <Chips label="Invoice status" options={['Paid', 'Unpaid'] as const} value={paid} onChange={setPaid} />
          <Muted>Subtotal {peso(t.subtotal)} · Discount −{peso(t.discount)}</Muted>
          <T bold style={{ fontSize: 22 }}>Total {peso(t.total)}</T>
          <Btn title="Complete Sale & Generate Invoice" onPress={done} disabled={items.length === 0 || over} testID="pos-complete" />
        </Card>
      </View>
    </Screen>
  );
}

