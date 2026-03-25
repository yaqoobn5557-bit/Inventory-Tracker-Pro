import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  Platform,
  Alert,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { CameraView, useCameraPermissions } from 'expo-camera';
import Colors from '@/constants/colors';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';

function genId() {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

type Policy = 'SUPPLIER' | 'DS' | 'DC' | 'UNKNOWN';
type Reason = 'Fresh ITEM' | 'Expired' | 'Damage Wrong Display' | 'Expired ITEM';
type DateFilter = 'today' | 'week' | 'all';

interface ItemData { name: string; sku: string; policy: Policy }

const ITEM_DB: Record<string, ItemData> = {
  '12345':   { name: 'Test Supplier', sku: 'SKU-12345',   policy: 'SUPPLIER' },
  '123456':  { name: 'Test DS',       sku: 'SKU-123456',  policy: 'DS'       },
  '1234567': { name: 'Test DC',       sku: 'SKU-1234567', policy: 'DC'       },
};

const POLICY_COLOR: Record<Policy, string> = {
  SUPPLIER: '#16A34A',
  DS:       '#7C3AED',
  DC:       '#EA580C',
  UNKNOWN:  '#2563EB',
};

const POLICY_BG: Record<Policy, string> = {
  SUPPLIER: 'rgba(22,163,74,0.15)',
  DS:       'rgba(124,58,237,0.15)',
  DC:       'rgba(234,88,12,0.15)',
  UNKNOWN:  'rgba(37,99,235,0.15)',
};

const POLICY_CARD_BG: Record<Policy, string> = {
  SUPPLIER: '#E8F5EE',
  DS:       '#F0EBFD',
  DC:       '#FDF0E8',
  UNKNOWN:  '#E8EFFE',
};

const POLICY_LABEL: Record<Policy, string> = {
  SUPPLIER: 'SUPPLIER',
  DS:       'DS',
  DC:       'DC',
  UNKNOWN:  'NEW ENTRY',
};

const REASONS: Reason[] = ['Fresh ITEM', 'Expired', 'Damage Wrong Display', 'Expired ITEM'];
const POLICIES: Policy[] = ['SUPPLIER', 'DS', 'DC'];

interface CurrentEntry {
  barcode: string;
  itemName: string;
  sku: string;
  policy: Policy;
  qty: string;
  reason: Reason | null;
  expiryDate: string;
  remainingDays: string;
  photos: string[];
  isNew: boolean;
}

interface HistoryItem {
  id: string;
  barcode: string;
  itemName: string;
  sku: string;
  policy: Policy;
  qty: string;
  reason: string;
  expiryDate: string;
  remainingDays: string;
  photoCount: number;
  createdAt: string;
}

function blankEntry(barcode: string, found: ItemData | null): CurrentEntry {
  return {
    barcode,
    itemName: found?.name ?? '',
    sku: found?.sku ?? '',
    policy: found?.policy ?? 'UNKNOWN',
    qty: '',
    reason: null,
    expiryDate: '',
    remainingDays: '',
    photos: [],
    isNew: !found,
  };
}

function isToday(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
}
function isThisWeek(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  return (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24) <= 7;
}
function fmtDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
    + ' · ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

export default function ExpiryDamageScreen() {
  const insets = useSafeAreaInsets();
  const webTopInset = Platform.OS === 'web' ? 67 : 0;
  const webBottomInset = Platform.OS === 'web' ? 34 : 0;

  const [permission, requestPermission] = useCameraPermissions();
  const [scannerOpen, setScannerOpen] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [entry, setEntry] = useState<CurrentEntry | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [dateFilter, setDateFilter] = useState<DateFilter>('today');
  const [isSaving, setIsSaving] = useState(false);

  const barcodeRef = useRef<TextInput>(null);
  const lastScannedRef = useRef('');

  useEffect(() => { loadHistory(); }, []);

  const loadHistory = async () => {
    try {
      const raw = await AsyncStorage.getItem('expiry_damage_history');
      if (raw) setHistory(JSON.parse(raw));
    } catch {}
  };

  const processBarcode = useCallback((code: string) => {
    const trimmed = code.trim();
    if (!trimmed) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const found = ITEM_DB[trimmed] ?? null;
    setEntry(blankEntry(trimmed, found));
    setBarcodeInput('');
  }, []);

  const handleBarcodeScanned = ({ type, data }: { type: string; data: string }) => {
    if (data === lastScannedRef.current) return;
    lastScannedRef.current = data;
    setTimeout(() => { lastScannedRef.current = ''; }, 2000);
    if (type !== 'code128') {
      Alert.alert('Unsupported Barcode', `Only Code 128 supported.\nDetected: ${type.toUpperCase()}`);
      return;
    }
    setScannerOpen(false);
    processBarcode(data);
  };

  const openScanner = async () => {
    if (Platform.OS === 'web') { Alert.alert('Not Available', 'Use manual entry on web.'); return; }
    if (!permission?.granted) {
      const r = await requestPermission();
      if (!r.granted) { Alert.alert('Permission Required', 'Camera permission needed.'); return; }
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setScannerOpen(true);
  };

  const updateEntry = (patch: Partial<CurrentEntry>) => {
    setEntry(prev => prev ? { ...prev, ...patch } : prev);
  };

  const pickPhotos = async () => {
    if (!entry) return;
    if (entry.photos.length >= 100) { Alert.alert('Limit', 'Max 100 photos.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.7,
    });
    if (!result.canceled) {
      const remaining = 100 - entry.photos.length;
      const newUris = result.assets.slice(0, remaining).map(a => a.uri);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      updateEntry({ photos: [...entry.photos, ...newUris] });
    }
  };

  const removePhoto = (uri: string) => {
    if (!entry) return;
    updateEntry({ photos: entry.photos.filter(p => p !== uri) });
  };

  const handleSubmit = async () => {
    if (!entry) return;
    if (!entry.qty.trim()) { Alert.alert('Missing', 'Please enter quantity.'); return; }
    const needsPhoto = entry.policy === 'DS' || entry.policy === 'DC';
    const needsReason = entry.policy === 'DS' || entry.policy === 'DC';
    if (needsPhoto && entry.photos.length === 0) {
      Alert.alert('Photo Required', 'Please add at least 1 photo for DS/DC items.'); return;
    }
    if (needsReason && !entry.reason) {
      Alert.alert('Reason Required', 'Please select a reason for DS/DC items.'); return;
    }
    setIsSaving(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      const newItem: HistoryItem = {
        id: genId(),
        barcode: entry.barcode,
        itemName: entry.itemName || entry.barcode,
        sku: entry.sku,
        policy: entry.policy,
        qty: entry.qty,
        reason: entry.reason ?? '',
        expiryDate: entry.expiryDate,
        remainingDays: entry.remainingDays,
        photoCount: entry.photos.length,
        createdAt: new Date().toISOString(),
      };
      const updated = [newItem, ...history];
      setHistory(updated);
      await AsyncStorage.setItem('expiry_damage_history', JSON.stringify(updated));
      setEntry(null);
      setTimeout(() => barcodeRef.current?.focus(), 100);
    } catch {
      Alert.alert('Error', 'Failed to save.');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredHistory = history.filter(h => {
    if (dateFilter === 'today') return isToday(h.createdAt);
    if (dateFilter === 'week') return isThisWeek(h.createdAt);
    return true;
  });

  if (scannerOpen) {
    return (
      <View style={styles.scannerContainer}>
        <CameraView
          style={StyleSheet.absoluteFill}
          barcodeScannerSettings={{ barcodeTypes: ['code128'] }}
          onBarcodeScanned={handleBarcodeScanned}
        />
        <View style={[styles.scannerTop, { paddingTop: insets.top + webTopInset + 10 }]}>
          <Pressable onPress={() => setScannerOpen(false)} style={styles.scannerClose}>
            <Ionicons name="close" size={24} color="#fff" />
          </Pressable>
          <View style={styles.scannerBadge}>
            <MaterialCommunityIcons name="barcode-scan" size={13} color="#FBBF24" />
            <Text style={styles.scannerBadgeText}>CODE 128 ONLY</Text>
          </View>
        </View>
        <View style={styles.scanFrame}>
          <View style={[styles.corner, styles.cTL]} />
          <View style={[styles.corner, styles.cTR]} />
          <View style={[styles.corner, styles.cBL]} />
          <View style={[styles.corner, styles.cBR]} />
          <View style={styles.scanLine} />
        </View>
        <View style={styles.scannerHintBox}>
          <Text style={styles.scannerHintText}>Point at Code 128 barcode</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#EF4444', '#DC2626']}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <View style={[styles.headerRow, { paddingTop: insets.top + webTopInset + 10 }]}>
          {entry ? (
            <Pressable onPress={() => setEntry(null)} style={styles.headerBtn}>
              <Ionicons name="close" size={22} color="#fff" />
            </Pressable>
          ) : (
            <Pressable onPress={() => router.back()} style={styles.headerBtn}>
              <Ionicons name="arrow-back" size={20} color="#fff" />
            </Pressable>
          )}
          <View style={styles.headerCenter}>
            <Ionicons name="alert-circle-outline" size={16} color="rgba(255,255,255,0.8)" />
            <Text style={styles.headerTitle}>
              {entry ? 'ITEM ENTRY' : 'EXPIRY / DAMAGE'}
            </Text>
          </View>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      {entry ? (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + webBottomInset + 32 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <EntryCard
            entry={entry}
            onChange={updateEntry}
            onPhotoPick={pickPhotos}
            onPhotoRemove={removePhoto}
            onSubmit={handleSubmit}
            isSaving={isSaving}
          />
        </ScrollView>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + webBottomInset + 24 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.scanInputCard}>
            <Pressable onPress={openScanner} style={styles.camBtn}>
              <LinearGradient colors={['#EF4444', '#F87171']} style={styles.camBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                <Ionicons name="scan" size={26} color="#fff" />
                <Text style={styles.camBtnText}>Tap to Scan</Text>
              </LinearGradient>
            </Pressable>
            <View style={styles.orRow}>
              <View style={styles.orLine} />
              <Text style={styles.orTxt}>OR ENTER / PHYSICAL SCANNER</Text>
              <View style={styles.orLine} />
            </View>
            <View style={styles.barcodeRow}>
              <TextInput
                ref={barcodeRef}
                style={styles.barcodeInput}
                placeholder="Scan or type barcode"
                placeholderTextColor={Colors.grayLight}
                value={barcodeInput}
                onChangeText={setBarcodeInput}
                autoFocus
                returnKeyType="done"
                blurOnSubmit={false}
                onSubmitEditing={() => processBarcode(barcodeInput)}
              />
              <Pressable onPress={() => processBarcode(barcodeInput)} style={styles.barcodeAddBtn}>
                <Ionicons name="arrow-forward" size={20} color="#fff" />
              </Pressable>
            </View>
          </View>

          <View style={styles.historySection}>
            <View style={styles.historyHeader}>
              <Text style={styles.historyTitle}>HISTORY</Text>
              <View style={styles.dateFilters}>
                {(['today', 'week', 'all'] as DateFilter[]).map(f => (
                  <Pressable
                    key={f}
                    onPress={() => setDateFilter(f)}
                    style={[styles.filterBtn, dateFilter === f && styles.filterBtnActive]}
                  >
                    <Text style={[styles.filterBtnText, dateFilter === f && styles.filterBtnTextActive]}>
                      {f === 'today' ? 'Today' : f === 'week' ? 'Week' : 'All'}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {filteredHistory.length === 0 ? (
              <View style={styles.historyEmpty}>
                <Ionicons name="time-outline" size={32} color={Colors.grayLight} />
                <Text style={styles.historyEmptyText}>No records for this period</Text>
              </View>
            ) : (
              filteredHistory.map(h => <HistoryCard key={h.id} item={h} />)
            )}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

function EntryCard({
  entry, onChange, onPhotoPick, onPhotoRemove, onSubmit, isSaving,
}: {
  entry: CurrentEntry;
  onChange: (p: Partial<CurrentEntry>) => void;
  onPhotoPick: () => void;
  onPhotoRemove: (uri: string) => void;
  onSubmit: () => void;
  isSaving: boolean;
}) {
  const [expiryOpen, setExpiryOpen] = useState(false);
  const [photosOpen, setPhotosOpen] = useState(false);

  const color = POLICY_COLOR[entry.policy];
  const cardBg = POLICY_CARD_BG[entry.policy];
  const badgeBg = POLICY_BG[entry.policy];
  const isDsDc = entry.policy === 'DS' || entry.policy === 'DC';
  const isSupplier = entry.policy === 'SUPPLIER';
  const isNew = entry.isNew;

  return (
    <View style={[styles.entryCard, { backgroundColor: cardBg, borderTopWidth: 5, borderTopColor: color }]}>
      <View style={styles.entryTopRow}>
        <View style={[styles.policyBadge, { backgroundColor: badgeBg }]}>
          <View style={[styles.policyDot, { backgroundColor: color }]} />
          <Text style={[styles.policyBadgeText, { color }]}>{POLICY_LABEL[entry.policy]}</Text>
        </View>
        <View style={styles.barcodeTag}>
          <Ionicons name="barcode-outline" size={13} color={Colors.gray} />
          <Text style={styles.barcodeTagText}>{entry.barcode}</Text>
        </View>
      </View>

      {isNew ? (
        <>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>ITEM NAME</Text>
            <TextInput
              style={styles.fieldInput}
              placeholder="Enter item name"
              placeholderTextColor={Colors.grayLight}
              value={entry.itemName}
              onChangeText={v => onChange({ itemName: v })}
            />
          </View>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>SKU</Text>
            <TextInput
              style={styles.fieldInput}
              placeholder="Enter SKU"
              placeholderTextColor={Colors.grayLight}
              value={entry.sku}
              onChangeText={v => onChange({ sku: v })}
            />
          </View>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>POLICY</Text>
            <View style={styles.policyToggle}>
              {POLICIES.map(p => (
                <Pressable
                  key={p}
                  onPress={() => onChange({ policy: p, reason: null })}
                  style={[styles.policyToggleBtn, entry.policy === p && { backgroundColor: POLICY_COLOR[p] }]}
                >
                  <Text style={[styles.policyToggleTxt, entry.policy === p && { color: '#fff' }]}>{p}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </>
      ) : (
        <View style={styles.itemInfoRow}>
          <View style={styles.itemInfoBlock}>
            <Text style={styles.itemName}>{entry.itemName}</Text>
            <Text style={styles.itemSku}>{entry.sku}</Text>
          </View>
          <View style={styles.policyChangePill}>
            <Text style={styles.policyChangeLabel}>Change</Text>
            <View style={styles.policyToggleMini}>
              {POLICIES.map(p => (
                <Pressable
                  key={p}
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onChange({ policy: p, reason: null }); }}
                  style={[styles.policyToggleMiniBtn, entry.policy === p && { backgroundColor: POLICY_COLOR[p] }]}
                >
                  <Text style={[styles.policyToggleMiniTxt, entry.policy === p && { color: '#fff' }]}>{p}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>
      )}

      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>QUANTITY</Text>
        <TextInput
          style={styles.fieldInput}
          placeholder="Enter quantity"
          placeholderTextColor={Colors.grayLight}
          value={entry.qty}
          onChangeText={v => onChange({ qty: v })}
          keyboardType="numeric"
        />
      </View>

      {isDsDc && (
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>REASON</Text>
          <View style={styles.reasonGrid}>
            {REASONS.map(r => (
              <Pressable
                key={r}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onChange({ reason: r, expiryDate: '', remainingDays: '' }); }}
                style={[styles.reasonBtn, entry.reason === r && { backgroundColor: color, borderColor: color }]}
              >
                <Text style={[styles.reasonBtnText, entry.reason === r && { color: '#fff' }]}>{r}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {isDsDc && entry.reason === 'Expired ITEM' && (
        <View style={[styles.expiryBlockInner, { borderColor: color + '40' }]}>
          <Text style={[styles.fieldLabel, { color, marginBottom: 2 }]}>EXPIRY DETAILS</Text>
          <View style={styles.twoCol}>
            <View style={[styles.fieldGroup, { flex: 1 }]}>
              <Text style={styles.fieldLabel}>EXPIRY DATE</Text>
              <TextInput
                style={styles.fieldInput}
                placeholder="DD/MM/YYYY"
                placeholderTextColor={Colors.grayLight}
                value={entry.expiryDate}
                onChangeText={v => onChange({ expiryDate: v })}
              />
            </View>
            <View style={[styles.fieldGroup, { flex: 1 }]}>
              <Text style={styles.fieldLabel}>REMAINING DAYS</Text>
              <TextInput
                style={styles.fieldInput}
                placeholder="Days"
                placeholderTextColor={Colors.grayLight}
                value={entry.remainingDays}
                onChangeText={v => onChange({ remainingDays: v })}
                keyboardType="numeric"
              />
            </View>
          </View>
        </View>
      )}

      {isDsDc && (
        <View style={styles.fieldGroup}>
          <Vie