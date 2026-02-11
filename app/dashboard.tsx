import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '@/lib/auth-context';
import Colors from '@/constants/colors';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';

interface DashboardOption {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  iconSet: 'ionicons' | 'material-community' | 'feather';
  gradient: [string, string];
  route: string;
}

const OPTIONS: DashboardOption[] = [
  {
    id: 'pomaker',
    title: 'POMAKER',
    subtitle: 'Create purchase orders',
    icon: 'file-document-edit-outline',
    iconSet: 'material-community',
    gradient: ['#6366F1', '#818CF8'],
    route: '/pomaker',
  },
  {
    id: 'invoice',
    title: 'INVOICE',
    subtitle: 'Manage invoices',
    icon: 'receipt-outline',
    iconSet: 'ionicons',
    gradient: ['#10B981', '#34D399'],
    route: '/invoice',
  },
  {
    id: 'expiry-damage',
    title: 'EXPIRY DAMAGE',
    subtitle: 'Track expired & damaged items',
    icon: 'alert-circle-outline',
    iconSet: 'ionicons',
    gradient: ['#EF4444', '#F87171'],
    route: '/shopper-verify',
  },
];

function OptionIcon({ option }: { option: DashboardOption }) {
  const size = 32;
  const color = Colors.white;
  if (option.iconSet === 'material-community') {
    return <MaterialCommunityIcons name={option.icon as any} size={size} color={color} />;
  }
  if (option.iconSet === 'feather') {
    return <Feather name={option.icon as any} size={size} color={color} />;
  }
  return <Ionicons name={option.icon as any} size={size} color={color} />;
}

function OptionCard({ option, index }: { option: DashboardOption; index: number }) {
  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push(option.route as any);
  };

  return (
    <Animated.View entering={FadeInDown.delay(index * 100).springify()}>
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => [
          styles.optionCard,
          pressed && styles.optionCardPressed,
        ]}
      >
        <LinearGradient
          colors={option.gradient}
          style={styles.optionIconBg}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <OptionIcon option={option} />
        </LinearGradient>

        <View style={styles.optionInfo}>
          <Text style={styles.optionTitle}>{option.title}</Text>
          <Text style={styles.optionSubtitle}>{option.subtitle}</Text>
        </View>

        <View style={styles.optionArrow}>
          <Ionicons name="chevron-forward" size={20} color={Colors.grayLight} />
        </View>
      </Pressable>
    </Animated.View>
  );
}

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const { userEmail, clearStore, logout } = useAuth();
  const webTopInset = Platform.OS === 'web' ? 67 : 0;
  const webBottomInset = Platform.OS === 'web' ? 34 : 0;

  const handleChangeStore = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await clearStore();
    router.replace('/store-select');
  };

  const handleLogout = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await logout();
    router.replace('/login');
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0A1628', '#142240']}
        style={styles.headerGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={[styles.headerContent, { paddingTop: insets.top + webTopInset + 16 }]}>
          <View style={styles.headerTopRow}>
            <Pressable onPress={handleChangeStore} style={styles.headerBtn}>
              <Ionicons name="swap-horizontal-outline" size={20} color={Colors.white} />
            </Pressable>
            <Pressable onPress={handleLogout} style={styles.headerBtn}>
              <Ionicons name="log-out-outline" size={20} color={Colors.white} />
            </Pressable>
          </View>

          <View style={styles.storeTag}>
            <MaterialCommunityIcons name="store" size={16} color={Colors.accent} />
            <Text style={styles.storeTagText}>RIMAL-HUNGERSTATION</Text>
          </View>

          <Text style={styles.headerGreeting}>
            Dashboard
          </Text>
          <Text style={styles.headerEmail}>{userEmail}</Text>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + webBottomInset + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionTitle}>Operations</Text>

        <View style={styles.optionsGrid}>
          {OPTIONS.map((option, index) => (
            <OptionCard key={option.id} option={option} index={index} />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.offWhite,
  },
  headerGradient: {
    paddingBottom: 28,
  },
  headerContent: {
    paddingHorizontal: 24,
    gap: 6,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  storeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 107, 53, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  storeTagText: {
    fontSize: 11,
    fontFamily: 'Poppins_700Bold',
    color: Colors.accent,
    letterSpacing: 0.5,
  },
  headerGreeting: {
    fontSize: 28,
    fontFamily: 'Poppins_700Bold',
    color: Colors.white,
    marginTop: 8,
  },
  headerEmail: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    color: Colors.grayLight,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
    color: Colors.gray,
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 16,
  },
  optionsGrid: {
    gap: 14,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 18,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 3,
  },
  optionCardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  optionIconBg: {
    width: 60,
    height: 60,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionInfo: {
    flex: 1,
    gap: 2,
  },
  optionTitle: {
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
    color: Colors.primary,
    letterSpacing: 0.5,
  },
  optionSubtitle: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    color: Colors.gray,
  },
  optionArrow: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.offWhite,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
