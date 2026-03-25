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
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';

function genId() {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

interface ReturnEntry {
  id: string;
  type: 'PO' | 'RT';
  number: string;
  amount: string;
}

function emptyReturn(): ReturnEntry {
  return { id: genId(), type: 'PO', number: '', amount: '' };
}

function formatReturnNumber(entry: ReturnEntry): string {
  if (!entry.number.trim()) return '';
  return entry.type === 'RT'
    ? `RT-${entry.number.trim()}`
    : `PO${entry.number.trim()}`;
}

export default function InvoiceReturnScreen() {
  const insets = useSafeAreaInsets();
  const webTopInset = Platform.OS === 'web' ? 67 : 0;
  const webBottomInset = Platform.OS === 'web' ? 34 : 0;

  const [entries, setEntries] = useState<ReturnEntry[]>([emptyReturn()]);
  const [photos, setPhotos] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const updateEntry = useCallback((id: string, patch: Partial<ReturnEntry>) => {
    setEntries(prev => prev.map(e => (e.id === id ? { ...e, ...patch } : e)));
  }, []);

  const addEntry = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEntries(prev => [...prev, emptyReturn()]);
  };

  const removeEntry = (id: string) => {
    if (entries.length <= 1) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEntries(prev => prev.filter(e => e.id !== id));
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

  const returnTotal = entries.reduce(
    (s, e) => s + (parseFloat(e.amount) || 0),
    0
  );

  const handleSave = async () => {
    if (photos.length < 1) {
      Alert.alert('Photo Required', 'Please add at least 1 photo before saving.');
      return;
    }
    setIsSaving(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      const existing = await AsyncStorage.getItem('invoices');
      const invoices = existing ? JSON.parse(existing) : [];
      invoices.push({
        id: genId(),
        type: 'RETURN',
        entries: entries.map(e => ({
          type: e.type,
          number: formatReturnNumber(e),
          amount: e.amount,
        })),
        returnTotal: returnTotal.toFixed(2),
        photoCount: photos.length,
        createdAt: new Date().toISOString(),
      });
      await AsyncStorage.setItem('invoices', JSON.stringify(invoices));
      Alert.alert('Saved', 'Return / CN saved successfully', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch {
      Alert.alert('Error', 'Failed to save return');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0A1628', '#1a2d4a']}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={[styles.headerTop, { paddingTop: insets.top + webTopInset + 10 }]}>
          <Pressable onPress={() => router.back()} style={styles.iconBtn}>
            <Ionicons name="arrow-back" size={20} color={Colors.white} />
          </Pressable>
          <View style={styles.headerCenter}>
            <MaterialCommunityIcons name="swap-horizontal" size={16} color="#FBBF24" />
            <Text style={styles.headerTitle}>RETURN / CN</Text>
          </View>
          <Pressable
            onPress={handleSave}
            style={[styles.iconBtn, { backgroundColor: '#F59E0B' }]}
            disabled={isSaving}
          >
            <Ionicons name="checkmark" size={20} color={Colors.white} />
          </Pressable>
        </View>

        <View style={styles.tabStrip}>
          <Pressable
            style={styles.tabInactive}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.back();
            }}
          >
            <Ionicons name="chevron-back" size={12} color="rgba(255,255,255,0.4)" />
            <Ionicons name="document-text-outline" size={13} color="rgba(255,255,255,0.5)" />
            <Text style={styles.tabInactiveText}>MAIN INVOICE</Text>
          </Pressable>
          <View style={styles.tabActive}>
            <MaterialCommunityIcons name="swap-horizontal" size={13} color={Colors.white} />
            <Text style={styles.tabActiveText}>RETURN / CN</Text>
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
        {entries.map((entry, index) => (
          <ReturnEntryCard
            key={entry.id}
            entry={entry}
            index={index}
            showRemove={entries.length > 1}
            onUpdate={patch => updateEntry(entry.id, patch)}
            onRemove={() => removeEntry(entry.id)}
          />
        ))}

        <Pressable onPress={addEntry} style={styles.addBtn}>
          <Ionicons name="add-circle-outline" size={18} color="#F59E0B" />
          <Text style={styles.addBtnText}>Add Entry</Text>
        </Pressable>

        {returnTotal > 0 && (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>RETURN SUMMARY</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total Return / CN</Text>
              <Text style={styles.summaryVal}>{returnTotal.toFixed(2)} SAR</Text>
            </View>
          </View>
        )}

        <View style={styles.photoCard}>
          <View style={styles.photoHeader}>
            <View style={styles.photoHeaderLeft}>
              <Ionicons name="camera-outline" size={17} color="#F59E0B" />
              <Text style={styles.photoTitle}>PHOTOS</Text>
            </View>
            <Text style={styles.photoCount}>{photos.length} / 100</Text>
          </View>

          {photos.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.photoRow}
            >
              {photos.map(uri => (
                <View key={uri} style={styles.thumb}>
                  <Image source={{ uri }} style={styles.thumbImg} />
                  <Pressable onPress={() => removePhoto(uri)} style={styles.thumbRemove}>
                    <Ionicons name="close" size={11} color="#fff" />
                  </Pressable>
                </View>
              ))}
            </ScrollView>
          )}

          <Pressable onPress={pickPhotos} style={styles.photoBtn}>
            <Ionicons name="add" size={17} color={Colors.white} />
            <Text style={styles.photoBtnText}>
              {photos.length === 0 ? 'Add Photos (Min 1 Required)' : 'Add More Photos'}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
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
  onUpdate: (p: Partial<ReturnEntry>) => void;
  onRemove: () => void;
}) {
  const formatted = formatReturnNumber(entry);

  return (
    <View style={styles.entryCard}>
      <View style={styles.entryRow}>
        <View style={styles.entryBadge}>
          <Text style={styles.entryBadgeText}>#{index + 1}</Text>
        </View>

        <View style={styles.typeToggle}>
          <Pressable
            style={[styles.typeBtn, entry.type === 'PO' && styles.typeBtnPO]}
            onPress={() => onUpdate({ type: 'PO' })}
          >
            <Text style={[styles.typeTxt, entry.type === 'PO' && styles.typeTxtActive]}>PO</Text>
          </Pressable>
          <Pressable
            style={[styles.typeBtn, entry.type === 'RT' && styles.typeBtnRT]}
            onPress={() => onUpdate({ type: 'RT' })}
          >
            <Text style={[styles.typeTxt, entry.type === 'RT' && styles.typeTxtActive]}>RT</Text>
          </Pressable>
        </View>

        {showRemove && (
          <Pressable onPress={onRemove} style={styles.removeBtn}>
            <Ionicons name="trash-outline" size={14} color={Colors.danger} />
          </Pressable>
        )}
      </View>

      <View style={styles.numberRow}>
        <View style={[styles.prefixBox, entry.type === 'RT' && styles.prefixBoxRT]}>
          <Text style={styles.prefixTxt}>{entry.type}</Text>
        </View>
        <TextInput
          style={styles.numberInput}
          placeholder={entry.type === 'PO' ? 'PO Number' : 'RT Number'}
          placeholderTextColor={Colors.grayLight}
          value={entry.number}
          onChangeText={v => onUpdate({ number: v })}
        />
      </View>

      {!!formatted && (
        <View style={styles.formattedRow}>
          <Ionicons name="checkmark-circle" size={13} color="#F59E0B" />
          <Text style={styles.formattedTxt}>{formatted}</Text>
        </View>
      )}

      <TextInput
        style={styles.amountInput}
        placeholder="Amount (SAR)"
        placeholderTextColor={Colors.grayLight}
        value={entry.amount}
        onChangeText={v => onUpdate({ amount: v })}
        keyboardType="numeric"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.offWhite },

  header: { paddingBottom: 0 },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingBottom: 16,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
    color: Colors.white,
    letterSpacing: 1.5,
  },

  tabStrip: {
    flexDirection: 'row',
    marginHorizontal: 18,
    marginBottom: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    padding: 4,
    gap: 4,
  },
  tabActive: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#F59E0B',
    borderRadius: 10,
    paddingVertical: 10,
  },
  tabActiveText: {
    fontSize: 11,
    fontFamily: 'Poppins_700Bold',
    color: Colors.white,
    letterSpacing: 0.8,
  },
  tabInactive: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderRadius: 10,
    paddingVertical: 10,
  },
  tabInactiveText: {
    fontSize: 11,
    fontFamily: 'Poppins_600SemiBold',
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 0.8,
  },

  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 12 },

  entryCard: {
    backgroundColor: Colors.white,
    borderRadius: 18,
    padding: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  entryBadge: {
    backgroundColor: Colors.offWhite,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  entryBadgeText: {
    fontSize: 11,
    fontFamily: 'Poppins_600SemiBold',
    color: Colors.gray,
  },
  typeToggle: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: Colors.offWhite,
    borderRadius: 10,
    padding: 3,
    gap: 3,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 8,
    alignItems: 'center',
  },
  typeBtnPO: { backgroundColor: '#6366F1' },
  typeBtnRT: { backgroundColor: '#F59E0B' },
  typeTxt: {
    fontSize: 12,
    fontFamily: 'Poppins_700Bold',
    color: Colors.gray,
    letterSpacing: 0.5,
  },
  typeTxtActive: { color: Colors.white },
  removeBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(239,68,68,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  numberRow: {
    flexDirection: 'row',
    backgroundColor: Colors.offWhite,
    borderRadius: 12,
    overflow: 'hidden',
  },
  prefixBox: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  prefixBoxRT: { backgroundColor: '#F59E0B' },
  prefixTxt: {
    fontSize: 12,
    fontFamily: 'Poppins_700Bold',
    color: Colors.white,
  },
  numberInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: Colors.primary,
  },

  formattedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: -4,
  },
  formattedTxt: {
    fontSize: 12,
    fontFamily: 'Poppins_600SemiBold',
    color: '#F59E0B',
  },

  amountInput: {
    backgroundColor: Colors.offWhite,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: Colors.primary,
  },

  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#F59E0B',
    borderStyle: 'dashed',
  },
  addBtnText: {
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
    color: '#F59E0B',
  },

  summaryCard: {
    backgroundColor: Colors.white,
    borderRadius: 18,
    padding: 18,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  summaryTitle: {
    fontSize: 11,
    fontFamily: 'Poppins_700Bold',
    color: Colors.gray,
    letterSpacing: 2,
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
  summaryVal: {
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
    color: '#F59E0B',
  },

  photoCard: {
    backgroundColor: Colors.white,
    borderRadius: 18,
    padding: 18,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  photoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  photoHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  photoTitle: {
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
  photoRow: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 4,
  },
  thumb: {
    width: 76,
    height: 76,
    borderRadius: 12,
  },
  thumbImg: {
    width: 76,
    height: 76,
    borderRadius: 12,
    backgroundColor: Colors.offWhite,
  },
  thumbRemove: {
    position: 'absolute',
    top: -5,
    right: -5,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.danger,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F59E0B',
    borderRadius: 14,
    paddingVertical: 14,
  },
  photoBtnText: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: Colors.white,
  },
});
