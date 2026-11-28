import React, { useEffect } from 'react';
import { View, Platform, Pressable, Text } from 'react-native';
import { Slot, useRouter, usePathname } from 'expo-router';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { SystemProvider } from '../context/SystemContext';
import TopBar from '../components/TopBar';
import { C, noPrint } from '../components/ui';

function FloatingAboutButton() {
  const router = useRouter();
  const pathname = usePathname();
  if (pathname === '/about') return null;

  return (
    <Pressable
      {...noPrint}
      onPress={() => router.push('/about')}
      accessibilityRole="button"
      accessibilityLabel="About Us & Contact"
      testID="floating-about-btn"
      style={({ pressed }) => ({
        position: (Platform.OS === 'web' ? 'fixed' : 'absolute') as any,
        bottom: 24,
        right: 24,
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: C.ink,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
        opacity: pressed ? 0.85 : 1,
        ...(Platform.OS === 'web'
          ? { boxShadow: '0 4px 14px rgba(0, 0, 0, 0.22)', cursor: 'pointer' }
          : {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 3 },
              shadowOpacity: 0.25,
              shadowRadius: 6,
              elevation: 6,
            }),
      })}
    >
      <Text style={{ color: '#fff', fontSize: 22, fontWeight: '800', lineHeight: 24 }}>?</Text>
    </Pressable>
  );
}

export default function RootLayout() {
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const s = document.createElement('style');
      s.innerHTML = '@media print{[data-noprint]{display:none!important} body{background:#fff!important}}';
      document.head.appendChild(s);
      document.title = "Garry's Smartlock and Solar — Inventory System";
    }
  }, []);
  return (
    <SafeAreaProvider>
      <SystemProvider>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top', 'left', 'right']}>
          <StatusBar style="dark" />
          <TopBar />
          <View style={{ flex: 1 }}><Slot /></View>
          <FloatingAboutButton />
        </SafeAreaView>
      </SystemProvider>
    </SafeAreaProvider>
  );
}

