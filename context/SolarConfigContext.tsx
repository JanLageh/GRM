import React, { createContext, useContext, useState, useMemo, ReactNode } from 'react';

export type SolarSizeId = 'small' | 'medium' | 'large';
export type BatteryOptionId = 'none' | 'grm_bank_10kwh';
export type InstallMethodId = 'diy' | 'pro';
export type RoofMaterial = 'Asphalt Shingle' | 'Metal Roof' | 'Clay / Concrete Tile';

export interface SolarSizeSpec {
  id: SolarSizeId;
  label: string;
  kwRating: number;
  kwText: string;
  panelCount: number;
  gridRows: number;
  gridCols: number;
  gridLabel: string;
  roofSqFt: number;
  dailyKwh: number;
  price: number;
  badge?: string;
  inverterSpec: string;
  description: string;
}

export interface UserProfile {
  name: string;
  email: string;
  provider?: 'email' | 'google' | 'apple';
  accountType?: string;
}

export interface CheckoutInfo {
  fullName: string;
  email: string;
  phone: string;
  streetAddress: string;
  city: string;
  stateRegion: string;
  postalCode: string;
  roofMaterial: RoofMaterial;
  // DIY freight logistics
  freightWindow: string;
  liftgateRequired: boolean;
  dropOffPlacement: string;
  // Pro install logistics
  surveyDate: string;
  surveySlot: string;
  utilityProvider: string;
}

export interface SubmittedOrder {
  orderId: string;
  createdAt: string;
  sizeSpec: SolarSizeSpec;
  batteryAddOn: BatteryOptionId;
  installMethod: InstallMethodId;
  panelPrice: number;
  batteryPrice: number;
  installPrice: number;
  totalPrice: number;
  checkout: CheckoutInfo;
  user: UserProfile | null;
}

export const SOLAR_SIZE_SPECS: Record<SolarSizeId, SolarSizeSpec> = {
  small: {
    id: 'small',
    label: 'Small',
    kwRating: 4.0,
    kwText: '4.0 kW',
    panelCount: 10,
    gridRows: 2,
    gridCols: 5,
    gridLabel: '2x5 grid',
    roofSqFt: 220,
    dailyKwh: 16,
    price: 4800,
    inverterSpec: 'GRM-4000H Hybrid String Inverter',
    description: 'Ideal for townhomes, compact roofs, or daytime load offsetting.',
  },
  medium: {
    id: 'medium',
    label: 'Medium',
    kwRating: 7.2,
    kwText: '7.2 kW',
    panelCount: 18,
    gridRows: 3,
    gridCols: 6,
    gridLabel: '3x6 grid',
    roofSqFt: 380,
    dailyKwh: 29,
    price: 7900,
    badge: 'Most Popular',
    inverterSpec: 'GRM-8000H Dual-MPPT Hybrid Inverter',
    description: 'Balanced full-home solar production for standard 3–4 bedroom residences.',
  },
  large: {
    id: 'large',
    label: 'Large',
    kwRating: 11.2,
    kwText: '11.2 kW',
    panelCount: 28,
    gridRows: 4,
    gridCols: 7,
    gridLabel: '4x7 grid',
    roofSqFt: 560,
    dailyKwh: 45,
    price: 11500,
    inverterSpec: 'GRM-12000H Split-Phase Commercial Grade Inverter',
    description: 'Maximum irradiance capture for large homes, EV charging, and heat pumps.',
  },
};

export const BATTERY_PRICE = 3400;
export const PRO_INSTALL_PRICE = 1800;

interface SolarConfigContextType {
  user: UserProfile | null;
  signIn: (profile: UserProfile) => void;
  signOut: () => void;

  selectedSize: SolarSizeId;
  setSelectedSize: (size: SolarSizeId) => void;

  batteryAddOn: BatteryOptionId;
  setBatteryAddOn: (battery: BatteryOptionId) => void;

  installMethod: InstallMethodId;
  setInstallMethod: (method: InstallMethodId) => void;

  diySafetyAck: boolean;
  setDiySafetyAck: (ack: boolean) => void;

  servicePostalCode: string;
  setServicePostalCode: (code: string) => void;
  isPostalVerified: boolean;
  verifyPostalCode: (code?: string) => boolean;

  checkoutInfo: CheckoutInfo;
  updateCheckoutInfo: (partial: Partial<CheckoutInfo>) => void;

  sizeSpec: SolarSizeSpec;
  panelPrice: number;
  batteryPrice: number;
  installPrice: number;
  totalPrice: number;

  submittedOrder: SubmittedOrder | null;
  submitOrder: () => SubmittedOrder;
  clearSubmittedOrder: () => void;
}

const defaultCheckoutInfo: CheckoutInfo = {
  fullName: 'Alex Mercer',
  email: 'alex.mercer@grmsolar.io',
  phone: '+1 (512) 840-2910',
  streetAddress: '742 Evergreen Solar Way',
  city: 'Austin',
  stateRegion: 'TX',
  postalCode: '78701',
  roofMaterial: 'Asphalt Shingle',
  freightWindow: 'Tuesday, Nov 24 • 08:00 – 12:00',
  liftgateRequired: true,
  dropOffPlacement: 'Driveway Apron (Curbside Pallet Drop)',
  surveyDate: 'Thursday, Nov 19, 2026',
  surveySlot: '09:30 AM – 11:30 AM',
  utilityProvider: 'Austin Energy (Net Metering Interconnect)',
};

const SolarConfigContext = createContext<SolarConfigContextType | undefined>(undefined);

export function SolarConfigProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [selectedSize, setSelectedSize] = useState<SolarSizeId>('medium');
  const [batteryAddOn, setBatteryAddOn] = useState<BatteryOptionId>('grm_bank_10kwh');
  const [installMethod, setInstallMethod] = useState<InstallMethodId>('diy');
  const [diySafetyAck, setDiySafetyAck] = useState<boolean>(true);
  const [servicePostalCode, setServicePostalCode] = useState<string>('78701');
  const [isPostalVerified, setIsPostalVerified] = useState<boolean>(true);
  const [checkoutInfo, setCheckoutInfo] = useState<CheckoutInfo>(defaultCheckoutInfo);
  const [submittedOrder, setSubmittedOrder] = useState<SubmittedOrder | null>(null);

  const signIn = (profile: UserProfile) => {
    setUser(profile);
    setCheckoutInfo((prev) => ({
      ...prev,
      fullName: profile.name || prev.fullName,
      email: profile.email || prev.email,
    }));
  };

  const signOut = () => {
    setUser(null);
  };

  const verifyPostalCode = (codeToTest?: string) => {
    const target = (codeToTest ?? servicePostalCode).trim();
    const valid = target.length >= 4;
    setIsPostalVerified(valid);
    if (valid) {
      setCheckoutInfo((prev) => ({ ...prev, postalCode: target }));
    }
    return valid;
  };

  const updateCheckoutInfo = (partial: Partial<CheckoutInfo>) => {
    setCheckoutInfo((prev) => ({ ...prev, ...partial }));
  };

  const sizeSpec = SOLAR_SIZE_SPECS[selectedSize];
  const panelPrice = sizeSpec.price;
  const batteryPrice = batteryAddOn === 'grm_bank_10kwh' ? BATTERY_PRICE : 0;
  const installPrice = installMethod === 'pro' ? PRO_INSTALL_PRICE : 0;
  const totalPrice = panelPrice + batteryPrice + installPrice;

  const submitOrder = (): SubmittedOrder => {
    const randomNum = Math.floor(100000 + Math.random() * 900000);
    const order: SubmittedOrder = {
      orderId: `GRM-${randomNum}`,
      createdAt: new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
      sizeSpec,
      batteryAddOn,
      installMethod,
      panelPrice,
      batteryPrice,
      installPrice,
      totalPrice,
      checkout: checkoutInfo,
      user,
    };
    setSubmittedOrder(order);
    return order;
  };

  const clearSubmittedOrder = () => {
    setSubmittedOrder(null);
  };

  const value = useMemo(
    () => ({
      user,
      signIn,
      signOut,
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
      checkoutInfo,
      updateCheckoutInfo,
      sizeSpec,
      panelPrice,
      batteryPrice,
      installPrice,
      totalPrice,
      submittedOrder,
      submitOrder,
      clearSubmittedOrder,
    }),
    [
      user,
      selectedSize,
      batteryAddOn,
      installMethod,
      diySafetyAck,
      servicePostalCode,
      isPostalVerified,
      checkoutInfo,
      sizeSpec,
      panelPrice,
      batteryPrice,
      installPrice,
      totalPrice,
      submittedOrder,
    ]
  );

  return <SolarConfigContext.Provider value={value}>{children}</SolarConfigContext.Provider>;
}

export function useSolarConfig(): SolarConfigContextType {
  const context = useContext(SolarConfigContext);
  if (!context) {
    throw new Error('useSolarConfig must be used within a SolarConfigProvider');
  }
  return context;
}

export function formatCurrency(amount: number): string {
  return '$' + amount.toLocaleString('en-US');
}

