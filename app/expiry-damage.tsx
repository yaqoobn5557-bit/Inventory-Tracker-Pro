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
import AsyncStorage from '@react-native-async-storage/async-storage';

type ReportType = 'expiry' | 'damage';

interface ReportItem {
  id: string;
  itemName: string;
  barcode: string;
  quantity: string;
  reason: string;
  type: ReportType;
}

export default function ExpiryDamageScreen() {
  const insets = useSafeAreaInsets();
  const webTopInset = Platform.OS === 'web' ? 67 : 0;
  const webBottomInset = Platform.OS === 'web' ? 34 : 0;

  const [activeTab, setActiveTab] = useState<ReportType>('expiry');
  const [items, setItems] = useState<ReportItem[]>([
    { id: Date.now().toString(), itemName: '', barcode: '', quantity: '', reason: '', type: 'expiry' },
  ]);

  const filteredItems = items.filter(i => i.type === activeTab);

  const addItem = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setItems(prev => [...prev, {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      itemName: '',
      barcode: '',
      quantity: '',
      reason: '',
      type: activeTab,
    }]);
  };

  const removeItem = (id: string) => {
    const typeItems = items.filter(i => i.type === activeTab);
    if (typeItems.length <= 1) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const updateItem = (id: string, field: keyof ReportItem, value: string) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, [field]: value } : i));
  };

  const switchTab = (tab: ReportType) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveTab(tab);
    const hasItems = items.some(i => i.type === tab);
    if (!hasItems) {
      setItems(prev => [...prev, {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        itemName: '',
        barcode: '',
        quantity: '',
        reason: '',
        type: tab,
      }]);
    }
  };

  const handleSave = async () => {
    const validItems = filteredItems.filter(i => i.itemName.trim());
    if (validItems.length === 0) {
      Alert.alert('Missing Info', 'Please add at least one item');
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      const key = activeTab === 'expiry' ? 'expiry_reports' : 'damage_reports';
      const existing = await AsyncStorage.getItem(key);
      const reports = existing ? JSON.parse(existing) : [];
      reports.push({
        id: Date.now().toString(),
        type: activeTab,
        items: validItems,
        createdAt: new Date().toISOString(),
      });
      await AsyncStorage.setItem(key, JSON.stringify(reports));
      Alert.alert('Success', `${activeTab === 'expiry' ? 'Expiry' : 'Damage'} report saved`, [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e) {
      Alert.alert('Error', 'Failed to save report');
    }
  };

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
          <Text style={styles.headerTitle}>EXPIRY / DAMAGE</Text>
          <Pressable onPress={handleSave} style={styles.saveBtn}>
            <Ionicons name="checkmark" size={22} color={Colors.white} />
          </Pressable>
        </View>
      </LinearGradient>

      <View style={styles.tabBar}>
        <Pressable
          onPress={() => switchTab('expiry')}
          style={[styles.tab, activeTab === 'expiry' && styles.tabActive]}
        >
          <Ionicons
            name="time-outline"
            size={18}
            color={activeTab === 'expiry' ? '#EF4444' : Colors.gray}
          />
          <Text style={[styles.tabText, activeTab === 'expiry' && styles.tabTextActive]}>
            Expiry
          </Text>
        </Pressable>
        <Pressable
          onPress={() => switchTab('damage')}
          style={[styles.tab, activeTab === 'damage' && styles.tabActive]}
        >
          <Ionicons
            name="warning-outline"
            size={18}
            color={activeTab === 'damage' ? '#EF4444' : Colors.gray}
          />
          <Text style={[styles.tabText, activeTab === 'damage' && styles.tabTextActive]}>
            Damage
          </Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + webBottomInset + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>
              {activeTab === 'expiry' ? 'Expired Items' : 'Damaged Items'}
            </Text>
            <Pressable onPress={addItem} style={styles.addItemBtn}>
              <Ionicons name="add" size={20} color={Colors.white} />
            </Pressable>
          </View>

          {filteredItems.map((item, index) => (
            <View key={item.id} style={styles.itemRow}>
              <View style={styles.itemHeader}>
                <View style={styles.itemNumber}>
                  <Text style={styles.itemNumberText}>{index + 1}</Text>
                </View>
                {filteredItems.length > 1 && (
                  <Pressable onPress={() => removeItem(item.id)} style={styles.removeBtn}>
                    <Ionicons name="close" size={16} color={Colors.danger} />
                  </Pressable>
                )}
              </View>

              <TextInput
                style={styles.itemInput}
                placeholder="Item name"
                placeholderTextColor={Colors.grayLight}
                value={item.itemName}
                onChangeText={(v) => updateItem(item.id, 'itemName', v)}
              />

              <View style={styles.rowInputs}>
                <TextInput
                  style={[styles.itemInput, { flex: 1 }]}
                  placeholder="Barcode"
                  placeholderTextColor={Colors.grayLight}
                  value={item.barcode}
                  onChangeText={(v) => updateItem(item.id, 'barcode', v)}
                />
                <TextInput
                  style={[styles.itemInput, { width: 80 }]}
                  placeholder="Qty"
                  placeholderTextColor={Colors.grayLight}
                  value={item.quantity}
                  onChangeText={(v) => updateItem(item.id, 'quantity', v)}
                  keyboardType="numeric"
                />
              </View>

              <TextInput
                style={[styles.itemInput, styles.reasonInput]}
                placeholder={activeTab === 'expiry' ? 'Expiry date / details' : 'Damage description'}
                placeholderTextColor={Colors.grayLight}
                value={item.reason}
                onChangeText={(v) => updateItem(item.id, 'reason', v)}
                multiline
              />
            </View>
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
    paddingBottom: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
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
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
    color: Colors.white,
    letterSpacing: 1,
  },
  saveBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    marginHorizontal: 20,
    marginTop: -10,
    borderRadius: 16,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 3,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  tabActive: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
  },
  tabText: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: Colors.gray,
  },
  tabTextActive: {
    color: '#EF4444',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    gap: 16,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 20,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 15,
    fontFamily: 'Poppins_700Bold',
    color: Colors.primary,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  addItemBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemRow: {
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.offWhite,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemNumber: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: Colors.offWhite,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemNumberText: {
    fontSize: 12,
    fontFamily: 'Poppins_600SemiBold',
    color: Colors.gray,
  },
  removeBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemInput: {
    backgroundColor: Colors.inputBg,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: Colors.primary,
  },
  rowInputs: {
    flexDirection: 'row',
    gap: 8,
  },
  reasonInput: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
});
