import React, { useState } from 'react';
import { View } from 'react-native';
import { useSystem } from '../../context/SystemContext';
import { Screen, Card, H1, Field, Btn, Row } from '../../components/ui';

export default function Profile() {
  const { user, updateProfile, changePassword, flash } = useSystem();
  const [f, setF] = useState({ name: user?.name ?? '', phone: user?.phone ?? '', address: user?.address ?? '' });
  const [p, setP] = useState({ cur: '', next: '' });
  const save = () => { const r = updateProfile(f); flash(r.ok ? 'Profile updated' : r.error, r.ok ? 'ok' : 'err'); };
  const pw = () => { const r = changePassword(p.cur, p.next); if (r.ok) setP({ cur: '', next: '' }); flash(r.ok ? 'Password changed' : r.error, r.ok ? 'ok' : 'err'); };
  return (
    <Screen max={700}>
      <H1>Profile</H1>
      <Card title="Contact details">
        <Field label="Email (login)" value={user?.email} editable={false} />
        <Field label="Full name" value={f.name} onChangeText={(v) => setF({ ...f, name: v })} />
        <Field label="Phone" value={f.phone} onChangeText={(v) => setF({ ...f, phone: v })} />
        <Field label="Delivery address" value={f.address} onChangeText={(v) => setF({ ...f, address: v })} />
        <View style={{ alignSelf: 'flex-start' }}><Btn title="Save changes" onPress={save} /></View>
      </Card>
      <Card title="Change password">
        <Row><Field label="Current password" value={p.cur} onChangeText={(v) => setP({ ...p, cur: v })} secureTextEntry /><Field label="New password" value={p.next} onChangeText={(v) => setP({ ...p, next: v })} secureTextEntry /></Row>
        <View style={{ alignSelf: 'flex-start' }}><Btn title="Update password" onPress={pw} /></View>
      </Card>
    </Screen>
  );
}

