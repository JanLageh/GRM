import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Slot } from 'expo-router';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { SolarConfigProvider } from '../context/SolarConfigContext';
import Header from '../components/Header';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <SolarConfigProvider>
        <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
          <StatusBar style="dark" />
          <View style={styles.rootContainer}>
            <Header />
            <View style={styles.contentArea}>
              <Slot />
            </View>
          </View>
        </SafeAreaView>
      </SolarConfigProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  rootContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  contentArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
});

