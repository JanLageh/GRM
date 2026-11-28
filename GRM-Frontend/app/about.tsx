import React, { useState } from 'react';
import { View } from 'react-native';
import { useSystem } from '../context/SystemContext';
import { Screen, Card, H1, Muted, T, Field, Btn, Row } from '../components/ui';

export default function About() {
  const { submitInquiry, flash } = useSystem();
  const [f, setF] = useState({ name: '', email: '', message: '' });
  const send = async () => {
    const r = await submitInquiry(f);
    if (r.ok) { flash('Inquiry sent. We will reply by email.'); setF({ name: '', email: '', message: '' }); } else flash(r.error, 'err');
  };
  return (
    <Screen max={900}>
      <H1>About Us</H1>
      <Card>
        <T bold>Garry's Smartlock and Solar</T>
        <Muted>Mahayahay, Bankal, Lapu-Lapu City, Cebu, Philippines. We supply smart locks (PIN, biometric, card), solar panel sets in Small, Medium and Large sizes, LiFePO4 batteries, and complete solar kit bundles. Hardware sales only — all items are tracked per variant SKU to keep stock accurate.</Muted>
        <Muted>Store hours: Mon–Sat 8:00 AM – 6:00 PM · Phone: 0917 100 0001 · Email: admin@garry.ph</Muted>
      </Card>
      <Card title="Contact Us">
        <Row>
          <Field label="Name" value={f.name} onChangeText={(v) => setF({ ...f, name: v })} />
          <Field label="Email" value={f.email} onChangeText={(v) => setF({ ...f, email: v })} autoCapitalize="none" />
        </Row>
        <Field label="Message" value={f.message} onChangeText={(v) => setF({ ...f, message: v })} multiline style={{ minHeight: 90 }} />
        <View style={{ alignSelf: 'flex-start' }}><Btn title="Send Inquiry" onPress={send} /></View>
      </Card>
    </Screen>
  );
}

