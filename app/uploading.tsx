import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Platform,
  Alert,
  FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import Colors from '@/constants/colors';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface UploadedFile {
  id: string;
  uri: string;
  name: string;
  uploadedAt: string;
}

export default function UploadingScreen() {
  const insets = useSafeAreaInsets();
  const webTopInset = Platform.OS === 'web' ? 67 : 0;
  const webBottomInset = Platform.OS === 'web' ? 34 : 0;

  const [files, setFiles] = useState<UploadedFile[]>([]);

  const pickImage = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets) {
        const newFiles: UploadedFile[] = result.assets.map((asset, index) => ({
          id: Date.now().toString() + index + Math.random().toString(36).substr(2, 9),
          uri: asset.uri,
          name: asset.fileName || `image_${Date.now()}_${index}.jpg`,
          uploadedAt: new Date().toISOString(),
        }));
        setFiles(prev => [...prev, ...newFiles]);
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const takePhoto = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Camera permission is required to take photos');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setFiles(prev => [...prev, {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          uri: asset.uri,
          name: asset.fileName || `photo_${Date.now()}.jpg`,
          uploadedAt: new Date().toISOString(),
        }]);
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const removeFile = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const handleSaveAll = async () => {
    if (files.length === 0) {
      Alert.alert('No Files', 'Please upload at least one file');
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      const existing = await AsyncStorage.getItem('uploads');
      const uploads = existing ? JSON.parse(existing) : [];
      uploads.push({
        id: Date.now().toString(),
        files: files.map(f => ({ name: f.name, uploadedAt: f.uploadedAt })),
        createdAt: new Date().toISOString(),
      });
      await AsyncStorage.setItem('uploads', JSON.stringify(uploads));
      Alert.alert('Success', `${files.length} file(s) saved successfully`, [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e) {
      Alert.alert('Error', 'Failed to save uploads');
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#3B82F6', '#60A5FA']}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={[styles.headerContent, { paddingTop: insets.top + webTopInset + 12 }]}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={Colors.white} />
          </Pressable>
          <Text style={styles.headerTitle}>UPLOADING</Text>
          <Pressable onPress={handleSaveAll} style={styles.saveBtn}>
            <Ionicons name="checkmark" size={22} color={Colors.white} />
          </Pressable>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + webBottomInset + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.uploadArea}>
          <View style={styles.uploadActions}>
            <Pressable
              onPress={pickImage}
              style={({ pressed }) => [styles.uploadBtn, pressed && styles.uploadBtnPressed]}
            >
              <View style={[styles.uploadIconBg, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}>
                <Ionicons name="images-outline" size={28} color="#3B82F6" />
              </View>
              <Text style={styles.uploadBtnTitle}>Gallery</Text>
              <Text style={styles.uploadBtnSub}>Pick from photos</Text>
            </Pressable>

            <Pressable
              onPress={takePhoto}
              style={({ pressed }) => [styles.uploadBtn, pressed && styles.uploadBtnPressed]}
            >
              <View style={[styles.uploadIconBg, { backgroundColor: 'rgba(99, 102, 241, 0.1)' }]}>
                <Ionicons name="camera-outline" size={28} color="#6366F1" />
              </View>
              <Text style={styles.uploadBtnTitle}>Camera</Text>
              <Text style={styles.uploadBtnSub}>Take a photo</Text>
            </Pressable>
          </View>
        </View>

        {files.length > 0 && (
          <View style={styles.filesSection}>
            <Text style={styles.filesTitle}>Uploaded Files ({files.length})</Text>
            <View style={styles.filesGrid}>
              {files.map((file) => (
                <View key={file.id} style={styles.fileCard}>
                  <Image source={{ uri: file.uri }} style={styles.fileImage} contentFit="cover" />
                  <Pressable onPress={() => removeFile(file.id)} style={styles.fileRemoveBtn}>
                    <Ionicons name="close-circle" size={24} color={Colors.danger} />
                  </Pressable>
                  <View style={styles.fileNameContainer}>
                    <Text style={styles.fileName} numberOfLines={1}>{file.name}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {files.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="cloud-upload-outline" size={48} color={Colors.grayLight} />
            <Text style={styles.emptyTitle}>No files uploaded</Text>
            <Text style={styles.emptySub}>Use the buttons above to add files</Text>
          </View>
        )}
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
    gap: 20,
  },
  uploadArea: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 3,
  },
  uploadActions: {
    flexDirection: 'row',
    gap: 12,
  },
  uploadBtn: {
    flex: 1,
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: Colors.offWhite,
    borderStyle: 'dashed',
    gap: 8,
  },
  uploadBtnPressed: {
    opacity: 0.8,
    backgroundColor: Colors.offWhite,
  },
  uploadIconBg: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadBtnTitle: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: Colors.primary,
  },
  uploadBtnSub: {
    fontSize: 11,
    fontFamily: 'Poppins_400Regular',
    color: Colors.gray,
  },
  filesSection: {
    gap: 12,
  },
  filesTitle: {
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
    color: Colors.gray,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  filesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  fileCard: {
    width: '47%' as any,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: Colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  fileImage: {
    width: '100%',
    height: 120,
  },
  fileRemoveBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
  },
  fileNameContainer: {
    padding: 10,
  },
  fileName: {
    fontSize: 11,
    fontFamily: 'Poppins_500Medium',
    color: Colors.grayDark,
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
});
