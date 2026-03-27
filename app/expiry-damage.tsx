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
import { useSettings } from '@/lib/settings-context';
import translations from '@/constants/translations';
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
  const { colors, language } = useSettings();
  const t = translations[language];
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
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
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
              {entry ? 'ITEM ENTRY' : t.expiry_damage.toUpperCase()}
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
          <View style={[styles.scanInputCard, { backgroundColor: colors.card }]}>
            <Pressable onPress={openScanner} style={styles.camBtn}>
              <LinearGradient colors={['#EF4444', '#F87171']} style={styles.camBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                <Ionicons name="scan" size={26} color="#fff" />
                <Text style={styles.camBtnText}>{t.tap_to_scan}</Text>
              </LinearGradient>
            </Pressable>
            <View style={styles.orRow}>
              <View style={[styles.orLine, { backgroundColor: colors.divider }]} />
              <Text style={[styles.orTxt, { color: colors.subtext }]}>{t.or_manual}</Text>
              <View style={[styles.orLine, { backgroundColor: colors.divider }]} />
            </View>
            <View style={styles.barcodeRow}>
              <TextInput
                ref={barcodeRef}
                style={[styles.barcodeInput, { backgroundColor: colors.inputBg, color: colors.text }]}
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
              <Text style={[styles.historyTitle, { color: colors.subtext }]}>{t.history.toUpperCase()}</Text>
              <View style={styles.dateFilters}>
                {(['today', 'week', 'all'] as DateFilter[]).map(f => (
                  <Pressable
                    key={f}
                    onPress={() => setDateFilter(f)}
                    style={[styles.filterBtn, { backgroundColor: colors.card }, dateFilter === f && styles.filterBtnActive]}
                  >
                    <Text style={[styles.filterBtnText, { color: colors.subtext }, dateFilter === f && styles.filterBtnTextActive]}>
                      {f === 'today' ? 'Today' : f === 'week' ? 'Week' : 'All'}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
            {filteredHistory.length === 0 ? (
              <View style={styles.historyEmpty}>
                <Ionicons name="time-outline" size={32} color={Colors.grayLight} />
                <Text style={[styles.historyEmptyText, { color: colors.subtext }]}>{t.no_history}</Text>
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
  const { colors } = useSettings();
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
        <View style={[styles.barcodeTag, { backgroundColor: colors.inputBg }]}>
          <Ionicons name="barcode-outline" size={13} color={colors.subtext} />
          <Text style={[styles.barcodeTagText, { color: colors.subtext }]}>{entry.barcode}</Text>
        </View>
      </View>

      {isNew ? (
        <>
          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: colors.subtext }]}>ITEM NAME</Text>
            <TextInput style={[styles.fieldInput, { backgroundColor: colors.card, color: colors.text }]} placeholder="Enter item name" placeholderTextColor={Colors.grayLight} value={entry.itemName} onChangeText={v => onChange({ itemName: v })} />
          </View>
          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: colors.subtext }]}>SKU</Text>
            <TextInput style={[styles.fieldInput, { backgroundColor: colors.card, color: colors.text }]} placeholder="Enter SKU" placeholderTextColor={Colors.grayLight} value={entry.sku} onChangeText={v => onChange({ sku: v })} />
          </View>
          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: colors.subtext }]}>POLICY</Text>
            <View style={[styles.policyToggle, { backgroundColor: colors.inputBg }]}>
              {POLICIES.map(p => (
                <Pressable key={p} onPress={() => onChange({ policy: p, reason: null })} style={[styles.policyToggleBtn, entry.policy === p && { backgroundColor: POLICY_COLOR[p] }]}>
                  <Text style={[styles.policyToggleTxt, { color: colors.subtext }, entry.policy === p && { color: '#fff' }]}>{p}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </>
      ) : (
        <View style={styles.itemInfoRow}>
          <View style={styles.itemInfoBlock}>
            <Text style={[styles.itemName, { color: colors.text }]}>{entry.itemName}</Text>
            <Text style={[styles.itemSku, { color: colors.subtext }]}>{entry.sku}</Text>
          </View>
          <View style={styles.policyChangePill}>
            <Text style={[styles.policyChangeLabel, { color: colors.subtext }]}>Change</Text>
            <View style={[styles.policyToggleMini, { backgroundColor: colors.inputBg }]}>
              {POLICIES.map(p => (
                <Pressable key={p} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onChange({ policy: p, reason: null }); }} style={[styles.policyToggleMiniBtn, entry.policy === p && { backgroundColor: POLICY_COLOR[p] }]}>
                  <Text style={[styles.policyToggleMiniTxt, { color: colors.subtext }, entry.policy === p && { color: '#fff' }]}>{p}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>
      )}

      <View style={styles.fieldGroup}>
        <Text style={[styles.fieldLabel, { color: colors.subtext }]}>QUANTITY</Text>
        <TextInput style={[styles.fieldInput, { backgroundColor: colors.card, color: colors.text }]} placeholder="Enter quantity" placeholderTextColor={Colors.grayLight} value={entry.qty} onChangeText={v => onChange({ qty: v })} keyboardType="numeric" />
      </View>

      {isDsDc && (
        <View style={styles.fieldGroup}>
          <Text style={[styles.fieldLabel, { color: colors.subtext }]}>REASON</Text>
          <View style={styles.reasonGrid}>
            {REASONS.map(r => (
              <Pressable key={r} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onChange({ reason: r, expiryDate: '', remainingDays: '' }); }} style={[styles.reasonBtn, { backgroundColor: colors.card, borderColor: colors.divider }, entry.reason === r && { backgroundColor: color, borderColor: color }]}>
                <Text style={[styles.reasonBtnText, { color: colors.text }, entry.reason === r && { color: '#fff' }]}>{r}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {isDsDc && entry.reason === 'Expired ITEM' && (
        <View style={[styles.expiryBlockInner, { backgroundColor: colors.card, borderColor: color + '40' }]}>
          <Text style={[styles.fieldLabel, { color, marginBottom: 2 }]}>EXPIRY DETAILS</Text>
          <View style={styles.twoCol}>
            <View style={[styles.fieldGroup, { flex: 1 }]}>
              <Text style={[styles.fieldLabel, { color: colors.subtext }]}>EXPIRY DATE</Text>
              <TextInput style={[styles.fieldInput, { backgroundColor: colors.inputBg, color: colors.text }]} placeholder="DD/MM/YYYY" placeholderTextColor={Colors.grayLight} value={entry.expiryDate} onChangeText={v => onChange({ expiryDate: v })} />
            </View>
            <View style={[styles.fieldGroup, { flex: 1 }]}>
              <Text style={[styles.fieldLabel, { color: colors.subtext }]}>REMAINING DAYS</Text>
              <TextInput style={[styles.fieldInput, { backgroundColor: colors.inputBg, color: colors.text }]} placeholder="Days" placeholderTextColor={Colors.grayLight} value={entry.remainingDays} onChangeText={v => onChange({ remainingDays: v })} keyboardType="numeric" />
            </View>
          </View>
        </View>
      )}

      {isDsDc && (
        <View style={styles.fieldGroup}>
          <View style={styles.photoFieldHeader}>
            <Text style={[styles.fieldLabel, { color: colors.subtext }]}>PHOTOS (MIN 1 REQUIRED)</Text>
            <Text style={[styles.photoCountTxt, { color: colors.subtext }]}>{entry.photos.length}/100</Text>
          </View>
          {entry.photos.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoRow}>
              {entry.photos.map(uri => (
                <View key={uri} style={styles.photoThumb}>
                  <Image source={{ uri }} style={[styles.photoImg, { backgroundColor: colors.inputBg }]} />
                  <Pressable onPress={() => onPhotoRemove(uri)} style={styles.photoRemove}><Ionicons name="close" size={11} color="#fff" /></Pressable>
                </View>
              ))}
            </ScrollView>
          )}
          <Pressable onPress={onPhotoPick} style={[styles.photoBtn, { backgroundColor: colors.card, borderColor: color }]}>
            <Ionicons name="camera-outline" size={16} color={color} />
            <Text style={[styles.photoBtnText, { color }]}>{entry.photos.length === 0 ? 'Add Photo' : 'Add More'}</Text>
          </Pressable>
        </View>
      )}

      {(isSupplier || isNew) && (
        <>
          <Pressable onPress={() => { setExpiryOpen(v => !v); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }} style={[styles.optToggleRow, { backgroundColor: colors.card, borderColor: color + '50' }]}>
            <View style={[styles.optToggleIcon, { backgroundColor: color + '20' }]}><Ionicons name="calendar-outline" size={15} color={color} /></View>
            <Text style={[styles.optToggleLabel, { color }]}>{expiryOpen ? 'Hide Expiry Date' : 'Add Expiry Date'}</Text>
            <Ionicons name={expiryOpen ? 'chevron-up' : 'chevron-down'} size={16} color={color} />
          </Pressable>

          {expiryOpen && (
            <View style={[styles.expiryBlockInner, { backgroundColor: colors.card, borderColor: color + '40' }]}>
              <View style={styles.twoCol}>
                <View style={[styles.fieldGroup, { flex: 1 }]}>
                  <Text style={[styles.fieldLabel, { color: colors.subtext }]}>EXPIRY DATE</Text>
                  <TextInput style={[styles.fieldInput, { backgroundColor: colors.inputBg, color: colors.text }]} placeholder="DD/MM/YYYY" placeholderTextColor={Colors.grayLight} value={entry.expiryDate} onChangeText={v => onChange({ expiryDate: v })} />
                </View>
                <View style={[styles.fieldGroup, { flex: 1 }]}>
                  <Text style={[styles.fieldLabel, { color: colors.subtext }]}>REMAINING DAYS</Text>
                  <TextInput style={[styles.fieldInput, { backgroundColor: colors.inputBg, color: colors.text }]} placeholder="Days" placeholderTextColor={Colors.grayLight} value={entry.remainingDays} onChangeText={v => onChange({ remainingDays: v })} keyboardType="numeric" />
                </View>
              </View>
            </View>
          )}

          {isNew && (
            <>
              <Pressable onPress={() => { setPhotosOpen(v => !v); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }} style={[styles.optToggleRow, { backgroundColor: colors.card, borderColor: color + '50' }]}>
                <View style={[styles.optToggleIcon, { backgroundColor: color + '20' }]}><Ionicons name="camera-outline" size={15} color={color} /></View>
                <Text style={[styles.optToggleLabel, { color }]}>{photosOpen ? (entry.photos.length > 0 ? `Hide Photos (${entry.photos.length})` : 'Hide Photos') : 'Add Photos'}</Text>
                <Ionicons name={photosOpen ? 'chevron-up' : 'chevron-down'} size={16} color={color} />
              </Pressable>

              {photosOpen && (
                <View style={styles.fieldGroup}>
                  <View style={styles.photoFieldHeader}>
                    <Text style={[styles.fieldLabel, { color: colors.subtext }]}>PHOTOS (OPTIONAL)</Text>
                    <Text style={[styles.photoCountTxt, { color: colors.subtext }]}>{entry.photos.length}/100</Text>
                  </View>
                  {entry.photos.length > 0 && (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoRow}>
                      {entry.photos.map(uri => (
                        <View key={uri} style={styles.photoThumb}>
                          <Image source={{ uri }} style={[styles.photoImg, { backgroundColor: colors.inputBg }]} />
                          <Pressable onPress={() => onPhotoRemove(uri)} style={styles.photoRemove}><Ionicons name="close" size={11} color="#fff" /></Pressable>
                        </View>
                      ))}
                    </ScrollView>
                  )}
                  <Pressable onPress={onPhotoPick} style={[styles.photoBtn, { backgroundColor: colors.card, borderColor: color }]}>
                    <Ionicons name="camera-outline" size={16} color={color} />
                    <Text style={[styles.photoBtnText, { color }]}>{entry.photos.length === 0 ? 'Add Photo' : 'Add More'}</Text>
                  </Pressable>
                </View>
              )}
            </>
          )}
        </>
      )}

      <Pressable onPress={onSubmit} disabled={isSaving} style={styles.submitBtn}>
        <LinearGradient
          colors={[color, color + 'CC']}
          style={styles.submitGrad}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <Ionicons name="checkmark-circle" size={18} color="#fff" />
          <Text style={styles.submitTxt}>Submit Entry</Text>
        </LinearGradient>
      </Pressable>
    </View>
  );
}

function HistoryCard({ item }: { item: HistoryItem }) {
  const { colors } = useSettings();
  const color = POLICY_COLOR[item.policy];
  const cardBg = POLICY_CARD_BG[item.policy];
  return (
    <View style={[styles.historyCard, { backgroundColor: cardBg, borderLeftColor: color }]}>
      <View style={styles.historyRow}>
        <View style={[styles.historyDot, { backgroundColor: color }]} />
        <View style={styles.historyBody}>
          <Text style={[styles.historyItemName, { color: colors.text }]} numberOfLines={1}>{item.itemName}</Text>
          <View style={styles.historyMeta}>
            <Text style={[styles.historyMetaTxt, { color: colors.subtext }]}>{item.barcode}</Text>
            {item.reason ? <Text style={[styles.historyMetaTxt, { color: colors.subtext }]}>· {item.reason}</Text> : null}
            {item.expiryDate ? <Text style={[styles.historyMetaTxt, { color: colors.subtext }]}>· Exp {item.expiryDate}</Text> : null}
            {item.photoCount > 0 ? (
              <View style={styles.photoBadge}>
                <Text style={[styles.historyMetaTxt, { color: colors.subtext }]}>·</Text>
                <Ionicons name="camera" size={10} color={color} />
                <Text style={[styles.historyMetaTxt, { color }]}>{item.photoCount}</Text>
              </View>
            ) : null}
          </View>
        </View>
        <View style={styles.historyRight}>
          <Text style={[styles.historyQty, { color }]}>{item.qty}</Text>
          <Text style={[styles.historyDate, { color: colors.subtext }]}>{fmtDateTime(item.createdAt)}</Text>
        </View>
      </View>
    </View>
  );
}

const CORNER_SZ = 20;
const CORNER_W = 3;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.offWhite },

  header: { paddingBottom: 14 },
  headerRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingHorizontal: 18,
    paddingBottom: 10,
  },
  headerBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center', alignItems: 'center',
  },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 15, fontFamily: 'Poppins_700Bold', color: '#fff', letterSpacing: 1.5 },

  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 14 },

  scanInputCard: {
    backgroundColor: Colors.white, borderRadius: 20, padding: 18, gap: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 12, elevation: 3,
  },
  camBtn: { borderRadius: 14, overflow: 'hidden' },
  camBtnGrad: { paddingVertical: 16, alignItems: 'center', gap: 5 },
  camBtnText: { fontSize: 15, fontFamily: 'Poppins_700Bold', color: '#fff', letterSpacing: 0.5 },
  orRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  orLine: { flex: 1, height: 1, backgroundColor: Colors.offWhite },
  orTxt: { fontSize: 9, fontFamily: 'Poppins_600SemiBold', color: Colors.gray, letterSpacing: 0.8 },
  barcodeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  barcodeInput: {
    flex: 1, minWidth: 0,
    backgroundColor: Colors.offWhite, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 13,
    fontSize: 14, fontFamily: 'Poppins_400Regular', color: Colors.primary,
  },
  barcodeAddBtn: {
    width: 46, height: 46, borderRadius: 12,
    backgroundColor: '#EF4444',
    justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },

  entryCard: {
    borderRadius: 20, padding: 18, gap: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1, shadowRadius: 14, elevation: 5,
  },
  entryTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  policyBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
  },
  policyDot: { width: 7, height: 7, borderRadius: 4 },
  policyBadgeText: { fontSize: 11, fontFamily: 'Poppins_700Bold', letterSpacing: 0.8 },
  barcodeTag: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(0,0,0,0.06)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
  },
  barcodeTagText: { fontSize: 11, fontFamily: 'Poppins_500Medium', color: Colors.grayDark },

  itemInfoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  itemInfoBlock: { flex: 1 },
  itemName: { fontSize: 15, fontFamily: 'Poppins_700Bold', color: Colors.primary },
  itemSku: { fontSize: 12, fontFamily: 'Poppins_400Regular', color: Colors.gray, marginTop: 2 },
  policyChangePill: { gap: 4, alignItems: 'flex-end' },
  policyChangeLabel: { fontSize: 9, fontFamily: 'Poppins_600SemiBold', color: Colors.gray, letterSpacing: 0.8 },
  policyToggleMini: {
    flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.06)',
    borderRadius: 8, padding: 2, gap: 2,
  },
  policyToggleMiniBtn: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 6, alignItems: 'center' },
  policyToggleMiniTxt: { fontSize: 10, fontFamily: 'Poppins_700Bold', color: Colors.gray },

  fieldGroup: { gap: 8 },
  fieldLabel: {
    fontSize: 10, fontFamily: 'Poppins_700Bold',
    color: Colors.gray, letterSpacing: 1.5, textTransform: 'uppercase',
  },
  fieldInput: {
    backgroundColor: Colors.white, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 13,
    fontSize: 14, fontFamily: 'Poppins_400Regular', color: Colors.primary,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },

  policyToggle: {
    flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.06)',
    borderRadius: 12, padding: 4, gap: 4,
  },
  policyToggleBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center',
  },
  policyToggleTxt: { fontSize: 12, fontFamily: 'Poppins_700Bold', color: Colors.gray },

  reasonGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  reasonBtn: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
    borderWidth: 1.5, borderColor: Colors.grayLight,
    backgroundColor: Colors.white,
  },
  reasonBtnText: { fontSize: 12, fontFamily: 'Poppins_600SemiBold', color: Colors.grayDark },

  expiryBlockInner: {
    backgroundColor: Colors.white, borderRadius: 14, padding: 14,
    gap: 10, borderWidth: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  twoCol: { flexDirection: 'row', gap: 10 },

  optToggleRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 11, paddingHorizontal: 14,
    backgroundColor: Colors.white, borderRadius: 12,
    borderWidth: 1.5,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  optToggleIcon: {
    width: 28, height: 28, borderRadius: 8,
    justifyContent: 'center', alignItems: 'center',
  },
  optToggleLabel: { flex: 1, fontSize: 13, fontFamily: 'Poppins_600SemiBold' },

  photoFieldHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  photoCountTxt: { fontSize: 12, fontFamily: 'Poppins_600SemiBold', color: Colors.gray },
  photoRow: { flexDirection: 'row', gap: 10, paddingVertical: 4 },
  photoThumb: { width: 70, height: 70, borderRadius: 10 },
  photoImg: { width: 70, height: 70, borderRadius: 10, backgroundColor: Colors.offWhite },
  photoRemove: {
    position: 'absolute', top: -5, right: -5,
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: Colors.danger, justifyContent: 'center', alignItems: 'center',
  },
  photoBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 12, borderRadius: 12,
    borderWidth: 1.5, borderStyle: 'dashed',
    backgroundColor: Colors.white,
  },
  photoBtnText: { fontSize: 13, fontFamily: 'Poppins_600SemiBold' },

  submitBtn: { borderRadius: 14, overflow: 'hidden', marginTop: 4 },
  submitGrad: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 16, gap: 8,
  },
  submitTxt: { fontSize: 15, fontFamily: 'Poppins_700Bold', color: '#fff', letterSpacing: 0.5 },

  historySection: { gap: 10 },
  historyHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  historyTitle: { fontSize: 12, fontFamily: 'Poppins_700Bold', color: Colors.gray, letterSpacing: 2 },
  dateFilters: { flexDirection: 'row', gap: 6 },
  filterBtn: {
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20,
    backgroundColor: Colors.white,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  filterBtnActive: { backgroundColor: '#EF4444' },
  filterBtnText: { fontSize: 11, fontFamily: 'Poppins_600SemiBold', color: Colors.gray },
  filterBtnTextActive: { color: '#fff' },

  historyEmpty: { alignItems: 'center', paddingVertical: 32, gap: 8 },
  historyEmptyText: { fontSize: 13, fontFamily: 'Poppins_400Regular', color: Colors.gray },

  historyCard: {
    borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12,
    borderLeftWidth: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  historyRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  historyDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  historyBody: { flex: 1, gap: 2 },
  historyItemName: { fontSize: 13, fontFamily: 'Poppins_600SemiBold', color: Colors.primary },
  historyMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, alignItems: 'center' },
  historyMetaTxt: { fontSize: 11, fontFamily: 'Poppins_400Regular', color: Colors.gray },
  photoBadge: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  historyRight: { alignItems: 'flex-end', gap: 2, flexShrink: 0 },
  historyQty: { fontSize: 16, fontFamily: 'Poppins_700Bold' },
  historyDate: { fontSize: 10, fontFamily: 'Poppins_400Regular', color: Colors.gray },

  scannerContainer: { flex: 1, backgroundColor: '#000' },
  scannerTop: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 18, paddingBottom: 12,
  },
  scannerClose: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center', alignItems: 'center',
  },
  scannerBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
  },
  scannerBadgeText: { fontSize: 11, fontFamily: 'Poppins_700Bold', color: '#FBBF24', letterSpacing: 1 },
  scanFrame: { position: 'absolute', top: '32%', left: '10%', right: '10%', height: 160 },
  corner: { position: 'absolute', width: CORNER_SZ, height: CORNER_SZ, borderColor: Colors.accent },
  cTL: { top: 0, left: 0, borderTopWidth: CORNER_W, borderLeftWidth: CORNER_W },
  cTR: { top: 0, right: 0, borderTopWidth: CORNER_W, borderRightWidth: CORNER_W },
  cBL: { bottom: 0, left: 0, borderBottomWidth: CORNER_W, borderLeftWidth: CORNER_W },
  cBR: { bottom: 0, right: 0, borderBottomWidth: CORNER_W, borderRightWidth: CORNER_W },
  scanLine: {
    position: 'absolute', left: 12, right: 12, top: '50%',
    height: 2, backgroundColor: Colors.accent, opacity: 0.8,
  },
  scannerHintBox: { position: 'absolute', bottom: '15%', left: 0, right: 0, alignItems: 'center' },
  scannerHintText: {
    fontSize: 14, fontFamily: 'Poppins_500Medium', color: '#fff',
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, overflow: 'hidden',
  },
});
