import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '@/lib/auth-context';
import Colors from '@/constants/colors';
import * as Haptics from 'expo-haptics';

const STORES = [
  {
    id: 'rimal-hungerstation',
    name: 'RIMAL-HUNGERSTATION',
    location: 'Rimal Branch',
    icon: 'store' as const,
  },
];

export default function StoreSelectScreen() {
  const insets = useSafeAreaInsets();
  const { selectStore, logout, userEmail } = useAuth();
  const webTopInset = Platform.OS === 'web' ? 67 : 0;
  const webBottomInset = Platform.OS === 'web' ? 34 : 0;

  const handleSelectStore = async (storeId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await selectStore(storeId);
    router.replace('/dashboard');
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
          <View style={styles.headerRow}>
            <Pressable onPress={handleLogout} style={styles.logoutBtn}>
              <Ionicons name="log-out-outline" size={22} color={Colors.white} />
            </Pressable>
            <View style={styles.userBadge}>
              <Ionicons name="person-circle-outline" size={18} color={Colors.accent} />
              <Text style={styles.userEmail} numberOfLines={1}>{userEmail}</Text>
            </View>
          </View>
          <Text style={styles.headerTitle}>Select Your Store</Text>
          <Text style={styles.headerSubtitle}>Choose a store to manage inventory</Text>
        </View>
      </LinearGradient>

      <View style={[styles.storeList, { paddingBottom: insets.bottom + webBottomInset + 20 }]}>
        {STORES.map((store) => (
          <Pressable
            key={store.id}
            onPress={() => handleSelectStore(store.id)}
            style={({ pressed }) => [
              styles.storeCard,
              pressed && styles.storeCardPressed,
            ]}
          >
            <View style={styles.storeIconContainer}>
              <LinearGradient
                colors={[Colors.accent, Colors.accentLight]}
                style={styles.storeIconGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <MaterialCommunityIcons name={store.icon} size={32} color={Colors.white} />
              </LinearGradient>
            </View>

            <View style={styles.storeInfo}>
              <Text style={styles.storeName}>{store.name}</Text>
              <View style={styles.storeLocationRow}>
                <Ionicons name="location-outline" size={14} color={Colors.gray} />
                <Text style={styles.storeLocation}>{store.location}</Text>
              </View>
            </View>

            <View style={styles.storeArrow}>
              <Ionicons name="chevron-forward" size={22} color={Colors.accent} />
            </View>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.offWhite,
  },
  headerGradient: {
    paddingBottom: 32,
  },
  headerContent: {
    paddingHorizontal: 24,
    gap: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  logoutBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    maxWidth: 200,
  },
  userEmail: {
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
    color: Colors.grayLight,
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: 'Poppins_700Bold',
    color: Colors.white,
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: Colors.grayLight,
  },
  storeList: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
    gap: 16,
  },
  storeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 20,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
  },
  storeCardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  storeIconContainer: {},
  storeIconGradient: {
    width: 64,
    height: 64,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  storeInfo: {
    flex: 1,
    gap: 4,
  },
  storeName: {
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
    color: Colors.primary,
  },
  storeLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  storeLocation: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    color: Colors.gray,
  },
  storeArrow: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 107, 53, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
