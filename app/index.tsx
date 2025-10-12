// app/index.tsx
import { useSession } from '@/state/session';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

export default function Index() {
  const { session, loading } = useSession();
  const [checking, setChecking] = useState(true);
  const [goOnboarding, setGoOnboarding] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const seen = await AsyncStorage.getItem('@seen_onboarding');
        setGoOnboarding(!seen);
      } finally {
        setChecking(false);
      }
    })();
  }, []);

  if (loading || checking) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (goOnboarding) return <Redirect href="/onboarding" />;
  if (!session) return <Redirect href="/auth" />;
  return <Redirect href="/cards" />; // inicial quando logado
}
