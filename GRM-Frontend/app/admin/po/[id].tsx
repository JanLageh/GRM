import React from 'react';
import { View, Text, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSystem, variantLabel, fmtDT, peso } from '../../../context/SystemContext';
import { Screen, Card, H1, Muted, T, Btn, NoPrint, Row, StatusBadge, Table } from '../../../components/ui';

export default function PrintPO() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { db } = useSystem();
  const router = useRouter();
  const po = db.pos.find((p) => p.id === id);
  if (!po) return <Screen max={560}><Card><H1>PO not found</H1></Card></Screen>;
  const sup = db.suppliers.find((s) => s.id === po.supplierId);
  return (
    <Screen max={820}>
      <NoPrint><Row><Btn title="Print / Export PDF" onPress={() => Platform.OS === 'web' && window.print()} /><Btn kind="ghost" title="Back" onPress={() => router.back()} /></Row></NoPrint>
      <Card style={{ padding: 28, gap: 14 }}>
        <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View><Text style={{ fontSize: 22, fontWeight: '800' }}>PURCHASE ORDER</Text><Muted>Garry's Smartlock and Solar{'\n'}Mahayahay, Bankal, Lapu-Lapu City</Muted></View>
          <View style={{ alignItems: 'flex-end', gap: 4 }}><T bold style={{ fontSize: 18 }}>{po.id}</T><StatusBadge s={po.status} /><Muted>{fmtDT(po.createdAt)}</Muted></View>
        </Row>
        <View><Muted>SUPPLIER</Muted><T bold>{sup?.name ?? 'Unassigned'}</T><Muted>{sup?.contact} · {sup?.phone}</Muted></View>
        <Table head={['SKU', 'Item', 'Qty ordered', 'Received']} widths={[1, 2.6, 1, 1]}
          rows={po.lines.map((l) => { const v = db.variants.find((x) => x.id === l.variantId)!; return [v.sku, variantLabel(db, v), String(l.qty), String(l.received)]; })} />
        <Muted>{po.note}</Muted>
      </Card>
    </Screen>
  );
}

