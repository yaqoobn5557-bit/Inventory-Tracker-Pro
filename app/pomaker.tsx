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
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/colors';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface POItem {
  id: string;
  itemName: string;
  quantity: string;
  unit: string;
}

export default function POmakerScreen() {
  const insets = useSafeAreaInsets();
  const webTopInset = Platform.OS === 'web' ? 67 : 0;
  const webBottomInset = Platform.OS === 'web' ? 34 : 0;

  const [poNumber, setPoNumber] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [items, setItems] = useState<POItem[]>([
    { id: Date.now().toString(), itemName: '', quantity: '', unit: 'pcs' },
  ]);

  const addItem = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setItems(prev => [...prev, {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      itemName: '',
      quantity: '',
      unit: 'pcs',
    }]);
  };

  const removeItem = (id: string) => {
    if (items.length <= 1) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const updateItem = (id: string, field: keyof POItem, value: string) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, [field]: value } : i));
  };

  const handleSave = async () => {
    if (!poNumber.trim() || !supplierName.trim()) {
      Alert.alert('Missing Info', 'Please fill in PO number and supplier name');
      return;
    }
    const hasItems = items.some(i => i.itemName.trim() && i.quantity.trim());
    if (!hasItems) {
      Alert.alert('Missing Items', 'Please add at least one item');
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      const existing = await AsyncStorage.getItem('po_orders');
      const orders = existing ? JSON.parse(existing) : [];
      orders.push({
        id: Date.now().toString(),
        poNumber,
        supplierName,
        items: items.filter(i => i.itemName.trim()),
        createdAt: new Date().toISOString(),
      });
      await AsyncStorage.setItem('po_orders', JSON.stringify(orders));
      Alert.alert('Success', 'Purchase order saved successfully', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e) {
      Alert.alert('Error', 'Failed to save purchase order');
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#6366F1', '#818CF8']}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={[styles.headerContent, { paddingTop: insets.top + webTopInset + 12 }]}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={Colors.white} />
          </Pressable>
          <Text style={styles.headerTitle}>POMAKER</Text>
          <Pressable onPress={handleSave} style={styles.saveBtn}>
            <Ionicons name="checkmark" size={22} color={Colors.white} />
          </Pressable>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + webBottomInset + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Order Details</Text>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>PO Number</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter PO number"
              placeholderTextColor={Colors.grayLight}
              value={poNumber}
              onChangeText={setPoNumber}
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Supplier Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter supplier name"
              placeholderTextColor={Colors.grayLight}
              value={supplierName}
              onChangeText={setSupplierName}
            />
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>Items</Text>
            <Pressable onPress={addItem} style={styles.addItemBtn}>
              <Ionicons name="add" size={20} color={Colors.white} />
            </Pressable>
          </View>

          {items.map((item, index) => (
            <View key={item.id} style={styles.itemRow}>
              <View style={styles.itemNumber}>
                <Text style={styles.itemNumberText}>{index + 1}</Text>
              </View>
              <View style={styles.itemFields}>
                <TextInput
                  style={styles.itemInput}
                  placeholder="Item name"
                  placeholderTextColor={Colors.grayLight}
                  value={item.itemName}
                  onChangeText={(v) => updateItem(item.id, 'itemName', v)}
                />
                <View style={styles.itemBottomRow}>
                  <TextInput
                    style={[styles.itemInput, styles.qtyInput]}
                    placeholder="Qty"
                    placeholderTextColor={Colors.grayLight}
                    value={item.quantity}
                    onChangeText={(v) => updateItem(item.id, 'quantity', v)}
                    keyboardType="numeric"
                  />
                  <TextInput
                    style={[styles.itemInput, styles.unitInput]}
                    placeholder="Unit"
                    placeholderTextColor={Colors.grayLight}
                    value={item.unit}
                    onChangeText={(v) => updateItem(item.id, 'unit', v)}
                  />
                </View>
              </View>
              {items.length > 1 && (
                <Pressable onPress={() => removeItem(item.id)} style={styles.removeBtn}>
                  <Ionicons name="close" size={18} color={Colors.danger} />
                </Pressable>
              )}
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
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 12,
    fontFamily: 'Poppins_600SemiBold',
    color: Colors.gray,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: Colors.inputBg,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    fontFamily: 'Poppins_400Regular',
    color: Colors.primary,
  },
  addItemBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.offWhite,
  },
  itemNumber: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: Colors.offWhite,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  itemNumberText: {
    fontSize: 12,
    fontFamily: 'Poppins_600SemiBold',
    color: Colors.gray,
  },
  itemFields: {
    flex: 1,
    gap: 8,
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
  itemBottomRow: {
    flexDirection: 'row',
    gap: 8,
  },
  qtyInput: {
    flex: 1,
  },
  unitInput: {
    flex: 1,
  },
  removeBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
});
