import React from 'react';
import { View, Text } from 'react-native';
import { Listing, peso } from '../context/SystemContext';
import { Badge, Btn, C, T, Muted } from './ui';

export const stockBadge = (l: Listing) =>
  l.stock <= 0 ? <Badge text="Out of Stock" tone="err" /> : l.low ? <Badge text={`Low Stock · ${l.stock} left`} tone="warn" /> : <Badge text={`In Stock: ${l.stock} units`} tone="ok" />;

export default function ProductCard({ l, onAdd }: { l: Listing; onAdd: () => void }) {
  return (
    <View testID={`card-${l.sku}`} style={{ flexBasis: 260, flexGrow: 1, maxWidth: 420, backgroundColor: C.white, borderWidth: 1, borderColor: l.kind === 'bundle' ? C.ink : C.line, borderRadius: 12, padding: 16, gap: 8 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
        <Badge text={l.category} tone={l.kind === 'bundle' ? 'dark' : 'neutral'} />
        <Text style={{ fontSize: 11, color: C.mute, fontWeight: '600' }}>{l.sku}</Text>
      </View>
      <T bold style={{ fontSize: 16 }}>{l.name}</T>
      <Text style={{ fontSize: 13, fontWeight: '600', color: C.ink }}>{l.sub}</Text>
      <Muted>{l.desc}</Muted>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
        <Text style={{ fontSize: 20, fontWeight: '800', color: C.ink }}>{peso(l.price)}</Text>
        {stockBadge(l)}
      </View>
      <Btn title="Add to Cart" kind="ghost" onPress={onAdd} disabled={l.stock <= 0} testID={`add-${l.sku}`} />
    </View>
  );
}

