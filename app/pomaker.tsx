import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  Platform,
  Alert,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { CameraView, useCameraPermissions } from 'expo-camera';
import Colors from '@/constants/colors';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

function genId() {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

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
  const [duplicateId, setDuplicateId] = useState<string | null>(null);
  const [lastAddedId, setLastAddedId] = useState<string | null>(null);

  const barcodeInputRef = useRef<TextInput>(null);
  const lastScannedRef = useRef('');
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const triggerShake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -6, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const processBarcode = useCallback(
    (raw: string, fromScanner = false) => {
      const code = raw.trim();
      if (!code) return;

      const duplicate = items.find(i => i.barcode === code);
      if (duplicate) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setDuplicateId(duplicate.id);
        triggerShake();
        setTimeout(() => setDuplicateId(null), 2500);
        if (!fromScanner) {
          setManualBarcode('');
          barcodeInputRef.current?.focus();
        }
        return;
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const newId = genId();
      setItems(prev => [...prev, { id: newId, barcode: code, quantity: '1' }]);
      setLastAddedId(newId);
      setTimeout(() => setLastAddedId(null), 1500);
      setManualBarcode('');
      barcodeInputRef.current?.focus();
    },
    [items]
  );

  const handleBarcodeScanned = ({
    type,
    data,
  }: {
    type: string;
    data: string;
  }) => {
    if (data === lastScannedRef.current) return;
    lastScannedRef.current = data;
    setTimeout(() => { lastScannedRef.current = ''; }, 2000);

    if (type !== 'code128') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert(
        'Unsupported Barcode',
        `Only Code 128 barcodes are supported.\nDetected: ${type.toUpperCase()}`,
        [{ text: 'OK' }]
      );
      return;
    }

    setScannerOpen(false);
    processBarcode(data, true);
  };

  const openScanner = async () => {
    if (Platform.OS === 'web') {
      Alert.alert('Not Available', 'Camera scanner is not available on web. Use manual entry.');
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

  const updateQty = (id: string, value: string) => {
    setItems(prev => prev.map(i => (i.id === id ? { ...i, quantity: value } : i)));
  };

  const removeItem = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const handleFinalSubmit = async () => {
    if (items.length === 0) {
      Alert.alert('No Items', 'Please scan or add at least one item first.');
      return;
    }

    Alert.alert(
      'Submit & Start New',
      `Save ${items.length} item(s) to history and start a fresh entry?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit',
          onPress: async () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            try {
              const existing = await AsyncStorage.getItem('po_history');
              const history = existing ? JSON.parse(existing) : [];
              history.unshift({
                id: genId(),
                items: [...items],
                totalItems: items.length,
                totalQty: items.reduce((s, i) => s + (parseInt(i.quantity) || 0), 0),
                createdAt: new Date().toISOString(),
              });
              await AsyncStorage.setItem('po_history', JSON.stringify(history));
              setItems([]);
              setManualBarcode('');
              barcodeInputRef.current?.focus();
              Alert.alert('Saved', 'Entry saved to history. Ready for next PO.');
            } catch {
              Alert.alert('Error', 'Failed to save entry.');
            }
          },
        },
      ]
    );
  };

  if (scannerOpen) {
    return (
      <View style={styles.scannerContainer}>
        <CameraView
          style={StyleSheet.absoluteFill}
          barcodeScannerSettings={{ barcodeTypes: ['code128'] }}
          onBarcodeScanned={handleBarcodeScanned}
        />
        <View
          style={[
            styles.scannerOverlay,
            { paddingTop: insets.top + webTopInset + 12 },
          ]}
        >
          <Pressable
            onPress={() => setScannerOpen(false)}
            style={styles.scannerCloseBtn}
          >
            <Ionicons name="close" size={24} color={Colors.white} />
          </Pressable>
          <View style={styles.scannerLabelTop}>
            <MaterialCommunityIcons name="barcode-scan" size={14} color="#FBBF24" />
            <Text style={styles.scannerLabelTopText}>CODE 128 ONLY</Text>
          </View>
        </View>

        <View style={styles.scannerFrame}>
          <View style={[styles.corner, styles.cornerTL]} />
          <View style={[styles.corner, styles.cornerTR]} />
          <View style={[styles.corner, styles.cornerBL]} />
          <View style={[styles.corner, styles.cornerBR]} />
          <View style={styles.scanLine} />
        </View>

        <View style={styles.scannerBottom}>
          <Text style={styles.scannerHint}>Point camera at a Code 128 barcode</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#4F46E5', '#6366F1']}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <View
          style={[
            styles.headerContent,
            { paddingTop: insets.top + webTopInset + 12 },
          ]}
        >
          <Pressable onPress={() => router.back()} style={styles.headerBtn}>
            <Ionicons name="arrow-back" size={20} color={Colors.white} />
          </Pressable>
          <View style={styles.headerCenter}>
            <MaterialCommunityIcons
              name="file-document-edit-outline"
              size={16}
              color="rgba(255,255,255,0.8)"
            />
            <Text style={styles.headerTitle}>POMAKER</Text>
          </View>
          <View style={styles.headerItemCount}>
            <Text style={styles.headerItemCountText}>{items.length}</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + webBottomInset + 24 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.inputCard}>
          <Pressable onPress={openScanner} style={styles.scanBtn}>
            <LinearGradient
              colors={['#4F46E5', '#6366F1']}
              style={styles.scanBtnGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="scan" size={28} color={Colors.white} />
              <Text style={styles.scanBtnText}>Tap to Scan</Text>
              <Text style={styles.scanBtnSub}>Code 128 barcodes only</Text>
            </LinearGradient>
          </Pressable>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR TYPE / USE PHYSICAL SCANNER</Text>
            <View style={styles.dividerLine} />
          </View>

          <Animated.View
            style={[
              styles.manualRow,
              { transform: [{ translateX: shakeAnim }] },
            ]}
          >
            <TextInput
              ref={barcodeInputRef}
              style={styles.manualInput}
              placeholder="Barcode"
              placeholderTextColor={Colors.grayLight}
              value={manualBarcode}
              onChangeText={setManualBarcode}
              autoFocus
              returnKeyType="done"
              blurOnSubmit={false}
              onSubmitEditing={() => processBarcode(manualBarcode)}
            />
            <Pressable
              onPress={() => processBarcode(manualBarcode)}
              style={styles.manualAddBtn}
            >
              <Ionicons name="add" size={22} color={Colors.white} />
            </Pressable>
          </Animated.View>
          <Text style={styles.physicalHint}>
            Physical scanner? Just scan — barcode auto-fills here
          </Text>
        </View>

        {items.length > 0 && (
          <View style={styles.listCard}>
            <View style={styles.listHeader}>
              <Text style={styles.listTitle}>
                Scanned Items
              </Text>
              <View style={styles.listBadge}>
                <Text style={styles.listBadgeText}>{items.length}</Text>
              </View>
            </View>

            {items.map((item, index) => {
              const isDup = duplicateId === item.id;
              const isNew = lastAddedId === item.id;
              return (
                <View
                  key={item.id}
                  style={[
                    styles.itemRow,
                    isDup && styles.itemRowDuplicate,
                    isNew && styles.itemRowNew,
                  ]}
                >
                  <View style={styles.itemLeft}>
                    <View style={[styles.itemIndex, isDup && styles.itemIndexDup]}>
                      {isDup ? (
                        <Ionicons name="warning" size={13} color={Colors.danger} />
                      ) : (
                        <Text style={styles.itemIndexText}>{index + 1}</Text>
                      )}
                    </View>
                    <View style={styles.itemInfo}>
                      <View style={styles.barcodeRow}>
                        <Ionicons
                          name="barcode-outline"
                          size={15}
                          color={isDup ? Colors.danger : '#6366F1'}
                        />
                        <Text
                          style={[
                            styles.barcodeText,
                            isDup && { color: Colors.danger },
                          ]}
                          numberOfLines={1}
                        >
                          {item.barcode}
                        </Text>
                      </View>
                      {isDup && (
                        <Text style={styles.duplicateLabel}>DUPLICATE</Text>
                      )}
                    </View>
                  </View>

                  <View style={styles.itemRight}>
                    <View style={styles.qtyBox}>
                      <Text style={styles.qtyLabel}>QTY</Text>
                      <TextInput
                        style={styles.qtyInput}
                        value={item.quantity}
                        onChangeText={v => updateQty(item.id, v)}
                        keyboardType="numeric"
                        textAlign="center"
                        onBlur={() => barcodeInputRef.current?.focus()}
                      />
                    </View>
                    <Pressable
                      onPress={() => removeItem(item.id)}
                      style={styles.removeBtn}
                    >
                      <Ionicons name="trash-outline" size={16} color={Colors.danger} />
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {duplicateId && (
          <View style={styles.dupAlert}>
            <Ionicons name="alert-circle" size={16} color={Colors.danger} />
            <Text style={styles.dupAlertText}>
              Duplicate barcode — already in list
            </Text>
          </View>
        )}

        {items.length === 0 && (
          <View style={styles.empty}>
            <MaterialCommunityIcons
              name="barcode-scan"
              size={52}
              color={Colors.grayLight}
            />
            <Text style={styles.emptyTitle}>No items yet</Text>
            <Text style={styles.emptySub}>
              Scan or type a Code 128 barcode above
            </Text>
          </View>
        )}

        {items.length > 0 && (
          <Pressable onPress={handleFinalSubmit} style={styles.submitBtn}>
            <LinearGradient
              colors={['#4F46E5', '#6366F1']}
              style={styles.submitGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons name="checkmark-circle" size={22} color={Colors.white} />
              <Text style={styles.submitText}>
                Final Submit  ·  {items.length} item{items.length !== 1 ? 's' : ''}
              </Text>
            </LinearGradient>
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}

const CORNER = 22;
const CW = 3;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.offWhite },

  header: { paddingBottom: 18 },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: 'Poppins_700Bold',
    color: Colors.white,
    letterSpacing: 2,
  },
  headerItemCount: {
    minWidth: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  headerItemCountText: {
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
    color: Colors.white,
  },

  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 14 },

  inputCard: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 18,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },

  scanBtn: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  scanBtnGradient: {
    paddingVertical: 28,
    alignItems: 'center',
    gap: 6,
  },
  scanBtnText: {
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
    color: Colors.white,
    letterSpacing: 0.5,
  },
  scanBtnSub: {
    fontSize: 11,
    fontFamily: 'Poppins_400Regular',
    color: 'rgba(255,255,255,0.65)',
  },

  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.offWhite,
  },
  dividerText: {
    fontSize: 9,
    fontFamily: 'Poppins_600SemiBold',
    color: Colors.gray,
    letterSpacing: 0.8,
    textAlign: 'center',
  },

  manualRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  manualInput: {
    flex: 1,
    backgroundColor: Colors.offWhite,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: Colors.primary,
    minWidth: 0,
  },
  manualAddBtn: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  physicalHint: {
    fontSize: 11,
    fontFamily: 'Poppins_400Regular',
    color: Colors.gray,
    textAlign: 'center',
    marginTop: -6,
  },

  listCard: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 18,
    gap: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  listTitle: {
    fontSize: 14,
    fontFamily: 'Poppins_700Bold',
    color: Colors.primary,
  },
  listBadge: {
    backgroundColor: '#6366F1',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  listBadgeText: {
    fontSize: 12,
    fontFamily: 'Poppins_700Bold',
    color: Colors.white,
  },

  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.offWhite,
  },
  itemRowDuplicate: {
    backgroundColor: 'rgba(239,68,68,0.04)',
    borderRadius: 10,
    paddingHorizontal: 6,
    marginHorizontal: -6,
  },
  itemRowNew: {
    backgroundColor: 'rgba(99,102,241,0.05)',
    borderRadius: 10,
    paddingHorizontal: 6,
    marginHorizontal: -6,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  itemIndex: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: Colors.offWhite,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  itemIndexDup: {
    backgroundColor: 'rgba(239,68,68,0.1)',
  },
  itemIndexText: {
    fontSize: 11,
    fontFamily: 'Poppins_600SemiBold',
    color: Colors.gray,
  },
  itemInfo: {
    flex: 1,
    minWidth: 0,
  },
  barcodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  barcodeText: {
    fontSize: 13,
    fontFamily: 'Poppins_500Medium',
    color: Colors.primary,
    flexShrink: 1,
  },
  duplicateLabel: {
    fontSize: 10,
    fontFamily: 'Poppins_700Bold',
    color: Colors.danger,
    letterSpacing: 1,
    marginTop: 2,
  },

  itemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  qtyBox: { alignItems: 'center', gap: 4 },
  qtyLabel: {
    fontSize: 9,
    fontFamily: 'Poppins_700Bold',
    color: Colors.gray,
    letterSpacing: 1.2,
  },
  qtyInput: {
    width: 68,
    backgroundColor: Colors.offWhite,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 8,
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
    color: Colors.primary,
  },
  removeBtn: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: 'rgba(239,68,68,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  dupAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(239,68,68,0.08)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.2)',
  },
  dupAlertText: {
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
    color: Colors.danger,
  },

  empty: {
    alignItems: 'center',
    paddingVertical: 48,
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
    textAlign: 'center',
  },

  submitBtn: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  submitGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 10,
  },
  submitText: {
    fontSize: 15,
    fontFamily: 'Poppins_700Bold',
    color: Colors.white,
    letterSpacing: 0.5,
  },

  scannerContainer: { flex: 1, backgroundColor: '#000' },
  scannerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingBottom: 12,
  },
  scannerCloseBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannerLabelTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  scannerLabelTopText: {
    fontSize: 11,
    fontFamily: 'Poppins_700Bold',
    color: '#FBBF24',
    letterSpacing: 1,
  },
  scannerFrame: {
    position: 'absolute',
    top: '32%',
    left: '10%',
    right: '10%',
    height: 160,
  },
  corner: {
    position: 'absolute',
    width: CORNER,
    height: CORNER,
    borderColor: Colors.accent,
  },
  cornerTL: { top: 0, left: 0, borderTopWidth: CW, borderLeftWidth: CW },
  cornerTR: { top: 0, right: 0, borderTopWidth: CW, borderRightWidth: CW },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: CW, borderLeftWidth: CW },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: CW, borderRightWidth: CW },
  scanLine: {
    position: 'absolute',
    left: 12,
    right: 12,
    top: '50%',
    height: 2,
    backgroundColor: Colors.accent,
    opacity: 0.7,
  },
  scannerBottom: {
    position: 'absolute',
    bottom: '15%',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  scannerHint: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    color: Colors.white,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    overflow: 'hidden',
  },
});
