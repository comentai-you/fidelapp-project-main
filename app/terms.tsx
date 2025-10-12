// app/terms.tsx
import { Header } from '@/components/ui/Header';
import { theme } from '@/components/ui/theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TermsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handleBack = () => {
    if (router.canGoBack()) router.back();
    else router.push('/' as never); // fallback para Home
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      {/* 🔙 Botão Voltar */}
      <Pressable
        onPress={handleBack}
        style={{
          position: 'absolute',
          top: insets.top + 10,
          left: 16,
          zIndex: 20,
          backgroundColor: theme.colors.card,
          borderRadius: 999,
          padding: 4,
          elevation: 4,
          shadowColor: '#000',
          shadowOpacity: 0.2,
          shadowRadius: 4,
          shadowOffset: { width: 0, height: 2 },
        }}
        accessibilityRole="button"
        accessibilityLabel="Voltar"
      >
        <Ionicons name="chevron-back" size={26} color={theme.colors.title} />
      </Pressable>

      {/* desloca o Header para não ser coberto pela seta */}
      <View style={{ paddingLeft: 44 }}>
        <Header title="Termos de Uso" />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <Text style={{ color: theme.colors.title, fontWeight: '800', fontSize: 18 }}>
          Termos de Uso
        </Text>

        <Text style={{ color: theme.colors.text, marginTop: 10, lineHeight: 22 }}>
          Este aplicativo armazena dados localmente no seu dispositivo. Não nos responsabilizamos por uso indevido ou
          perda de dados decorrente de desinstalação, troca de aparelho ou ações de terceiros. Ao usar o app, você
          concorda em utilizar as funcionalidades conforme previsto e respeitar a privacidade dos seus clientes.
        </Text>

        <Text style={{ color: theme.colors.text, marginTop: 10, lineHeight: 22 }}>
          Em versões futuras, poderemos oferecer sincronização em nuvem. Caso ativada, você deverá aceitar termos
          específicos de armazenamento e processamento de dados na nuvem.
        </Text>

        <Text style={{ color: theme.colors.muted, marginTop: 16 }}>
          Suporte: contato@seudominio.com
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
