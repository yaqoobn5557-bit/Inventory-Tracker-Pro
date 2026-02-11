import React, { useState, useRef } from 'react';
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
import { CameraView, useCameraPermissions } from 'expo-camera';
import Colors from '@/constants/colors';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface POItem {
  id: string;
  barcode: string;
  quantity: string;
}

export default function POmakerScreen() {
  const insets = useSafeAreaInsets();
  const webTopInset = Platform.OS === 'web' ? 67 : 0;
  const webBottomInset = Platform.OS === 'web' ? 34 : 0;

  const [permission, requestPermission] = useCameraPermissions();
  const [scannerOpen, setScannerOpen] = useState(false);
  const [items, setItems] = useState<POItem[]>([]);
  const [manualBarcode, setManualBarcode] = useState('');
  const lastScannedRef = useRef('');

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    if (data === lastScannedRef.current) return;
    lastScannedRef.current = data;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const existing = items.find(i => i.barcode === data);
    if (existing) {
      setItems(prev => prev.map(i =>
        i.barcode === data
          ? { ...i, quantity: String(parseInt(i.quantity || '0') + 1) }
          : i
      ));
    } else {
      setItems(prev => [...prev, {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        barcode: data,
        quantity: '1',
      }]);
    }

    setScannerOpen(false);
    setTimeout(() => { lastScannedRef.current = ''; }, 2000);
  };

  const addManualBarcode = () => {
    if (!manualBarcode.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const existing = items.find(i => i.barcode === manualBarcode.trim());
    if (existing) {
      setItems(prev => prev.map(i =>
        i.barcode === manualBarcode.trim()
          ? { ...i, quantity: String(parseInt(i.quantity || '0') + 1) }
          : i
      ));
    } else {
      setItems(prev => [...prev, {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        barcode: manualBarcode.trim(),
        quantity: '1',
      }]);
    }
    setManualBarcode('');
  };

  const updateQty = (id: string, value: string) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, quantity: value } : i));
  };

  const removeItem = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const openScanner = async () => {
    if (Platform.OS === 'web') {
      Alert.alert('Not Available', 'Scanner is not available on web. Use manual entry.');
      return;
    }
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert('Permission Required', 'Camera permission is needed for scanning');
        return;
      }
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setScannerOpen(true);
  };

  const handleSave = async () => {
    if (items.length === 0) {
      Alert.alert('No Items', 'Please scan or add at least one item');
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      const existing = await AsyncStorage.getItem('po_orders');
      const orders = existing ? JSON.parse(existing) : [];
      orders.push({
        id: Date.now().toString(),
        items,
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

  if (scannerOpen) {
    return (
      <View style={styles.scannerContainer}>
        <CameraView
          style={StyleSheet.absoluteFill}
          barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39', 'qr'] }}
          onBarcodeScanned={handleBarcodeScanned}
        />
        <View style={[styles.scannerOverlay, { paddingTop: insets.top + webTopInset + 12 }]}>
          <Pressable onPress={() => setScannerOpen(false)} style={styles.scannerCloseBtn}>
            <Ionicons name="close" size={28} color={Colors.white} />
          </Pressable>
        </View>
        <View style={styles.scannerFrame}>
          <View style={styles.scannerCornerTL} />
          <View style={styles.scannerCornerTR} />
          <View style={styles.scannerCornerBL} />
          <View style={styles.scannerCornerBR} />
        </View>
        <View style={styles.scannerBottomLabel}>
          <Text style={styles.scannerText}>Point camera at barcode</Text>
        </View>
      </View>
    );
  }

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
        <View style={styles.scanCard}>
          <Pressable
            onPress={openScanner}
            style={({ pressed }) => [styles.scanButton, pressed && styles.scanButtonPressed]}
          >
            <LinearGradient
              colors={['#6366F1', '#818CF8']}
              style={styles.scanButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="scan-outline" size={36} color={Colors.white} />
              <Text style={styles.scanButtonText}>Scan Barcode</Text>
            </LinearGradient>
          </Pressable>

          <View style={styles.orDivider}>
            <View style={styles.dividerLine} />
            <Text style={styles.orText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.manualRow}>
            <TextInput
              style={styles.manualInput}
              placeholder="Enter barcode manually"
              placeholderTextColor={Colors.grayLight}
              value={manualBarcode}
              onChangeText={setManualBarcode}
              keyboardType="default"
              onSubmitEditing={addManualBarcode}
              returnKeyType="done"
            />
            <Pressable onPress={addManualBarcode} style={styles.manualAddBtn}>
              <Ionicons name="add" size={22} color={Colors.white} />
            </Pressable>
          </View>
        </View>

        {items.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Scanned Items ({items.length})</Text>

            {items.map((item, index) => (
              <View key={item.id} style={styles.itemRow}>
                <View style={styles.itemLeft}>
                  <View style={styles.itemNumber}>
                    <Text style={styles.itemNumberText}>{index + 1}</Text>
                  </View>
                  <View style={styles.itemInfo}>
                    <View style={styles.barcodeRow}>
                      <Ionicons name="barcode-outline" size={16} color="#6366F1" />
                      <Text style={styles.barcodeText}>{item.barcode}</Text>
                    </View>
                  </View>
                </View>
                <View style={styles.itemRight}>
                  <View style={styles.qtyBox}>
                    <Text style={styles.qtyLabel}>QTY</Text>
                    <TextInput
                      style={styles.qtyInput}
                      value={item.quantity}
                      onChangeText={(v) => updateQty(item.id, v)}
                      keyboardType="numeric"
                      textAlign="center"
                    />
                  </View>
                  <Pressable onPress={() => removeItem(item.id)} style={styles.removeBtn}>
                    <Ionicons name="trash-outline" size={18} color={Colors.danger} />
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        )}

        {items.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="barcode-outline" size={48} color={Colors.grayLight} />
            <Text style={styles.emptyTitle}>No items scanned</Text>
            <Text style={styles.emptySub}>Scan a barcode or enter manually</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const CORNER_SIZE = 24;
const CORNER_WIDTH = 3;

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
  scanCard: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 20,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 3,
  },
  scanButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  scanButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  scanButtonGradient: {
    paddingVertical: 32,
    alignItems: 'center',
    gap: 10,
  },
  scanButtonText: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: Colors.white,
  },
  orDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.offWhite,
  },
  orText: {
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
    color: Colors.gray,
  },
  manualRow: {
    flexDirection: 'row',
    gap: 10,
  },
  manualInput: {
    flex: 1,
    backgroundColor: Colors.inputBg,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    fontFamily: 'Poppins_400Regular',
    color: Colors.primary,
  },
  manualAddBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 20,
    gap: 12,
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
    marginBottom: 4,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.offWhite,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
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
  itemInfo: {
    flex: 1,
  },
  barcodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  barcodeText: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    color: Colors.primary,
  },
  itemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  qtyBox: {
    alignItems: 'center',
    gap: 2,
  },
  qtyLabel: {
    fontSize: 9,
    fontFamily: 'Poppins_600SemiBold',
    color: Colors.gray,
    letterSpacing: 1,
  },
  qtyInput: {
    width: 56,
    backgroundColor: Colors.inputBg,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 8,
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: Colors.primary,
  },
  removeBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: Colors.grayDark,
  },
  emptySub: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    color: Colors.gray,
  },
  scannerContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  scannerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  scannerCloseBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannerFrame: {
    position: 'absolute',
    top: '30%',
    left: '15%',
    right: '15%',
    height: 200,
  },
  scannerCornerTL: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderTopWidth: CORNER_WIDTH,
    borderLeftWidth: CORNER_WIDTH,
    borderColor: Colors.accent,
  },
  scannerCornerTR: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderTopWidth: CORNER_WIDTH,
    borderRightWidth: CORNER_WIDTH,
    borderColor: Colors.accent,
  },
  scannerCornerBL: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderBottomWidth: CORNER_WIDTH,
    borderLeftWidth: CORNER_WIDTH,
    borderColor: Colors.accent,
  },
  scannerCornerBR: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderBottomWidth: CORNER_WIDTH,
    borderRightWidth: CORNER_WIDTH,
    borderColor: Colors.accent,
  },
  scannerBottomLabel: {
    position: 'absolute',
    bottom: '20%',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  scannerText: {
    fontSize: 16,
    fontFamily: 'Poppins_500Medium',
    color: Colors.white,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    overflow: 'hidden',
  },
});
