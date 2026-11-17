import React, { useState } from 'react';
import { View } from 'react-native';
import { useSystem, variantLabel, fmtDT } from '../../context/SystemContext';
import { Screen, Card, H1, Muted, Btn, Row, Field, Chips, Table, Badge, T } from '../../components/ui';

export const VariantPicker = ({ value, onChange }: { value: string; onChange: (id: string) => void }) => {
  const { db } = useSystem();
  const ids = db.variants.map((v) => v.id);
  return (
    <View style={{ gap: 4 }}>
      <Chips options={ids as readonly string[]} value={value} onChange={onChange} label="Variant (tap SKU)" />
      <Muted>{value ? `${variantLabel(db, db.variants.find((v) => v.id === value)!)} · SKU ${db.variants.find((v) => v.id === value)!.sku} · stock ${db.variants.find((v) => v.id === value)!.stock}` : 'None selected'}</Muted>
    </View>
  );
};
export function SkuChips({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const { db } = useSystem();
  return (
    <View style={{ gap: 4 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {db.variants.map((v) => <Btn key={v.id} small kind={value === v.id ? 'primary' : 'ghost'} title={v.sku} onPress={() => onChange(v.id)} testID={`sku-${v.sku}`} />)}
      </View>
      <Muted>{value ? (() => { const v = db.variants.find((x) => x.id === value)!; return `${variantLabel(db, v)} · stock ${v.stock}`; })() : 'Select a variant SKU'}</Muted>
    </View>
  );
}

const REASONS = ['Damaged Unit', 'Display Unit', 'Store Return', 'Supplier Return', 'Count Correction'];

export default function StockLog() {
  const { db, logStock, flash } = useSystem();
  const [vid, setVid] = useState('');
  const [type, setType] = useState<'Stock-In' | 'Stock-Out'>('Stock-Out');
  const [qty, setQty] = useState('1');
  const [reason, setReason] = useState('Damaged Unit');
  const [other, setOther] = useState('');
  const submit = () => {
    const r = logStock({ variantId: vid, type, qty: Number(qty), reason: other.trim() ? `${reason}: ${other.trim()}` : reason });
    if (r.ok) { flash(`${type} logged`); setOther(''); } else flash(r.error, 'err');
  };
  return (
    <Screen>
      <H1>Stock-In / Stock-Out Logger</H1>
      <Card title="Log manual inventory change">
        <SkuChips value={vid} onChange={setVid} />
        <Chips label="Direction" options={['Stock-In', 'Stock-Out'] as const} value={type} onChange={setType} />
        <Row><Field label="Quantity" value={qty} onChangeText={setQty} keyboardType="numeric" /></Row>
        <Chips label="Reason (mandatory)" options={REASONS as readonly string[]} value={reason} onChange={setReason} />
        <Field label="Additional detail (optional)" value={other} onChangeText={setOther} />
        <View style={{ alignSelf: 'flex-start' }}><Btn title="Record Movement" onPress={submit} disabled={!vid} testID="log-submit" /></View>
      </Card>
      <Card title="Stock movement history">
        <Table head={['When', 'SKU', 'Type', 'Qty', 'Reason', 'Ref', 'By']} widths={[1.4, 1, 1, 0.5, 2.2, 0.9, 1]}
          rows={db.movements.slice().reverse().slice(0, 60).map((m) => [fmtDT(m.at), db.variants.find((v) => v.id === m.variantId)?.sku ?? '?', m.type, <T bold style={{ color: m.qty < 0 ? '#DC2626' : '#047857' }}>{m.qty > 0 ? '+' : ''}{m.qty}</T>, m.reason, m.ref, m.by])} />
      </Card>
    </Screen>
  );
}

