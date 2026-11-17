import React, { useState } from 'react';
import { useSystem } from '../context/SystemContext';
import ProductCard from '../components/ProductCard';
import { Screen, H1, Chips, Field, Row, Muted } from '../components/ui';

const CATS = ['All', 'Smart Locks', 'Solar Panels', 'Batteries', 'Solar Bundles'] as const;

export default function Catalog() {
  const { listings, addToCart, flash } = useSystem();
  const [cat, setCat] = useState<(typeof CATS)[number]>('All');
  const [q, setQ] = useState('');
  const shown = listings.filter((l) => (cat === 'All' || l.category === cat) && (l.name + ' ' + l.sub + ' ' + l.sku).toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <Screen>
      <H1>Catalog</H1>
      <Chips options={CATS} value={cat} onChange={setCat} />
      <Field label="Search by model or SKU" value={q} onChangeText={setQ} placeholder="Search…" testID="search" />
      <Muted>{shown.length} item(s)</Muted>
      <Row style={{ alignItems: 'stretch' }}>
        {shown.map((l) => <ProductCard key={l.kind + l.id} l={l} onAdd={() => { addToCart(l.kind, l.id, 1); flash(`${l.sku} added to cart`); }} />)}
      </Row>
    </Screen>
  );
}

