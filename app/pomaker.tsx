import React, { useState, useRef, useCallback } from 'react';
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
import { useSettings } from '@/lib/settings-context';
import translations from '@/constants/translations';
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
  const { colors, language } = useSettings();
  const t = translations[language];
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
        if (!fromScanner) { setManualBarcode(''); barcodeInputRef.current?.focus(); }
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

  const handleBarcodeScanned = ({ type, data }: { type: string; data: string }) => {
    if (data === lastScannedRef.current) return;
    lastScannedRef.current = data;
    setTimeout(() => { lastScannedRef.current = ''; }, 2000);
    if (type !== 'code128') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert('Unsupported Barcode', `Only Code 128 barcodes are supported.\nDetected: ${type.toUpperCase()}`, [{ text: 'OK' }]);
      return;
    }
    setScannerOpen(false);
    processBarcode(data, true);
  };

  const openScanner = async () => {
    if (Platform.OS === 'web') { Alert.alert('Not Available', 'Camera scanner is not available on web. Use manual entry.'); return; }
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) { Alert.alert('Permission Required', 'Camera permission is needed for scanning'); return; }
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
    if (items.length === 0) { Alert.alert('No Items', 'Please scan or add at least one item first.'); return; }
    Alert.alert('Submit & Start New', `Save ${items.length} item(s) to history and start a fresh entry?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Submit',
        onPress: async () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          try {
            const existing = await AsyncStorage.getItem('po_history');
            const history = existing ? JSON.parse(existing) : [];
            history.unshift({ id: genId(), items: [...items], totalItems: items.length, totalQty: items.reduce((s, i) => s + (parseInt(i.quantity) || 0), 0), createdAt: new Date().toISOString() });
            await AsyncStorage.setItem('po_history', JSON.stringify(history));
            setItems([]); setManualBarcode(''); barcodeInputRef.current?.focus();
            Alert.alert('Saved', 'Entry saved to history. Ready for next PO.');
          } catch { Alert.alert('Error', 'Failed to save entry.'); }
        },
      },
    ]);
  };

  if (scannerOpen) {
    return (
      <View style={s.scannerContainer}>
        <CameraView style={StyleSheet.absoluteFill} barcodeScannerSettings={{ barcodeTypes: ['code128'] }} onBarcodeScanned={handleBarcodeScanned} />
        <View style={[s.scannerOverlay, { paddingTop: insets.top + webTopInset + 12 }]}>
          <Pressable onPress={() => setScannerOpen(false)} style={s.scannerCloseBtn}>
            <Ionicons name="close" size={24} color={Colors.white} />
          </Pressable>
          <View style={s.scannerLabelTop}>
            <MaterialCommunityIcons name="barcode-scan" size={14} color="#FBBF24" />
            <Text style={s.scannerLabelTopText}>{t.code128_only.toUpperCase()}</Text>
          </View>
        </View>
        <View style={s.scannerFrame}>
          <View style={[s.corner, s.cornerTL]} /><View style={[s.corner, s.cornerTR]} />
          <View style={[s.corner, s.cornerBL]} /><View style={[s.corner, s.cornerBR]} />
          <View style={s.scanLine} />
        </View>
        <View style={s.scannerBottom}>
          <Text style={s.scannerHint}>{t.point_camera}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[s.container, { backgroundColor: colors.bg }]}>
      <LinearGradient colors={['#4F46E5', '#6366F1']} style={s.header} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
        <View style={[s.headerContent, { paddingTop: insets.top + webTopInset + 12 }]}>
          <Pressable onPress={() => router.back()} style={s.headerBtn}>
            <Ionicons name="arrow-back" size={20} color={Colors.white} />
          </Pressable>
          <View style={s.headerCenter}>
            <MaterialCommunityIcons name="file-document-edit-outline" size={16} color="rgba(255,255,255,0.8)" />
            <Text style={s.headerTitle}>{t.pomaker}</Text>
          </View>
          <View style={s.headerItemCount}>
            <Text style={s.headerItemCountText}>{items.length}</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView style={s.scroll} contentContainerStyle={[s.scrollContent, { paddingBottom: insets.bottom + webBottomInset + 24 }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={[s.inputCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Pressable onPress={openScanner} style={s.scanBtn}>
            <LinearGradient colors={['#4F46E5', '#6366F1']} style={s.scanBtnGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <Ionicons name="scan" size={28} color={Colors.white} />
              <Text style={s.scanBtnText}>{t.tap_to_scan}</Text>
              <Text style={s.scanBtnSub}>{t.code128_only}</Text>
            </LinearGradient>
          </Pressable>

          <View style={s.divider}>
            <View style={[s.dividerLine, { backgroundColor: colors.divider }]} />
            <Text style={[s.dividerText, { color: colors.subtext }]}>{t.or_manual}</Text>
            <View style={[s.dividerLine, { backgroundColor: colors.divider }]} />
          </View>

          <Animated.View style={[s.manualRow, { transform: [{ translateX: shakeAnim }] }]}>
            <TextInput
              ref={barcodeInputRef}
              style={[s.manualInput, { backgroundColor: colors.inputBg, color: colors.text }]}
              placeholder="Barcode"
              placeholderTextColor={Colors.grayLight}
              value={manualBarcode}
              onChangeText={setManualBarcode}
              autoFocus
              returnKeyType="done"
              blurOnSubmit={false}
              onSubmitEditing={() => processBarcode(manualBarcode)}
            />
            <Pressable onPress={() => processBarcode(manualBarcode)} style={s.manualAddBtn}>
              <Ionicons name="add" size={22} color={Colors.white} />
            </Pressable>
          </Animated.View>
          <Text style={[s.physicalHint, { color: colors.subtext }]}>{t.physical_hint}</Text>
        </View>

        {items.length > 0 && (
          <View style={[s.listCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={s.listHeader}>
              <Text style={[s.listTitle, { color: colors.text }]}>{t.scanned_items}</Text>
              <View style={s.listBadge}><Text style={s.listBadgeText}>{items.length}</Text></View>
            </View>
            {items.map((item, index) => {
              const isDup = duplicateId === item.id;
              const isNew = lastAddedId === item.id;
              return (
                <View key={item.id} style={[s.itemRow, { borderTopColor: colors.divider }, isDup && s.itemRowDuplicate, isNew && s.itemRowNew]}>
                  <View style={s.itemLeft}>
                    <View style={[s.itemIndex, { backgroundColor: colors.inputBg }, isDup && s.itemIndexDup]}>
                      {isDup ? <Ionicons name="warning" size={13} color={Colors.danger} /> : <Text style={[s.itemIndexText, { color: colors.subtext }]}>{index + 1}</Text>}
                    </View>
                    <View style={s.itemInfo}>
                      <View style={s.barcodeRow}>
                        <Ionicons name="barcode-outline" size={15} color={isDup ? Colors.danger : '#6366F1'} />
                        <Text style={[s.barcodeText, { color: isDup ? Colors.danger : colors.text }]} numberOfLines={1}>{item.barcode}</Text>
                      </View>
                      {isDup && <Text style={s.duplicateLabel}>DUPLICATE</Text>}
                    </View>
                  </View>
                  <View style={s.itemRight}>
                    <View style={s.qtyBox}>
                      <Text style={[s.qtyLabel, { color: colors.subtext }]}>QTY</Text>
                      <TextInput
                        style={[s.qtyInput, { backgroundColor: colors.inputBg, color: colors.text }]}
                        value={item.quantity}
                        onChangeText={v => updateQty(item.id, v)}
                        keyboardType="numeric"
                        textAlign="center"
                        onBlur={() => barcodeInputRef.current?.focus()}
                      />
                    </View>
                    <Pressable onPress={() => removeItem(item.id)} style={s.removeBtn}>
                      <Ionicons name="trash-outline" size={16} color={Colors.danger} />
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {!!duplicateId && (
          <View style={s.dupAlert}>
            <Ionicons name="alert-circle" size={16} color={Colors.danger} />
            <Text style={s.dupAlertText}>Duplicate barcode — already in list</Text>
          </View>
        )}

        {items.length === 0 && (
          <View style={s.empty}>
            <MaterialCommunityIcons name="barcode-scan" size={52} color={Colors.grayLight} />
            <Text style={[s.emptyTitle, { color: colors.subtext }]}>{t.no_items}</Text>
            <Text style={[s.emptySub, { color: colors.subtext }]}>{t.no_items_sub}</Text>
          </View>
        )}

        {items.length > 0 && (
          <Pressable onPress={handleFinalSubmit} style={s.submitBtn}>
            <LinearGradient colors={['#4F46E5', '#6366F1']} style={s.submitGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              <Ionicons name="checkmark-circle" size={22} color={Colors.white} />
              <Text style={s.submitText}>{t.final_submit}  ·  {items.length} item{items.length !== 1 ? 's' : ''}</Text>
            </LinearGradient>
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}

const CORNER = 22, CW = 3;

const s = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingBottom: 18 },
  headerContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18 },
  headerBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 17, fontFamily: 'Poppins_700Bold', color: Colors.white, letterSpacing: 2 },
  headerItemCount: { minWidth: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 8 },
  headerItemCountText: { fontSize: 16, fontFamily: 'Poppins_700Bold', color: Colors.white },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 14 },
  inputCard: { borderRadius: 20, padding: 18, gap: 14, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 3 },
  scanBtn: { borderRadius: 16, overflow: 'hidden' },
  scanBtnGradient: { paddingVertical: 16, alignItems: 'center', gap: 5 },
  scanBtnText: { fontSize: 16, fontFamily: 'Poppins_700Bold', color: Colors.white, letterSpacing: 0.5 },
  scanBtnSub: { fontSize: 11, fontFamily: 'Poppins_400Regular', color: 'rgba(255,255,255,0.65)' },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontSize: 9, fontFamily: 'Poppins_600SemiBold', letterSpacing: 0.8, textAlign: 'center' },
  manualRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  manualInput: { flex: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, fontSize: 14, fontFamily: 'Poppins_400Regular', minWidth: 0 },
  manualAddBtn: { width: 46, height: 46, borderRadius: 12, backgroundColor: '#6366F1', justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  physicalHint: { fontSize: 11, fontFamily: 'Poppins_400Regular', textAlign: 'center', marginTop: -6 },
  listCard: { borderRadius: 20, padding: 18, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 3 },
  listHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  listTitle: { fontSize: 14, fontFamily: 'Poppins_700Bold' },
  listBadge: { backgroundColor: '#6366F1', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  listBadgeText: { fontSize: 12, fontFamily: 'Poppins_700Bold', color: Colors.white },
  itemRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderTopWidth: 1 },
  itemRowDuplicate: { backgroundColor: 'rgba(239,68,68,0.04)', borderRadius: 10, paddingHorizontal: 6, marginHorizontal: -6 },
  itemRowNew: { backgroundColor: 'rgba(99,102,241,0.05)', borderRadius: 10, paddingHorizontal: 6, marginHorizontal: -6 },
  itemLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 },
  itemIndex: { width: 28, height: 28, borderRadius: 8, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  itemIndexDup: { backgroundColor: 'rgba(239,68,68,0.1)' },
  itemIndexText: { fontSize: 11, fontFamily: 'Poppins_600SemiBold' },
  itemInfo: { flex: 1, minWidth: 0 },
  barcodeRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  barcodeText: { fontSize: 13, fontFamily: 'Poppins_500Medium', flexShrink: 1 },
  duplicateLabel: { fontSize: 10, fontFamily: 'Poppins_700Bold', color: Colors.danger, letterSpacing: 1, marginTop: 2 },
  itemRight: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 0 },
  qtyBox: { alignItems: 'center', gap: 4 },
  qtyLabel: { fontSize: 9, fontFamily: 'Poppins_700Bold', letterSpacing: 1.2, textAlign: 'center' },
  qtyInput: { width: 68, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 8, fontSize: 16, fontFamily: 'Poppins_700Bold', textAlign: 'center', textAlignVertical: 'center' },
  removeBtn: { width: 32, height: 32, borderRadius: 9, backgroundColor: 'rgba(239,68,68,0.08)', justifyContent: 'center', alignItems: 'center' },
  dupAlert: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(239,68,68,0.08)', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)' },
  dupAlertText: { fontSize: 13, fontFamily: 'Poppins_600SemiBold', color: Colors.danger },
  empty: { alignItems: 'center', paddingVertical: 48, gap: 8 },
  emptyTitle: { fontSize: 16, fontFamily: 'Poppins_600SemiBold' },
  emptySub: { fontSize: 13, fontFamily: 'Poppins_400Regular', textAlign: 'center' },
  submitBtn: { borderRadius: 16, overflow: 'hidden', shadowColor: '#6366F1', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6 },
  submitGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 18, gap: 10 },
  submitText: { fontSize: 15, fontFamily: 'Poppins_700Bold', color: Colors.white, letterSpacing: 0.5 },
  scannerContainer: { flex: 1, backgroundColor: '#000' },
  scannerOverlay: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingBottom: 12 },
  scannerCloseBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  scannerLabelTop: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  scannerLabelTopText: { fontSize: 11, fontFamily: 'Poppins_700Bold', color: '#FBBF24', letterSpacing: 1 },
  scannerFrame: { position: 'absolute', top: '50%', left: '50%', width: 260, height: 160, marginLeft: -130, marginTop: -80 },
  corner: { position: 'absolute', width: CORNER, height: CORNER, borderColor: Colors.white },
  cornerTL: { top: 0, left: 0, borderTopWidth: CW, borderLeftWidth: CW, borderTopLeftRadius: 6 },
  cornerTR: { top: 0, right: 0, borderTopWidth: CW, borderRightWidth: CW, borderTopRightRadius: 6 },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: CW, borderLeftWidth: CW, borderBottomLeftRadius: 6 },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: CW, borderRightWidth: CW, borderBottomRightRadius: 6 },
  scanLine: { position: 'absolute', top: '50%', left: 10, right: 10, height: 2, backgroundColor: Colors.accent, opacity: 0.8 },
  scannerBottom: { position: 'absolute', bottom: 80, left: 0, right: 0, alignItems: 'center' },
  scannerHint: { fontSize: 14, fontFamily: 'Poppins_500Medium', color: Colors.white, backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
});
