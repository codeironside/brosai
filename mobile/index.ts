import { registerRootComponent } from 'expo';
import * as SplashScreen from 'expo-splash-screen';
import App from './App';

SplashScreen.preventAutoHideAsync().catch(() => {});

registerRootComponent(App);
