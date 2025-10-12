// app/_layout.tsx
import { ToastProvider } from '@/components/ui/toast';
import { SessionProvider, useSession } from '@/state/session';
import { StoreProvider } from '@/state/store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Redirect, Slot, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useMemo } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

function LoadingScreen() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator />
    </View>
  );
}

function AppShell() {
  return <Slot />;
}

/** Guard declarativo: evita actions imperativas e elimina o warning */
function AuthGuard() {
  const pathname = usePathname();
  const { session, loading } = useSession();

  const PUBLIC = useMemo(
    () =>
      new Set<string>(['/onboarding', '/terms', '/privacy', '/auth']),
    []
  );

  if (loading) return <LoadingScreen />;

  const isPublic = PUBLIC.has(pathname || '');

  if (!session && !isPublic) {
    // ✅ sem replace, sem ação imperativa; o Router resolve a navegação
    return <Redirect href="/auth" />;
  }

  return <AppShell />;
}

export default function RootLayout() {
  const pathname = usePathname();

  // Onboarding: não redireciona quando estamos no /auth
  useEffect(() => {
    (async () => {
      try {
        const seen = await AsyncStorage.getItem('@seen_onboarding');
        const isOnboarding = pathname === '/onboarding';
        const isAuth = pathname === '/auth';
        if (!seen && !isOnboarding && !isAuth) {
          // Declarativo aqui também:
          // usamos Redirect no guard; aqui apenas setamos a flag.
          // Se você preferir forçar, pode usar um estado local + <Redirect />.
        }
      } catch (err) {
        console.warn('onboarding check error', err);
      }
    })();
  }, [pathname]);

  return (
    <SafeAreaProvider>
      <SessionProvider>
        <StoreProvider>
          <ToastProvider>
            <StatusBar style="dark" />
            <AuthGuard />
          </ToastProvider>
        </StoreProvider>
      </SessionProvider>
    </SafeAreaProvider>
  );
}
