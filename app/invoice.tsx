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

interface InvoiceItem {
  id: string;
  description: string;
  quantity: string;
  price: string;
}

export default function InvoiceScreen() {
  const insets = useSafeAreaInsets();
  const webTopInset = Platform.OS === 'web' ? 67 : 0;
  const webBottomInset = Platform.OS === 'web' ? 34 : 0;

  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [vendorName, setVendorName] = useState('');
  const [items, setItems] = useState<InvoiceItem[]>([
    { id: Date.now().toString(), description: '', quantity: '', price: '' },
  ]);

  const addItem = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setItems(prev => [...prev, {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      description: '',
      quantity: '',
      price: '',
    }]);
  };

  const removeItem = (id: string) => {
    if (items.length <= 1) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const updateItem = (id: string, field: keyof InvoiceItem, value: string) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, [field]: value } : i));
  };

  const getTotal = () => {
    return items.reduce((sum, item) => {
      const qty = parseFloat(item.quantity) || 0;
      const price = parseFloat(item.price) || 0;
      return sum + (qty * price);
    }, 0).toFixed(2);
  };

  const handleSave = async () => {
    if (!invoiceNumber.trim() || !vendorName.trim()) {
      Alert.alert('Missing Info', 'Please fill in invoice number and vendor name');
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      const existing = await AsyncStorage.getItem('invoices');
      const invoices = existing ? JSON.parse(existing) : [];
      invoices.push({
        id: Date.now().toString(),
        invoiceNumber,
        vendorName,
        items: items.filter(i => i.description.trim()),
        total: getTotal(),
        createdAt: new Date().toISOString(),
      });
      await AsyncStorage.setItem('invoices', JSON.stringify(invoices));
      Alert.alert('Success', 'Invoice saved successfully', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e) {
      Alert.alert('Error', 'Failed to save invoice');
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#10B981', '#34D399']}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={[styles.headerContent, { paddingTop: insets.top + webTopInset + 12 }]}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={Colors.white} />
          </Pressable>
          <Text style={styles.headerTitle}>INVOICE</Text>
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
          <Text style={styles.cardTitle}>Invoice Details</Text>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Invoice Number</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter invoice number"
              placeholderTextColor={Colors.grayLight}
              value={invoiceNumber}
              onChangeText={setInvoiceNumber}
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Vendor Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter vendor name"
              placeholderTextColor={Colors.grayLight}
              value={vendorName}
              onChangeText={setVendorName}
            />
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>Line Items</Text>
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
                  placeholder="Description"
                  placeholderTextColor={Colors.grayLight}
                  value={item.description}
                  onChangeText={(v) => updateItem(item.id, 'description', v)}
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
                    style={[styles.itemInput, styles.priceInput]}
                    placeholder="Price"
                    placeholderTextColor={Colors.grayLight}
                    value={item.price}
                    onChangeText={(v) => updateItem(item.id, 'price', v)}
                    keyboardType="numeric"
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

        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>TOTAL</Text>
          <Text style={styles.totalAmount}>{getTotal()} SAR</Text>
        </View>

        <View style={styles.returnSlipCard}>
          <View style={styles.returnSlipIconRow}>
            <Ionicons name="document-text-outline" size={22} color="#F59E0B" />
            <Text style={styles.returnSlipTitle}>RETURN SLIP AND CREDIT NOTE</Text>
          </View>
          <Text style={styles.returnSlipSub}>
            This invoice is subject to return slip and credit note policies
          </Text>
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
    backgroundColor: '#10B981',
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
  priceInput: {
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
  totalCard: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 3,
  },
  totalLabel: {
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
    color: Colors.gray,
    letterSpacing: 2,
  },
  totalAmount: {
    fontSize: 24,
    fontFamily: 'Poppins_700Bold',
    color: '#10B981',
  },
  returnSlipCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 20,
    padding: 20,
    gap: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  returnSlipIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  returnSlipTitle: {
    fontSize: 14,
    fontFamily: 'Poppins_700Bold',
    color: '#92400E',
    letterSpacing: 0.5,
  },
  returnSlipSub: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    color: '#A16207',
    paddingLeft: 32,
  },
});
