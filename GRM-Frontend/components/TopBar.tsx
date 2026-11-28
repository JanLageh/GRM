import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useSystem, Role } from '../context/SystemContext';
import { C, noPrint, useWide } from './ui';

const NAV: Record<Role, [string, string][]> = {
  Guest: [['Home', '/'], ['Catalog', '/catalog'], ['Cart', '/cart']],
  Customer: [['Home', '/'], ['Catalog', '/catalog'], ['Cart', '/cart'], ['Quotations', '/customer/quotations'], ['Orders & Invoices', '/customer/orders'], ['Profile', '/customer/profile']],
  Staff: [['Dashboard', '/staff'], ['Walk-In POS', '/staff/pos'], ['Quotations', '/staff/quotations'], ['Orders & Invoices', '/staff/orders'], ['Stock Log', '/staff/stock'], ['Purchasing', '/staff/purchasing'], ['Catalog', '/catalog']],
  Admin: [['Dashboard', '/admin'], ['Products', '/admin/catalog'], ['Pricing', '/admin/pricing'], ['Purchasing', '/admin/purchasing'], ['Inventory & Invoices', '/admin/inventory'], ['People', '/admin/people'], ['Reports', '/admin/reports'], ['Quotations', '/staff/quotations'], ['Orders', '/staff/orders']],
};
const HOME: Record<Role, string> = { Guest: '/', Customer: '/', Staff: '/staff', Admin: '/admin' };
// const ROLES: { r: Role; label: string }[] = [{ r: 'Guest', label: 'Guest' }, { r: 'Customer', label: 'Customer' }, { r: 'Staff', label: 'Staff' }, { r: 'Admin', label: 'Admin/Owner' }];

export default function TopBar() {
  const { role, user, cart, notice, logout, apiOnline, syncWithBackend, flash } = useSystem();
  const router = useRouter();
  const path = usePathname();
  const wide = useWide();
  const count = cart.reduce((a, i) => a + i.qty, 0);

  const go = (p: string) => router.push(p as any);
  // const pick = (r: Role) => { (r); router.replace(HOME[r] as any); };

  return (
    <View {...noPrint} style={{ backgroundColor: C.white, borderBottomWidth: 1, borderBottomColor: C.line, zIndex: 20 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingHorizontal: 16, paddingVertical: 10 }}>
        <Pressable onPress={() => go(HOME[role])} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ width: 32, height: 32, borderRadius: 7, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center' }}><Feather name="lock" size={15} color="#fff" /></View>
          <View>
            <Text style={{ fontWeight: '800', fontSize: 15, color: C.ink }}>Garry's Smartlock & Solar</Text>
            <Text style={{ fontSize: 10, color: C.mute, fontWeight: '600' }}>Inventory Management System · Lapu-Lapu City</Text>
          </View>
        </Pressable>

        {/* <View testID="role-switcher" style={{ flexDirection: 'row', backgroundColor: C.bg, borderWidth: 1, borderColor: C.line, borderRadius: 999, padding: 3 }}>
          {ROLES.map(({ r, label }) => (
            <Pressable key={r} testID={`role-${r}`} accessibilityRole="button" onPress={() => pick(r)} style={{ paddingHorizontal: wide ? 14 : 9, paddingVertical: 6, borderRadius: 999, backgroundColor: role === r ? C.ink : 'transparent' }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: role === r ? '#fff' : C.mute }}>{label}</Text>
            </Pressable>
          ))}
        </View> */}

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {/* Live GRM-Backend API Status Pill */}
          <Pressable
            onPress={async () => {
              const ok = await syncWithBackend();
              flash(ok ? 'Synced with GRM-Backend' : 'GRM-Backend offline', ok ? 'ok' : 'err');
            }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              backgroundColor: apiOnline ? '#ECFDF5' : '#FEF2F2',
              borderWidth: 1,
              borderColor: apiOnline ? '#A7F3D0' : '#FECACA',
              borderRadius: 999,
              paddingHorizontal: 10,
              paddingVertical: 5,
            }}
          >
            <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: apiOnline ? C.ok : C.err }} />
            <Text style={{ fontSize: 11, fontWeight: '700', color: apiOnline ? '#065F46' : '#991B1B' }}>
              {apiOnline ? 'API: Connected' : 'API: Offline'}
            </Text>
          </Pressable>

          {(role === 'Guest' || role === 'Customer') && (
            <Pressable onPress={() => go('/cart')} style={{ flexDirection: 'row', gap: 6, alignItems: 'center', borderWidth: 1, borderColor: C.line, borderRadius: 999, paddingHorizontal: 11, paddingVertical: 6 }}>
              <Feather name="shopping-cart" size={14} color={C.ink} /><Text style={{ fontWeight: '700', fontSize: 12 }}>{count}</Text>
            </Pressable>
          )}
          {user ? (
            <Pressable onPress={async () => { await logout(); router.replace('/'); }} style={{ borderWidth: 1, borderColor: C.ink, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 }}>
              <Text style={{ fontSize: 12, fontWeight: '700' }}>{user.name.split(' ')[0]} · Log out</Text>
            </Pressable>
          ) : (
            <Pressable onPress={() => go('/login')} style={{ backgroundColor: C.ink, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 7 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#fff' }}>Log in / Register</Text>
            </Pressable>
          )}
        </View>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 2, paddingHorizontal: 12, borderTopWidth: 1, borderTopColor: C.line, backgroundColor: C.bg }}>
        {NAV[role].map(([label, p]) => {
          const active = p === '/' ? path === '/' : path === p || (p !== '/staff' && p !== '/admin' && path.startsWith(p + '/'));
          return (
            <Pressable key={p + label} onPress={() => go(p)} style={{ paddingHorizontal: 11, paddingVertical: 9, borderBottomWidth: 2, borderBottomColor: active ? C.ink : 'transparent' }}>
              <Text style={{ fontSize: 13, fontWeight: active ? '700' : '500', color: active ? C.ink : C.mute }}>{label}</Text>
            </Pressable>
          );
        })}
      </View>

      {notice && (
        <View testID="notice" style={{ backgroundColor: notice.tone === 'ok' ? '#ECFDF5' : '#FEF2F2', borderTopWidth: 1, borderTopColor: notice.tone === 'ok' ? '#A7F3D0' : '#FECACA', paddingHorizontal: 16, paddingVertical: 9 }}>
          <Text style={{ color: notice.tone === 'ok' ? '#065F46' : '#991B1B', fontWeight: '600', fontSize: 13 }}>{notice.tone === 'ok' ? '✓ ' : '⚠ '}{notice.msg}</Text>
        </View>
      )}
    </View>
  );
}
