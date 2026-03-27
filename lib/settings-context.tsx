import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Language } from '@/constants/translations';

export type Theme = 'light' | 'dark';

interface ThemeColors {
  bg: string;
  card: string;
  cardBorder: string;
  headerGrad: [string, string];
  text: string;
  subtext: string;
  inputBg: string;
  divider: string;
  iconBg: string;
  rowBg: string;
}

export const LIGHT_COLORS: ThemeColors = {
  bg: '#F4F6FA',
  card: '#FFFFFF',
  cardBorder: 'transparent',
  headerGrad: ['#0A1628', '#142240'],
  text: '#0A1628',
  subtext: '#8E99A4',
  inputBg: '#F0F2F5',
  divider: '#E8EBF0',
  iconBg: '#F4F6FA',
  rowBg: '#FFFFFF',
};

export const DARK_COLORS: ThemeColors = {
  bg: '#0A1628',
  card: '#142240',
  cardBorder: 'rgba(255,255,255,0.06)',
  headerGrad: ['#060E1A', '#0A1628'],
  text: '#F4F6FA',
  subtext: '#8E99A4',
  inputBg: '#1A2D50',
  divider: 'rgba(255,255,255,0.07)',
  iconBg: '#1A2D50',
  rowBg: '#142240',
};

interface SettingsContextType {
  theme: Theme;
  language: Language;
  colors: ThemeColors;
  toggleTheme: () => void;
  setLanguage: (lang: Language) => void;
}

const SettingsContext = createContext<SettingsContextType>({
  theme: 'light',
  language: 'en',
  colors: LIGHT_COLORS,
  toggleTheme: () => {},
  setLanguage: () => {},
});

const THEME_KEY = 'app_theme';
const LANG_KEY = 'app_language';

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light');
  const [language, setLanguageState] = useState<Language>('en');

  useEffect(() => {
    (async () => {
      const [savedTheme, savedLang] = await Promise.all([
        AsyncStorage.getItem(THEME_KEY),
        AsyncStorage.getItem(LANG_KEY),
      ]);
      if (savedTheme === 'dark' || savedTheme === 'light') setTheme(savedTheme);
      if (savedLang) setLanguageState(savedLang as Language);
    })();
  }, []);

  const toggleTheme = async () => {
    const next: Theme = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    await AsyncStorage.setItem(THEME_KEY, next);
  };

  const setLanguage = async (lang: Language) => {
    setLanguageState(lang);
    await AsyncStorage.setItem(LANG_KEY, lang);
  };

  const colors = theme === 'dark' ? DARK_COLORS : LIGHT_COLORS;

  return (
    <SettingsContext.Provider value={{ theme, language, colors, toggleTheme, setLanguage }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}

export function useT() {
  const { language } = useSettings();
  return language;
}
