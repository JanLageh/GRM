import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, {
  Rect,
  Path,
  Line,
  G,
  Text as SvgText,
  Circle,
  Defs,
  LinearGradient,
  Stop,
} from 'react-native-svg';
import { Feather } from '@expo/vector-icons';
import {
  SolarSizeId,
  BatteryOptionId,
  InstallMethodId,
  SOLAR_SIZE_SPECS,
} from '../context/SolarConfigContext';

interface HouseVisualizerProps {
  selectedSize: SolarSizeId;
  batteryAddOn: BatteryOptionId;
  installMethod?: InstallMethodId;
  compact?: boolean;
}

export default function HouseVisualizer({
  selectedSize,
  batteryAddOn,
  installMethod = 'diy',
  compact = false,
}: HouseVisualizerProps) {
  const spec = SOLAR_SIZE_SPECS[selectedSize];
  const hasBattery = batteryAddOn === 'grm_bank_10kwh';

  // Calculate dynamic solar panel grid coordinates on the pitched roof
  // Roof plane bounding area: x from 95 to 475, y from 82 to 220
  const roofStartX = 112;
  const roofEndX = 458;
  const roofStartY = 86;
  const roofEndY = 212;

  const totalWidth = roofEndX - roofStartX;
  const totalHeight = roofEndY - roofStartY;

  const cols = spec.gridCols;
  const rows = spec.gridRows;

  // Center the array inside the roof plane with proportional panel dimensions
  const maxArrayWidth = selectedSize === 'small' ? 240 : selectedSize === 'medium' ? 295 : 340;
  const maxArrayHeight = selectedSize === 'small' ? 76 : selectedSize === 'medium' ? 102 : 122;

  const arrayOriginX = roofStartX + (totalWidth - maxArrayWidth) / 2;
  const arrayOriginY = roofStartY + (totalHeight - maxArrayHeight) / 2;

  const gapX = 5;
  const gapY = 5;
  const panelWidth = (maxArrayWidth - gapX * (cols - 1)) / cols;
  const panelHeight = (maxArrayHeight - gapY * (rows - 1)) / rows;

  const panels: { key: string; x: number; y: number; w: number; h: number }[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      panels.push({
        key: `panel-${r}-${c}`,
        x: arrayOriginX + c * (panelWidth + gapX),
        y: arrayOriginY + r * (panelHeight + gapY),
        w: panelWidth,
        h: panelHeight,
      });
    }
  }

  return (
    <View style={styles.card}>
      {/* Top Floating Spec Pill Bar */}
      <View style={styles.topOverlayBar}>
        <View style={styles.liveTag}>
          <View style={styles.liveDot} />
          <Text style={styles.liveTagText}>ARCHITECTURAL CAD TELEMETRY</Text>
        </View>
        <View style={styles.specPillsRow}>
          <View style={styles.specPillPrimary}>
            <Feather name="zap" size={12} color="#10B981" />
            <Text style={styles.specPillPrimaryText}>{spec.kwText} System</Text>
          </View>
          <View style={styles.specPill}>
            <Feather name="grid" size={12} color="#111111" />
            <Text style={styles.specPillText}>
              {spec.panelCount} Panels ({spec.gridLabel})
            </Text>
          </View>
          <View
            style={[
              styles.specPill,
              hasBattery && styles.specPillEmerald,
            ]}
          >
            <Feather
              name="battery-charging"
              size={12}
              color={hasBattery ? '#047857' : '#6B7280'}
            />
            <Text
              style={[
                styles.specPillText,
                hasBattery && styles.specPillEmeraldText,
              ]}
            >
              {hasBattery ? '10kWh LiFePO4 Backup' : 'Grid-Tied (0 kWh)'}
            </Text>
          </View>
        </View>
      </View>

      {/* Reactive Cross-Platform SVG Architectural Drawing */}
      <View style={[styles.svgContainer, compact && styles.svgContainerCompact]}>
        <Svg
          viewBox="0 0 680 390"
          width="100%"
          height="100%"
          preserveAspectRatio="xMidYMid meet"
        >
          <Defs>
            <LinearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#F9FAFB" />
              <Stop offset="100%" stopColor="#FFFFFF" />
            </LinearGradient>
            <LinearGradient id="panelFill" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0%" stopColor="#111111" />
              <Stop offset="100%" stopColor="#262626" />
            </LinearGradient>
          </Defs>

          {/* Subtle Background Blueprint Grid */}
          <Rect x="0" y="0" width="680" height="390" fill="url(#skyGrad)" />
          {[60, 120, 180, 240, 300].map((yLine) => (
            <Line
              key={`grid-h-${yLine}`}
              x1="20"
              y1={yLine}
              x2="660"
              y2={yLine}
              stroke="#F3F4F6"
              strokeWidth="1"
            />
          ))}
          {[100, 220, 340, 460, 580].map((xLine) => (
            <Line
              key={`grid-v-${xLine}`}
              x1={xLine}
              y1="20"
              x2={xLine}
              y2="345"
              stroke="#F3F4F6"
              strokeWidth="1"
            />
          ))}

          {/* Minimalist Solar Irradiance Arc & Sun */}
          <Path
            d="M 55 130 Q 340 10 625 130"
            fill="none"
            stroke="#E5E7EB"
            strokeWidth="1.2"
            strokeDasharray="4,4"
          />
          <G>
            <Circle cx="565" cy="54" r="14" fill="#FFFFFF" stroke="#111111" strokeWidth="1.5" />
            <Circle cx="565" cy="54" r="5" fill="#10B981" />
            <SvgText
              x="565"
              y="82"
              fontSize="9"
              fontWeight="600"
              fill="#6B7280"
              textAnchor="middle"
            >
              ~{spec.dailyKwh} kWh/DAY
            </SvgText>
          </G>

          {/* Main Residence Pitched Roof Polygon */}
          <Path
            d="M 105 72 L 465 72 L 505 225 L 65 225 Z"
            fill="#F9FAFB"
            stroke="#111111"
            strokeWidth="2"
          />
          {/* Roof Ridge Cap */}
          <Line x1="103" y1="72" x2="467" y2="72" stroke="#111111" strokeWidth="3.5" />
          {/* Roof Eave Line */}
          <Line x1="63" y1="225" x2="507" y2="225" stroke="#111111" strokeWidth="3" />

          {/* Dynamic Solar Panel Array on Roof */}
          <G>
            {panels.map((p) => (
              <G key={p.key}>
                <Rect
                  x={p.x}
                  y={p.y}
                  width={p.w}
                  height={p.h}
                  rx="2"
                  fill="url(#panelFill)"
                  stroke="#FFFFFF"
                  strokeWidth="0.9"
                />
                {/* Internal photovoltaic cell busbars */}
                <Line
                  x1={p.x + p.w / 2}
                  y1={p.y + 2}
                  x2={p.x + p.w / 2}
                  y2={p.y + p.h - 2}
                  stroke="#374151"
                  strokeWidth="0.6"
                />
                <Line
                  x1={p.x + 2}
                  y1={p.y + p.h / 2}
                  x2={p.x + p.w - 2}
                  y2={p.y + p.h / 2}
                  stroke="#374151"
                  strokeWidth="0.6"
                />
                {/* Corner anodized clamp detail */}
                <Circle
                  cx={p.x + p.w - 3.5}
                  cy={p.y + 3.5}
                  r="1"
                  fill="#10B981"
                />
              </G>
            ))}
          </G>

          {/* Dimension Callout Above Roof */}
          <Line x1={arrayOriginX} y1="56" x2={arrayOriginX + maxArrayWidth} y2="56" stroke="#6B7280" strokeWidth="1" />
          <Line x1={arrayOriginX} y1="52" x2={arrayOriginX} y2="60" stroke="#6B7280" strokeWidth="1" />
          <Line
            x1={arrayOriginX + maxArrayWidth}
            y1="52"
            x2={arrayOriginX + maxArrayWidth}
            y2="60"
            stroke="#6B7280"
            strokeWidth="1"
          />
          <SvgText
            x={arrayOriginX + maxArrayWidth / 2}
            y="49"
            fontSize="9.5"
            fontWeight="600"
            fill="#111111"
            textAnchor="middle"
          >
            {`${spec.roofSqFt} SQ FT ARRAY FOOTPRINT • ${spec.panelCount}x 400W N-TYPE MONO`}
          </SvgText>

          {/* Main House First-Floor Architectural Walls */}
          <Rect
            x="88"
            y="225"
            width="390"
            height="120"
            fill="#FFFFFF"
            stroke="#111111"
            strokeWidth="2"
          />

          {/* Modern Architectural Picture Windows (Left Living Area) */}
          <Rect
            x="118"
            y="248"
            width="115"
            height="68"
            fill="#F9FAFB"
            stroke="#111111"
            strokeWidth="1.5"
          />
          <Line x1="156" y1="248" x2="156" y2="316" stroke="#111111" strokeWidth="1" />
          <Line x1="194" y1="248" x2="194" y2="316" stroke="#111111" strokeWidth="1" />
          <Line x1="118" y1="282" x2="233" y2="282" stroke="#E5E7EB" strokeWidth="1" />

          {/* Architectural Entry Door + Transom */}
          <Rect
            x="265"
            y="252"
            width="44"
            height="93"
            fill="#F9FAFB"
            stroke="#111111"
            strokeWidth="1.5"
          />
          <Rect x="273" y="260" width="12" height="75" fill="#FFFFFF" stroke="#111111" strokeWidth="1" />
          <Circle cx="301" cy="298" r="2" fill="#111111" />

          {/* Secondary Window */}
          <Rect
            x="338"
            y="248"
            width="95"
            height="48"
            fill="#F9FAFB"
            stroke="#111111"
            strokeWidth="1.5"
          />
          <Line x1="385" y1="248" x2="385" y2="296" stroke="#111111" strokeWidth="1" />

          {/* Attached Garage Wing (Right Side) */}
          <Path
            d="M 478 188 L 620 188 L 632 225 L 478 225 Z"
            fill="#F3F4F6"
            stroke="#111111"
            strokeWidth="2"
          />
          <Rect
            x="478"
            y="225"
            width="144"
            height="120"
            fill="#FFFFFF"
            stroke="#111111"
            strokeWidth="2"
          />

          {/* Minimalist Panelized Garage Door */}
          <Rect
            x="494"
            y="248"
            width="74"
            height="97"
            fill="#F9FAFB"
            stroke="#111111"
            strokeWidth="1.4"
          />
          <Line x1="494" y1="272" x2="568" y2="272" stroke="#E5E7EB" strokeWidth="1" />
          <Line x1="494" y1="296" x2="568" y2="296" stroke="#E5E7EB" strokeWidth="1" />
          <Line x1="494" y1="320" x2="568" y2="320" stroke="#E5E7EB" strokeWidth="1" />

          {/* Hybrid Inverter Unit (Mounted Next to Garage) */}
          <Rect
            x="452"
            y="256"
            width="18"
            height="26"
            rx="2"
            fill="#FFFFFF"
            stroke="#111111"
            strokeWidth="1.5"
          />
          <Circle cx="461" cy="264" r="2" fill="#10B981" />

          {/* Power Conduit from Roof Array to Inverter */}
          <Path
            d={`M ${arrayOriginX + maxArrayWidth} ${arrayOriginY + maxArrayHeight / 2} L 461 ${
              arrayOriginY + maxArrayHeight / 2
            } L 461 256`}
            fill="none"
            stroke={hasBattery ? '#10B981' : '#111111'}
            strokeWidth="2"
          />

          {/* Conditional GRM-Bank 10kWh LiFePO4 Wall-Mounted Battery Unit on Garage Wall */}
          {hasBattery ? (
            <G>
              {/* Power Conduit connecting Inverter to Garage Battery Unit */}
              <Path
                d="M 470 269 L 596 269 L 596 254"
                fill="none"
                stroke="#10B981"
                strokeWidth="2.2"
              />
              {/* Sleek Wall-Mounted Battery Enclosure */}
              <Rect
                x="579"
                y="252"
                width="34"
                height="58"
                rx="4"
                fill="#111111"
                stroke="#10B981"
                strokeWidth="1.8"
              />
              {/* Vertical Emerald LED State-of-Charge Bar */}
              <Rect x="585" y="260" width="3.5" height="42" rx="1.5" fill="#10B981" />
              {/* GRM Branding & Spec Etch on Battery */}
              <SvgText
                x="600"
                y="274"
                fontSize="6.5"
                fontWeight="700"
                fill="#FFFFFF"
                textAnchor="middle"
              >
                GRM
              </SvgText>
              <SvgText
                x="600"
                y="284"
                fontSize="6"
                fontWeight="600"
                fill="#10B981"
                textAnchor="middle"
              >
                10kWh
              </SvgText>
              <SvgText
                x="600"
                y="294"
                fontSize="5.2"
                fill="#9CA3AF"
                textAnchor="middle"
              >
                LiFePO4
              </SvgText>

              {/* Callout Badge pointing to Battery */}
              <Rect
                x="534"
                y="144"
                width="126"
                height="30"
                rx="6"
                fill="#111111"
              />
              <Circle cx="546" cy="159" r="3.5" fill="#10B981" />
              <SvgText
                x="555"
                y="157"
                fontSize="8.5"
                fontWeight="700"
                fill="#FFFFFF"
              >
                GRM-BANK 10kWh
              </SvgText>
              <SvgText
                x="555"
                y="167"
                fontSize="7.5"
                fill="#D1D5DB"
              >
                ACTIVE BACKUP WALL
              </SvgText>
              <Line
                x1="596"
                y1="174"
                x2="596"
                y2="250"
                stroke="#10B981"
                strokeWidth="1.2"
                strokeDasharray="3,3"
              />
            </G>
          ) : (
            <G>
              {/* Grid-Only Meter Representation */}
              <Rect
                x="584"
                y="266"
                width="24"
                height="30"
                rx="3"
                fill="#F9FAFB"
                stroke="#9CA3AF"
                strokeWidth="1.2"
                strokeDasharray="2,2"
              />
              <SvgText
                x="596"
                y="312"
                fontSize="7"
                fill="#6B7280"
                textAnchor="middle"
              >
                GRID ONLY
              </SvgText>
            </G>
          )}

          {/* Ground Horizon Line */}
          <Line x1="25" y1="345" x2="655" y2="345" stroke="#111111" strokeWidth="2.5" />
          <Line x1="55" y1="352" x2="625" y2="352" stroke="#E5E7EB" strokeWidth="1" />

          {/* Architectural Scale Caption */}
          <SvgText x="35" y="372" fontSize="9.5" fontWeight="600" fill="#6B7280">
            FIG 1.0 — ELEVATION & CONDUIT SCHEMATIC ({spec.label.toUpperCase()} ARRAY)
          </SvgText>
          <SvgText
            x="645"
            y="372"
            fontSize="9.5"
            fontWeight="600"
            fill="#111111"
            textAnchor="end"
          >
            {installMethod === 'pro'
              ? 'CERTIFIED PRO TURNKEY SPEC'
              : 'SELF-INSTALL KIT BLUEPRINT'}
          </SvgText>
        </Svg>
      </View>

      {/* Bottom Telemetry Metrics Strip */}
      <View style={styles.metricsFooter}>
        <View style={styles.metricCell}>
          <Text style={styles.metricLabel}>EST. DAILY PRODUCTION</Text>
          <Text style={styles.metricValue}>~{spec.dailyKwh} kWh / day</Text>
        </View>
        <View style={styles.metricDivider} />
        <View style={styles.metricCell}>
          <Text style={styles.metricLabel}>ROOF FOOTPRINT</Text>
          <Text style={styles.metricValue}>{spec.roofSqFt} sq ft</Text>
        </View>
        <View style={styles.metricDivider} />
        <View style={styles.metricCell}>
          <Text style={styles.metricLabel}>INVERTER ARCHITECTURE</Text>
          <Text style={styles.metricValue} numberOfLines={1}>
            {spec.inverterSpec}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    overflow: 'hidden',
  },
  topOverlayBar: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    gap: 10,
  },
  liveTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  liveTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
    letterSpacing: 0.8,
  },
  specPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  specPillPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#111111',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  specPillPrimaryText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  specPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  specPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111111',
  },
  specPillEmerald: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  specPillEmeraldText: {
    color: '#065F46',
    fontWeight: '700',
  },
  svgContainer: {
    width: '100%',
    height: 330,
    backgroundColor: '#FFFFFF',
  },
  svgContainerCompact: {
    height: 240,
  },
  metricsFooter: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: '#F9FAFB',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  metricCell: {
    flex: 1,
    minWidth: 120,
  },
  metricDivider: {
    width: 1,
    height: 26,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 8,
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6B7280',
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111111',
  },
});

