import React, { useState, useCallback } from 'react';
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
import Colors from '@/constants/colors';
import { useSettings } from '@/lib/settings-context';
import translations from '@/constants/translations';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';

function genId() {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

interface MainEntry {
  id: string;
  type: 'PO' | 'ST';
  number: string;
  amount: string;
  isFixing: boolean;
  fixingSuffix: string;
  fixingAmount: string;
}

function emptyMain(): MainEntry {
  return { id: genId(), type: 'PO', number: '', amount: '', isFixing: false, fixingSuffix: '', fixingAmount: '' };
}

function formatMainNumber(entry: MainEntry): string {
  if (!entry.number.trim()) return '';
  return entry.type === 'ST' ? `ST${entry.number.trim()}` : `PO${entry.number.trim()}`;
}

function EntryCard({ entry, index, showRemove, onUpdate, onRemove }: {
  entry: MainEntry; index: number; showRemove: boolean;
  onUpdate: (p: Partial<MainEntry>) => void; onRemove: () => void;
}) {
  const { colors, language } = useSettings();
  const t = translations[language];
  const formatted = formatMainNumber(entry);

  return (
    <View style={[s.entryCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
      <View style={s.entryRow}>
        <View style={[s.entryBadge, { backgroundColor: colors.inputBg }]}>
          <Text style={[s.entryBadgeText, { color: colors.subtext }]}>#{index + 1}</Text>
        </View>
        <View style={[s.typeToggle, { backgroundColor: colors.inputBg }]}>
          <Pressable style={[s.typeBtn, entry.type === 'PO' && s.typeBtnPO]} onPress={() => onUpdate({ type: 'PO', isFixing: false })}>
            <Text style={[s.typeTxt, entry.type === 'PO' && s.typeTxtActive]}>PO</Text>
          </Pressable>
          <Pressable style={[s.typeBtn, entry.type === 'ST' && s.typeBtnST]} onPress={() => onUpdate({ type: 'ST', isFixing: false })}>
            <Text style={[s.typeTxt, entry.type === 'ST' && s.typeTxtActive]}>ST</Text>
          </Pressable>
        </View>
        {showRemove && (
          <Pressable onPress={onRemove} style={s.removeBtn}>
            <Ionicons name="trash-outline" size={14} color={Colors.danger} />
          </Pressable>
        )}
      </View>

      <View style={[s.numberRow, { backgroundColor: colors.inputBg }]}>
        <View style={[s.prefixBox, entry.type === 'ST' && s.prefixBoxST]}>
          <Text style={s.prefixTxt}>{entry.type}</Text>
        </View>
        <TextInput
          style={[s.numberInput, { color: colors.text }]}
          placeholder={entry.type === 'PO' ? 'PO Number' : 'ST Number'}
          placeholderTextColor={Colors.grayLight}
          value={entry.number}
          onChangeText={v => onUpdate({ number: v })}
        />
      </View>

      {!!formatted && (
        <View style={s.formattedRow}>
          <Ionicons name="checkmark-circle" size={13} color={entry.type === 'ST' ? '#10B981' : '#6366F1'} />
          <Text style={[s.formattedTxt, entry.type === 'ST' && { color: '#10B981' }]}>{formatted}</Text>
        </View>
      )}

      {entry.type === 'PO' && (
        <>
          <TextInput
            style={[s.amountInput, { backgroundColor: colors.inputBg, color: colors.text }]}
            placeholder="Amount (SAR)"
            placeholderTextColor={Colors.grayLight}
            value={entry.amount}
            onChangeText={v => onUpdate({ amount: v })}
            keyboardType="numeric"
          />
          <Pressable style={s.fixingToggle} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onUpdate({ isFixing: !entry.isFixing }); }}>
            <View style={[s.check, { backgroundColor: colors.card }, entry.isFixing && s.checkOn]}>
              {entry.isFixing && <Ionicons name="checkmark" size={11} color="#fff" />}
            </View>
            <Text style={[s.fixingLbl, { color: colors.text }]}>{t.fixing_order}</Text>
          </Pressable>
          {entry.isFixing && (
            <View style={s.fixingBox}>
              <Text style={s.fixingBoxLabel}>{t.fixing_reference}</Text>
              <View style={[s.fixingRefRow, { backgroundColor: colors.card }]}>
                <Text style={s.fixingPrefix}>{formatted || 'PO'}-</Text>
                <TextInput
                  style={[s.fixingSuffixInput, { color: colors.text }]}
                  placeholder="suffix / note"
                  placeholderTextColor={Colors.grayLight}
                  value={entry.fixingSuffix}
                  onChangeText={v => onUpdate({ fixingSuffix: v })}
                />
              </View>
              <TextInput
                style={[s.amountInput, { backgroundColor: colors.inputBg, color: colors.text }]}
                placeholder="Fixing Deduction (SAR)"
                placeholderTextColor={Colors.grayLight}
                value={entry.fixingAmount}
                onChangeText={v => onUpdate({ fixingAmount: v })}
                keyboardType="numeric"
              />
            </View>
          )}
        </>
      )}
    </View>
  );
}

export default function InvoiceScreen() {
  const insets = useSafeAreaInsets();
  const { colors, language } = useSettings();
  const t = translations[language];
  const webTopInset = Platform.OS === 'web' ? 67 : 0;
  const webBottomInset = Platform.OS === 'web' ? 34 : 0;

  const [entries, setEntries] = useState<MainEntry[]>([emptyMain()]);
  const [photos, setPhotos] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const updateEntry = useCallback((id: string, patch: Partial<MainEntry>) => {
    setEntries(prev => prev.map(e => (e.id === id ? { ...e, ...patch } : e)));
  }, []);

  const addEntry = () => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setEntries(prev => [...prev, emptyMain()]); };
  const removeEntry = (id: string) => { if (entries.length <= 1) return; Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setEntries(prev => prev.filter(e => e.id !== id)); };

  const pickPhotos = async () => {
    if (photos.length >= 100) { Alert.alert('Limit Reached', 'Maximum 100 photos allowed.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, quality: 0.7 });
    if (!result.canceled) {
      const newUris = result.assets.slice(0, 100 - photos.length).map(a => a.uri);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setPhotos(prev => [...prev, ...newUris]);
    }
  };

  const removePhoto = (uri: string) => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setPhotos(prev => prev.filter(p => p !== uri)); };

  const poTotal = entries.filter(e => e.type === 'PO').reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
  const fixingTotal = entries.filter(e => e.type === 'PO' && e.isFixing).reduce((s, e) => s + (parseFloat(e.fixingAmount) || 0), 0);
  const netTotal = poTotal - fixingTotal;

  const handleSave = async () => {
    if (photos.length < 1) { Alert.alert('Photo Required', 'Please add at least 1 photo before saving.'); return; }
    setIsSaving(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      const existing = await AsyncStorage.getItem('invoices');
      const invoices = existing ? JSON.parse(existing) : [];
      invoices.push({ id: genId(), type: 'MAIN', entries: entries.map(e => ({ type: e.type, number: formatMainNumber(e), amount: e.amount, isFixing: e.isFixing, fixingLabel: e.isFixing ? `${formatMainNumber(e)}-${e.fixingSuffix}` : '', fixingAmount: e.fixingAmount })), netTotal: netTotal.toFixed(2), photoCount: photos.length, createdAt: new Date().toISOString() });
      await AsyncStorage.setItem('invoices', JSON.stringify(invoices));
      Alert.alert('Saved', 'Invoice saved successfully', [{ text: 'OK', onPress: () => router.back() }]);
    } catch { Alert.alert('Error', 'Failed to save invoice'); } finally { setIsSaving(false); }
  };

  return (
    <View style={[s.container, { backgroundColor: colors.bg }]}>
      <LinearGradient colors={['#0A1628', '#1a2d4a']} style={s.header} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <View style={[s.headerTop, { paddingTop: insets.top + webTopInset + 10 }]}>
          <Pressable onPress={() => router.back()} style={s.iconBtn}>
            <Ionicons name="arrow-back" size={20} color={Colors.white} />
          </Pressable>
          <View style={s.headerCenter}>
            <MaterialCommunityIcons name="file-document-outline" size={16} color={Colors.accent} />
            <Text style={s.headerTitle}>{t.main_invoice}</Text>
          </View>
          <Pressable onPress={handleSave} style={[s.iconBtn, { backgroundColor: Colors.accent }]} disabled={isSaving}>
            <Ionicons name="checkmark" size={20} color={Colors.white} />
          </Pressable>
        </View>
        <View style={s.tabStrip}>
          <View style={s.tabActive}>
            <Ionicons name="document-text" size={13} color={Colors.white} />
            <Text style={s.tabActiveText}>{t.main_invoice}</Text>
          </View>
          <Pressable style={s.tabInactive} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push('/invoice-return'); }}>
            <MaterialCommunityIcons name="swap-horizontal" size={13} color="rgba(255,255,255,0.5)" />
            <Text style={s.tabInactiveText}>{t.return_cn}</Text>
            <Ionicons name="chevron-forward" size={12} color="rgba(255,255,255,0.4)" />
          </Pressable>
        </View>
      </LinearGradient>

      <ScrollView style={s.scroll} contentContainerStyle={[s.scrollContent, { paddingBottom: insets.bottom + webBottomInset + 24 }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {entries.map((entry, index) => (
          <EntryCard key={entry.id} entry={entry} index={index} showRemove={entries.length > 1} onUpdate={patch => updateEntry(entry.id, patch)} onRemove={() => removeEntry(entry.id)} />
        ))}

        <Pressable onPress={addEntry} style={s.addBtn}>
          <Ionicons name="add-circle-outline" size={18} color="#6366F1" />
          <Text style={s.addBtnText}>{t.add_entry}</Text>
        </Pressable>

        {(poTotal > 0 || fixingTotal > 0) && (
          <View style={[s.summaryCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Text style={[s.summaryTitle, { color: colors.subtext }]}>{t.amount_summary}</Text>
            <View style={s.summaryBody}>
              {poTotal > 0 && (
                <View style={s.summaryRow}>
                  <Text style={[s.summaryLabel, { color: colors.subtext }]}>{t.po_total}</Text>
                  <Text style={[s.summaryVal, { color: colors.text }]}>{poTotal.toFixed(2)} SAR</Text>
                </View>
              )}
              {fixingTotal > 0 && (
                <View style={s.summaryRow}>
                  <Text style={[s.summaryLabel, { color: colors.subtext }]}>{t.fixing_deduction}</Text>
                  <Text style={[s.summaryVal, { color: Colors.danger }]}>-{fixingTotal.toFixed(2)} SAR</Text>
                </View>
              )}
              {fixingTotal > 0 && <View style={[s.sumLine, { backgroundColor: colors.divider }]} />}
              <View style={s.summaryRow}>
                <Text style={[s.summaryLabel, s.summaryLabelBold, { color: colors.text }]}>{t.net_total}</Text>
                <Text style={[s.summaryVal, s.summaryValBig]}>{netTotal.toFixed(2)} SAR</Text>
              </View>
            </View>
          </View>
        )}

        <View style={[s.photoCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={s.photoHeader}>
            <View style={s.photoHeaderLeft}>
              <Ionicons name="camera-outline" size={17} color={Colors.accent} />
              <Text style={[s.photoTitle, { color: colors.text }]}>{t.photos}</Text>
            </View>
            <Text style={[s.photoCount, { color: colors.subtext }]}>{photos.length} / 100</Text>
          </View>
          {photos.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.photoRow}>
              {photos.map(uri => (
                <View key={uri} style={s.thumb}>
                  <Image source={{ uri }} style={[s.thumbImg, { backgroundColor: colors.inputBg }]} />
                  <Pressable onPress={() => removePhoto(uri)} style={s.thumbRemove}>
                    <Ionicons name="close" size={11} color="#fff" />
                  </Pressable>
                </View>
              ))}
            </ScrollView>
          )}
          <Pressable onPress={pickPhotos} style={s.photoBtn}>
            <Ionicons name="add" size={17} color={Colors.white} />
            <Text style={s.photoBtnText}>{photos.length === 0 ? t.add_photos : t.add_more_photos}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingBottom: 0 },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingBottom: 16 },
  iconBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 16, fontFamily: 'Poppins_700Bold', color: Colors.white, letterSpacing: 1.5 },
  tabStrip: { flexDirection: 'row', marginHorizontal: 18, marginBottom: 16, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 14, padding: 4, gap: 4 },
  tabActive: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#6366F1', borderRadius: 10, paddingVertical: 10 },
  tabActiveText: { fontSize: 11, fontFamily: 'Poppins_700Bold', color: Colors.white, letterSpacing: 0.8 },
  tabInactive: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, borderRadius: 10, paddingVertical: 10 },
  tabInactiveText: { fontSize: 11, fontFamily: 'Poppins_600SemiBold', color: 'rgba(255,255,255,0.5)', letterSpacing: 0.8 },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 12 },
  entryCard: { borderRadius: 18, padding: 16, gap: 12, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3, borderLeftWidth: 4, borderLeftColor: '#6366F1' },
  entryRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  entryBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  entryBadgeText: { fontSize: 11, fontFamily: 'Poppins_600SemiBold' },
  typeToggle: { flex: 1, flexDirection: 'row', borderRadius: 10, padding: 3, gap: 3 },
  typeBtn: { flex: 1, paddingVertical: 7, borderRadius: 8, alignItems: 'center' },
  typeBtnPO: { backgroundColor: '#6366F1' },
  typeBtnST: { backgroundColor: '#10B981' },
  typeTxt: { fontSize: 12, fontFamily: 'Poppins_700Bold', color: Colors.gray, letterSpacing: 0.5 },
  typeTxtActive: { color: Colors.white },
  removeBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(239,68,68,0.08)', justifyContent: 'center', alignItems: 'center' },
  numberRow: { flexDirection: 'row', borderRadius: 12, overflow: 'hidden' },
  prefixBox: { backgroundColor: '#6366F1', paddingHorizontal: 14, justifyContent: 'center', alignItems: 'center' },
  prefixBoxST: { backgroundColor: '#10B981' },
  prefixTxt: { fontSize: 12, fontFamily: 'Poppins_700Bold', color: Colors.white },
  numberInput: { flex: 1, paddingHorizontal: 14, paddingVertical: 13, fontSize: 14, fontFamily: 'Poppins_400Regular' },
  formattedRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: -4 },
  formattedTxt: { fontSize: 12, fontFamily: 'Poppins_600SemiBold', color: '#6366F1' },
  amountInput: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, fontSize: 14, fontFamily: 'Poppins_400Regular' },
  fixingToggle: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  check: { width: 20, height: 20, borderRadius: 6, borderWidth: 1.5, borderColor: Colors.grayLight, justifyContent: 'center', alignItems: 'center' },
  checkOn: { backgroundColor: '#6366F1', borderColor: '#6366F1' },
  fixingLbl: { fontSize: 13, fontFamily: 'Poppins_500Medium' },
  fixingBox: { backgroundColor: 'rgba(99,102,241,0.05)', borderRadius: 12, padding: 14, gap: 10, borderWidth: 1, borderColor: 'rgba(99,102,241,0.15)' },
  fixingBoxLabel: { fontSize: 11, fontFamily: 'Poppins_600SemiBold', color: '#6366F1', letterSpacing: 0.5, textTransform: 'uppercase' },
  fixingRefRow: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 10, paddingLeft: 10, overflow: 'hidden' },
  fixingPrefix: { fontSize: 13, fontFamily: 'Poppins_600SemiBold', color: '#6366F1' },
  fixingSuffixInput: { flex: 1, paddingHorizontal: 8, paddingVertical: 12, fontSize: 13, fontFamily: 'Poppins_400Regular' },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 14, borderWidth: 1.5, borderColor: '#6366F1', borderStyle: 'dashed' },
  addBtnText: { fontSize: 13, fontFamily: 'Poppins_600SemiBold', color: '#6366F1' },
  summaryCard: { borderRadius: 18, padding: 18, gap: 12, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
  summaryTitle: { fontSize: 11, fontFamily: 'Poppins_700Bold', letterSpacing: 2 },
  summaryBody: { gap: 10 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { fontSize: 13, fontFamily: 'Poppins_400Regular' },
  summaryLabelBold: { fontFamily: 'Poppins_700Bold' },
  summaryVal: { fontSize: 13, fontFamily: 'Poppins_600SemiBold' },
  summaryValBig: { fontSize: 18, fontFamily: 'Poppins_700Bold', color: '#6366F1' },
  sumLine: { height: 1 },
  photoCard: { borderRadius: 18, padding: 18, gap: 14, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
  photoHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  photoHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  photoTitle: { fontSize: 13, fontFamily: 'Poppins_700Bold', letterSpacing: 1 },
  photoCount: { fontSize: 12, fontFamily: 'Poppins_600SemiBold' },
  photoRow: { flexDirection: 'row', gap: 10, paddingVertical: 4 },
  thumb: { width: 76, height: 76, borderRadius: 12 },
  thumbImg: { width: 76, height: 76, borderRadius: 12 },
  thumbRemove: { position: 'absolute', top: -5, right: -5, width: 20, height: 20, borderRadius: 10, backgroundColor: Colors.danger, justifyContent: 'center', alignItems: 'center' },
  photoBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.accent, borderRadius: 14, paddingVertical: 14 },
  photoBtnText: { fontSize: 13, fontFamily: 'Poppins_600SemiBold', color: Colors.white },
});
