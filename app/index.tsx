import React from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import {
  useSolarConfig,
  SOLAR_SIZE_SPECS,
  SolarSizeId,
  formatCurrency,
} from '../context/SolarConfigContext';
import HouseVisualizer from '../components/HouseVisualizer';

export default function LandingPage() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 900;

  const {
    selectedSize,
    setSelectedSize,
    batteryAddOn,
    installMethod,
    totalPrice,
  } = useSolarConfig();

  const handleQuickConfigure = (size: SolarSizeId) => {
    setSelectedSize(size);
    router.push('/builder');
  };

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero Section */}
      <View style={[styles.heroSection, isDesktop && styles.heroSectionDesktop]}>
        <View style={[styles.heroLeft, isDesktop && styles.heroLeftDesktop]}>
          <View style={styles.statusPill}>
            <View style={styles.emeraldDot} />
            <Text style={styles.statusPillText}>
              DIRECT-TO-SITE SOLAR & LFP STORAGE TRADING DESK
            </Text>
          </View>

          <Text style={[styles.heroHeadline, isDesktop && styles.heroHeadlineDesktop]}>
            Power, simplified.
          </Text>

          <Text style={styles.heroSubheadline}>
            Welcome to{' '}
            <Text style={styles.heroBrandStrong}>
              GRM-Solar Panel and Battery Trading
            </Text>{' '}
            — transparent architectural-grade N-Type solar arrays and 10kWh LiFePO4
            battery walls shipped direct as pre-engineered DIY kits or installed by
            certified GRM-Solar technicians.
          </Text>

          <View style={styles.ctaRow}>
            <Pressable
              onPress={() => router.push('/builder')}
              style={styles.primaryCta}
              accessibilityRole="button"
              accessibilityLabel="Build Your System"
            >
              <Text style={styles.primaryCtaText}>Build Your System</Text>
              <Feather name="arrow-right" size={18} color="#FFFFFF" />
            </Pressable>

            <Pressable
              onPress={() => router.push('/checkout')}
              style={styles.secondaryCta}
              accessibilityRole="button"
            >
              <Text style={styles.secondaryCtaText}>
                Direct Checkout ({formatCurrency(totalPrice)})
              </Text>
            </Pressable>
          </View>

          {/* Trust & Trading Specs Strip */}
          <View style={styles.kpiRow}>
            <View style={styles.kpiItem}>
              <Text style={styles.kpiValue}>22.8%</Text>
              <Text style={styles.kpiLabel}>N-Type Cell Efficiency</Text>
            </View>
            <View style={styles.kpiDivider} />
            <View style={styles.kpiItem}>
              <Text style={styles.kpiValue}>6,000+</Text>
              <Text style={styles.kpiLabel}>LiFePO4 Charge Cycles</Text>
            </View>
            <View style={styles.kpiDivider} />
            <View style={styles.kpiItem}>
              <Text style={styles.kpiValue}>25 YR</Text>
              <Text style={styles.kpiLabel}>Performance Warranty</Text>
            </View>
          </View>
        </View>

        {/* Right: Interactive Architectural Preview */}
        <View style={[styles.heroRight, isDesktop && styles.heroRightDesktop]}>
          <HouseVisualizer
            selectedSize={selectedSize}
            batteryAddOn={batteryAddOn}
            installMethod={installMethod}
            compact={!isDesktop}
          />
          <View style={styles.previewSwitchBar}>
            <Text style={styles.previewSwitchLabel}>LIVE ARRAY PREVIEW:</Text>
            <View style={styles.previewSwitchPills}>
              {(['small', 'medium', 'large'] as SolarSizeId[]).map((sizeKey) => {
                const s = SOLAR_SIZE_SPECS[sizeKey];
                const active = selectedSize === sizeKey;
                return (
                  <Pressable
                    key={sizeKey}
                    onPress={() => setSelectedSize(sizeKey)}
                    style={[
                      styles.previewSizePill,
                      active && styles.previewSizePillActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.previewSizePillText,
                        active && styles.previewSizePillTextActive,
                      ]}
                    >
                      {s.label} ({s.kwText})
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
      </View>

      {/* Value Proposition Grid (Responsive 3-Card Layout) */}
      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeaderRow}>
          <View>
            <Text style={styles.sectionEyebrow}>ARCHITECTURAL TRADING PLATFORM</Text>
            <Text style={styles.sectionTitle}>
              Engineered for complete transparency.
            </Text>
          </View>
          <Pressable
            onPress={() => router.push('/builder')}
            style={styles.sectionLinkBtn}
          >
            <Text style={styles.sectionLinkText}>Open Solar Builder</Text>
            <Feather name="arrow-up-right" size={16} color="#111111" />
          </Pressable>
        </View>

        <View style={[styles.valueGrid, isDesktop && styles.valueGridDesktop]}>
          {/* Card 1: Modular Array Sizes */}
          <View style={[styles.valueCard, isDesktop && styles.valueCardDesktop]}>
            <View style={styles.valueCardTopRow}>
              <View style={styles.iconBox}>
                <Feather name="grid" size={20} color="#111111" />
              </View>
              <View style={styles.cardBadge}>
                <Text style={styles.cardBadgeText}>TIER-1 BIFACIAL MONO</Text>
              </View>
            </View>
            <Text style={styles.valueCardTitle}>Modular Array Sizes</Text>
            <Text style={styles.valueCardBody}>
              Small (4.0 kW), Medium (7.2 kW), and Large (11.2 kW) solar kits matched
              with high-efficiency hybrid string inverters and anodized rail hardware.
            </Text>
            <View style={styles.specList}>
              <View style={styles.specRowItem}>
                <Text style={styles.specRowName}>Small • 10 Panels (2x5)</Text>
                <Text style={styles.specRowVal}>$4,800</Text>
              </View>
              <View style={styles.specRowItem}>
                <Text style={styles.specRowName}>Medium • 18 Panels (3x6)</Text>
                <Text style={styles.specRowVal}>$7,900</Text>
              </View>
              <View style={styles.specRowItem}>
                <Text style={styles.specRowName}>Large • 28 Panels (4x7)</Text>
                <Text style={styles.specRowVal}>$11,500</Text>
              </View>
            </View>
            <Pressable
              onPress={() => handleQuickConfigure('medium')}
              style={styles.cardActionBtn}
            >
              <Text style={styles.cardActionText}>Compare Array Sizes</Text>
              <Feather name="chevron-right" size={16} color="#111111" />
            </Pressable>
          </View>

          {/* Card 2: Battery Storage Trading */}
          <View style={[styles.valueCard, isDesktop && styles.valueCardDesktop]}>
            <View style={styles.valueCardTopRow}>
              <View style={styles.iconBox}>
                <Feather name="battery-charging" size={20} color="#10B981" />
              </View>
              <View style={[styles.cardBadge, styles.cardBadgeEmerald]}>
                <Text style={styles.cardBadgeEmeraldText}>+$3,400 TRADE LOT</Text>
              </View>
            </View>
            <Text style={styles.valueCardTitle}>Battery Storage Trading</Text>
            <Text style={styles.valueCardBody}>
              High-density 10kWh LiFePO4 battery wall units engineered for whole-home
              blackout protection, peak-tariff arbitrage, and zero-cobalt thermal safety.
            </Text>
            <View style={styles.specList}>
              <View style={styles.specRowItem}>
                <Text style={styles.specRowName}>Model</Text>
                <Text style={styles.specRowVal}>GRM-Bank 10kWh LFP</Text>
              </View>
              <View style={styles.specRowItem}>
                <Text style={styles.specRowName}>Continuous Output</Text>
                <Text style={styles.specRowVal}>7.6 kW / 11.4 kW Peak</Text>
              </View>
              <View style={styles.specRowItem}>
                <Text style={styles.specRowName}>Enclosure Rating</Text>
                <Text style={styles.specRowVal}>IP65 Garage / Exterior</Text>
              </View>
            </View>
            <Pressable
              onPress={() => router.push('/builder')}
              style={styles.cardActionBtn}
            >
              <Text style={styles.cardActionText}>Configure Storage</Text>
              <Feather name="chevron-right" size={16} color="#111111" />
            </Pressable>
          </View>

          {/* Card 3: Flexible Setup */}
          <View style={[styles.valueCard, isDesktop && styles.valueCardDesktop]}>
            <View style={styles.valueCardTopRow}>
              <View style={styles.iconBox}>
                <Feather name="tool" size={20} color="#111111" />
              </View>
              <View style={styles.cardBadge}>
                <Text style={styles.cardBadgeText}>DIY OR TURNKEY PRO</Text>
              </View>
            </View>
            <Text style={styles.valueCardTitle}>Flexible Setup</Text>
            <Text style={styles.valueCardBody}>
              Complete DIY Self-Install Kits with stamped engineering blueprints, or
              Certified GRM-Solar Pro Installation with full utility interconnect.
            </Text>
            <View style={styles.specList}>
              <View style={styles.specRowItem}>
                <Text style={styles.specRowName}>DIY Self-Install Kit</Text>
                <Text style={styles.specRowVal}>+$0 (Included)</Text>
              </View>
              <View style={styles.specRowItem}>
                <Text style={styles.specRowName}>Certified Pro Install</Text>
                <Text style={styles.specRowVal}>+$1,800 Flat</Text>
              </View>
              <View style={styles.specRowItem}>
                <Text style={styles.specRowName}>Permit & CAD Packet</Text>
                <Text style={styles.specRowVal}>Instant Digital Issue</Text>
              </View>
            </View>
            <Pressable
              onPress={() => router.push('/builder')}
              style={styles.cardActionBtn}
            >
              <Text style={styles.cardActionText}>Select Installation</Text>
              <Feather name="chevron-right" size={16} color="#111111" />
            </Pressable>
          </View>
        </View>
      </View>

      {/* Bottom Minimalist Banner */}
      <View style={styles.bottomCtaSection}>
        <View style={[styles.bottomBanner, isDesktop && styles.bottomBannerDesktop]}>
          <View style={styles.bottomBannerTextCol}>
            <Text style={styles.bottomBannerTitle}>
              Ready to lock in wholesale solar & battery pricing?
            </Text>
            <Text style={styles.bottomBannerSub}>
              Configure your roof array size, toggle the 10kWh LiFePO4 wall unit, and
              receive your itemized engineering schematic in under 60 seconds.
            </Text>
          </View>
          <Pressable
            onPress={() => router.push('/builder')}
            style={styles.primaryCta}
          >
            <Text style={styles.primaryCtaText}>Launch Solar Builder</Text>
            <Feather name="arrow-right" size={18} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    paddingBottom: 64,
  },
  heroSection: {
    maxWidth: 1360,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 40,
    gap: 32,
  },
  heroSectionDesktop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 48,
    paddingBottom: 56,
    gap: 48,
  },
  heroLeft: {
    flex: 1,
    gap: 20,
  },
  heroLeftDesktop: {
    maxWidth: 560,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 8,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  emeraldDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#111111',
    letterSpacing: 0.7,
  },
  heroHeadline: {
    fontSize: 42,
    fontWeight: '800',
    color: '#111111',
    letterSpacing: -1.4,
    lineHeight: 46,
  },
  heroHeadlineDesktop: {
    fontSize: 58,
    lineHeight: 62,
  },
  heroSubheadline: {
    fontSize: 16,
    lineHeight: 26,
    color: '#6B7280',
  },
  heroBrandStrong: {
    color: '#111111',
    fontWeight: '700',
  },
  ctaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 12,
    paddingTop: 6,
  },
  primaryCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#111111',
    paddingHorizontal: 24,
    paddingVertical: 15,
    borderRadius: 8,
  },
  primaryCtaText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  secondaryCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 8,
  },
  secondaryCtaText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111111',
  },
  kpiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 18,
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 20,
  },
  kpiItem: {
    flex: 1,
  },
  kpiDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#E5E7EB',
  },
  kpiValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111111',
    letterSpacing: -0.5,
  },
  kpiLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  heroRight: {
    flex: 1,
    gap: 12,
  },
  heroRightDesktop: {
    maxWidth: 680,
  },
  previewSwitchBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
  },
  previewSwitchLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
    letterSpacing: 0.6,
  },
  previewSwitchPills: {
    flexDirection: 'row',
    gap: 6,
  },
  previewSizePill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  previewSizePillActive: {
    borderColor: '#111111',
    backgroundColor: '#111111',
  },
  previewSizePillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111111',
  },
  previewSizePillTextActive: {
    color: '#FFFFFF',
  },
  sectionContainer: {
    maxWidth: 1360,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
    gap: 24,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 36,
    gap: 12,
  },
  sectionEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
    letterSpacing: 0.9,
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111111',
    letterSpacing: -0.7,
  },
  sectionLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
  },
  sectionLinkText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111111',
  },
  valueGrid: {
    gap: 20,
  },
  valueGridDesktop: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  valueCard: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 24,
    justifyContent: 'space-between',
    gap: 16,
  },
  valueCardDesktop: {
    minHeight: 340,
  },
  valueCardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBadge: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  cardBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#111111',
    letterSpacing: 0.5,
  },
  cardBadgeEmerald: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  cardBadgeEmeraldText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#065F46',
    letterSpacing: 0.5,
  },
  valueCardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111111',
    letterSpacing: -0.3,
  },
  valueCardBody: {
    fontSize: 14,
    lineHeight: 22,
    color: '#6B7280',
  },
  specList: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
  specRowItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  specRowName: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  specRowVal: {
    fontSize: 12,
    color: '#111111',
    fontWeight: '700',
  },
  cardActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  cardActionText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111111',
  },
  bottomCtaSection: {
    maxWidth: 1360,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 24,
    marginTop: 40,
  },
  bottomBanner: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#111111',
    borderRadius: 12,
    padding: 28,
    gap: 20,
  },
  bottomBannerDesktop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 36,
    paddingVertical: 32,
  },
  bottomBannerTextCol: {
    flex: 1,
    maxWidth: 720,
    gap: 6,
  },
  bottomBannerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111111',
    letterSpacing: -0.4,
  },
  bottomBannerSub: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 21,
  },
});

