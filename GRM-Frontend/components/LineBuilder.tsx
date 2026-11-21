import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { CartItem, peso, totals, useSystem } from '../context/SystemContext';
import { Btn, C, Field, Muted, T, Row } from './ui';

/** Reusable item picker + line list (POS and Quotation Builder). */
export default function LineBuilder({ items, setItems }: { items: CartItem[]; setItems: (i: CartItem[]) => void }) {
  const { listings } = useSystem();
  const [q, setQ] = useState('');
  const hits = listings.filter((l) => (l.name + l.sub + l.sku).toLowerCase().includes(q.toLowerCase())).slice(0, 8);
  const add = (kind: 'variant' | 'bundle', id: string) => {
    const ex = items.find((i) => i.kind === kind && i.refId === id);
    setItems(ex ? items.map((i) => (i === ex ? { ...i, qty: i.qty + 1 } : i)) : [...items, { kind, refId: id, qty: 1 }]);
  };
  const lookup = (i: CartItem) => listings.find((l) => l.kind === i.kind && l.id === i.refId);
  const t = totals(items.map((i) => ({ unitPrice: lookup(i)?.price ?? 0, qty: i.qty })), 0);
  return (
    <View style={{ gap: 10 }}>
      <Field label="Search model or SKU" value={q} onChangeText={setQ} placeholder="e.g. SP-M-04, Biometric, Medium kit" />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {hits.map((l) => (
          <Pressable key={l.kind + l.id} testID={`pick-${l.sku}`} onPress={() => add(l.kind, l.id)} style={{ borderWidth: 1, borderColor: C.line, borderRadius: 8, padding: 8, backgroundColor: C.white, opacity: l.stock <= 0 ? 0.4 : 1 }}>
            <Text style={{ fontSize: 12, fontWeight: '700' }}>+ {l.sku}</Text>
            <Text style={{ fontSize: 11, color: C.mute }}>{l.sub} · {peso(l.price)} · {l.stock} avail</Text>
          </Pressable>
        ))}
      </View>
      {items.length === 0 ? <Muted>No items added yet.</Muted> : null}
      {items.map((i) => {
        const l = lookup(i);
        return (
          <Row key={i.kind + i.refId} style={{ alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: C.line, paddingBottom: 8 }}>
            <View style={{ flex: 1, minWidth: 180 }}><T bold>{l?.name} — {l?.sub}</T><Muted>{l?.sku} · {peso(l?.price ?? 0)}</Muted></View>
            <Row style={{ alignItems: 'center' }}>
              <Btn small kind="ghost" title="−" onPress={() => setItems(items.map((x) => (x === i ? { ...x, qty: x.qty - 1 } : x)).filter((x) => x.qty > 0))} />
              <T bold>{i.qty}</T>
              <Btn small kind="ghost" title="+" onPress={() => add(i.kind, i.refId)} />
              <T bold style={{ minWidth: 90, textAlign: 'right' }}>{peso((l?.price ?? 0) * i.qty)}</T>
            </Row>
          </Row>
        );
      })}
      <T bold style={{ textAlign: 'right' }}>Subtotal: {peso(t.subtotal)}</T>
    </View>
  );
}

