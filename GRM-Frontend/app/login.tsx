import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import { useSystem } from '../context/SystemContext';
import { Screen, Card, H1, Muted, Field, Btn, Row, T } from '../components/ui';

export default function Login() {
  const { login, flash, apiOnline } = useSystem();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const submit = () => {
    const r = login(email, pw);
    if (!r.ok) { setErr(r.error); return; }
    flash(apiOnline ? 'Signed in via GRM-Backend JWT (/api/auth/login)' : 'Signed in (local JWT issued)');
    const u = email.trim().toLowerCase();
    router.replace((u.startsWith('admin') ? '/admin' : u.startsWith('staff') ? '/staff' : '/cart') as any);
  };
  const fill = (e: string, p: string) => { setEmail(e); setPw(p); setErr(''); };
  return (
    <Screen max={480}>
      <Card>
        <H1>Log in</H1>
        <Field label="Email or Username" value={email} onChangeText={setEmail} autoCapitalize="none" testID="email" />
        <Field label="Password" value={pw} onChangeText={setPw} secureTextEntry testID="password" onSubmitEditing={submit} />
        {err ? <T style={{ color: '#DC2626' }}>{err}</T> : null}
        <Btn title="Log in" onPress={submit} testID="login-submit" />
        <Btn title="Create a Customer account" kind="ghost" onPress={() => router.push('/register')} />
      </Card>
      <Card title="GRM-Backend Seeded Accounts (tap to fill)">
        <Row>
          <Btn small kind="ghost" title="Customer (customer@grm.local)" onPress={() => fill('customer@grm.local', 'Customer123!')} />
          <Btn small kind="ghost" title="Staff (staff@grm.local)" onPress={() => fill('staff@grm.local', 'Staff123!')} />
          <Btn small kind="ghost" title="Admin (admin@grm.local)" onPress={() => fill('admin@grm.local', 'Admin123!')} />
        </Row>
        <Muted>
          Authenticates against POST http://localhost:5133/api/auth/login (or local fallback if the C# server is stopped) and attaches the Bearer JWT token to subsequent API calls.
        </Muted>
      </Card>
    </Screen>
  );
}
