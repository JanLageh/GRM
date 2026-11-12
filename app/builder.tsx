import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
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
  BATTERY_PRICE,
  PRO_INSTALL_PRICE,
} from '../context/SolarConfigContext';
import HouseVisualizer from '../components/HouseVisualizer';

const DIY_BLUEPRINT_ITEMS = [
  'Pre-terminated MC4 solar string harnesses & combiner disconnect box',
  'Anodized L-foot & rail racking hardware matched to your roof pitch',
  'Stamped single-line electrical schematic (NEC 2023 Article 690 compliant)',
  'Local utility net-metering & AHJ building permit submittal packet',
];

export default function SolarBuilderScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 900;

  const {
    selectedSize,
    setSelectedSize,
    batteryAddOn,
    setBatteryAddOn,
    installMethod,
    setInstallMethod,
    diySafetyAck,
    setDiySafetyAck,
    servicePostalCode,
    setServicePostalCode,
    isPostalVerified,
    verifyPostalCode,
    sizeSpec,
    panelPrice,
    batteryPrice,
    installPrice,
    totalPrice,
  } = useSolarConfig();

  const [validationAlert, setValidationAlert] = useState<string>('');

  const handleProceedToCheckout = () => {
    if (installMethod === 'diy' && !diySafetyAck) {
      setValidationAlert(
        'Please acknowledge the DIY high-voltage DC wiring & permit safety requirement before checkout.'
      );
      return;
    }
    if (installMethod === 'pro' && !isPostalVerified) {
      const ok = verifyPostalCode(servicePostalCode);
      if (!ok) {
        setValidationAlert(
          'Please enter a valid postal/ZIP code to confirm Certified Pro technician availability.'
        );
        return;
      }
    }
    setValidationAlert('');
    router.push('/checkout');
  };

  const renderConfiguratorSteps = () => (
    <View style={styles.stepsColumn}>
      {/* Configurator Intro Header */}
      <View style={styles.configHeaderBlock}>
        <Text style={styles.eyebrowText}>SYSTEM ARCHITECTURE CONFIGURATOR</Text>
        <Text style={styles.configTitle}>Build Your GRM-Solar System</Text>
        <Text style={styles.configSubtitle}>
          Select your modular N-Type photovoltaic array, LiFePO4 battery wall allocation,
          and preferred deployment method.
        </Text>
      </View>

      {/* STEP 1: Select Solar Panel Size */}
      <View style={styles.stepSection}>
        <View style={styles.stepTitleRow}>
          <View style={styles.stepBadge}>
            <Text style={styles.stepBadgeText}>01</Text>
          </View>
          <View>
            <Text style={styles.stepHeading}>Select Solar Panel Size</Text>
            <Text style={styles.stepSubheading}>
              400W N-Type Bifacial Monocrystalline modules + Hybrid String Inverter
            </Text>
          </View>
        </View>

        <View style={styles.cardsStack}>
          {(['small', 'medium', 'large'] as SolarSizeId[]).map((sizeKey) => {
            const item = SOLAR_SIZE_SPECS[sizeKey];
            const isSelected = selectedSize === sizeKey;
            return (
              <Pressable
                key={item.id}
                onPress={() => setSelectedSize(item.id)}
                style={[
                  styles.optionCard,
                  isSelected && styles.optionCardSelected,
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
              >
                <View style={styles.optionTopRow}>
                  <View style={styles.optionTitleGroup}>
                    <View
                      style={[
                        styles.radioOuter,
                        isSelected && styles.radioOuterActive,
                      ]}
                    >
                      {isSelected && <View style={styles.radioInner} />}
                    </View>
                    <Text style={styles.optionTitle}>
                      {item.label} ({item.kwText})
                    </Text>
                    {item.badge && (
                      <View style={styles.popularBadge}>
                        <Text style={styles.popularBadgeText}>{item.badge}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.optionPrice}>
                    {formatCurrency(item.price)}
                  </Text>
                </View>

                <Text style={styles.optionDescription}>{item.description}</Text>

                <View style={styles.specChipsRow}>
                  <View style={styles.specChip}>
                    <Text style={styles.specChipText}>
                      {item.panelCount} panels ({item.gridLabel})
                    </Text>
                  </View>
                  <View style={styles.specChip}>
                    <Text style={styles.specChipText}>
                      {item.roofSqFt} sq ft roof space
                    </Text>
                  </View>
                  <View style={[styles.specChip, styles.specChipEmerald]}>
                    <Text style={styles.specChipEmeraldText}>
                      ~{item.dailyKwh} kWh/day
                    </Text>
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* STEP 2: Select Battery Storage */}
      <View style={styles.stepSection}>
        <View style={styles.stepTitleRow}>
          <View style={styles.stepBadge}>
            <Text style={styles.stepBadgeText}>02</Text>
          </View>
          <View>
            <Text style={styles.stepHeading}>Select Battery Storage</Text>
            <Text style={styles.stepSubheading}>
              Trade grid-tied export or add high-density LFP home backup wall storage
            </Text>
          </View>
        </View>

        <View style={styles.cardsStack}>
          {/* Grid-Only (No Battery) */}
          <Pressable
            onPress={() => setBatteryAddOn('none')}
            style={[
              styles.optionCard,
              batteryAddOn === 'none' && styles.optionCardSelected,
            ]}
            accessibilityRole="button"
          >
            <View style={styles.optionTopRow}>
              <View style={styles.optionTitleGroup}>
                <View
                  style={[
                    styles.radioOuter,
                    batteryAddOn === 'none' && styles.radioOuterActive,
                  ]}
                >
                  {batteryAddOn === 'none' && <View style={styles.radioInner} />}
                </View>
                <Text style={styles.optionTitle}>Grid-Only (No Battery)</Text>
              </View>
              <Text style={styles.optionPrice}>+$0</Text>
            </View>
            <Text style={styles.optionDescription}>
              Direct solar-to-grid net metering configuration. Ready for plug-and-play
              LFP expansion at any time via hybrid inverter battery terminals.
            </Text>
          </Pressable>

          {/* GRM-Bank 10kWh LiFePO4 Backup */}
          <Pressable
            onPress={() => setBatteryAddOn('grm_bank_10kwh')}
            style={[
              styles.optionCard,
              batteryAddOn === 'grm_bank_10kwh' && styles.optionCardSelected,
            ]}
            accessibilityRole="button"
          >
            <View style={styles.optionTopRow}>
              <View style={styles.optionTitleGroup}>
                <View
                  style={[
                    styles.radioOuter,
                    batteryAddOn === 'grm_bank_10kwh' && styles.radioOuterActive,
                  ]}
                >
                  {batteryAddOn === 'grm_bank_10kwh' && (
                    <View style={styles.radioInner} />
                  )}
                </View>
                <Text style={styles.optionTitle}>
                  GRM-Bank 10kWh LiFePO4 Backup
                </Text>
              </View>
              <Text style={styles.optionPrice}>
                +{formatCurrency(BATTERY_PRICE)}
              </Text>
            </View>
            <Text style={styles.optionDescription}>
              Architectural garage-wall mounted 10.24 kWh Lithium Iron Phosphate storage
              unit with <Text style={styles.inlineStrong}>&lt;10ms automatic transfer</Text>{' '}
              outage protection and mobile peak-shaving telemetry.
            </Text>
            <View style={styles.specChipsRow}>
              <View style={[styles.specChip, styles.specChipEmerald]}>
                <Text style={styles.specChipEmeraldText}>10.0 kWh Usable</Text>
              </View>
              <View style={styles.specChip}>
                <Text style={styles.specChipText}>6,000+ Cycles @ 80% DoD</Text>
              </View>
              <View style={styles.specChip}>
                <Text style={styles.specChipText}>IP65 Wall Mount</Text>
              </View>
            </View>
          </Pressable>
        </View>
      </View>

      {/* STEP 3: Choose Installation Method */}
      <View style={styles.stepSection}>
        <View style={styles.stepTitleRow}>
          <View style={styles.stepBadge}>
            <Text style={styles.stepBadgeText}>03</Text>
          </View>
          <View>
            <Text style={styles.stepHeading}>Choose Installation Method</Text>
            <Text style={styles.stepSubheading}>
              Direct freight DIY builder kit or turnkey GRM-Solar Certified Crew
            </Text>
          </View>
        </View>

        <View style={styles.cardsStack}>
          {/* DIY / Self-Install Kit */}
          <Pressable
            onPress={() => {
              setInstallMethod('diy');
              setValidationAlert('');
            }}
            style={[
              styles.optionCard,
              installMethod === 'diy' && styles.optionCardSelected,
            ]}
            accessibilityRole="button"
          >
            <View style={styles.optionTopRow}>
              <View style={styles.optionTitleGroup}>
                <View
                  style={[
                    styles.radioOuter,
                    installMethod === 'diy' && styles.radioOuterActive,
                  ]}
                >
                  {installMethod === 'diy' && <View style={styles.radioInner} />}
                </View>
                <Text style={styles.optionTitle}>DIY / Self-Install Kit</Text>
              </View>
              <Text style={styles.optionPrice}>+$0</Text>
            </View>
            <Text style={styles.optionDescription}>
              Complete palletized hardware kit with pre-labeled solar racking, custom
              CAD string layouts, and utility permit engineering schematics.
            </Text>

            {/* Dynamically Expanded DIY Inline Checklist & Mandatory Safety Checkbox */}
            {installMethod === 'diy' && (
              <View style={styles.expandedDrawer}>
                <Text style={styles.drawerHeading}>
                  INCLUDED RACKING & WIRING BLUEPRINT PACKAGE:
                </Text>
                <View style={styles.checklistContainer}>
                  {DIY_BLUEPRINT_ITEMS.map((line, idx) => (
                    <View key={idx} style={styles.checklistItem}>
                      <Feather name="check-circle" size={14} color="#10B981" />
                      <Text style={styles.checklistText}>{line}</Text>
                    </View>
                  ))}
                </View>

                <Pressable
                  onPress={() => {
                    setDiySafetyAck(!diySafetyAck);
                    if (!diySafetyAck) setValidationAlert('');
                  }}
                  style={[
                    styles.safetyAckBox,
                    diySafetyAck && styles.safetyAckBoxChecked,
                  ]}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: diySafetyAck }}
                >
                  <View
                    style={[
                      styles.checkboxSquare,
                      diySafetyAck && styles.checkboxSquareChecked,
                    ]}
                  >
                    {diySafetyAck && (
                      <Feather name="check" size={12} color="#FFFFFF" />
                    )}
                  </View>
                  <Text style={styles.safetyAckText}>
                    I understand this DIY kit involves high-voltage DC wiring and local
                    utility permits
                  </Text>
                </Pressable>
              </View>
            )}
          </Pressable>

          {/* GRM-Solar Certified Installation */}
          <Pressable
            onPress={() => {
              setInstallMethod('pro');
              setValidationAlert('');
            }}
            style={[
              styles.optionCard,
              installMethod === 'pro' && styles.optionCardSelected,
            ]}
            accessibilityRole="button"
          >
            <View style={styles.optionTopRow}>
              <View style={styles.optionTitleGroup}>
                <View
                  style={[
                    styles.radioOuter,
                    installMethod === 'pro' && styles.radioOuterActive,
                  ]}
                >
                  {installMethod === 'pro' && <View style={styles.radioInner} />}
                </View>
                <Text style={styles.optionTitle}>
                  GRM-Solar Certified Installation
                </Text>
              </View>
              <Text style={styles.optionPrice}>
                +{formatCurrency(PRO_INSTALL_PRICE)}
              </Text>
            </View>
            <Text style={styles.optionDescription}>
              Full turnkey roof mounting, conduit routing, main panel tie-in, municipal
              inspection sign-off, and 10-year workmanship warranty.
            </Text>

            {/* Dynamically Expanded Service Area / Postal Code Verifier */}
            {installMethod === 'pro' && (
              <View style={styles.expandedDrawer}>
                <Text style={styles.drawerHeading}>
                  SERVICE AREA / POSTAL CODE VERIFIER:
                </Text>
                <View style={styles.postalVerifierRow}>
                  <TextInput
                    value={servicePostalCode}
                    onChangeText={(txt) => {
                      setServicePostalCode(txt);
                      verifyPostalCode(txt);
                    }}
                    placeholder="Enter Postal / ZIP Code (e.g., 78701)"
                    placeholderTextColor="#9CA3AF"
                    style={styles.postalInput}
                  />
                  <Pressable
                    onPress={() => verifyPostalCode(servicePostalCode)}
                    style={styles.verifyBtn}
                  >
                    <Text style={styles.verifyBtnText}>Verify Crew</Text>
                  </Pressable>
                </View>

                {isPostalVerified ? (
                  <View style={styles.verifiedStatusRow}>
                    <View style={styles.emeraldDot} />
                    <Text style={styles.verifiedStatusText}>
                      GRM-Solar NABCEP Certified Crew available in Postal Area{' '}
                      {servicePostalCode || '78701'} • Est. lead time: 5–7 business days.
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.unverifiedStatusText}>
                    Enter a valid 4+ character Postal/ZIP code to confirm crew dispatch.
                  </Text>
                )}
              </View>
            )}
          </Pressable>
        </View>
      </View>

      {validationAlert ? (
        <View style={styles.validationBanner}>
          <Feather name="alert-circle" size={16} color="#DC2626" />
          <Text style={styles.validationBannerText}>{validationAlert}</Text>
        </View>
      ) : null}
    </View>
  );

  return (
    <View style={styles.pageWrapper}>
      {isDesktop ? (
        /* DESKTOP / WEB (width >= 900): 2-Column Split Screen */
        <View style={styles.desktopSplitContainer}>
          {/* Left Column: Sticky Architectural Visualizer + Live Itemized Summary */}
          <View style={styles.desktopLeftSticky}>
            <HouseVisualizer
              selectedSize={selectedSize}
              batteryAddOn={batteryAddOn}
              installMethod={installMethod}
            />

            <View style={styles.desktopSummaryCard}>
              <View style={styles.desktopSummaryRow}>
                <View>
                  <Text style={styles.summaryLabel}>SELECTED SYSTEM LOT</Text>
                  <Text style={styles.summaryLinesText}>
                    {sizeSpec.label} {sizeSpec.kwText} ({sizeSpec.panelCount} panels) •{' '}
                    {batteryAddOn === 'grm_bank_10kwh'
                      ? 'GRM-Bank 10kWh LFP'
                      : 'Grid-Only'}{' '}
                    • {installMethod === 'pro' ? 'Certified Pro Install' : 'DIY Kit'}
                  </Text>
                </View>
                <View style={styles.summaryPriceColumn}>
                  <Text style={styles.summaryTotalLabel}>TOTAL TRADE PRICE</Text>
                  <Text style={styles.summaryTotalPrice}>
                    {formatCurrency(totalPrice)}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Right Column: Scrollable 3-Step Configurator */}
          <ScrollView
            style={styles.desktopRightScroll}
            contentContainerStyle={styles.desktopRightScrollContent}
            showsVerticalScrollIndicator={false}
          >
            {renderConfiguratorSteps()}
          </ScrollView>
        </View>
      ) : (
        /* MOBILE (width < 900): Stacked Vertical Layout with Pinned Card Visualizer */
        <ScrollView
          style={styles.mobileScroll}
          contentContainerStyle={styles.mobileScrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.mobileVisualizerWrapper}>
            <HouseVisualizer
              selectedSize={selectedSize}
              batteryAddOn={batteryAddOn}
              installMethod={installMethod}
              compact
            />
          </View>
          {renderConfiguratorSteps()}
        </ScrollView>
      )}

      {/* Sticky Summary Footer (Desktop & Mobile) */}
      <View style={styles.stickyFooter}>
        <View style={styles.stickyFooterInner}>
          <View style={styles.footerBreakdownCol}>
            <View style={styles.footerItemizedRow}>
              <Text style={styles.footerItemTag}>
                {sizeSpec.label} Array ({sizeSpec.kwText}): {formatCurrency(panelPrice)}
              </Text>
              <Text style={styles.footerItemDot}>•</Text>
              <Text style={styles.footerItemTag}>
                Battery:{' '}
                {batteryAddOn === 'grm_bank_10kwh'
                  ? `10kWh LFP (+${formatCurrency(batteryPrice)})`
                  : 'Grid-Only (+$0)'}
              </Text>
              <Text style={styles.footerItemDot}>•</Text>
              <Text style={styles.footerItemTag}>
                Setup:{' '}
                {installMethod === 'pro'
                  ? `Certified Pro (+${formatCurrency(installPrice)})`
                  : 'DIY Kit (+$0)'}
              </Text>
            </View>
            <View style={styles.footerTotalLine}>
              <Text style={styles.footerTotalCaption}>LIVE SYSTEM TOTAL:</Text>
              <Text style={styles.footerTotalAmount}>
                {formatCurrency(totalPrice)}
              </Text>
            </View>
          </View>

          <Pressable
            onPress={handleProceedToCheckout}
            style={styles.checkoutCtaBtn}
            accessibilityRole="button"
            accessibilityLabel="Proceed to Checkout"
          >
            <Text style={styles.checkoutCtaText}>Proceed to Checkout</Text>
            <Feather name="arrow-right" size={17} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pageWrapper: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  desktopSplitContainer: {
    flex: 1,
    maxWidth: 1360,
    width: '100%',
    alignSelf: 'center',
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingTop: 22,
    gap: 32,
  },
  desktopLeftSticky: {
    flex: 1.08,
    gap: 14,
  },
  desktopSummaryCard: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 18,
  },
  desktopSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6B7280',
    letterSpacing: 0.7,
    marginBottom: 4,
  },
  summaryLinesText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111111',
  },
  summaryPriceColumn: {
    alignItems: 'flex-end',
  },
  summaryTotalLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#10B981',
    letterSpacing: 0.6,
  },
  summaryTotalPrice: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111111',
    letterSpacing: -0.6,
  },
  desktopRightScroll: {
    flex: 1,
  },
  desktopRightScrollContent: {
    paddingBottom: 48,
  },
  mobileScroll: {
    flex: 1,
  },
  mobileScrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 36,
    gap: 20,
  },
  mobileVisualizerWrapper: {
    width: '100%',
  },
  stepsColumn: {
    gap: 28,
  },
  configHeaderBlock: {
    gap: 6,
  },
  eyebrowText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#10B981',
    letterSpacing: 0.9,
  },
  configTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111111',
    letterSpacing: -0.7,
  },
  configSubtitle: {
    fontSize: 14,
    lineHeight: 21,
    color: '#6B7280',
  },
  stepSection: {
    gap: 14,
  },
  stepTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stepBadge: {
    width: 30,
    height: 30,
    borderRadius: 6,
    backgroundColor: '#111111',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  stepHeading: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111111',
  },
  stepSubheading: {
    fontSize: 12,
    color: '#6B7280',
  },
  cardsStack: {
    gap: 12,
  },
  optionCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 18,
    gap: 10,
  },
  optionCardSelected: {
    borderWidth: 2,
    borderColor: '#111111',
    backgroundColor: '#F9FAFB',
  },
  optionTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  optionTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
    flex: 1,
  },
  radioOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: '#9CA3AF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterActive: {
    borderColor: '#111111',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#111111',
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111111',
  },
  popularBadge: {
    backgroundColor: '#111111',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  popularBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.4,
  },
  optionPrice: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111111',
  },
  optionDescription: {
    fontSize: 13,
    lineHeight: 20,
    color: '#6B7280',
  },
  inlineStrong: {
    color: '#111111',
    fontWeight: '700',
  },
  specChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingTop: 2,
  },
  specChip: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  specChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#111111',
  },
  specChipEmerald: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  specChipEmeraldText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#065F46',
  },
  expandedDrawer: {
    marginTop: 6,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 12,
  },
  drawerHeading: {
    fontSize: 11,
    fontWeight: '700',
    color: '#111111',
    letterSpacing: 0.6,
  },
  checklistContainer: {
    gap: 8,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  checklistText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: '#374151',
  },
  safetyAckBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
  },
  safetyAckBoxChecked: {
    borderColor: '#111111',
  },
  checkboxSquare: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#6B7280',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkboxSquareChecked: {
    backgroundColor: '#111111',
    borderColor: '#111111',
  },
  safetyAckText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#111111',
    lineHeight: 18,
  },
  postalVerifierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  postalInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#111111',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111111',
    fontWeight: '600',
  },
  verifyBtn: {
    backgroundColor: '#111111',
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 8,
  },
  verifyBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  verifiedStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 8,
    padding: 10,
  },
  emeraldDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  verifiedStatusText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#065F46',
  },
  unverifiedStatusText: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '500',
  },
  validationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    padding: 12,
    borderRadius: 8,
  },
  validationBannerText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#DC2626',
  },
  stickyFooter: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  stickyFooterInner: {
    maxWidth: 1360,
    width: '100%',
    alignSelf: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
  },
  footerBreakdownCol: {
    flex: 1,
    minWidth: 240,
    gap: 4,
  },
  footerItemizedRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
  },
  footerItemTag: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  footerItemDot: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  footerTotalLine: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  footerTotalCaption: {
    fontSize: 11,
    fontWeight: '700',
    color: '#111111',
    letterSpacing: 0.6,
  },
  footerTotalAmount: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111111',
    letterSpacing: -0.5,
  },
  checkoutCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#111111',
    paddingHorizontal: 26,
    paddingVertical: 14,
    borderRadius: 8,
  },
  checkoutCtaText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

