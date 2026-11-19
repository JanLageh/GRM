import React from 'react';
import { View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useSystem } from '../context/SystemContext';
import ProductCard from '../components/ProductCard';
import { Screen, Btn, H1, H2, Muted, Row, C, Badge } from '../components/ui';

export default function Home() {
  const { listings, addToCart, flash, db } = useSystem();
  const router = useRouter();
  const add = (kind: 'variant' | 'bundle', id: string) => { addToCart(kind, id, 1); flash('Added to cart'); };
  const group = (cat: string) => listings.filter((l) => l.category === cat);
  const Section = ({ title, cat }: { title: string; cat: string }) => (
    <View style={{ gap: 10 }}>
      <H2>{title}</H2>
      <Row style={{ alignItems: 'stretch' }}>{group(cat).map((l) => <ProductCard key={l.kind + l.id} l={l} onAdd={() => add(l.kind, l.id)} />)}</Row>
    </View>
  );
  return (
    <Screen>
      <View style={{ backgroundColor: C.white, borderWidth: 1, borderColor: C.line, borderRadius: 14, padding: 28, gap: 12 }}>
        <Badge text="MAHAYAHAY · BANKAL · LAPU-LAPU CITY" tone="ok" />
        <Text style={{ fontSize: 40, fontWeight: '800', color: C.ink, letterSpacing: -1.2 }}>Smart locks & solar, in stock and ready.</Text>
        <Muted style={{ fontSize: 15, maxWidth: 640 }}>
          Garry's Smartlock and Solar sells smart locks, solar panels, batteries and ready-made solar bundles. Stock counts below are live — online orders and in-store sales share one inventory.
        </Muted>
        <Row><Btn title="Browse Catalog" onPress={() => router.push('/catalog')} /><Btn title="About & Contact" kind="ghost" onPress={() => router.push('/about')} /></Row>
      </View>
      <Section title="Composite Solar Bundles" cat="Solar Bundles" />
      <Section title="Featured Smart Locks" cat="Smart Locks" />
      <Section title="Solar Panels (Small · Medium · Large)" cat="Solar Panels" />
      <Section title="Solar Batteries" cat="Batteries" />
      <Muted>Demo logins — admin@garry.ph / admin123 · staff@garry.ph / staff123 · customer@garry.ph / customer123 ({db.users.length} accounts)</Muted>
    </Screen>
  );
}

