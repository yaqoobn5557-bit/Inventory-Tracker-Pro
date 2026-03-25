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
  FlatList,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/colors';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SCREEN_W = Dimensions.get('window').width;

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

interface ReturnEntry {
  id: string;
  type: 'PO' | 'RT';
  number: string;
  amount: string;
}

function emptyMain(): MainEntry {
  return { id: genId(), type: 'PO', number: '', amount: '', isFixing: false, fixingSuffix: '', fixingAmount: '' };
}

function emptyReturn(): ReturnEntry {
  return { id: genId(), type: 'PO', number: '', amount: '' };
}

function formatMainNumber(entry: MainEntry): string {
  if (!entry.number.trim()) return '';
  return entry.type === 'ST' ? `ST${entry.number.trim()}` : `PO${entry.number.trim()}`;
}

function formatReturnNumber(entry: ReturnEntry): string {
  if (!entry.number.trim()) return '';
  return entry.type === 'RT' ? `RT-${entry.number.trim()}` : `PO${entry.number.trim()}`;
}

export default function InvoiceScreen() {
  const insets = useSafeAreaInsets();
  const webTopInset = Platform.OS === 'web' ? 67 : 0;
  const webBottomInset = Platform.OS === 'web' ? 34 : 0;

  const [mainEntries, setMainEntries] = useState<MainEntry[]>([emptyMain()]);
  const [returnEntries, setReturnEntries] = useState<ReturnEntry[]>([emptyReturn()]);
  const [photos, setPhotos] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const updateMain = useCallback((id: string, patch: Partial<MainEntry>) => {
    setMainEntries(prev => prev.map(e => e.id === id ? { ...e, ...patch } : e));
  }, []);

  const addMain = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setMainEntries(prev => [...prev, emptyMain()]);
  };

  const removeMain = (id: string) => {
    if (mainEntries.length <= 1) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setMainEntries(prev => prev.filter(e => e.id !== id));
  };

  const updateReturn = useCallback((id: string, patch: Partial<ReturnEntry>) => {
    setReturnEntries(prev => prev.map(e => e.id === id ? { ...e, ...patch } : e));
  }, []);

  const addReturn = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setReturnEntries(prev => [...prev, emptyReturn()]);
  };

  const removeReturn = (id: string) => {
    if (returnEntries.length <= 1) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setReturnEntries(prev => prev.filter(e => e.id !== id));
  };

  const pickPhotos = async () => {
    if (photos.length >= 100) {
      Alert.alert('Limit Reached', 'Maximum 100 photos allowed.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.7,
    });
    if (!result.canceled) {
      const remaining = 100 - photos.length;
      const newUris = result.assets.slice(0, remaining).map(a => a.uri);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setPhotos(prev => [...prev, ...newUris]);
    }
  };

  const removePhoto = (uri: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPhotos(prev => prev.filter(p => p !== uri));
  };

  const getPoTotal = () =>
    mainEntries
      .filter(e => e.type === 'PO')
      .reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);

  const getFixingTotal = () =>
    mainEntries
      .filter(e => e.type === 'PO' && e.isFixing)
      .reduce((s, e) => s + (parseFloat(e.fixingAmount) || 0), 0);

  const getReturnTotal = () =>
    returnEntries.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);

  const getNetTotal = () => getPoTotal() - getFixingTotal();

  const handleSave = async () => {
    if (photos.length < 1) {
      Alert.alert('Photo Required', 'Please add at least 1 photo.');
      return;
    }
    setIsSaving(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      const existing = await AsyncStorage.getItem('invoices');
      const invoices = existing ? JSON.parse(existing) : [];
      invoices.push({
        id: genId(),
        mainEntries: mainEntries.map(e => ({
          type: e.type,
          number: formatMainNumber(e),
          amount: e.amount,
          isFixing: e.isFixing,
          fixingLabel: e.isFixing ? `${formatMainNumber(e)}-${e.fixingSuffix}` : '',
          fixingAmount: e.fixingAmount,
        })),
        returnEntries: returnEntries.map(e => ({
          type: e.type,
          number: formatReturnNumber(e),
          amount: e.amount,
        })),
        netTotal: getNetTotal().toFixed(2),
        returnTotal: getReturnTotal().toFixed(2),
        photoCount: photos.length,
        createdAt: new Date().toISOString(),
      });
      await AsyncStorage.setItem('invoices', JSON.stringify(invoices));
      Alert.alert('Saved', 'Invoice saved successfully', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch {
      Alert.alert('Error', 'Failed to save invoice');
    } finally {
      setIsSaving(false);
    }
  };

  const poTotal = getPoTotal();
  const fixingTotal = getFixingTotal();
  const netTotal = getNetTotal();
  const returnTotal = getReturnTotal();

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0A1628', '#142240']}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={[styles.headerContent, { paddingTop: insets.top + webTopInset + 12 }]}>
          <Pressable onPress={() => router.back()} style={styles.headerBtn}>
            <Ionicons name="arrow-back" size={20} color={Colors.white} />
          </Pressable>
          <View style={styles.headerTitleBlock}>
            <MaterialCommunityIcons name="file-document-outline" size={18} color={Colors.accent} />
            <Text style={styles.headerTitle}>INVOICE</Text>
          </View>
          <Pressable onPress={handleSave} style={[styles.headerBtn, styles.saveBtn]} disabled={isSaving}>
            <Ionicons name="checkmark" size={20} color={Colors.white} />
          </Pressable>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + webBottomInset + 24 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.columnsContainer}>
          <View style={styles.columnLeft}>
            <View style={styles.colHeader}>
              <LinearGradient colors={['#6366F1', '#818CF8']} style={styles.colHeaderDot} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                <MaterialCommunityIcons name="file-plus-outline" size={13} color="#fff" />
              </LinearGradient>
              <Text style={styles.colHeaderText}>MAIN INVOICE</Text>
            </View>

            {mainEntries.map((entry, idx) => (
              <MainEntryCard
                key={entry.id}
                entry={entry}
                index={idx}
                showRemove={mainEntries.length > 1}
                onUpdate={(patch) => updateMain(entry.id, patch)}
                onRemove={() => removeMain(entry.id)}
              />
            ))}

            <Pressable onPress={addMain} style={styles.addEntryBtn}>
              <Ionicons name="add-circle-outline" size={15} color="#6366F1" />
              <Text style={styles.addEntryText}>Add Entry</Text>
            </Pressable>
          </View>

          <View style={styles.divider} />

          <View style={styles.columnRight}>
            <View style={styles.colHeader}>
              <LinearGradient colors={['#F59E0B', '#FBBF24']} style={styles.colHeaderDot} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                <MaterialCommunityIcons name="swap-horizontal" size={13} color="#fff" />
              </LinearGradient>
              <Text style={styles.colHeaderText}>RETURN / CN</Text>
            </View>

            {returnEntries.map((entry, idx) => (
              <ReturnEntryCard
                key={entry.id}
                entry={entry}
                index={idx}
                showRemove={returnEntries.length > 1}
                onUpdate={(patch) => updateReturn(entry.id, patch)}
                onRemove={() => removeReturn(entry.id)}
              />
            ))}

            <Pressable onPress={addReturn} style={[styles.addEntryBtn, styles.addEntryBtnRight]}>
              <Ionicons name="add-circle-outline" size={15} color="#F59E0B" />
              <Text style={[styles.addEntryText, { color: '#F59E0B' }]}>Add Entry</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>AMOUNT SUMMARY</Text>
          <View style={styles.summaryRows}>
            <SummaryRow label="PO Total" value={poTotal.toFixed(2)} color={Colors.primary} />
            {fixingTotal > 0 && (
              <SummaryRow label="Fixing Deduction" value={`-${fixingTotal.toFixed(2)}`} color={Colors.danger} />
            )}
            <View style={styles.summaryDivider} />
            <SummaryRow label="NET TOTAL" value={`${netTotal.toFixed(2)} SAR`} color="#6366F1" bold />
            {returnTotal > 0 && (
              <SummaryRow label="Return / CN" value={`${returnTotal.toFixed(2)} SAR`} color="#F59E0B" bold />
            )}
          </View>
        </View>

        <View style={styles.photoCard}>
          <View style={styles.photoCardHeader}>
            <View style={styles.photoHeaderLeft}>
              <Ionicons name="camera-outline" size={18} color={Colors.accent} />
              <Text style={styles.photoCardTitle}>PHOTOS</Text>
            </View>
            <Text style={styles.photoCount}>{photos.length}/100</Text>
          </View>

          {photos.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoScroll} contentContainerStyle={styles.photoScrollContent}>
              {photos.map((uri) => (
                <View key={uri} style={styles.photoThumb}>
                  <Image source={{ uri }} style={styles.photoImg} />
                  <Pressable onPress={() => removePhoto(uri)} style={styles.photoRemoveBtn}>
                    <Ionicons name="close" size={12} color="#fff" />
                  </Pressable>
                </View>
              ))}
            </ScrollView>
          )}

          <Pressable onPress={pickPhotos} style={styles.photoPickBtn}>
            <Ionicons name="add" size={18} color={Colors.white} />
            <Text style={styles.photoPickText}>
              {photos.length === 0 ? 'Add Photos (Required)' : 'Add More Photos'}
            </Text>
          </Pressable>

          {photos.length === 0 && (
            <Text style={styles.photoHint}>Minimum 1 photo required to save</Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function SummaryRow({ label, value, color, bold }: { label: string; value: string; color: string; bold?: boolean }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={[styles.summaryLabel, bold && styles.summaryLabelBold]}>{label}</Text>
      <Text style={[styles.summaryValue, { color }, bold && styles.summaryValueBold]}>{value}</Text>
    </View>
  );
}

function MainEntryCard({
  entry,
  index,
  showRemove,
  onUpdate,
  onRemove,
}: {
  entry: MainEntry;
  index: number;
  showRemove: boolean;
  onUpdate: (patch: Partial<MainEntry>) => void;
  onRemove: () => void;
}) {
  const formatted = formatMainNumber(entry);

  return (
    <View style={styles.entryCard}>
      <View style={styles.entryTopRow}>
        <Text style={styles.entryIndex}>#{index + 1}</Text>
        <View style={styles.typeToggle}>
          <Pressable
            onPress={() => onUpdate({ type: 'PO' })}
            style={[styles.typeBtn, entry.type === 'PO' && styles.typeBtnActivePO]}
          >
            <Text style={[styles.typeBtnText, entry.type === 'PO' && styles.typeBtnTextActive]}>PO</Text>
          </Pressable>
          <Pressable
            onPress={() => onUpdate({ type: 'ST' })}
            style={[styles.typeBtn, entry.type === 'ST' && styles.typeBtnActiveST]}
          >
            <Text style={[styles.typeBtnText, entry.type === 'ST' && styles.typeBtnTextActive]}>ST</Text>
          </Pressable>
        </View>
        {showRemove && (
          <Pressable onPress={onRemove} style={styles.entryRemoveBtn}>
            <Ionicons name="trash-outline" size={13} color={Colors.danger} />
          </Pressable>
        )}
      </View>

      <View style={styles.entryNumberRow}>
        <View style={styles.entryPrefix}>
          <Text style={styles.entryPrefixText}>{entry.type}</Text>
        </View>
        <TextInput
          style={styles.entryNumberInput}
          placeholder="Number"
          placeholderTextColor={Colors.grayLight}
          value={entry.number}
          onChangeText={(v) => onUpdate({ number: v })}
          keyboardType="default"
        />
      </View>

      {formatted ? (
        <Text style={styles.entryFormatted}>{formatted}</Text>
      ) : null}

      {entry.type === 'PO' && (
        <>
          <TextInput
            style={styles.entryAmountInput}
            placeholder="Amount (SAR)"
            placeholderTextColor={Colors.grayLight}
            value={entry.amount}
            onChangeText={(v) => onUpdate({ amount: v })}
            keyboardType="numeric"
          />

          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onUpdate({ isFixing: !entry.isFixing });
            }}
            style={styles.fixingRow}
          >
            <View style={[styles.checkbox, entry.isFixing && styles.checkboxChecked]}>
              {entry.isFixing && <Ionicons name="checkmark" size={11} color="#fff" />}
            </View>
            <Text style={styles.fixingLabel}>Fixing</Text>
          </Pressable>

          {entry.isFixing && (
            <View style={styles.fixingBlock}>
              <View style={styles.fixingNumberRow}>
                <Text style={styles.fixingNumberPrefix}>{formatted}-</Text>
                <TextInput
                  style={styles.fixingSuffixInput}
                  placeholder="suffix"
                  placeholderTextColor={Colors.grayLight}
                  value={entry.fixingSuffix}
                  onChangeText={(v) => onUpdate({ fixingSuffix: v })}
                />
              </View>
              <TextInput
                style={styles.entryAmountInput}
                placeholder="Fixing Amt"
                placeholderTextColor={Colors.grayLight}
                value={entry.fixingAmount}
                onChangeText={(v) => onUpdate({ fixingAmount: v })}
                keyboardType="numeric"
              />
            </View>
          )}
        </>
      )}
    </View>
  );
}

function ReturnEntryCard({
  entry,
  index,
  showRemove,
  onUpdate,
  onRemove,
}: {
  entry: ReturnEntry;
  index: number;
  showRemove: boolean;
  onUpdate: (patch: Partial<ReturnEntry>) => void;
  onRemove: () => void;
}) {
  const formatted = formatReturnNumber(entry);

  return (
    <View style={[styles.entryCard, styles.entryCardReturn]}>
      <View style={styles.entryTopRow}>
        <Text style={styles.entryIndex}>#{index + 1}</Text>
        <View style={styles.typeToggle}>
          <Pressable
            onPress={() => onUpdate({ type: 'PO' })}
            style={[styles.typeBtn, entry.type === 'PO' && styles.typeBtnActivePO]}
          >
            <Text style={[styles.typeBtnText, entry.type === 'PO' && styles.typeBtnTextActive]}>PO</Text>
          </Pressable>
          <Pressable
            onPress={() => onUpdate({ type: 'RT' })}
            style={[styles.typeBtn, entry.type === 'RT' && styles.typeBtnActiveRT]}
          >
            <Text style={[styles.typeBtnText, entry.type === 'RT' && styles.typeBtnTextActive]}>RT</Text>
          </Pressable>
        </View>
        {showRemove && (
          <Pressable onPress={onRemove} style={styles.entryRemoveBtn}>
            <Ionicons name="trash-outline" size={13} color={Colors.danger} />
          </Pressable>
        )}
      </View>

      <View style={styles.entryNumberRow}>
        <View style={[styles.entryPrefix, styles.entryPrefixReturn]}>
          <Text style={styles.entryPrefixText}>{entry.type}</Text>
        </View>
        <TextInput
          style={styles.entryNumberInput}
          placeholder="Number"
          placeholderTextColor={Colors.grayLight}
          value={entry.number}
          onChangeText={(v) => onUpdate({ number: v })}
          keyboardType="default"
        />
      </View>

      {formatted ? (
        <Text style={[styles.entryFormatted, { color: '#F59E0B' }]}>{formatted}</Text>
      ) : null}

      <TextInput
        style={styles.entryAmountInput}
        placeholder="Amount (SAR)"
        placeholderTextColor={Colors.grayLight}
        value={entry.amount}
        onChangeText={(v) => onUpdate({ amount: v })}
        keyboardType="numeric"
      />
    </View>
  );
}

const COL_WIDTH = (SCREEN_W - 40 - 1) / 2;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.offWhite,
  },
  header: {
    paddingBottom: 18,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveBtn: {
    backgroundColor: Colors.accent,
  },
  headerTitleBlock: {
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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 14,
  },
  columnsContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  columnLeft: {
    width: COL_WIDTH,
    padding: 12,
    gap: 10,
  },
  divider: {
    width: 1,
    backgroundColor: Colors.offWhite,
  },
  columnRight: {
    width: COL_WIDTH,
    padding: 12,
    gap: 10,
  },
  colHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.offWhite,
  },
  colHeaderDot: {
    width: 24,
    height: 24,
    borderRadius: 7,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colHeaderText: {
    fontSize: 10,
    fontFamily: 'Poppins_700Bold',
    color: Colors.primary,
    letterSpacing: 0.8,
    flexShrink: 1,
  },
  entryCard: {
    backgroundColor: Colors.offWhite,
    borderRadius: 12,
    padding: 10,
    gap: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#6366F1',
  },
  entryCardReturn: {
    borderLeftColor: '#F59E0B',
  },
  entryTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  entryIndex: {
    fontSize: 10,
    fontFamily: 'Poppins_600SemiBold',
    color: Colors.gray,
  },
  typeToggle: {
    flexDirection: 'row',
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 8,
    overflow: 'hidden',
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 5,
    alignItems: 'center',
  },
  typeBtnActivePO: {
    backgroundColor: '#6366F1',
  },
  typeBtnActiveST: {
    backgroundColor: '#10B981',
  },
  typeBtnActiveRT: {
    backgroundColor: '#F59E0B',
  },
  typeBtnText: {
    fontSize: 10,
    fontFamily: 'Poppins_700Bold',
    color: Colors.gray,
    letterSpacing: 0.5,
  },
  typeBtnTextActive: {
    color: '#fff',
  },
  entryRemoveBtn: {
    width: 24,
    height: 24,
    borderRadius: 7,
    backgroundColor: 'rgba(239,68,68,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  entryNumberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 9,
    overflow: 'hidden',
  },
  entryPrefix: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 7,
    paddingVertical: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  entryPrefixReturn: {
    backgroundColor: '#F59E0B',
  },
  entryPrefixText: {
    fontSize: 10,
    fontFamily: 'Poppins_700Bold',
    color: '#fff',
  },
  entryNumberInput: {
    flex: 1,
    paddingHorizontal: 8,
    paddingVertical: 9,
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    color: Colors.primary,
  },
  entryFormatted: {
    fontSize: 10,
    fontFamily: 'Poppins_600SemiBold',
    color: '#6366F1',
    marginTop: -4,
  },
  entryAmountInput: {
    backgroundColor: Colors.white,
    borderRadius: 9,
    paddingHorizontal: 10,
    paddingVertical: 9,
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    color: Colors.primary,
  },
  fixingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  checkbox: {
    width: 16,
    height: 16,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: Colors.grayLight,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.white,
  },
  checkboxChecked: {
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
  },
  fixingLabel: {
    fontSize: 11,
    fontFamily: 'Poppins_500Medium',
    color: Colors.gray,
  },
  fixingBlock: {
    backgroundColor: 'rgba(99,102,241,0.06)',
    borderRadius: 9,
    padding: 8,
    gap: 7,
    borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.15)',
  },
  fixingNumberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  fixingNumberPrefix: {
    fontSize: 11,
    fontFamily: 'Poppins_600SemiBold',
    color: '#6366F1',
  },
  fixingSuffixInput: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 7,
    paddingHorizontal: 8,
    paddingVertical: 7,
    fontSize: 11,
    fontFamily: 'Poppins_400Regular',
    color: Colors.primary,
  },
  addEntryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#6366F1',
    borderStyle: 'dashed',
  },
  addEntryBtnRight: {
    borderColor: '#F59E0B',
  },
  addEntryText: {
    fontSize: 11,
    fontFamily: 'Poppins_600SemiBold',
    color: '#6366F1',
  },
  summaryCard: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
    gap: 12,
  },
  summaryTitle: {
    fontSize: 11,
    fontFamily: 'Poppins_700Bold',
    color: Colors.gray,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  summaryRows: {
    gap: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    color: Colors.grayDark,
  },
  summaryLabelBold: {
    fontFamily: 'Poppins_700Bold',
    color: Colors.primary,
  },
  summaryValue: {
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
  },
  summaryValueBold: {
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: Colors.offWhite,
  },
  photoCard: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
    gap: 12,
  },
  photoCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  photoHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  photoCardTitle: {
    fontSize: 13,
    fontFamily: 'Poppins_700Bold',
    color: Colors.primary,
    letterSpacing: 1,
  },
  photoCount: {
    fontSize: 12,
    fontFamily: 'Poppins_600SemiBold',
    color: Colors.gray,
  },
  photoScroll: {
    marginHorizontal: -6,
  },
  photoScrollContent: {
    paddingHorizontal: 6,
    gap: 10,
    flexDirection: 'row',
  },
  photoThumb: {
    width: 72,
    height: 72,
    borderRadius: 12,
    overflow: 'visible',
    position: 'relative',
  },
  photoImg: {
    width: 72,
    height: 72,
    borderRadius: 12,
    backgroundColor: Colors.offWhite,
  },
  photoRemoveBtn: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.danger,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  photoPickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.accent,
    borderRadius: 12,
    paddingVertical: 14,
  },
  photoPickText: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: Colors.white,
  },
  photoHint: {
    fontSize: 11,
    fontFamily: 'Poppins_400Regular',
    color: Colors.gray,
    textAlign: 'center',
    marginTop: -4,
  },
});
