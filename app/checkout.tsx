import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import {
  useSolarConfig,
  RoofMaterial,
  formatCurrency,
} from '../context/SolarConfigContext';

const ROOF_MATERIALS: {
  id: RoofMaterial;
  bracketKit: string;
  specNote: string;
}[] = [
  {
    id: 'Asphalt Shingle',
    bracketKit: 'GRM-FlashLoc Comp Shingle Mounts',
    specNote: 'Includes EPDM waterproof lag-bolt flashing & anodized L-feet',
  },
  {
    id: 'Metal Roof',
    bracketKit: 'GRM-S5 Non-Penetrating Seam Clamps',
    specNote: 'Zero-penetration standing seam torque clamps + bonding pins',
  },
  {
    id: 'Clay / Concrete Tile',
    bracketKit: 'GRM-TileHook Stainless S-Hooks',
    specNote: '304 stainless steel universal tile replacement hooks & deck flashing',
  },
];

const FREIGHT_WINDOWS = [
  'Tuesday, Nov 24 • 08:00 – 12:00',
  'Wednesday, Nov 25 • 13:00 – 17:00',
  'Friday, Nov 27 • 08:00 – 12:00',
];

const SURVEY_DATES = [
  { date: 'Thursday, Nov 19, 2026', slot: '09:30 AM – 11:30 AM' },
  { date: 'Friday, Nov 20, 2026', slot: '01:30 PM – 03:30 PM' },
  { date: 'Monday, Nov 23, 2026', slot: '10:00 AM – 12:00 PM' },
];

export default function CheckoutScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 900;

  const {
    sizeSpec,
    batteryAddOn,
    installMethod,
    setInstallMethod,
    panelPrice,
    batteryPrice,
    installPrice,
    totalPrice,
    checkoutInfo,
    updateCheckoutInfo,
    submittedOrder,
    submitOrder,
    clearSubmittedOrder,
  } = useSolarConfig();

  const [downloadedDoc, setDownloadedDoc] = useState<string | null>(null);

  const selectedRoofObj =
    ROOF_MATERIALS.find((r) => r.id === checkoutInfo.roofMaterial) ||
    ROOF_MATERIALS[0];

  const handlePlaceOrder = () => {
    submitOrder();
  };

  /* ORDER CONFIRMATION VIEW */
  if (submittedOrder) {
    const trackerSteps = [
      {
        title: 'Order & Engineering Allocation Confirmed',
        detail: `Reference ${submittedOrder.orderId} logged on GRM-Solar Trading Desk`,
        status: 'completed',
      },
      {
        title: 'CAD Single-Line Wiring & Permit Packet Generated',
        detail: `Matched for ${submittedOrder.checkout.roofMaterial} (${selectedRoofObj.bracketKit})`,
        status: 'completed',
      },
      {
        title:
          submittedOrder.installMethod === 'diy'
            ? 'Class-A Palletized Freight Dispatch'
            : 'Certified Pro Site Survey & Interconnect Filing',
        detail:
          submittedOrder.installMethod === 'diy'
            ? `Scheduled Window: ${submittedOrder.checkout.freightWindow}`
            : `Scheduled Survey: ${submittedOrder.checkout.surveyDate} (${submittedOrder.checkout.surveySlot})`,
        status: 'active',
      },
      {
        title: 'PTO (Permission to Operate) & Telemetry Activation',
        detail: 'Live array monitoring via GRM-Solar mobile portal',
        status: 'upcoming',
      },
    ];

    return (
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.confirmationContainer}>
          <View style={styles.confirmationCard}>
            {/* Top Status Header */}
            <View style={styles.confirmBannerRow}>
              <View style={styles.emeraldBadgeLarge}>
                <Feather name="check" size={22} color="#FFFFFF" />
              </View>
              <View style={styles.flexOne}>
                <Text style={styles.confirmEyebrow}>
                  GRM-SOLAR PANEL AND BATTERY TRADING • OFFICIAL DISPATCH RECEIPT
                </Text>
                <Text style={styles.confirmHeadline}>
                  System Trade Order Confirmed
                </Text>
              </View>
              <View style={styles.orderRefBox}>
                <Text style={styles.orderRefLabel}>ORDER REFERENCE ID</Text>
                <Text style={styles.orderRefCode}>{submittedOrder.orderId}</Text>
              </View>
            </View>

            {/* Order Status Tracker */}
            <View style={styles.trackerBox}>
              <Text style={styles.subSectionTitle}>
                LIVE DEPLOYMENT & LOGISTICS TRACKER
              </Text>
              <View style={styles.trackerStepsList}>
                {trackerSteps.map((step, index) => {
                  const isDone = step.status === 'completed';
                  const isCurrent = step.status === 'active';
                  return (
                    <View key={index} style={styles.trackerStepRow}>
                      <View
                        style={[
                          styles.trackerDot,
                          isDone && styles.trackerDotDone,
                          isCurrent && styles.trackerDotCurrent,
                        ]}
                      >
                        {isDone ? (
                          <Feather name="check" size={11} color="#FFFFFF" />
                        ) : (
                          <Text style={styles.trackerStepNum}>{index + 1}</Text>
                        )}
                      </View>
                      <View style={styles.flexOne}>
                        <Text style={styles.trackerStepTitle}>{step.title}</Text>
                        <Text style={styles.trackerStepDetail}>{step.detail}</Text>
                      </View>
                      <View
                        style={[
                          styles.trackerStatusPill,
                          isDone && styles.trackerStatusPillDone,
                          isCurrent && styles.trackerStatusPillActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.trackerStatusPillText,
                            (isDone || isCurrent) &&
                              styles.trackerStatusPillTextEmerald,
                          ]}
                        >
                          {isDone
                            ? 'COMPLETE'
                            : isCurrent
                            ? 'IN PROGRESS'
                            : 'QUEUED'}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* Downloadable Permit & Wiring Diagram Summary */}
            <View style={styles.blueprintPacketSection}>
              <View style={styles.packetHeaderRow}>
                <View>
                  <Text style={styles.subSectionTitle}>
                    DOWNLOADABLE PERMIT & WIRING DIAGRAM SUMMARY
                  </Text>
                  <Text style={styles.packetSubtitle}>
                    Pre-generated engineering documentation customized for your{' '}
                    {submittedOrder.sizeSpec.kwText} system &{' '}
                    {submittedOrder.checkout.roofMaterial} mounting kit.
                  </Text>
                </View>
              </View>

              <View style={[styles.docsGrid, isDesktop && styles.docsGridDesktop]}>
                {[
                  {
                    id: 'cad-wiring',
                    title: 'NEC 690 Single-Line Wiring Diagram.pdf',
                    meta: `${submittedOrder.sizeSpec.panelCount}x 400W String Layout + ${
                      submittedOrder.batteryAddOn === 'grm_bank_10kwh'
                        ? '10kWh LFP Bus'
                        : 'Grid Tie'
                    }`,
                  },
                  {
                    id: 'structural-racking',
                    title: 'Roof Racking & Wind-Load Stamp.pdf',
                    meta: `${selectedRoofObj.bracketKit} (${submittedOrder.sizeSpec.roofSqFt} sq ft)`,
                  },
                  {
                    id: 'utility-interconnect',
                    title: 'AHJ Building & Utility Permit Packet.pdf',
                    meta: `Site: ${submittedOrder.checkout.streetAddress}, ${submittedOrder.checkout.city}`,
                  },
                ].map((doc) => {
                  const isDownloaded = downloadedDoc === doc.id;
                  return (
                    <Pressable
                      key={doc.id}
                      onPress={() => setDownloadedDoc(doc.id)}
                      style={[
                        styles.docDownloadCard,
                        isDownloaded && styles.docDownloadCardActive,
                      ]}
                      accessibilityRole="button"
                    >
                      <View style={styles.docTopRow}>
                        <Feather
                          name={isDownloaded ? 'check-circle' : 'file-text'}
                          size={18}
                          color={isDownloaded ? '#10B981' : '#111111'}
                        />
                        <Feather name="download" size={15} color="#6B7280" />
                      </View>
                      <Text style={styles.docTitle}>{doc.title}</Text>
                      <Text style={styles.docMeta}>{doc.meta}</Text>
                      <Text style={styles.docActionLabel}>
                        {isDownloaded
                          ? 'Saved to Device Packet ✓'
                          : 'Download Engineering PDF'}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Itemized Receipt Breakdown */}
            <View style={styles.confirmSummaryBox}>
              <Text style={styles.subSectionTitle}>
                ITEMIZED ORDER SUMMARY — GRM-SOLAR PANEL AND BATTERY TRADING
              </Text>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptItemText}>
                  {submittedOrder.sizeSpec.label} Solar Array Kit (
                  {submittedOrder.sizeSpec.kwText} •{' '}
                  {submittedOrder.sizeSpec.panelCount} Panels)
                </Text>
                <Text style={styles.receiptItemVal}>
                  {formatCurrency(submittedOrder.panelPrice)}
                </Text>
              </View>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptItemText}>
                  {submittedOrder.batteryAddOn === 'grm_bank_10kwh'
                    ? 'GRM-Bank 10kWh LiFePO4 Battery Wall Unit'
                    : 'Grid-Only Configuration (No Battery)'}
                </Text>
                <Text style={styles.receiptItemVal}>
                  {formatCurrency(submittedOrder.batteryPrice)}
                </Text>
              </View>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptItemText}>
                  {submittedOrder.installMethod === 'pro'
                    ? 'GRM-Solar Certified Pro Installation'
                    : 'DIY Self-Install Kit + Engineering Blueprints'}
                </Text>
                <Text style={styles.receiptItemVal}>
                  {formatCurrency(submittedOrder.installPrice)}
                </Text>
              </View>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptItemText}>
                  Roof Hardware Bundle ({submittedOrder.checkout.roofMaterial})
                </Text>
                <Text style={styles.receiptItemVal}>Included</Text>
              </View>
              <View style={styles.receiptTotalRow}>
                <Text style={styles.receiptTotalLabel}>TOTAL SETTLEMENT</Text>
                <Text style={styles.receiptTotalVal}>
                  {formatCurrency(submittedOrder.totalPrice)}
                </Text>
              </View>
            </View>

            {/* Actions */}
            <View style={styles.confirmActionsRow}>
              <Pressable
                onPress={() => {
                  clearSubmittedOrder();
                  router.push('/builder');
                }}
                style={styles.secondaryButton}
              >
                <Text style={styles.secondaryButtonText}>
                  Modify or Start New System
                </Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  clearSubmittedOrder();
                  router.push('/');
                }}
                style={styles.primaryButton}
              >
                <Text style={styles.primaryButtonText}>Return to Overview</Text>
                <Feather name="arrow-right" size={16} color="#FFFFFF" />
              </Pressable>
            </View>
          </View>
        </View>
      </ScrollView>
    );
  }

  /* DISTRACTION-FREE CHECKOUT VIEW */
  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.checkoutPageContainer}>
        {/* Page Header */}
        <View style={styles.pageTitleBlock}>
          <Text style={styles.pageEyebrow}>
            GRM-SOLAR PANEL AND BATTERY TRADING • DIRECT SETTLEMENT
          </Text>
          <Text style={styles.pageHeadline}>
            Final Site Specification & Checkout
          </Text>
        </View>

        <View
          style={[
            styles.checkoutColumns,
            isDesktop && styles.checkoutColumnsDesktop,
          ]}
        >
          {/* Left Column: Site Address, Roof Material Selector & Conditional Logistics */}
          <View style={styles.leftFormColumn}>
            {/* Section 1: Site & Roof Type Selector */}
            <View style={styles.cardBlock}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.cardStepBadge}>01</Text>
                <View>
                  <Text style={styles.cardTitle}>
                    Site Address & Roof Type Selector
                  </Text>
                  <Text style={styles.cardSubtitle}>
                    Used to generate structural racking stamps and bundle matching roof
                    mounting brackets
                  </Text>
                </View>
              </View>

              <View style={styles.inputsGrid}>
                <View style={styles.inputWrapFull}>
                  <Text style={styles.fieldLabel}>RECIPIENT / SITE CONTACT</Text>
                  <TextInput
                    value={checkoutInfo.fullName}
                    onChangeText={(v) => updateCheckoutInfo({ fullName: v })}
                    style={styles.textInput}
                    placeholder="Full Name"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>

                <View style={styles.inputWrapFull}>
                  <Text style={styles.fieldLabel}>
                    INSTALLATION / DELIVERY STREET ADDRESS
                  </Text>
                  <TextInput
                    value={checkoutInfo.streetAddress}
                    onChangeText={(v) => updateCheckoutInfo({ streetAddress: v })}
                    style={styles.textInput}
                    placeholder="Street address"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>

                <View style={styles.inputRowSplit}>
                  <View style={styles.flexOne}>
                    <Text style={styles.fieldLabel}>CITY</Text>
                    <TextInput
                      value={checkoutInfo.city}
                      onChangeText={(v) => updateCheckoutInfo({ city: v })}
                      style={styles.textInput}
                      placeholder="City"
                      placeholderTextColor="#9CA3AF"
                    />
                  </View>
                  <View style={styles.stateFieldWrap}>
                    <Text style={styles.fieldLabel}>STATE</Text>
                    <TextInput
                      value={checkoutInfo.stateRegion}
                      onChangeText={(v) => updateCheckoutInfo({ stateRegion: v })}
                      style={styles.textInput}
                      placeholder="TX"
                      placeholderTextColor="#9CA3AF"
                    />
                  </View>
                  <View style={styles.zipFieldWrap}>
                    <Text style={styles.fieldLabel}>POSTAL CODE</Text>
                    <TextInput
                      value={checkoutInfo.postalCode}
                      onChangeText={(v) => updateCheckoutInfo({ postalCode: v })}
                      style={styles.textInput}
                      placeholder="78701"
                      placeholderTextColor="#9CA3AF"
                    />
                  </View>
                </View>
              </View>

              {/* Roof Material Selectable Pressable Pills */}
              <View style={styles.roofSelectorBlock}>
                <Text style={styles.fieldLabel}>
                  SELECT ROOF MATERIAL (BUNDLES MATCHING MOUNTING BRACKETS)
                </Text>
                <View style={styles.roofPillsRow}>
                  {ROOF_MATERIALS.map((roof) => {
                    const active = checkoutInfo.roofMaterial === roof.id;
                    return (
                      <Pressable
                        key={roof.id}
                        onPress={() =>
                          updateCheckoutInfo({ roofMaterial: roof.id })
                        }
                        style={[
                          styles.roofPill,
                          active && styles.roofPillActive,
                        ]}
                        accessibilityRole="button"
                        accessibilityState={{ selected: active }}
                      >
                        <Text
                          style={[
                            styles.roofPillText,
                            active && styles.roofPillTextActive,
                          ]}
                        >
                          {roof.id}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <View style={styles.bracketBundleCallout}>
                  <Feather name="package" size={15} color="#10B981" />
                  <View style={styles.flexOne}>
                    <Text style={styles.bracketBundleTitle}>
                      Auto-Bundled Hardware: {selectedRoofObj.bracketKit} (Included)
                    </Text>
                    <Text style={styles.bracketBundleSub}>
                      {selectedRoofObj.specNote}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Section 2: Conditional Logistics Section (DIY Freight vs Pro Site Survey) */}
            <View style={styles.cardBlock}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.cardStepBadge}>02</Text>
                <View style={styles.flexOne}>
                  <Text style={styles.cardTitle}>
                    {installMethod === 'diy'
                      ? 'DIY Freight Delivery & Pallet Drop-Off Schedule'
                      : 'Certified Pro Site Survey & Interconnect Schedule'}
                  </Text>
                  <Text style={styles.cardSubtitle}>
                    {installMethod === 'diy'
                      ? 'Class-A solar carrier with hydraulic liftgate offload'
                      : 'On-site structural roof verification & main breaker panel check'}
                  </Text>
                </View>

                {/* Quick mode switch in case user wants to compare logistics */}
                <View style={styles.miniModeToggle}>
                  <Pressable
                    onPress={() => setInstallMethod('diy')}
                    style={[
                      styles.miniModeBtn,
                      installMethod === 'diy' && styles.miniModeBtnActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.miniModeBtnText,
                        installMethod === 'diy' && styles.miniModeBtnTextActive,
                      ]}
                    >
                      DIY
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setInstallMethod('pro')}
                    style={[
                      styles.miniModeBtn,
                      installMethod === 'pro' && styles.miniModeBtnActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.miniModeBtnText,
                        installMethod === 'pro' && styles.miniModeBtnTextActive,
                      ]}
                    >
                      Pro
                    </Text>
                  </Pressable>
                </View>
              </View>

              {installMethod === 'diy' ? (
                <View style={styles.logisticsBody}>
                  <Text style={styles.fieldLabel}>
                    SELECT FREIGHT DELIVERY WINDOW
                  </Text>
                  <View style={styles.slotsList}>
                    {FREIGHT_WINDOWS.map((win) => {
                      const active = checkoutInfo.freightWindow === win;
                      return (
                        <Pressable
                          key={win}
                          onPress={() =>
                            updateCheckoutInfo({ freightWindow: win })
                          }
                          style={[
                            styles.slotCard,
                            active && styles.slotCardActive,
                          ]}
                        >
                          <Feather
                            name="truck"
                            size={15}
                            color={active ? '#10B981' : '#6B7280'}
                          />
                          <Text
                            style={[
                              styles.slotCardText,
                              active && styles.slotCardTextActive,
                            ]}
                          >
                            {win}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  <View style={styles.inputWrapFull}>
                    <Text style={styles.fieldLabel}>
                      PALLET DROP-OFF PLACEMENT & GATE INSTRUCTIONS
                    </Text>
                    <TextInput
                      value={checkoutInfo.dropOffPlacement}
                      onChangeText={(v) =>
                        updateCheckoutInfo({ dropOffPlacement: v })
                      }
                      style={styles.textInput}
                      placeholder="e.g., Driveway apron, call 30 mins prior"
                      placeholderTextColor="#9CA3AF"
                    />
                  </View>
                </View>
              ) : (
                <View style={styles.logisticsBody}>
                  <Text style={styles.fieldLabel}>
                    SELECT SITE SURVEY DATE & ENGINEER ARRIVAL SLOT
                  </Text>
                  <View style={styles.slotsList}>
                    {SURVEY_DATES.map((s) => {
                      const active = checkoutInfo.surveyDate === s.date;
                      return (
                        <Pressable
                          key={s.date}
                          onPress={() =>
                            updateCheckoutInfo({
                              surveyDate: s.date,
                              surveySlot: s.slot,
                            })
                          }
                          style={[
                            styles.slotCard,
                            active && styles.slotCardActive,
                          ]}
                        >
                          <Feather
                            name="calendar"
                            size={15}
                            color={active ? '#10B981' : '#6B7280'}
                          />
                          <View style={styles.flexOne}>
                            <Text
                              style={[
                                styles.slotCardText,
                                active && styles.slotCardTextActive,
                              ]}
                            >
                              {s.date}
                            </Text>
                            <Text style={styles.slotTimeSub}>{s.slot}</Text>
                          </View>
                        </Pressable>
                      );
                    })}
                  </View>

                  <View style={styles.inputWrapFull}>
                    <Text style={styles.fieldLabel}>
                      ELECTRIC UTILITY PROVIDER (FOR NET-METERING FILING)
                    </Text>
                    <TextInput
                      value={checkoutInfo.utilityProvider}
                      onChangeText={(v) =>
                        updateCheckoutInfo({ utilityProvider: v })
                      }
                      style={styles.textInput}
                      placeholder="Utility Provider Name"
                      placeholderTextColor="#9CA3AF"
                    />
                  </View>
                </View>
              )}
            </View>
          </View>

          {/* Right Column: Itemized Order Breakdown for GRM-Solar Panel and Battery Trading */}
          <View style={styles.rightSummaryColumn}>
            <View style={styles.orderBreakdownCard}>
              <View style={styles.orderBrandHeader}>
                <Text style={styles.orderBrandTitle}>
                  GRM-Solar Panel and Battery Trading
                </Text>
                <Text style={styles.orderBrandSub}>
                  ITEMIZED ARCHITECTURAL ORDER BREAKDOWN
                </Text>
              </View>

              <View style={styles.lineItemsContainer}>
                {/* 1. Selected Panel Kit */}
                <View style={styles.lineItemRow}>
                  <View style={styles.flexOne}>
                    <Text style={styles.lineItemName}>
                      {sizeSpec.label} Solar Array Kit ({sizeSpec.kwText})
                    </Text>
                    <Text style={styles.lineItemMeta}>
                      {sizeSpec.panelCount}x 400W N-Type Panels ({sizeSpec.gridLabel})
                      + {sizeSpec.inverterSpec}
                    </Text>
                  </View>
                  <Text style={styles.lineItemPrice}>
                    {formatCurrency(panelPrice)}
                  </Text>
                </View>

                {/* 2. Battery Storage */}
                <View style={styles.lineItemRow}>
                  <View style={styles.flexOne}>
                    <Text style={styles.lineItemName}>
                      {batteryAddOn === 'grm_bank_10kwh'
                        ? 'GRM-Bank 10kWh LiFePO4 Backup'
                        : 'Grid-Only (No Battery Storage)'}
                    </Text>
                    <Text style={styles.lineItemMeta}>
                      {batteryAddOn === 'grm_bank_10kwh'
                        ? 'Wall-mount LFP enclosure + hybrid transfer bus'
                        : 'Pre-wired for future LFP expansion'}
                    </Text>
                  </View>
                  <Text style={styles.lineItemPrice}>
                    {batteryPrice > 0 ? formatCurrency(batteryPrice) : '$0'}
                  </Text>
                </View>

                {/* 3. Installation Service */}
                <View style={styles.lineItemRow}>
                  <View style={styles.flexOne}>
                    <Text style={styles.lineItemName}>
                      {installMethod === 'pro'
                        ? 'GRM-Solar Certified Installation'
                        : 'DIY / Self-Install Kit'}
                    </Text>
                    <Text style={styles.lineItemMeta}>
                      {installMethod === 'pro'
                        ? 'Turnkey crew labor, conduit & utility PTO inspection'
                        : 'Includes stamped CAD blueprints & permit submittal packet'}
                    </Text>
                  </View>
                  <Text style={styles.lineItemPrice}>
                    {installPrice > 0 ? formatCurrency(installPrice) : '$0'}
                  </Text>
                </View>

                {/* 4. Roof Mounting Bracket Kit */}
                <View style={styles.lineItemRow}>
                  <View style={styles.flexOne}>
                    <Text style={styles.lineItemName}>
                      Roof Bracket Kit: {checkoutInfo.roofMaterial}
                    </Text>
                    <Text style={styles.lineItemMeta}>
                      {selectedRoofObj.bracketKit}
                    </Text>
                  </View>
                  <Text style={styles.lineItemIncluded}>INCLUDED</Text>
                </View>
              </View>

              <View style={styles.totalBlock}>
                <View style={styles.totalLineRow}>
                  <Text style={styles.totalLabel}>Total Settlement Due</Text>
                  <Text style={styles.totalAmount}>
                    {formatCurrency(totalPrice)}
                  </Text>
                </View>
                <Text style={styles.taxNote}>
                  Includes direct factory freight & digital engineering stamp package.
                  Eligible for 30% Federal Clean Energy Tax Credit (est.{' '}
                  {formatCurrency(Math.round(totalPrice * 0.3))}).
                </Text>
              </View>

              <Pressable
                onPress={handlePlaceOrder}
                style={styles.placeOrderBtn}
                accessibilityRole="button"
                accessibilityLabel="Submit Order"
              >
                <Text style={styles.placeOrderBtnText}>
                  Submit Order • {formatCurrency(totalPrice)}
                </Text>
                <Feather name="check-circle" size={18} color="#FFFFFF" />
              </Pressable>

              <Pressable
                onPress={() => router.push('/builder')}
                style={styles.backToBuilderLink}
              >
                <Feather name="arrow-left" size={14} color="#6B7280" />
                <Text style={styles.backToBuilderText}>
                  Return to Solar Builder Configurator
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flexOne: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollContent: {
    paddingBottom: 64,
  },
  checkoutPageContainer: {
    maxWidth: 1320,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingTop: 28,
    gap: 24,
  },
  pageTitleBlock: {
    gap: 4,
  },
  pageEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    color: '#10B981',
    letterSpacing: 0.8,
  },
  pageHeadline: {
    fontSize: 30,
    fontWeight: '800',
    color: '#111111',
    letterSpacing: -0.7,
  },
  checkoutColumns: {
    gap: 24,
  },
  checkoutColumnsDesktop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  leftFormColumn: {
    flex: 1.25,
    gap: 20,
  },
  rightSummaryColumn: {
    flex: 0.9,
  },
  cardBlock: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 24,
    gap: 20,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardStepBadge: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#111111',
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 28,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111111',
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#6B7280',
  },
  inputsGrid: {
    gap: 14,
  },
  inputWrapFull: {
    gap: 6,
  },
  inputRowSplit: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  stateFieldWrap: {
    width: 80,
    gap: 6,
  },
  zipFieldWrap: {
    width: 110,
    gap: 6,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
    letterSpacing: 0.6,
  },
  textInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: '#111111',
    fontWeight: '500',
  },
  roofSelectorBlock: {
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 12,
  },
  roofPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  roofPill: {
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  roofPillActive: {
    borderWidth: 2,
    borderColor: '#111111',
    backgroundColor: '#111111',
  },
  roofPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111111',
  },
  roofPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  bracketBundleCallout: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 12,
    borderRadius: 8,
  },
  bracketBundleTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111111',
  },
  bracketBundleSub: {
    fontSize: 11,
    color: '#6B7280',
  },
  miniModeToggle: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 6,
    padding: 2,
  },
  miniModeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  miniModeBtnActive: {
    backgroundColor: '#111111',
  },
  miniModeBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
  },
  miniModeBtnTextActive: {
    color: '#FFFFFF',
  },
  logisticsBody: {
    gap: 14,
  },
  slotsList: {
    gap: 10,
  },
  slotCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 14,
  },
  slotCardActive: {
    borderWidth: 2,
    borderColor: '#111111',
    backgroundColor: '#F9FAFB',
  },
  slotCardText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111111',
  },
  slotCardTextActive: {
    fontWeight: '700',
  },
  slotTimeSub: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  orderBreakdownCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#111111',
    borderRadius: 12,
    padding: 24,
    gap: 20,
  },
  orderBrandHeader: {
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    gap: 4,
  },
  orderBrandTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111111',
  },
  orderBrandSub: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6B7280',
    letterSpacing: 0.7,
  },
  lineItemsContainer: {
    gap: 16,
  },
  lineItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  lineItemName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111111',
  },
  lineItemMeta: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
    lineHeight: 17,
  },
  lineItemPrice: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111111',
  },
  lineItemIncluded: {
    fontSize: 11,
    fontWeight: '700',
    color: '#10B981',
  },
  totalBlock: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 8,
  },
  totalLineRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111111',
  },
  totalAmount: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111111',
    letterSpacing: -0.7,
  },
  taxNote: {
    fontSize: 11,
    lineHeight: 17,
    color: '#6B7280',
  },
  placeOrderBtn: {
    backgroundColor: '#111111',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  placeOrderBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  backToBuilderLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  backToBuilderText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  /* Confirmation View Styles */
  confirmationContainer: {
    maxWidth: 960,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingTop: 32,
  },
  confirmationCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#111111',
    borderRadius: 12,
    padding: 28,
    gap: 26,
  },
  confirmBannerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 16,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  emeraldBadgeLarge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmEyebrow: {
    fontSize: 10,
    fontWeight: '700',
    color: '#10B981',
    letterSpacing: 0.7,
  },
  confirmHeadline: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111111',
    letterSpacing: -0.5,
  },
  orderRefBox: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#111111',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  orderRefLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#6B7280',
    letterSpacing: 0.6,
  },
  orderRefCode: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111111',
  },
  subSectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  trackerBox: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 18,
  },
  trackerStepsList: {
    gap: 14,
  },
  trackerStepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  trackerDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#9CA3AF',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  trackerDotDone: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  trackerDotCurrent: {
    backgroundColor: '#111111',
    borderColor: '#111111',
  },
  trackerStepNum: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
  },
  trackerStepTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111111',
  },
  trackerStepDetail: {
    fontSize: 12,
    color: '#6B7280',
  },
  trackerStatusPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  trackerStatusPillDone: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  trackerStatusPillActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#10B981',
  },
  trackerStatusPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6B7280',
  },
  trackerStatusPillTextEmerald: {
    color: '#065F46',
  },
  blueprintPacketSection: {
    gap: 12,
  },
  packetHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  packetSubtitle: {
    fontSize: 13,
    color: '#6B7280',
  },
  docsGrid: {
    gap: 12,
  },
  docsGridDesktop: {
    flexDirection: 'row',
  },
  docDownloadCard: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 16,
    gap: 8,
  },
  docDownloadCardActive: {
    borderColor: '#10B981',
    backgroundColor: '#ECFDF5',
  },
  docTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  docTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111111',
  },
  docMeta: {
    fontSize: 11,
    color: '#6B7280',
  },
  docActionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#111111',
    marginTop: 4,
  },
  confirmSummaryBox: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 18,
    gap: 8,
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  receiptItemText: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '500',
  },
  receiptItemVal: {
    fontSize: 13,
    color: '#111111',
    fontWeight: '700',
  },
  receiptTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 10,
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  receiptTotalLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111111',
  },
  receiptTotalVal: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111111',
  },
  confirmActionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: 12,
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 18,
    paddingVertical: 13,
    borderRadius: 8,
  },
  secondaryButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111111',
  },
  primaryButton: {
    backgroundColor: '#111111',
    paddingHorizontal: 20,
    paddingVertical: 13,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  primaryButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

