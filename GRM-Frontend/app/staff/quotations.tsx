import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useSystem, CartItem, Quotation, peso, totals, fmtDate, isExpired } from '../../context/SystemContext';
import LineBuilder from '../../components/LineBuilder';
import { Screen, Card, H1, Muted, T, Btn, Row, Field, Chips, StatusBadge, Table, Modal } from '../../components/ui';

export default function StaffQuotations() {
  const { db, role, saveQuotation, convertQuotation, listings, flash } = useSystem();
  const cap = db.settings.maxStaffDiscountPercent;
  const customers = db.users.filter((u) => u.role === 'Customer' && u.active);
  const [edit, setEdit] = useState<Quotation | null>(null);
  const [disc, setDisc] = useState('0');
  const [days, setDays] = useState('7');
  const [note, setNote] = useState('');
  const [nw, setNw] = useState(false);
  const [items, setItems] = useState<CartItem[]>([]);
  const [custId, setCustId] = useState<string>(customers[0]?.id ?? '');

  useEffect(() => {
    if (!custId && customers.length > 0) {
      setCustId(customers[0].id);
    }
  }, [custId, customers.length]);

  const pct = Number(disc) || 0;
  const over = role === 'Staff' && pct > cap;
  const open = (q: Quotation) => { setEdit(q); setDisc(String(q.discountPercent)); setDays('7'); setNote(q.note); };
  const submitEdit = async () => {
    const r = await saveQuotation({ id: edit!.id, discountPercent: pct, validDays: Number(days) || 7, note });
    if (r.ok) { flash(`Quotation ${edit!.id} sent to customer`); setEdit(null); } else flash(r.error, 'err');
  };
  const submitNew = async () => {
    const r = await saveQuotation({ customerId: custId, items, discountPercent: pct, validDays: Number(days) || 7, note });
    if (r.ok) { flash(`Quotation ${r.data.id} created & sent`); setNw(false); setItems([]); setDisc('0'); } else flash(r.error, 'err');
  };
  const price = (q: Quotation) => totals(q.lines, q.discountPercent).total;
  const newTotal = totals(items.map((i) => ({ unitPrice: listings.find((l) => l.kind === i.kind && l.id === i.refId)?.price ?? 0, qty: i.qty })), pct).total;
  const act = async (p: Promise<{ ok: boolean; error?: string }>, msg: string) => {
    const r = await p;
    flash(r.ok ? msg : (r as any).error, r.ok ? 'ok' : 'err');
  };

  const DiscountBlock = (
    <>
      <Row>
        <Field label={`Discount % (Staff max ${cap}%)`} value={disc} onChangeText={setDisc} keyboardType="numeric" testID="q-discount" />
        <Field label="Valid for (days)" value={days} onChangeText={setDays} keyboardType="numeric" />
      </Row>
      {over && <T bold style={{ color: '#DC2626' }}>⚠ Discount of {pct}% exceeds the Admin limit ({cap}%). Submission blocked.</T>}
      <Field label="Note" value={note} onChangeText={setNote} />
    </>
  );

  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between', alignItems: 'center' }}><H1>Quotations</H1><Btn title="+ New Quotation" onPress={() => { setNw(true); setDisc('0'); setNote(''); }} testID="new-quote" /></Row>
      <Muted>Maximum Staff discount (set by Admin): {cap}%</Muted>
      <Card>
        <Table head={['ID', 'Customer', 'Total', 'Discount', 'Valid until', 'Status', 'Actions']} widths={[0.8, 1.4, 1, 0.7, 1, 0.9, 2.6]}
          rows={db.quotations.slice().reverse().map((q) => {
            const exp = isExpired(q);
            return [q.id, q.customerName, peso(price(q)), q.discountPercent + '%', fmtDate(q.validUntil), <StatusBadge s={exp ? 'Expired' : q.status} />,
              <Row style={{ alignItems: 'center' }}>
                {q.status === 'Requested' && <Btn small title="Prepare Quote" onPress={() => open(q)} testID={`prep-${q.id}`} />}
                {q.status === 'Accepted' && <Btn small kind="ok" title="Convert to Order" onPress={async () => { const r = await convertQuotation(q.id); act(Promise.resolve(r), `Converted to order ${r.ok ? r.data.id : ''}`); }} />}
                {q.orderId ? <Muted>→ {q.orderId}</Muted> : null}
              </Row>];
          })} />
      </Card>

      <Modal visible={!!edit} onClose={() => setEdit(null)} title={`Prepare ${edit?.id ?? ''} — ${edit?.customerName ?? ''}`}>
        {edit && <Muted>{edit.lines.map((l) => `${l.qty}× ${l.sku}`).join(', ')} · Subtotal {peso(totals(edit.lines, 0).subtotal)}</Muted>}
        {DiscountBlock}
        {edit && <T bold>Quoted total: {peso(totals(edit.lines, pct).total)}</T>}
        <Row><Btn title="Send Quotation" onPress={submitEdit} disabled={over} testID="q-submit" /><Btn kind="ghost" title="Cancel" onPress={() => setEdit(null)} /></Row>
      </Modal>

      <Modal visible={nw} onClose={() => setNw(false)} title="New Quotation">
        {customers.length === 0 ? (
          <Muted>No active Customer accounts found.</Muted>
        ) : (
          <>
            <Chips label="Customer" options={customers.map((c) => c.id) as readonly string[]} value={custId} onChange={setCustId} />
            <Muted>{customers.find((c) => c.id === custId)?.name ?? 'Select a customer'}</Muted>
          </>
        )}
        <LineBuilder items={items} setItems={setItems} />
        {DiscountBlock}
        <T bold>Quoted total: {peso(newTotal)}</T>
        <Row><Btn title="Create & Send Quotation" onPress={submitNew} disabled={over || items.length === 0 || !custId} testID="q-create" /><Btn kind="ghost" title="Cancel" onPress={() => setNw(false)} /></Row>
      </Modal>
    </Screen>
  );
}

