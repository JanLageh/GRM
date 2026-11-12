import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useSolarConfig, formatCurrency } from '../context/SolarConfigContext';

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 900;
  const isCompact = width < 640;

  const { totalPrice, user, sizeSpec, batteryAddOn } = useSolarConfig();

  const navItems = [
    { label: 'Overview', path: '/' },
    { label: 'Solar Builder', path: '/builder' },
    { label: 'Checkout', path: '/checkout' },
  ];

  const isActive = (path: string) => {
    if (path === '/') return pathname === '/' || pathname === '/index';
    return pathname.startsWith(path);
  };

  return (
    <View style={styles.headerWrapper}>
      <View style={[styles.container, isCompact && styles.containerCompact]}>
        {/* Left: Brand Identity */}
        <Pressable
          onPress={() => router.push('/')}
          style={styles.brandContainer}
          accessibilityRole="button"
          accessibilityLabel="GRM-Solar Panel and Battery Trading Home"
        >
          <View style={styles.logoMark}>
            <Feather name="sun" size={16} color="#FFFFFF" />
          </View>
          <View style={styles.brandTextRow}>
            <Text style={styles.brandTitle}>GRM-Solar</Text>
            <View style={styles.brandDivider} />
            <View style={styles.subtitleBadge}>
              <Text style={styles.subtitleText}>Panel & Battery Trading</Text>
            </View>
          </View>
        </Pressable>

        {/* Center: Navigation Links (Desktop inline) */}
        {isDesktop && (
          <View style={styles.navLinksRow}>
            {navItems.map((item) => {
              const active = isActive(item.path);
              return (
                <Pressable
                  key={item.path}
                  onPress={() => router.push(item.path as any)}
                  style={[styles.navItem, active && styles.navItemActive]}
                >
                  <Text style={[styles.navText, active && styles.navTextActive]}>
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}

        {/* Right: Live Cart Total Badge + Sign In / Account Pill */}
        <View style={styles.rightControls}>
          <Pressable
            onPress={() => router.push('/checkout')}
            style={styles.cartBadge}
            accessibilityRole="button"
            accessibilityLabel={`Live cart total ${formatCurrency(totalPrice)}`}
          >
            <View style={styles.emeraldDot} />
            {!isCompact && (
              <Text style={styles.cartMetaText}>
                {sizeSpec.kwText}
                {batteryAddOn === 'grm_bank_10kwh' ? ' + 10kWh' : ''}
              </Text>
            )}
            <Text style={styles.cartTotalText}>{formatCurrency(totalPrice)}</Text>
          </Pressable>

          <Pressable
            onPress={() => router.push('/login')}
            style={[
              styles.accountPill,
              pathname === '/login' && styles.accountPillActive,
            ]}
            accessibilityRole="button"
          >
            <Feather
              name="user"
              size={14}
              color={pathname === '/login' ? '#FFFFFF' : '#111111'}
            />
            <Text
              style={[
                styles.accountPillText,
                pathname === '/login' && styles.accountPillTextActive,
              ]}
              numberOfLines={1}
            >
              {user ? user.name.split(' ')[0] : 'Sign In / Account'}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Mobile Secondary Navigation Strip */}
      {!isDesktop && (
        <View style={styles.mobileNavStrip}>
          {navItems.map((item) => {
            const active = isActive(item.path);
            return (
              <Pressable
                key={item.path}
                onPress={() => router.push(item.path as any)}
                style={[styles.mobileNavTab, active && styles.mobileNavTabActive]}
              >
                <Text
                  style={[
                    styles.mobileNavText,
                    active && styles.mobileNavTextActive,
                  ]}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  headerWrapper: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    zIndex: 50,
  },
  container: {
    maxWidth: 1360,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  containerCompact: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoMark: {
    width: 30,
    height: 30,
    borderRadius: 6,
    backgroundColor: '#111111',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  brandTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111111',
    letterSpacing: -0.4,
  },
  brandDivider: {
    width: 1,
    height: 14,
    backgroundColor: '#E5E7EB',
  },
  subtitleBadge: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  subtitleText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
    letterSpacing: 0.2,
  },
  navLinksRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  navItem: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
  },
  navItemActive: {
    backgroundColor: '#F9FAFB',
  },
  navText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  navTextActive: {
    color: '#111111',
    fontWeight: '600',
  },
  rightControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cartBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    gap: 7,
  },
  emeraldDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  cartMetaText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
    paddingRight: 4,
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
  },
  cartTotalText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111111',
    fontVariant: ['tabular-nums'],
  },
  accountPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#111111',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 999,
  },
  accountPillActive: {
    backgroundColor: '#111111',
  },
  accountPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111111',
  },
  accountPillTextActive: {
    color: '#FFFFFF',
  },
  mobileNavStrip: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 12,
  },
  mobileNavTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  mobileNavTabActive: {
    borderBottomColor: '#111111',
  },
  mobileNavText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
  },
  mobileNavTextActive: {
    color: '#111111',
    fontWeight: '700',
  },
});

