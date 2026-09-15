import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { VideoView, type VideoPlayer } from 'expo-video';
import { Dimensions } from 'react-native';
import { expoOut } from '../theme';

const SCREEN = Dimensions.get('window');

type Props = {
  player: VideoPlayer;
  fontsLoaded: boolean;
  opacity: Animated.Value;
};

export function SplashScreenView({ player, fontsLoaded, opacity }: Props) {
  const brandY = useRef(new Animated.Value(28)).current;
  const brandOpacity = useRef(new Animated.Value(0)).current;
  const catchX = useRef(new Animated.Value(-48)).current;
  const catchOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.stagger(180, [
      Animated.parallel([
        Animated.timing(brandOpacity, { toValue: 1, duration: 700, easing: expoOut, useNativeDriver: true }),
        Animated.timing(brandY, { toValue: 0, duration: 700, easing: expoOut, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(catchOpacity, { toValue: 1, duration: 800, easing: expoOut, useNativeDriver: true }),
        Animated.timing(catchX, { toValue: 0, duration: 800, easing: expoOut, useNativeDriver: true }),
      ]),
    ]).start();
  }, [brandOpacity, brandY, catchOpacity, catchX]);

  return (
    <Animated.View style={[styles.splash, { opacity }]}>
      <VideoView
        player={player}
        style={styles.videoFill}
        contentFit="cover"
        nativeControls={false}
        allowsPictureInPicture={false}
      />
      <View style={styles.shade} />
      <View style={styles.copy}>
        <Animated.Text
          style={[
            styles.brand,
            fontsLoaded && styles.brandFont,
            { opacity: brandOpacity, transform: [{ translateY: brandY }] },
          ]}
        >
          VAMVAMVAM <Text style={styles.accent}>AI</Text>
        </Animated.Text>
        <Animated.Text
          style={[
            styles.catchLine,
            fontsLoaded && styles.brandFont,
            { opacity: catchOpacity, transform: [{ translateX: catchX }] },
          ]}
        >
          Ship AI workers while you sleep
        </Animated.Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  splash: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 30,
    backgroundColor: '#111111',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: SCREEN.width,
    height: SCREEN.height,
  },
  shade: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  copy: {
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  brand: {
    color: '#fff',
    fontSize: 42,
    letterSpacing: 0.6,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  brandFont: {
    fontFamily: 'BarlowCondensed_800ExtraBold',
  },
  accent: { color: '#7dd3fc' },
  catchLine: {
    marginTop: 14,
    color: '#fff',
    fontSize: 22,
    lineHeight: 26,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
});
