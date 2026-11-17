import React, { ReactNode } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSystem, Role } from '../context/SystemContext';
import { Screen, Card, H1, Muted, Btn } from './ui';

export default function Guard({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { role } = useSystem();
  const router = useRouter();
  if (roles.includes(role)) return <>{children}</>;
  return (
    <Screen max={560}>
      <Card>
        <H1>403 — Access denied</H1>
        <Muted>
          You are browsing as <Muted style={{ fontWeight: '700' }}>{role}</Muted>. This area requires: {roles.join(' or ')}. Use the Role Switcher above or log in with the proper account (JWT role claim is checked on every route and API call).
        </Muted>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Btn title="Log in" onPress={() => router.push('/login')} />
          <Btn title="Home" kind="ghost" onPress={() => router.replace('/')} />
        </View>
      </Card>
    </Screen>
  );
}

