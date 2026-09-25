import { useEffect, useRef, useState } from 'react';
import { Animated, StatusBar, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useVideoPlayer } from 'expo-video';
import { useFonts, BarlowCondensed_800ExtraBold } from '@expo-google-fonts/barlow-condensed';
import * as SplashScreen from 'expo-splash-screen';
import { expoOut, HERO_VIDEO, type TabId } from './src/theme';
import { SessionProvider, useSession } from './src/session';
import { addNotificationResponseListener } from './src/api/push';
import { TabBar } from './src/components/TabBar';
import { SplashScreenView } from './src/screens/SplashScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { AgentsScreen } from './src/screens/AgentsScreen';
import { NewAgentScreen } from './src/screens/NewAgentScreen';
import { ChatScreen } from './src/screens/ChatScreen';
import { JobsScreen } from './src/screens/JobsScreen';
import { BrandScreen } from './src/screens/BrandScreen';
import { NewBrandScreen } from './src/screens/NewBrandScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { CronScreen } from './src/screens/CronScreen';
import { SearchScreen } from './src/screens/SearchScreen';
import { ConnectionsScreen } from './src/screens/ConnectionsScreen';
import { BillingScreen } from './src/screens/BillingScreen';

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
  const [recording, setRecording] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const splashOpacity = useRef(new Animated.Value(1)).current;
  const { ready } = useSession();

  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  useEffect(() => {
    let remove = () => {};
    addNotificationResponseListener((response) => {
      const type = String(response.notification.request.content.data?.type || '');
      if (type === 'clarification' || type === 'approval') setTab('home');
      if (type === 'chat') setTab('chat');
      if (type === 'cron') setTab('jobStart');
    }).then((sub) => {
      remove = () => sub.remove();
    });
    return () => remove();
  }, []);

  const player = useVideoPlayer(HERO_VIDEO, (instance) => {
    instance.loop = true;
    instance.muted = true;
    instance.play();
  });

  useEffect(() => {
    if (!ready) return;
    const timer = setTimeout(() => {
      Animated.timing(splashOpacity, {
        toValue: 0,
        duration: 420,
        easing: expoOut,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) setShowSplash(false);
      });
    }, 1400);
    return () => clearTimeout(timer);
  }, [ready, splashOpacity]);

  const openChat = () => setTab('chat');
  const openProfile = () => setTab('profile');
  const openSearch = () => setTab('search');

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <View style={styles.stage}>
        {tab === 'home' && (
          <HomeScreen
            onOpenChat={openChat}
            onOpenProfile={openProfile}
            onOpenSearch={openSearch}
          />
        )}
        {tab === 'search' && (
          <SearchScreen
            onBack={() => setTab('home')}
            onOpenChat={openChat}
            onOpenProfile={openProfile}
          />
        )}
        {tab === 'brand' && (
          <BrandScreen
            onOpenChat={openChat}
            onOpenProfile={openProfile}
            onCreateBrand={() => setTab('brandCreate')}
          />
        )}
        {tab === 'brandCreate' && (
          <NewBrandScreen
            onOpenChat={openChat}
            onOpenProfile={openProfile}
            onCreated={() => setTab('brand')}
          />
        )}
        {tab === 'agents' && (
          <AgentsScreen
            onOpenChat={openChat}
            onOpenProfile={openProfile}
            onOpenSearch={openSearch}
            onCreateAgent={() => setTab('agentCreate')}
          />
        )}
        {tab === 'agentCreate' && (
          <NewAgentScreen
            onOpenChat={openChat}
            onOpenProfile={openProfile}
            onCreated={() => setTab('agents')}
          />
        )}
        {tab === 'jobs' && (
          <JobsScreen
            onOpenChat={openChat}
            onOpenProfile={openProfile}
            onOpenSearch={openSearch}
            onStartJob={() => setTab('jobStart')}
          />
        )}
        {tab === 'jobStart' && (
          <CronScreen
            onOpenChat={openChat}
            onOpenProfile={openProfile}
            onOpened={() => setTab('jobs')}
          />
        )}
        {tab === 'profile' && (
          <ProfileScreen
            onBack={() => setTab('home')}
            onOpenChat={openChat}
            onOpenConnections={() => setTab('connections')}
            onOpenBilling={() => setTab('billing')}
          />
        )}
        {tab === 'connections' && (
          <ConnectionsScreen onBack={() => setTab('profile')} />
        )}
        {tab === 'billing' && (
          <BillingScreen onBack={() => setTab('profile')} />
        )}
        {tab === 'chat' && (
          <ChatScreen
            onBack={() => {
              setRecording(false);
              setTab('home');
            }}
            onOpenProfile={openProfile}
            listening={recording}
            onListeningChange={setRecording}
          />
        )}
      </View>
      {tab !== 'chat' ? (
        <TabBar
          active={tab}
          onChange={(id) => {
            if (id !== 'chat') setRecording(false);
            setTab(id);
          }}
          recording={recording}
          onStopRecording={() => setRecording(false)}
        />
      ) : null}
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
