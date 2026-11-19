import React, { ReactNode } from 'react';
import { View, Text, Pressable, TextInput, ScrollView, Modal as RNModal, StyleSheet, TextInputProps, useWindowDimensions } from 'react-native';

export const C = { bg: '#F9FAFB', white: '#FFFFFF', ink: '#111111', mute: '#6B7280', line: '#E5E7EB', ok: '#10B981', warn: '#D97706', err: '#DC2626' };

export const useWide = () => useWindowDimensions().width >= 900;
export const noPrint = { dataSet: { noprint: '1' } } as any;
export const NoPrint = ({ children, style }: { children: ReactNode; style?: any }) => <View {...noPrint} style={style}>{children}</View>;

export function Screen({ children, max = 1200 }: { children: ReactNode; max?: number }) {
  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
      <View style={{ width: '100%', maxWidth: max, alignSelf: 'center', gap: 16 }}>{children}</View>
    </ScrollView>
  );
}
export const H1 = ({ children }: { children: ReactNode }) => <Text style={{ fontSize: 26, fontWeight: '800', color: C.ink, letterSpacing: -0.5 }}>{children}</Text>;
export const H2 = ({ children }: { children: ReactNode }) => <Text style={{ fontSize: 17, fontWeight: '700', color: C.ink }}>{children}</Text>;
export const Muted = ({ children, style }: { children: ReactNode; style?: any }) => <Text style={[{ fontSize: 13, color: C.mute, lineHeight: 19 }, style]}>{children}</Text>;
export const T = ({ children, bold, style }: { children: ReactNode; bold?: boolean; style?: any }) => <Text style={[{ fontSize: 14, color: C.ink, fontWeight: bold ? '700' : '400' }, style]}>{children}</Text>;

export function Card({ children, style, title, right }: { children: ReactNode; style?: any; title?: string; right?: ReactNode }) {
  return (
    <View style={[{ backgroundColor: C.white, borderWidth: 1, borderColor: C.line, borderRadius: 12, padding: 16, gap: 12 }, style]}>
      {title ? (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <H2>{title}</H2>{right}
        </View>
      ) : null}
      {children}
    </View>
  );
}

export function Btn({ title, onPress, kind = 'primary', small, disabled, testID }: { title: string; onPress?: () => void; kind?: 'primary' | 'ghost' | 'danger' | 'ok'; small?: boolean; disabled?: boolean; testID?: string }) {
  const bg = kind === 'primary' ? C.ink : kind === 'danger' ? C.err : kind === 'ok' ? C.ok : C.white;
  const fg = kind === 'ghost' ? C.ink : '#fff';
  return (
    <Pressable testID={testID} accessibilityRole="button" onPress={disabled ? undefined : onPress}
      style={{ backgroundColor: bg, borderWidth: 1, borderColor: kind === 'ghost' ? C.line : bg, paddingHorizontal: small ? 10 : 16, paddingVertical: small ? 6 : 11, borderRadius: 8, opacity: disabled ? 0.4 : 1, alignItems: 'center' }}>
      <Text style={{ color: fg, fontWeight: '700', fontSize: small ? 12 : 14 }}>{title}</Text>
    </Pressable>
  );
}

const tones: Record<string, [string, string, string]> = {
  ok: ['#ECFDF5', '#A7F3D0', '#065F46'], warn: ['#FFFBEB', '#FDE68A', '#92400E'], err: ['#FEF2F2', '#FECACA', '#991B1B'],
  neutral: ['#F3F4F6', '#E5E7EB', '#374151'], dark: ['#111111', '#111111', '#FFFFFF'],
};
export function Badge({ text, tone = 'neutral' }: { text: string; tone?: keyof typeof tones }) {
  const [bg, bd, fg] = tones[tone];
  return <View style={{ alignSelf: 'flex-start', backgroundColor: bg, borderColor: bd, borderWidth: 1, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 }}><Text style={{ color: fg, fontSize: 11, fontWeight: '700' }}>{text}</Text></View>;
}
export const statusTone = (s: string): keyof typeof tones =>
  ['Paid', 'Completed', 'Accepted', 'Received', 'Approved', 'Quoted'].includes(s) ? 'ok'
    : ['Voided', 'Cancelled', 'Declined', 'Expired'].includes(s) ? 'err'
      : ['Unpaid', 'Pending', 'Requested', 'Draft', 'Processing', 'Sent'].includes(s) ? 'warn' : 'neutral';
export const StatusBadge = ({ s }: { s: string }) => <Badge text={s} tone={statusTone(s)} />;

export function Field({ label, ...p }: { label?: string } & TextInputProps) {
  return (
    <View style={{ gap: 4, flex: 1, minWidth: 140 }}>
      {label ? <Text style={{ fontSize: 11, fontWeight: '700', color: C.mute, letterSpacing: 0.5 }}>{label.toUpperCase()}</Text> : null}
      <TextInput placeholderTextColor="#9CA3AF" {...p} style={[{ borderWidth: 1, borderColor: C.line, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: C.ink, backgroundColor: C.white }, p.style]} />
    </View>
  );
}

export function Chips<V extends string>({ options, value, onChange, label }: { options: readonly V[]; value: V; onChange: (v: V) => void; label?: string }) {
  return (
    <View style={{ gap: 6 }}>
      {label ? <Text style={{ fontSize: 11, fontWeight: '700', color: C.mute, letterSpacing: 0.5 }}>{label.toUpperCase()}</Text> : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {options.map((o) => (
          <Pressable key={o} onPress={() => onChange(o)} style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1, borderColor: value === o ? C.ink : C.line, backgroundColor: value === o ? C.ink : C.white }}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: value === o ? '#fff' : C.ink }}>{o}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export function Table({ head, rows, widths }: { head: string[]; rows: ReactNode[][]; widths?: number[] }) {
  const w = (i: number) => widths?.[i] ?? 1;
  const cell = (c: ReactNode, i: number, hd?: boolean) => (
    <View key={i} style={{ flex: w(i), minWidth: 90, paddingHorizontal: 6, justifyContent: 'center' }}>
      {typeof c === 'string' || typeof c === 'number' ? <Text style={{ fontSize: hd ? 11 : 13, fontWeight: hd ? '700' : '400', color: hd ? C.mute : C.ink }}>{hd ? String(c).toUpperCase() : c}</Text> : c}
    </View>
  );
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={{ minWidth: Math.max(head.length * 110, 560), flexGrow: 1 }}>
        <View style={{ flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.ink }}>{head.map((h, i) => cell(h, i, true))}</View>
        {rows.length === 0 ? <Muted style={{ paddingVertical: 14 }}>No records.</Muted> : null}
        {rows.map((r, ri) => (
          <View key={ri} style={{ flexDirection: 'row', paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: C.line, alignItems: 'center' }}>{r.map((c, i) => cell(c, i))}</View>
        ))}
      </View>
    </ScrollView>
  );
}

export function Modal({ visible, onClose, title, children }: { visible: boolean; onClose: () => void; title: string; children: ReactNode }) {
  return (
    <RNModal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(17,17,17,0.5)', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <View style={{ backgroundColor: C.white, borderRadius: 14, padding: 22, width: '100%', maxWidth: 460, gap: 14 }}>
          <H2>{title}</H2>
          {children}
        </View>
      </View>
    </RNModal>
  );
}

export const Row = ({ children, style }: { children: ReactNode; style?: any }) => <View style={[{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'flex-end' }, style]}>{children}</View>;
export const Kpi = ({ label, value, tone }: { label: string; value: string; tone?: 'err' | 'ok' }) => (
  <View style={{ flex: 1, minWidth: 150, backgroundColor: C.white, borderWidth: 1, borderColor: C.line, borderRadius: 12, padding: 16, gap: 4 }}>
    <Text style={{ fontSize: 11, fontWeight: '700', color: C.mute, letterSpacing: 0.6 }}>{label.toUpperCase()}</Text>
    <Text style={{ fontSize: 24, fontWeight: '800', color: tone === 'err' ? C.err : tone === 'ok' ? '#047857' : C.ink }}>{value}</Text>
  </View>
);
export const styles = StyleSheet.create({ hr: { height: 1, backgroundColor: C.line } });

