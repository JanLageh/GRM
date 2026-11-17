import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import { useSystem } from '../context/SystemContext';
import { Screen, Card, H1, Field, Btn, T } from '../components/ui';

export default function Register() {
  const { register, flash } = useSystem();
  const router = useRouter();
  const [f, setF] = useState({ name: '', email: '', password: '', phone: '' });
  const [err, setErr] = useState('');
  const submit = () => {
    const r = register(f);
    if (!r.ok) { setErr(r.error); return; }
    flash('Account created — welcome!');
    router.replace('/cart');
  };
  return (
    <Screen max={460}>
      <Card>
        <H1>Register as Customer</H1>
        <Field label="Full name" value={f.name} onChangeText={(v) => setF({ ...f, name: v })} testID="reg-name" />
        <Field label="Email" value={f.email} onChangeText={(v) => setF({ ...f, email: v })} autoCapitalize="none" />
        <Field label="Phone" value={f.phone} onChangeText={(v) => setF({ ...f, phone: v })} />
        <Field label="Password (6+ chars)" value={f.password} onChangeText={(v) => setF({ ...f, password: v })} secureTextEntry />
        {err ? <T style={{ color: '#DC2626' }}>{err}</T> : null}
        <Btn title="Create account" onPress={submit} />
        <Btn title="I already have an account" kind="ghost" onPress={() => router.push('/login')} />
      </Card>
    </Screen>
  );
}

