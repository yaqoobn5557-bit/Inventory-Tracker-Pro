import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '@/lib/auth-context';
import Colors from '@/constants/colors';
import * as Haptics from 'expo-haptics';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [focused, setFocused] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const webTopInset = Platform.OS === 'web' ? 67 : 0;
  const webBottomInset = Platform.OS === 'web' ? 34 : 0;

  const isValid = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  const handleLogin = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }
    if (!isValid(email.trim())) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }
    try {
      setIsSubmitting(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await login(email.trim().toLowerCase());
      router.replace('/store-select');
    } catch {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0A1628', '#142240', '#1A2D50']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <View style={[styles.topSection, { paddingTop: insets.top + webTopInset + 60 }]}>
        <View style={styles.logoRow}>
          <LinearGradient
            colors={[Colors.accent, Colors.accentLight]}
            style={styles.logoBg}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="clipboard-outline" size={26} color={Colors.white} />
          </LinearGradient>
          <Text style={styles.logoText}>
            InvenTrack <Text style={{ color: Colors.accent }}>Pro</Text>
          </Text>
        </View>
        <Text style={styles.title}>Welcome Back</Text>
        <Text style={styles.subtitle}>Sign in with your email to continue</Text>
      </View>

      <View style={[styles.formSection, { paddingBottom: insets.bottom + webBottomInset + 24 }]}>
        <View style={styles.card}>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>EMAIL ADDRESS</Text>
            <View style={[styles.inputBox, focused && styles.inputBoxFocused]}>
              <View style={styles.inputIconWrap}>
                <Ionicons
                  name="mail-outline"
                  size={18}
                  color={focused ? Colors.accent : Colors.gray}
                />
              </View>
              <TextInput
                style={styles.input}
                placeholder="you@example.com"
                placeholderTextColor={Colors.grayLight}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                editable={!isSubmitting}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                onSubmitEditing={handleLogin}
                returnKeyType="go"
              />
              {email.length > 0 && isValid(email) && (
                <View style={styles.validIcon}>
                  <Ionicons name="checkmark-circle" size={18} color={Colors.success} />
                </View>
              )}
            </View>
          </View>

          <Pressable
            onPress={handleLogin}
            disabled={isSubmitting}
            style={({ pressed }) => [
              styles.loginBtn,
              pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
              isSubmitting && { opacity: 0.7 },
            ]}
          >
            <LinearGradient
              colors={isSubmitting ? [Colors.gray, Colors.gray] : [Colors.accent, '#FF8C5A']}
              style={styles.loginBtnGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {isSubmitting ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <>
                  <Text style={styles.loginBtnText}>Sign In</Text>
                  <Ionicons name="arrow-forward" size={18} color={Colors.white} />
                </>
              )}
            </LinearGradient>
          </Pressable>
        </View>

        <View style={styles.footer}>
          <MaterialCommunityIcons name="store" size={13} color="rgba(255,255,255,0.3)" />
          <Text style={styles.footerText}>Rimal HungerStation Inventory System</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'space-between' },

  topSection: {
    paddingHorizontal: 28,
    gap: 12,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 36,
  },
  logoBg: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 22,
    fontFamily: 'Poppins_700Bold',
    color: Colors.white,
  },
  title: {
    fontSize: 34,
    fontFamily: 'Poppins_700Bold',
    color: Colors.white,
    lineHeight: 40,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: 'rgba(255,255,255,0.5)',
    marginTop: 4,
  },

  formSection: {
    paddingHorizontal: 20,
    gap: 20,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 24,
    padding: 22,
    gap: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 28,
    elevation: 10,
  },

  fieldGroup: { gap: 10 },
  fieldLabel: {
    fontSize: 11,
    fontFamily: 'Poppins_700Bold',
    color: Colors.gray,
    letterSpacing: 1.5,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.offWhite,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  inputBoxFocused: {
    borderColor: Colors.accent,
    backgroundColor: '#FFF8F5',
  },
  inputIconWrap: {
    width: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    paddingRight: 14,
    fontSize: 15,
    fontFamily: 'Poppins_400Regular',
    color: Colors.primary,
    minWidth: 0,
  },
  validIcon: {
    paddingRight: 14,
  },

  loginBtn: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  loginBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 17,
    gap: 8,
  },
  loginBtnText: {
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
    color: Colors.white,
    letterSpacing: 0.5,
  },

  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  footerText: {
    fontSize: 11,
    fontFamily: 'Poppins_400Regular',
    color: 'rgba(255,255,255,0.35)',
  },
});
