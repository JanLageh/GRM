import React, { useEffect } from 'react';
import { View, Platform } from 'react-native';
import { Slot } from 'expo-router';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { SystemProvider } from '../context/SystemContext';
import TopBar from '../components/TopBar';

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
        </SafeAreaView>
      </SystemProvider>
    </SafeAreaProvider>
  );
}

