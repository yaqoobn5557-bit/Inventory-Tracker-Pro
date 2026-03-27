import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  ScrollView,
  Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSettings } from '@/lib/settings-context';
import { useT } from '@/lib/settings-context';
import translations, { Language, LANGUAGE_LABELS } from '@/constants/translations';
import Colors from '@/constants/colors';
import * as Haptics from 'expo-haptics';

const LANGUAGES: Language[] = ['en', 'hi', 'ar', 'ur', 'ne', 'bn'];

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { theme, colors, toggleTheme, language, setLanguage } = useSettings();
  const lang = useT();
  const t = translations[lang];
  const isDark = theme === 'dark';

  const webTopInset = Platform.OS === 'web' ? 67 : 0;
  const webBottomInset = Platform.OS === 'web' ? 34 : 0;

  const handleToggleTheme = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleTheme();
  };

  const handleLanguage = (l: Language) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLanguage(l);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <View
        style={[
          styles.header,
          {
            backgroundColor: isDark ? colors.card : Colors.primary,
            paddingTop: insets.top + webTopInset + 8,
            borderBottomColor: colors.divider,
          },
        ]}
      >
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={Colors.white} />
        </Pressable>
        <Text style={styles.headerTitle}>{t.settings}</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insets.bottom + webBottomInset + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.section, { color: colors.subtext }]}>{t.appearance}</Text>

        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.card,
              borderColor: colors.cardBorder,
            },
          ]}
        >
          <View style={styles.row}>
            <View style={[styles.rowIcon, { backgroundColor: isDark ? '#1A2D50' : '#EEF0FF' }]}>
              <Ionicons
                name={isDark ? 'moon' : 'sunny'}
                size={20}
                color={isDark ? '#818CF8' : '#6366F1'}
              />
            </View>
            <View style={styles.rowInfo}>
              <Text style={[styles.rowTitle, { color: colors.text }]}>{t.dark_mode}</Text>
              <Text style={[styles.rowSub, { color: colors.subtext }]}>{t.dark_mode_sub}</Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={handleToggleTheme}
              trackColor={{ false: '#C8CDD3', true: Colors.accent }}
              thumbColor={Colors.white}
              ios_backgroundColor="#C8CDD3"
            />
          </View>
        </View>

        <Text style={[styles.section, { color: colors.subtext }]}>{t.language}</Text>
        <Text style={[styles.sectionSub, { color: colors.subtext }]}>{t.language_sub}</Text>

        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.card,
              borderColor: colors.cardBorder,
            },
          ]}
        >
          {LANGUAGES.map((l, i) => {
            const isSelected = language === l;
            const isLast = i === LANGUAGES.length - 1;
            return (
              <Pressable
                key={l}
                onPress={() => handleLanguage(l)}
                style={({ pressed }) => [
                  styles.langRow,
                  !isLast && { borderBottomWidth: 1, borderBottomColor: colors.divider },
                  pressed && { opacity: 0.75 },
                ]}
              >
                <View style={styles.langLeft}>
                  <View
                    style={[
                      styles.langDot,
                      {
                        backgroundColor: isSelected
                          ? Colors.accent
                          : isDark
                          ? '#1A2D50'
                          : '#F4F6FA',
                        borderColor: isSelected ? Colors.accent : colors.divider,
                      },
                    ]}
                  >
                    {isSelected && (
                      <Ionicons name="checkmark" size={13} color={Colors.white} />
                    )}
                  </View>
                  <Text
                    style={[
                      styles.langName,
                      {
                        color: isSelected ? Colors.accent : colors.text,
                        fontFamily: isSelected ? 'Poppins_700Bold' : 'Poppins_400Regular',
                      },
                    ]}
                  >
                    {LANGUAGE_LABELS[l]}
                  </Text>
                </View>
                {isSelected && (
                  <View style={styles.activeBadge}>
                    <Text style={styles.activeBadgeText}>Active</Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: 'Poppins_700Bold',
    color: Colors.white,
  },

  scroll: {
    paddingHorizontal: 18,
    paddingTop: 24,
    gap: 0,
  },
  section: {
    fontSize: 11,
    fontFamily: 'Poppins_700Bold',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 10,
    marginTop: 20,
  },
  sectionSub: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    marginBottom: 12,
    marginTop: -6,
  },

  card: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 14,
  },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowInfo: { flex: 1 },
  rowTitle: {
    fontSize: 15,
    fontFamily: 'Poppins_600SemiBold',
  },
  rowSub: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    marginTop: 1,
  },

  langRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    paddingHorizontal: 16,
  },
  langLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  langDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  langName: {
    fontSize: 15,
  },
  activeBadge: {
    backgroundColor: Colors.accent,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  activeBadgeText: {
    fontSize: 11,
    fontFamily: 'Poppins_700Bold',
    color: Colors.white,
  },
});
