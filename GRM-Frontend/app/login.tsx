import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import { useSystem } from '../context/SystemContext';
import { Screen, Card, H1, Field, Btn, T } from '../components/ui';

export default function Login() {
  const { login, flash } = useSystem();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!email.trim() || !pw) {
      setErr('Please enter your email or username and password.');
      return;
    }
    setErr('');
    setSubmitting(true);
    try {
      const r = await login(email, pw);
      if (!r.ok) {
        setErr(r.error);
        return;
      }
      flash('Signed in successfully');
      const role = r.data.role;
      router.replace((role === 'Admin' ? '/admin' : role === 'Staff' ? '/staff' : '/cart') as any);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen max={480}>
      <Card>
        <H1>Log in</H1>
        <Field label="Email or Username" value={email} onChangeText={setEmail} autoCapitalize="none" testID="email" />
        <Field label="Password" value={pw} onChangeText={setPw} secureTextEntry testID="password" onSubmitEditing={submit} />
        {err ? <T style={{ color: '#DC2626' }}>{err}</T> : null}
        <Btn title={submitting ? 'Signing in...' : 'Log in'} onPress={submit} disabled={submitting} testID="login-submit" />
        <Btn title="Create a Customer account" kind="ghost" onPress={() => router.push('/register')} />
      </Card>
    </Screen>
  );
}
