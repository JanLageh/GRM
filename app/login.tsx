import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useSolarConfig } from '../context/SolarConfigContext';

export default function LoginScreen() {
  const router = useRouter();
  const { user, signIn, signOut } = useSolarConfig();

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [fullName, setFullName] = useState('Alex Mercer');
  const [email, setEmail] = useState('alex.mercer@grmsolar.io');
  const [password, setPassword] = useState('••••••••••••');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }
    if (mode === 'signup' && !fullName.trim()) {
      setErrorMessage('Please enter your full name to create an account.');
      return;
    }

    setErrorMessage('');
    const derivedName =
      mode === 'signup'
        ? fullName.trim()
        : fullName.trim() || trimmedEmail.split('@')[0];

    signIn({
      name: derivedName,
      email: trimmedEmail,
      provider: 'email',
      accountType: mode === 'signup' ? 'Direct Trading Member' : 'Verified Solar Buyer',
    });

    router.push('/builder');
  };

  const handleOAuthSimulation = (provider: 'google' | 'apple') => {
    setErrorMessage('');
    signIn({
      name: provider === 'google' ? 'Alex Mercer (Google)' : 'Alex Mercer (Apple ID)',
      email:
        provider === 'google'
          ? 'alex.mercer@gmail.com'
          : 'alex.mercer@icloud.com',
      provider,
      accountType: 'OAuth Verified Trader',
    });
    router.push('/builder');
  };

  return (
    <KeyboardAvoidingView
      style={styles.flexOne}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.authCard}>
          {/* Brand Header */}
          <View style={styles.brandRow}>
            <View style={styles.brandBadgeIcon}>
              <Feather name="sun" size={16} color="#FFFFFF" />
            </View>
            <View>
              <Text style={styles.brandTitle}>GRM-Solar</Text>
              <Text style={styles.brandSubtitle}>Panel & Battery Trading Portal</Text>
            </View>
          </View>

          {user && (
            <View style={styles.activeSessionBanner}>
              <View style={styles.activeSessionInfo}>
                <View style={styles.emeraldDot} />
                <View>
                  <Text style={styles.activeSessionName}>
                    Signed in as {user.name}
                  </Text>
                  <Text style={styles.activeSessionEmail}>{user.email}</Text>
                </View>
              </View>
              <View style={styles.activeSessionActions}>
                <Pressable
                  onPress={() => router.push('/builder')}
                  style={styles.continueBtnSmall}
                >
                  <Text style={styles.continueBtnSmallText}>Builder</Text>
                </Pressable>
                <Pressable onPress={signOut} style={styles.signOutBtnSmall}>
                  <Text style={styles.signOutBtnSmallText}>Sign Out</Text>
                </Pressable>
              </View>
            </View>
          )}

          {/* Segmented Control Toggle: [ Sign In ] | [ Create Account ] */}
          <View style={styles.segmentedControl}>
            <Pressable
              onPress={() => {
                setMode('signin');
                setErrorMessage('');
              }}
              style={[
                styles.segmentButton,
                mode === 'signin' && styles.segmentButtonActive,
              ]}
              accessibilityRole="button"
            >
              <Text
                style={[
                  styles.segmentText,
                  mode === 'signin' && styles.segmentTextActive,
                ]}
              >
                Sign In
              </Text>
            </Pressable>

            <Pressable
              onPress={() => {
                setMode('signup');
                setErrorMessage('');
              }}
              style={[
                styles.segmentButton,
                mode === 'signup' && styles.segmentButtonActive,
              ]}
              accessibilityRole="button"
            >
              <Text
                style={[
                  styles.segmentText,
                  mode === 'signup' && styles.segmentTextActive,
                ]}
              >
                Create Account
              </Text>
            </Pressable>
          </View>

          <View style={styles.headingBlock}>
            <Text style={styles.cardHeading}>
              {mode === 'signin'
                ? 'Access your solar configuration'
                : 'Open a GRM-Solar trading account'}
            </Text>
            <Text style={styles.cardDescription}>
              {mode === 'signin'
                ? 'Sign in to save array layouts, battery allocations, and engineering blueprints.'
                : 'Lock in wholesale N-Type solar array and 10kWh LiFePO4 battery pricing.'}
            </Text>
          </View>

          {/* Form Fields with Clean Bottom/Hairline Borders */}
          <View style={styles.formContainer}>
            {mode === 'signup' && (
              <View style={styles.fieldGroup}>
                <Text style={styles.inputLabel}>FULL NAME</Text>
                <TextInput
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="Enter your full name"
                  placeholderTextColor="#9CA3AF"
                  style={styles.bottomBorderInput}
                  autoCapitalize="words"
                />
              </View>
            )}

            <View style={styles.fieldGroup}>
              <Text style={styles.inputLabel}>EMAIL ADDRESS</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="name@domain.com"
                placeholderTextColor="#9CA3AF"
                keyboardType="email-address"
                autoCapitalize="none"
                style={styles.bottomBorderInput}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.inputLabel}>PASSWORD</Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Enter password"
                placeholderTextColor="#9CA3AF"
                secureTextEntry
                style={styles.bottomBorderInput}
              />
            </View>

            {errorMessage ? (
              <Text style={styles.errorText}>{errorMessage}</Text>
            ) : null}

            <Pressable
              onPress={handleSubmit}
              style={styles.submitButton}
              accessibilityRole="button"
            >
              <Text style={styles.submitButtonText}>
                {mode === 'signin'
                  ? 'Sign In & Continue to Builder'
                  : 'Create Account & Launch Builder'}
              </Text>
              <Feather name="arrow-right" size={16} color="#FFFFFF" />
            </Pressable>
          </View>

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.hairline} />
            <Text style={styles.dividerText}>OR QUICK AUTHENTICATION</Text>
            <View style={styles.hairline} />
          </View>

          {/* Quick OAuth Simulation Buttons */}
          <View style={styles.oauthStack}>
            <Pressable
              onPress={() => handleOAuthSimulation('google')}
              style={styles.oauthButton}
              accessibilityRole="button"
            >
              <Ionicons name="logo-google" size={16} color="#111111" />
              <Text style={styles.oauthButtonText}>Continue with Google</Text>
            </Pressable>

            <Pressable
              onPress={() => handleOAuthSimulation('apple')}
              style={styles.oauthButton}
              accessibilityRole="button"
            >
              <Ionicons name="logo-apple" size={18} color="#111111" />
              <Text style={styles.oauthButtonText}>Continue with Apple</Text>
            </Pressable>
          </View>

          <View style={styles.securityNote}>
            <Feather name="shield" size={13} color="#10B981" />
            <Text style={styles.securityNoteText}>
              256-bit encrypted session • Instant CAD & permit packet synchronization
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flexOne: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  authCard: {
    width: '100%',
    maxWidth: 460,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 32,
    gap: 22,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  brandBadgeIcon: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#111111',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111111',
    letterSpacing: -0.3,
  },
  brandSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
  },
  activeSessionBanner: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 10,
  },
  activeSessionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  emeraldDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  activeSessionName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111111',
  },
  activeSessionEmail: {
    fontSize: 11,
    color: '#6B7280',
  },
  activeSessionActions: {
    flexDirection: 'row',
    gap: 6,
  },
  continueBtnSmall: {
    backgroundColor: '#111111',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  continueBtnSmallText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  signOutBtnSmall: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  signOutBtnSmallText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 4,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 6,
  },
  segmentButtonActive: {
    backgroundColor: '#111111',
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  segmentTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  headingBlock: {
    gap: 6,
  },
  cardHeading: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111111',
    letterSpacing: -0.4,
  },
  cardDescription: {
    fontSize: 13,
    lineHeight: 20,
    color: '#6B7280',
  },
  formContainer: {
    gap: 18,
  },
  fieldGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
    letterSpacing: 0.7,
  },
  bottomBorderInput: {
    fontSize: 15,
    color: '#111111',
    paddingVertical: 10,
    borderBottomWidth: 1.5,
    borderBottomColor: '#111111',
    backgroundColor: 'transparent',
  },
  errorText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#DC2626',
  },
  submitButton: {
    marginTop: 6,
    backgroundColor: '#111111',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  hairline: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6B7280',
    letterSpacing: 0.7,
  },
  oauthStack: {
    gap: 10,
  },
  oauthButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingVertical: 13,
    borderRadius: 8,
  },
  oauthButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111111',
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  securityNoteText: {
    fontSize: 11,
    color: '#6B7280',
  },
});

