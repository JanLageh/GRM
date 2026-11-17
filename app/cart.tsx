import React, { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSystem, peso, totals, Payment } from '../context/SystemContext';
import { Screen, Card, H1, Muted, T, Btn, Row, Chips, Field, Modal } from '../components/ui';

export default function Cart() {
  const { cart, listings, role, user, setCartQty, clearCart, requestQuotation, checkout, flash } = useSystem();
  const router = useRouter();
  const [auth, setAuth] = useState(false);
  const [note, setNote] = useState('');
  const [pay, setPay] = useState<Payment>('Cash on Delivery');
  const [addr, setAddr] = useState(user?.address ?? '');
  const lines = cart.map((c) => ({ c, l: listings.find((x) => x.kind === c.kind && x.id === c.refId) }));
  const t = totals(lines.map(({ c, l }) => ({ unitPrice: l?.price ?? 0, qty: c.qty })), 0);

  if (role === 'Staff' || role === 'Admin') return <Screen max={600}><Card><H1>Cart</H1><Muted>Staff and Admin accounts record sales through the Walk-In POS and Quotation Builder.</Muted><Btn title="Open POS" onPress={() => router.push('/staff/pos')} /></Card></Screen>;

  const guard = (fn: () => void) => () => (role === 'Guest' ? setAuth(true) : fn());
  const doQuote = () => { const r = requestQuotation(note); if (r.ok) { flash('Quotation request submitted to Staff'); router.push('/customer/quotations'); } else flash(r.error, 'err'); };
  const doCheckout = () => { const r = checkout(pay, addr); if (r.ok) { flash(`Order ${r.data.id} placed (Pending)`); router.push('/customer/orders'); } else flash(r.error, 'err'); };

  return (
    <Screen max={900}>
      <H1>{role === 'Guest' ? 'Temporary Session Cart' : 'My Saved Cart'}</H1>
      <Card>
        {lines.length === 0 ? <Muted>Your cart is empty. Visit the catalog to add items.</Muted> : null}
        {lines.map(({ c, l }) => (
          <Row key={c.kind + c.refId} style={{ justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#E5E7EB', paddingBottom: 10 }}>
            <View style={{ flex: 1, minWidth: 200 }}><T bold>{l?.name} — {l?.sub}</T><Muted>{l?.sku} · {peso(l?.price ?? 0)} · {l?.stock} in stock</Muted></View>
            <Row style={{ alignItems: 'center' }}>
              <Btn small kind="ghost" title="−" onPress={() => setCartQty(c.kind, c.refId, c.qty - 1)} />
              <T bold>{c.qty}</T>
              <Btn small kind="ghost" title="+" onPress={() => setCartQty(c.kind, c.refId, c.qty + 1)} />
              <T bold style={{ minWidth: 100, textAlign: 'right' }}>{peso((l?.price ?? 0) * c.qty)}</T>
            </Row>
          </Row>
        ))}
        <T bold style={{ textAlign: 'right', fontSize: 18 }}>Estimated total: {peso(t.total)}</T>
        {lines.length > 0 && <View style={{ alignSelf: 'flex-start' }}><Btn small kind="ghost" title="Clear cart" onPress={clearCart} /></View>}
      </Card>

      {lines.length > 0 && (
        <>
          <Card title="Request Quotation">
            <Muted>Send this list to Staff for a formal price quote (with possible discount and validity date).</Muted>
            <Field label="Note to Staff (optional)" value={note} onChangeText={setNote} />
            <View style={{ alignSelf: 'flex-start' }}><Btn title="Request Quotation" onPress={guard(doQuote)} testID="request-quote" /></View>
          </Card>
          <Card title="Checkout & Place Order">
            <Chips label="Offline payment method" options={['Cash on Delivery', 'Manual Bank Transfer'] as const} value={pay as any} onChange={(v) => setPay(v)} />
            <Field label="Delivery address" value={addr} onChangeText={setAddr} placeholder="Street, Barangay, City" testID="addr" />
            <Muted>{pay === 'Manual Bank Transfer' ? 'Staff will confirm your bank transfer manually and mark the invoice Paid.' : 'Pay in cash when the order is delivered.'}</Muted>
            <View style={{ alignSelf: 'flex-start' }}><Btn title="Proceed to Checkout" onPress={guard(doCheckout)} testID="checkout" /></View>
          </Card>
        </>
      )}

      <Modal visible={auth} onClose={() => setAuth(false)} title="Sign in to continue">
        <Muted>Quotations and orders are tied to a Customer account. Please log in or register first — your cart will be kept.</Muted>
        <Row>
          <Btn title="Log In" onPress={() => { setAuth(false); router.push('/login'); }} testID="auth-login" />
          <Btn title="Register" kind="ghost" onPress={() => { setAuth(false); router.push('/register'); }} />
          <Btn title="Cancel" kind="ghost" onPress={() => setAuth(false)} />
        </Row>
      </Modal>
    </Screen>
  );
}

