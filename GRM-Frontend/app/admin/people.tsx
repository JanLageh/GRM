import React, { useState } from 'react';
import { View } from 'react-native';
import { useSystem } from '../../context/SystemContext';
import { Screen, Card, H1, Muted, T, Btn, Row, Field, Chips, Table, Badge } from '../../components/ui';

export default function People() {
  const { db, saveSupplier, saveUser, toggleUser, flash } = useSystem();
  const [s, setS] = useState({ name: '', contact: '', phone: '' });
  const [u, setU] = useState({ name: '', email: '', password: '' });
  const [role, setRole] = useState<'Staff' | 'Customer'>('Staff');
  const act = (r: any, m: string) => flash(r.ok ? m : r.error, r.ok ? 'ok' : 'err');
  return (
    <Screen>
      <H1>Suppliers & User Accounts</H1>
      <Card title="Suppliers">
        <Table head={['ID', 'Name', 'Contact', 'Phone']} widths={[0.6, 2, 1, 1]} rows={db.suppliers.map((x) => [x.id, x.name, x.contact, x.phone])} />
        <Row><Field label="Name" value={s.name} onChangeText={(t) => setS({ ...s, name: t })} /><Field label="Contact" value={s.contact} onChangeText={(t) => setS({ ...s, contact: t })} /><Field label="Phone" value={s.phone} onChangeText={(t) => setS({ ...s, phone: t })} />
          <Btn small title="Add Supplier" onPress={() => { const r = saveSupplier(s); if (r.ok) setS({ name: '', contact: '', phone: '' }); act(r, 'Supplier saved'); }} /></Row>
      </Card>
      <Card title="User accounts">
        <Table head={['Name', 'Email', 'Role', 'Status', 'Action']} widths={[1.4, 1.8, 0.8, 0.8, 1]}
          rows={db.users.map((x) => [x.name, x.email, x.role, <Badge text={x.active ? 'Active' : 'Deactivated'} tone={x.active ? 'ok' : 'err'} />, <Btn small kind="ghost" title={x.active ? 'Deactivate' : 'Activate'} onPress={() => act(toggleUser(x.id), `${x.name} ${x.active ? 'deactivated' : 'activated'}`)} />])} />
        <Chips label="New account role" options={['Staff', 'Customer'] as const} value={role} onChange={setRole} />
        <Row><Field label="Name" value={u.name} onChangeText={(t) => setU({ ...u, name: t })} /><Field label="Email" value={u.email} onChangeText={(t) => setU({ ...u, email: t })} autoCapitalize="none" /><Field label="Password" value={u.password} onChangeText={(t) => setU({ ...u, password: t })} />
          <Btn small title="Create Account" onPress={() => { const r = saveUser({ ...u, role }); if (r.ok) setU({ name: '', email: '', password: '' }); act(r, 'Account created'); }} /></Row>
      </Card>
    </Screen>
  );
}

