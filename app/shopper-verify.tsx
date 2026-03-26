import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  Platform,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/colors';
import * as Haptics from 'expo-haptics';

interface Shopper {
  id: string;
  name: string;
  role: string;
  passcode: string;
}

const SHOPPERS: Shopper[] = [
  { id: '1', name: 'MOHAMMAD YAQOOB', role: 'SENIOR SHOPPER', passcode: '12283' },
  { id: '2', name: 'Fuzail Rashid', role: 'SHOPPER', passcode: '28137' },
  { id: '3', name: 'MD HOSSAIN', role: 'SHOPPER', passcode: '24925' },
  { id: '4', name: 'ABDUL BASIT KHAN', role: 'SHOPPER', passcode: '19650' },
  { id: '5', name: 'Parash Das', role: 'SHOPPER', passcode: '12345' },
  { id: '6', name: 'ALSAYID NOUH', role: 'SHOPPER', passcode: '88911' },
];

export default function ShopperVerifyScreen() {
  const insets = useSafeAreaInsets();
  const webTopInset = Platform.OS === 'web' ? 67 : 0;
  const webBottomInset = Platform.OS === 'web' ? 34 : 0;

  const [selectedShopper, setSelectedShopper] = useState<Shopper | null>(null);
  const [enteredPasscode, setEnteredPasscode] = useState('');

  const handleSelectShopper = (shopper: Shopper) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedShopper(shopper);
    setEnteredPasscode('');
  };

  const handleVerify = () => {
    if (!selectedShopper) return;

    if (enteredPasscode === selectedShopper.passcode) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace({
        pathname: '/expiry-damage',
        params: { shopperName: selectedShopper.name, shopperRole: selectedShopper.role },
      });
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Invalid Passcode', 'Please enter the correct passcode');
      setEnteredPasscode('');
    }
  };

  const handleDigitPress = (digit: string) => {
    if (enteredPasscode.length >= 5) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newPasscode = enteredPasscode + digit;
    setEnteredPasscode(newPasscode);

    if (newPasscode.length === 5 && selectedShopper) {
      setTimeout(() => {
        if (newPasscode === selectedShopper.passcode) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          router.replace({
            pathname: '/expiry-damage',
            params: { shopperName: selectedShopper.name, shopperRole: selectedShopper.role },
          });
        } else {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          Alert.alert('Invalid Passcode', 'Please enter the correct passcode');
          setEnteredPasscode('');
        }
      }, 200);
    }
  };

  const handleDelete = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEnteredPasscode(prev => prev.slice(0, -1));
  };

  if (selectedShopper) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#EF4444', '#F87171']}
          style={styles.header}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={[styles.headerContent, { paddingTop: insets.top + webTopInset + 12 }]}>
            <Pressable onPress={() => setSelectedShopper(null)} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={22} color={Colors.white} />
            </Pressable>
            <Text style={styles.headerTitle}>VERIFICATION</Text>
            <View style={{ width: 40 }} />
          </View>
        </LinearGradient>

        <View style={[styles.passcodeContainer, { paddingBottom: insets.bottom + webBottomInset + 20 }]}>
          <View style={styles.shopperBadge}>
            <View style={styles.shopperAvatar}>
              <Ionicons name="person" size={24} color={Colors.white} />
            </View>
            <Text style={styles.shopperBadgeName}>{selectedShopper.name}</Text>
            <Text style={styles.shopperBadgeRole}>{selectedShopper.role}</Text>
          </View>

          <Text style={styles.passcodeLabel}>Enter Passcode</Text>

          <View style={styles.dotsRow}>
            {[0, 1, 2, 3, 4].map((i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  i < enteredPasscode.length && styles.dotFilled,
                ]}
              />
            ))}
          </View>

          <View style={styles.keypad}>
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'].map((key) => {
              if (key === '') {
                return <View key="empty" style={styles.keyEmpty} />;
              }
              if (key === 'del') {
                return (
                  <Pressable
                    key="del"
                    onPress={handleDelete}
                    style={({ pressed }) => [styles.key, pressed && styles.keyPressed]}
                  >
                    <Ionicons name="backspace-outline" size={24} color={Colors.primary} />
                  </Pressable>
                );
              }
              return (
                <Pressable
                  key={key}
                  onPress={() => handleDigitPress(key)}
                  style={({ pressed }) => [styles.key, pressed && styles.keyPressed]}
                >
                  <Text style={styles.keyText}>{key}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#EF4444', '#F87171']}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={[styles.headerContent, { paddingTop: insets.top + webTopInset + 12 }]}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={Colors.white} />
          </Pressable>
          <Text style={styles.headerTitle}>SHOPPER VERIFICATION</Text>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + webBottomInset + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionLabel}>RIMAL - SHOPPER LIST</Text>
        <Text style={styles.sectionSub}>Select your name to verify</Text>

        <View style={styles.shopperList}>
          {SHOPPERS.map((shopper) => (
            <Pressable
              key={shopper.id}
              onPress={() => handleSelectShopper(shopper)}
              style={({ pressed }) => [
                styles.shopperCard,
                pressed && styles.shopperCardPressed,
              ]}
            >
              <View style={[
                styles.shopperIcon,
                shopper.role === 'SENIOR SHOPPER' && styles.shopperIconSenior,
              ]}>
                <Ionicons
                  name="person"
                  size={20}
                  color={shopper.role === 'SENIOR SHOPPER' ? '#F59E0B' : Colors.white}
                />
              </View>
              <View style={styles.shopperInfo}>
                <Text style={styles.shopperName}>{shopper.name}</Text>
                <Text style={[
                  styles.shopperRole,
                  shopper.role === 'SENIOR SHOPPER' && styles.shopperRoleSenior,
                ]}>
                  {shopper.role}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.grayLight} />
            </Pressable>
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
  header: {
    paddingBottom: 12,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 6,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
    color: Colors.white,
    letterSpacing: 0.5,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    gap: 12,
  },
  sectionLabel: {
    fontSize: 14,
    fontFamily: 'Poppins_700Bold',
    color: Colors.primary,
    letterSpacing: 1,
    marginTop: 4,
  },
  sectionSub: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    color: Colors.gray,
    marginBottom: 4,
  },
  shopperList: {
    gap: 10,
  },
  shopperCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  shopperCardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  shopperIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shopperIconSenior: {
    backgroundColor: '#92400E',
  },
  shopperInfo: {
    flex: 1,
    gap: 2,
  },
  shopperName: {
    fontSize: 15,
    fontFamily: 'Poppins_600SemiBold',
    color: Colors.primary,
  },
  shopperRole: {
    fontSize: 11,
    fontFamily: 'Poppins_500Medium',
    color: Colors.gray,
    letterSpacing: 0.5,
  },
  shopperRoleSenior: {
    color: '#F59E0B',
  },
  passcodeContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 24,
  },
  shopperBadge: {
    alignItems: 'center',
    gap: 6,
  },
  shopperAvatar: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  shopperBadgeName: {
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
    color: Colors.primary,
    textAlign: 'center',
  },
  shopperBadgeRole: {
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
    color: Colors.gray,
    letterSpacing: 1,
  },
  passcodeLabel: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    color: Colors.gray,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: Colors.grayLight,
    backgroundColor: 'transparent',
  },
  dotFilled: {
    backgroundColor: '#EF4444',
    borderColor: '#EF4444',
  },
  keypad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    width: 260,
    marginTop: 12,
  },
  key: {
    width: 72,
    height: 56,
    borderRadius: 16,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  keyPressed: {
    backgroundColor: Colors.offWhite,
    transform: [{ scale: 0.95 }],
  },
  keyEmpty: {
    width: 72,
    height: 56,
  },
  keyText: {
    fontSize: 24,
    fontFamily: 'Poppins_600SemiBold',
    color: Colors.primary,
  },
});
