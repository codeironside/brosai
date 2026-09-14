import { useEffect, useRef, useState } from 'react';
import { Animated, StatusBar, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useVideoPlayer } from 'expo-video';
import { useFonts, BarlowCondensed_800ExtraBold } from '@expo-google-fonts/barlow-condensed';
import * as SplashScreen from 'expo-splash-screen';
import { expoOut, HERO_VIDEO, type TabId } from './src/theme';
import { SessionProvider } from './src/session';
import { TabBar } from './src/components/TabBar';
import { SplashScreenView } from './src/screens/SplashScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { SearchScreen } from './src/screens/SearchScreen';
import { ChatScreen } from './src/screens/ChatScreen';
import { SavedScreen } from './src/screens/SavedScreen';
import { YouScreen } from './src/screens/YouScreen';

export default function App() {
  return (
    <SafeAreaProvider>
      <SessionProvider>
        <Root />
      </SessionProvider>
    </SafeAreaProvider>
  );
}

function Root() {
  const [fontsLoaded] = useFonts({ BarlowCondensed_800ExtraBold });
  const [tab, setTab] = useState<TabId>('home');
  const [showSplash, setShowSplash] = useState(true);
  const splashOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  const player = useVideoPlayer(HERO_VIDEO, (instance) => {
    instance.loop = true;
    instance.muted = true;
    instance.play();
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.timing(splashOpacity, {
        toValue: 0,
        duration: 420,
        easing: expoOut,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) setShowSplash(false);
      });
    }, 1800);
    return () => clearTimeout(timer);
  }, [splashOpacity]);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <View style={styles.stage}>
        {tab === 'home' && <HomeScreen />}
        {tab === 'search' && <SearchScreen />}
        {tab === 'chat' && <ChatScreen />}
        {tab === 'saved' && <SavedScreen />}
        {tab === 'you' && <YouScreen />}
      </View>
      <TabBar active={tab} onChange={setTab} />
      {showSplash && (
        <SplashScreenView player={player} fontsLoaded={fontsLoaded} opacity={splashOpacity} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  stage: { flex: 1 },
});
