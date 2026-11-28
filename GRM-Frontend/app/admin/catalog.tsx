import React, { useState } from 'react';
import { View } from 'react-native';
import { useSystem, peso, Product, Bundle } from '../../context/SystemContext';
import { Screen, Card, H1, H2, Muted, T, Btn, Row, Field, Chips, Badge } from '../../components/ui';

const CATS = ['Smart Locks', 'Solar Panels', 'Batteries'] as const;

function VariantRow({ id }: { id: string }) {
  const { db, saveVariant, flash } = useSystem();
  const v = db.variants.find((x) => x.id === id);
  const [price, setPrice] = useState(String(v?.price ?? '0'));
  const [sku, setSku] = useState(v?.sku ?? '');
  if (!v) return null;
  const save = async (patch: object = {}) => { const r = await saveVariant({ ...v, sku, price: Number(price), ...patch }); flash(r.ok ? `${sku} saved` : r.error, r.ok ? 'ok' : 'err'); };
  return (
    <Row style={{ alignItems: 'flex-end', borderTopWidth: 1, borderTopColor: '#E5E7EB', paddingTop: 8 }}>
      <View style={{ minWidth: 130 }}><T bold>{v.name}</T><Muted>Stock {v.stock}</Muted></View>
      <Field label="SKU" value={sku} onChangeText={setSku} />
      <Field label="Price (₱)" value={price} onChangeText={setPrice} keyboardType="numeric" />
      <Btn small title="Save" onPress={() => save()} />
    </Row>
  );
}

function ProductBlock({ p }: { p: Product }) {
  const { db, saveVariant, saveProduct, flash } = useSystem();
  const [nv, setNv] = useState({ name: '', sku: '', price: '', stock: '0' });
  const add = async () => {
    const r = await saveVariant({ productId: p.id, name: nv.name, sku: nv.sku, price: Number(nv.price), stock: Number(nv.stock) || 0 });
    if (r.ok) { flash('Variant added'); setNv({ name: '', sku: '', price: '', stock: '0' }); } else flash(r.error, 'err');
  };
  return (
    <Card title={p.name} right={<Row style={{ alignItems: 'center' }}><Badge text={p.category} /><Btn small kind="ghost" title={p.active ? 'Deactivate product' : 'Activate'} onPress={async () => { const r = await saveProduct({ ...p, active: !p.active }); flash(r.ok ? `${p.name} updated` : r.error, r.ok ? 'ok' : 'err'); }} /></Row>}>
      {db.variants.filter((v) => v.productId === p.id).map((v) => <VariantRow key={v.id + v.price + v.sku + v.active} id={v.id} />)}
      <Row style={{ borderTopWidth: 1, borderTopColor: '#E5E7EB', paddingTop: 8 }}>
        <Field label="New variant name" value={nv.name} onChangeText={(t) => setNv({ ...nv, name: t })} />
        <Field label="SKU" value={nv.sku} onChangeText={(t) => setNv({ ...nv, sku: t })} />
        <Field label="Price" value={nv.price} onChangeText={(t) => setNv({ ...nv, price: t })} keyboardType="numeric" />
        <Field label="Opening stock" value={nv.stock} onChangeText={(t) => setNv({ ...nv, stock: t })} keyboardType="numeric" />
        <Btn small title="Add Variant" onPress={add} />
      </Row>
    </Card>
  );
}

function BundleBlock({ b }: { b: Bundle }) {
  const { db, saveBundle, deleteBundle, flash } = useSystem();
  const [price, setPrice] = useState(String(b.price));
  const [vid, setVid] = useState('');
  const [qty, setQty] = useState('1');
  const save = async (patch: Partial<Bundle>) => { const r = await saveBundle({ ...b, price: Number(price), ...patch }); flash(r.ok ? `${b.sku} saved` : r.error, r.ok ? 'ok' : 'err'); };
  const addComp = () => {
    if (!vid) return flash('Pick a component SKU', 'err');
    const comps = b.components.filter((c) => c.variantId !== vid).concat({ variantId: vid, qty: Number(qty) || 1 });
    save({ components: comps });
  };
  return (
    <Card title={b.name} right={<Badge text={b.sku} tone="dark" />}>
      <Row>
        <Field label="Bundle price (₱)" value={price} onChangeText={setPrice} keyboardType="numeric" />
        <Btn small title="Save price" onPress={() => save({})} />
        <Btn small kind="danger" title="Delete Bundle" onPress={async () => { const r = await deleteBundle(b.id); flash(r.ok ? `${b.sku} deleted` : r.error, r.ok ? 'ok' : 'err'); }} />
      </Row>
      <Muted>Component mapping (deducted from variant stock on sale):</Muted>
      {b.components.map((c) => {
        const v = db.variants.find((x) => x.id === c.variantId);
        return <Row key={c.variantId} style={{ alignItems: 'center' }}><T>{c.qty} × {v?.sku} ({v?.name})</T><Btn small kind="danger" title="Remove" onPress={() => save({ components: b.components.filter((x) => x.variantId !== c.variantId) })} /></Row>;
      })}
      <Row style={{ alignItems: 'center' }}>
        {db.variants.map((v) => <Btn key={v.id} small kind={vid === v.id ? 'primary' : 'ghost'} title={v.sku} onPress={() => setVid(v.id)} />)}
      </Row>
      <Row><Field label="Qty" value={qty} onChangeText={setQty} keyboardType="numeric" /><Btn small title="Add / update component" onPress={addComp} /></Row>
    </Card>
  );
}

export default function AdminCatalog() {
  const { db, saveProduct, saveBundle, flash } = useSystem();
  const [np, setNp] = useState({ name: '', description: '' });
  const [cat, setCat] = useState<(typeof CATS)[number]>('Smart Locks');
  const [nb, setNb] = useState({ name: '', sku: '', price: '' });
  const addP = async () => { const r = await saveProduct({ name: np.name, category: cat, description: np.description }); if (r.ok) { flash('Product added'); setNp({ name: '', description: '' }); } else flash(r.error, 'err'); };
  const addB = async () => {
    const first = db.variants.find((v) => v.active);
    const r = await saveBundle({ name: nb.name, sku: nb.sku || 'BND-NEW', price: Number(nb.price), components: first ? [{ variantId: first.id, qty: 1 }] : [] });
    if (r.ok) { flash('Bundle created — edit its components below'); setNb({ name: '', sku: '', price: '' }); } else flash(r.error, 'err');
  };
  return (
    <Screen>
      <H1>Products, Variants & Bundles</H1>
      <Card title="Add product">
        <Row><Field label="Name" value={np.name} onChangeText={(t) => setNp({ ...np, name: t })} /><Field label="Description" value={np.description} onChangeText={(t) => setNp({ ...np, description: t })} /></Row>
        <Chips options={CATS} value={cat} onChange={setCat} />
        <View style={{ alignSelf: 'flex-start' }}><Btn title="Create Product" onPress={addP} /></View>
      </Card>
      {db.products.map((p) => <ProductBlock key={p.id + p.active} p={p} />)}
      <H2>Composite bundles</H2>
      <Card title="Add bundle">
        <Row><Field label="Name" value={nb.name} onChangeText={(t) => setNb({ ...nb, name: t })} /><Field label="SKU" value={nb.sku} onChangeText={(t) => setNb({ ...nb, sku: t })} /><Field label="Price" value={nb.price} onChangeText={(t) => setNb({ ...nb, price: t })} keyboardType="numeric" /><Btn small title="Create Bundle" onPress={addB} /></Row>
      </Card>
      {db.bundles.map((b) => <BundleBlock key={b.id + JSON.stringify(b.components) + b.active + b.price} b={b} />)}
    </Screen>
  );
}

