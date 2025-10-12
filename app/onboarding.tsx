import { Button } from '@/components/ui/button';
import { theme } from '@/components/ui/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Dimensions, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

const slides = [
  {
    image: require('@/assets/onboarding/onboarding1.png'),
    title: 'Gerencie sua Fidelidade',
    text: 'Crie cartões personalizados e acompanhe o progresso dos seus clientes em tempo real.',
  },
  {
    image: require('@/assets/onboarding/onboarding2.png'),
    title: 'Recompense seus clientes',
    text: 'Ofereça prêmios e descontos para incentivar o retorno e fidelizar clientes fiéis.',
  },
  {
    image: require('@/assets/onboarding/onboarding3.png'),
    title: 'Acompanhe seus resultados',
    text: 'Veja estatísticas de resgates e crescimento da sua base de clientes.',
  },
];

export default function OnboardingScreen() {
  const [index, setIndex] = useState(0);
  const insets = useSafeAreaInsets();
  const router = useRouter();

  async function next() {
    if (index < slides.length - 1) setIndex(index + 1);
    else {
      await AsyncStorage.setItem('@seen_onboarding', '1');
      router.replace('/(tabs)/cards' as never);
    }
  }

  async function skip() {
    await AsyncStorage.setItem('@seen_onboarding', '1');
    router.replace('/(tabs)/cards' as never);
  }

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top + 20 }]}>
      {/* Conteúdo */}
      <View style={styles.body}>
        <Image source={slides[index].image} style={styles.image} resizeMode="contain" />

        <Text style={styles.title}>{slides[index].title}</Text>
        <Text style={styles.text}>{slides[index].text}</Text>
      </View>

      {/* Navegação inferior */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.dots}>
          {slides.map((_, i) => (
            <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
          ))}
        </View>

        <Button
          title={index === slides.length - 1 ? 'Começar' : 'Próximo'}
          onPress={next}
        />

        <Pressable onPress={skip}>
          <Text style={styles.skip}>Pular</Text>
        </Pressable>

        <View style={styles.legal}>
          <Pressable onPress={() => router.push('/terms' as never)}>
            <Text style={styles.legalText}>Termos de Uso</Text>
          </Pressable>
          <Text style={{ color: theme.colors.text }}> • </Text>
          <Pressable onPress={() => router.push('/privacy' as never)}>
            <Text style={styles.legalText}>Política de Privacidade</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg, alignItems: 'center' },
  body: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  image: { width: width * 0.8, height: width * 0.7, marginBottom: 40 },
  title: { fontSize: 22, fontWeight: '800', color: theme.colors.title, textAlign: 'center', marginBottom: 10 },
  text: { fontSize: 16, color: theme.colors.text, textAlign: 'center', lineHeight: 22 },
  footer: { alignItems: 'center', gap: 14, width: '100%' },
  dots: { flexDirection: 'row', gap: 8, justifyContent: 'center', alignItems: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.border },
  dotActive: { backgroundColor: theme.colors.primary, width: 16 },
  skip: { color: theme.colors.text, fontSize: 14 },
  legal: { flexDirection: 'row', justifyContent: 'center', gap: 4 },
  legalText: { color: theme.colors.primary, fontSize: 13 },
});
