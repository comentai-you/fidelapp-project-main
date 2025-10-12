// app/(tabs)/cards.tsx
import { useRootNavigationState, useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { FlatList, ImageBackground, Pressable, StyleSheet, Text, View } from 'react-native';

import { DevBadge } from '@/components/DevBadge';
import { Page } from '@/components/layout/Page';
import { Header } from '@/components/ui/Header';
import { Button } from '@/components/ui/button';
import { Card as UICard } from '@/components/ui/card';
import { theme } from '@/components/ui/theme';
import type { LoyaltyProgram } from '@/state/store';
import { useStore } from '@/state/store';


/** Capas disponíveis (keys em minúsculas, sem acento/espaço) */
const coverMap = {
  barber: require('@/assets/covers/barber.jpg'),
  coffee: require('@/assets/covers/coffee.jpg'),
  pet: require('@/assets/covers/pet.jpg'),
  pizza: require('@/assets/covers/pizza.jpg'),

  borracharia: require('@/assets/covers/Borracharia.jpg'),
  computacao: require('@/assets/covers/Computação.jpg'),
  costura: require('@/assets/covers/Costura.jpg'),
  educacao: require('@/assets/covers/Educação.jpg'),
  eletrica: require('@/assets/covers/Elétrica.jpg'),
  farmacias: require('@/assets/covers/Farmacias.jpg'),
  fitness: require('@/assets/covers/Fitness.jpg'),
  floricultura: require('@/assets/covers/Floricultura.jpg'),
  manicure: require('@/assets/covers/Manicure.jpg'),
  maquiagem: require('@/assets/covers/Maquiagem.jpg'),
  mecanica: require('@/assets/covers/Mecanica.jpg'),
  reformas: require('@/assets/covers/Reformas.jpg'),
  restaurantes: require('@/assets/covers/Restaurantes.jpg'),
  vestuario: require('@/assets/covers/Vestuário.jpg'),
  beleza: require('@/assets/covers/Beleza.jpg'),
} as const;

/** normaliza strings: minúsculas + remove acentos + remove espaços */
function normalizeKey(s: string) {
  return s
    .normalize('NFD') // separa diacríticos
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, '');
}

/** lookup seguro que evita erro TS7053 ao indexar `as const` com string */
function getCoverSrc(cover?: string) {
  if (!cover) return undefined;
  const key = normalizeKey(cover);
  const map = coverMap as Record<string, any>;
  return map[key];
}

export default function CardsScreen() {
  const router = useRouter();
  const navState = useRootNavigationState();
  const isNavReady = !!navState?.key;

  const { state } = useStore();
  const programs = useMemo(() => state.programs, [state.programs]);

  return (
    <Page>
      <Header title="Cartões" subtitle="Gerencie seus programas de fidelidade" />

      <FlatList<LoyaltyProgram>
        data={programs}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{ padding: theme.space.lg, paddingBottom: 160 }}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <UICard elevated style={styles.emptyCard}>
              <Text style={styles.emptyEmoji}>🎟️</Text>
              <Text style={styles.emptyTitle}>Nenhum programa por aqui… ainda</Text>
              <Text style={styles.emptyText}>
                Crie seu primeiro programa de fidelidade e comece a carimbar selos.
              </Text>
              <View style={{ height: 12 }} />
              <Button
                title="+ Criar programa"
                onPress={() => {
                  if (!isNavReady) return;
                  router.push('/program/new');
                }}
              />
            </UICard>
          </View>
        }
        renderItem={({ item }) => {
          const src = getCoverSrc(item.cover);
          return (
            <Pressable
              onPress={() => {
                if (!isNavReady) return;
                router.push({ pathname: '/program/[id]', params: { id: item.id } });
              }}
              style={{ marginBottom: theme.space.md }}
            >
              <UICard>
                {src && (
                  <ImageBackground
                    source={src}
                    style={styles.cover}
                    imageStyle={{ borderRadius: theme.radius.md }}
                    resizeMode="cover"
                  />
                )}
                <Text style={styles.cardTitle}>{item.name}</Text>
                <Text style={styles.cardSub}>
                  {item.totalStamps} selos • {item.reward}
                </Text>
                <Text style={styles.link}>Abrir</Text>
              </UICard>
            </Pressable>
          );
        }}
      />

      <View style={styles.ctaBar}>
        <Button
          title="+ Criar programa"
          onPress={() => {
            if (!isNavReady) return;
            router.push('/program/new');
          }}
        />

        {/* 👇 Adicione exatamente aqui, fora da FlatList, antes de fechar o <Page> */}
      {__DEV__ && <DevBadge />}
      </View>
    </Page>
  );
}

const styles = StyleSheet.create({
  cover: {
    width: '100%',
    height: 120,
    marginBottom: 10,
  },
  cardTitle: { fontSize: 18, fontWeight: '800', color: theme.colors.title },
  cardSub: { marginTop: 6, color: theme.colors.text, fontSize: theme.font.body },
  link: { marginTop: 10, color: theme.colors.primary, fontWeight: '700' },

  emptyWrap: { paddingTop: theme.space.xl },
  emptyCard: { alignItems: 'center', paddingVertical: theme.space.xl },
  emptyEmoji: { fontSize: 44 },
  emptyTitle: {
    marginTop: 8, fontSize: 18, fontWeight: '800', color: theme.colors.title, textAlign: 'center',
  },
  emptyText: {
    marginTop: 6, color: theme.colors.text, fontSize: theme.font.body, textAlign: 'center',
  },

  ctaBar: {
    position: 'absolute',
    left: theme.space.lg,
    right: theme.space.lg,
    bottom: theme.space.lg,
  },
});
