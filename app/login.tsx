import React, { useState } from 'react';
import {
  View,
  Text,
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
import { useSettings } from '@/lib/settings-context';
import translations from '@/constants/translations';
import Colors from '@/constants/colors';
import * as Haptics from 'expo-haptics';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { login } = useAuth();
  const { language, theme } = useSettings();
  const t = translations[language];
  const [isSubmitting, setIsSubmitting] = useState(false);

  const webTopInset = Platform.OS === 'web' ? 67 : 0;
  const webBottomInset = Platform.OS === 'web' ? 34 : 0;

  const handleGoogleLogin = async () => {
    try {
      setIsSubmitting(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await login('google.user@gmail.com');
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
        <Text style={styles.title}>{t.welcome_back}</Text>
        <Text style={styles.subtitle}>{t.sign_in_subtitle}</Text>
      </View>

      <View style={[styles.bottomSection, { paddingBottom: insets.bottom + webBottomInset + 32 }]}>
        <Pressable
          onPress={handleGoogleLogin}
          disabled={isSubmitting}
          style={({ pressed }) => [
            styles.googleBtn,
            pressed && { opacity: 0.88, transform: [{ scale: 0.97 }] },
            isSubmitting && { opacity: 0.6 },
          ]}
        >
          {isSubmitting ? (
            <ActivityIndicator color={Colors.primary} />
          ) : (
            <>
              <View style={styles.googleIconBox}>
                <Text style={styles.googleG}>G</Text>
              </View>
              <Text style={styles.googleBtnText}>{t.continue_with_google}</Text>
            </>
          )}
        </Pressable>

        <View style={styles.footer}>
          <MaterialCommunityIcons name="store" size={13} color="rgba(255,255,255,0.3)" />
          <Text style={styles.footerText}>{t.rimal_footer}</Text>
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

  bottomSection: {
    paddingHorizontal: 20,
    gap: 24,
  },

  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    backgroundColor: Colors.white,
    borderRadius: 16,
    paddingVertical: 17,
    paddingHorizontal: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  googleIconBox: {
    width: 28,
    height: 28,
    borderRadius: 7,
    backgroundColor: '#F1F3F4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  googleG: {
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
    color: '#4285F4',
  },
  googleBtnText: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: Colors.primary,
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
