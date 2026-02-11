import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSequence,
  withSpring,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useAuth } from '@/lib/auth-context';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/colors';

export default function SplashAnimationScreen() {
  const { isLoggedIn, selectedStore, isLoading } = useAuth();

  const iconScale = useSharedValue(0);
  const iconOpacity = useSharedValue(0);
  const titleOpacity = useSharedValue(0);
  const titleTranslateY = useSharedValue(30);
  const subtitleOpacity = useSharedValue(0);
  const subtitleTranslateY = useSharedValue(20);
  const creditOpacity = useSharedValue(0);
  const wholeOpacity = useSharedValue(1);
  const pulseScale = useSharedValue(1);

  const navigated = useRef(false);

  const navigateAway = () => {
    if (navigated.current) return;
    navigated.current = true;
    if (isLoggedIn && selectedStore) {
      router.replace('/dashboard');
    } else if (isLoggedIn) {
      router.replace('/store-select');
    } else {
      router.replace('/login');
    }
  };

  useEffect(() => {
    if (isLoading) return;

    iconOpacity.value = withDelay(300, withTiming(1, { duration: 600 }));
    iconScale.value = withDelay(300, withSpring(1, { damping: 12, stiffness: 100 }));

    pulseScale.value = withDelay(900, withSequence(
      withTiming(1.1, { duration: 300 }),
      withTiming(1, { duration: 300 }),
    ));

    titleOpacity.value = withDelay(800, withTiming(1, { duration: 500 }));
    titleTranslateY.value = withDelay(800, withSpring(0, { damping: 15 }));

    subtitleOpacity.value = withDelay(1200, withTiming(1, { duration: 500 }));
    subtitleTranslateY.value = withDelay(1200, withSpring(0, { damping: 15 }));

    creditOpacity.value = withDelay(1600, withTiming(1, { duration: 500 }));

    wholeOpacity.value = withDelay(3200, withTiming(0, { duration: 400, easing: Easing.ease }, () => {
      runOnJS(navigateAway)();
    }));
  }, [isLoading]);

  const iconAnimStyle = useAnimatedStyle(() => ({
    opacity: iconOpacity.value,
    transform: [{ scale: iconScale.value * pulseScale.value }],
  }));

  const titleAnimStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleTranslateY.value }],
  }));

  const subtitleAnimStyle = useAnimatedStyle(() => ({
    opacity: subtitleOpacity.value,
    transform: [{ translateY: subtitleTranslateY.value }],
  }));

  const creditAnimStyle = useAnimatedStyle(() => ({
    opacity: creditOpacity.value,
  }));

  const containerAnimStyle = useAnimatedStyle(() => ({
    opacity: wholeOpacity.value,
  }));

  return (
    <Animated.View style={[styles.container, containerAnimStyle]}>
      <LinearGradient
        colors={['#0A1628', '#142240', '#1A2D50']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <View style={styles.content}>
        <Animated.View style={[styles.iconContainer, iconAnimStyle]}>
          <LinearGradient
            colors={[Colors.accent, Colors.accentLight]}
            style={styles.iconGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="clipboard-outline" size={48} color={Colors.white} />
          </LinearGradient>
        </Animated.View>

        <Animated.View style={titleAnimStyle}>
          <Text style={styles.title}>InvenTrack</Text>
          <Text style={styles.titleAccent}>Pro</Text>
        </Animated.View>

        <Animated.View style={subtitleAnimStyle}>
          <Text style={styles.subtitle}>Inventory Management System</Text>
        </Animated.View>
      </View>

      <Animated.View style={[styles.creditContainer, creditAnimStyle]}>
        <Text style={styles.creditLabel}>MADE BY</Text>
        <Text style={styles.creditName}>Mohammad Yaqoob</Text>
        <Text style={styles.creditRole}>Senior Shopper Rimal</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    gap: 16,
  },
  iconContainer: {
    marginBottom: 20,
  },
  iconGradient: {
    width: 100,
    height: 100,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 42,
    fontFamily: 'Poppins_700Bold',
    color: Colors.white,
    textAlign: 'center',
    letterSpacing: 1,
  },
  titleAccent: {
    fontSize: 42,
    fontFamily: 'Poppins_700Bold',
    color: Colors.accent,
    textAlign: 'center',
    marginTop: -12,
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: Colors.grayLight,
    textAlign: 'center',
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  creditContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'web' ? 60 : 80,
    alignItems: 'center',
    gap: 4,
  },
  creditLabel: {
    fontSize: 10,
    fontFamily: 'Poppins_500Medium',
    color: Colors.gray,
    letterSpacing: 3,
  },
  creditName: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: Colors.white,
  },
  creditRole: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    color: Colors.grayLight,
  },
});
