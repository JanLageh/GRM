import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useSystem, peso, variantLabel } from '../../context/SystemContext';
import { Screen, Card, H1, Muted, Field, Btn, Row } from '../../components/ui';

export default function Pricing() {
  const { db, setMaxDiscount, flash } = useSystem();
  const [cap, setCap] = useState(String(db.settings.maxStaffDiscountPercent));
  useEffect(() => {
    setCap(String(db.settings.maxStaffDiscountPercent));
  }, [db.settings.maxStaffDiscountPercent]);
  const save = async () => { const r = await setMaxDiscount(Number(cap)); flash(r.ok ? `MaxStaffDiscountPercent set to ${cap}%` : r.error, r.ok ? 'ok' : 'err'); };
  return (
    <Screen max={900}>
      <H1>Pricing & Discount Control</H1>
      <Card title="MaxStaffDiscountPercent">
        <Muted>Staff cannot submit quotations or POS sales with a discount above this limit. Current: {db.settings.maxStaffDiscountPercent}%.</Muted>
        <Row><Field label="Max discount %" value={cap} onChangeText={setCap} keyboardType="numeric" testID="max-disc" /><Btn title="Save Rule" onPress={save} testID="save-disc" /></Row>
      </Card>
      <Card title="Variant base prices">
        {db.variants.map((v) => <PriceRow key={v.id + v.price} id={v.id} />)}
      </Card>
    </Screen>
  );
}
function PriceRow({ id }: { id: string }) {
  const { db, saveVariant, flash } = useSystem();
  const v = db.variants.find((x) => x.id === id);
  const [p, setP] = useState(String(v?.price ?? '0'));
  if (!v) return null;
  return (
    <Row style={{ alignItems: 'center', justifyContent: 'space-between' }}>
      <View style={{ flex: 2, minWidth: 220 }}><Muted>{v.sku}</Muted><Muted style={{ color: '#111' }}>{variantLabel(db, v)} · now {peso(v.price)}</Muted></View>
      <Field label="Price (₱)" value={p} onChangeText={setP} keyboardType="numeric" />
      <Btn small title="Update" onPress={async () => { const r = await saveVariant({ ...v, price: Number(p) }); flash(r.ok ? `${v.sku} price updated` : r.error, r.ok ? 'ok' : 'err'); }} />
    </Row>
  );
}

