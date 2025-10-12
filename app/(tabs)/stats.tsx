import { Card } from '@/components/ui/card';
import { Header } from '@/components/ui/Header';
import { theme } from '@/components/ui/theme';
import { computeKPIs } from '@/lib/stats';
import { useStore } from '@/state/store';
import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, ScrollView, StyleSheet, Text, View } from 'react-native';


export default function StatsScreen() {
  const { state } = useStore();
  const kpi = computeKPIs(state);

  const stats = useMemo(() => {
    const activeCustomers = state.customers.length;

    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const monthRedemptions = state.redemptions.filter(r => {
      const d = new Date(r.createdAt);
      return d.getFullYear() === y && d.getMonth() === m;
    }).length;

    const topCustomer = [...state.customers].sort((a, b) => b.stamps - a.stamps)[0] || null;

    const totalStamps = state.customers.reduce((sum, c) => sum + c.stamps, 0);
    const goal = 100;

    return { activeCustomers, monthRedemptions, topCustomer, totalStamps, goal };
  }, [state.customers, state.redemptions]);

  const pct = Math.min(stats.totalStamps / stats.goal, 1);
  const rotate = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(rotate, { toValue: pct, duration: 800, useNativeDriver: false }).start();
  }, [pct, rotate]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <Header title="Estatísticas" subtitle="Resumo do seu desempenho" />

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.kpiRow}>
          <Card style={s.kpiCard}>
            <Text style={s.kpiTitle}>Clientes ativos</Text>
            <Text style={s.kpiNumber}>{stats.activeCustomers}</Text>
          </Card>

          <Card style={s.kpiCard}>
            <Text style={s.kpiTitle}>Resgates no mês</Text>
            <Text style={s.kpiNumber}>{stats.monthRedemptions}</Text>
          </Card>
        </View>

        <Card style={s.centerCard}>
          <Text style={s.kpiTitle}>Cliente destaque</Text>
          {stats.topCustomer ? (
            <>
              <Text style={s.kpiNumber}>{stats.topCustomer.name}</Text>
              <Text style={s.subtle}>{stats.topCustomer.stamps} selos acumulados</Text>
            </>
          ) : (
            <Text style={s.muted}>Nenhum cliente ainda</Text>
          )}
        </Card>

        <Card style={s.centerCard}>
          <Text style={s.kpiTitle}>Progresso total de selos</Text>

          <View style={s.circleWrap}>
            <View style={s.circleBase} />
            <Animated.View
              style={[
                s.circleProgress,
                {
                  transform: [
                    {
                      rotateZ: rotate.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0deg', '360deg'],
                      }),
                    },
                  ],
                },
              ]}
            />
            <View style={s.circleLabel}>
              <Text style={s.circlePercent}>{Math.round(pct * 100)}%</Text>
              <Text style={s.circleHint}>de {stats.goal} selos</Text>
            </View>
          </View>
        </Card>

        {state.customers.length > 0 && (
          <Card style={{ paddingVertical: 20 }}>
            <Text style={[s.kpiTitle, { marginBottom: 14 }]}>Top 3 clientes</Text>
            {[...state.customers]
              .sort((a, b) => b.stamps - a.stamps)
              .slice(0, 3)
              .map((c, i) => {
                const w = Math.max(0.08, Math.min(1, c.stamps / 20));
                return (
                  <View key={c.id} style={s.barRow}>
                    <View style={s.barLeft}>
                      <Text style={s.badge}>#{i + 1}</Text>
                      <Text style={s.barName}>{c.name}</Text>
                    </View>
                    <View style={s.barMeterBG}>
                      <View style={[s.barMeterFG, { width: `${w * 100}%` }]} />
                    </View>
                    <Text style={s.barValue}>{c.stamps}</Text>
                  </View>
                );
              })}
          </Card>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  content: { padding: 16, paddingBottom: 80, gap: 20 },
  kpiRow: { flexDirection: 'row', gap: 12 },
  kpiCard: { flex: 1, alignItems: 'center', paddingVertical: 20 },
  kpiTitle: { color: theme.colors.text, fontSize: 14, fontWeight: '600' },
  kpiNumber: { color: theme.colors.title, fontSize: 22, fontWeight: '800', marginTop: 6 },
  subtle: { color: theme.colors.text, marginTop: 6 },
  muted: { color: theme.colors.muted, marginTop: 6 },
  centerCard: { alignItems: 'center', paddingVertical: 24 },
  circleWrap: { width: 160, height: 160, marginTop: 18, justifyContent: 'center', alignItems: 'center' },
  circleBase: { position: 'absolute', width: 160, height: 160, borderRadius: 80, borderWidth: 12, borderColor: theme.colors.border },
  circleProgress: { position: 'absolute', width: 160, height: 160, borderRadius: 80, borderWidth: 12, borderColor: theme.colors.primary },
  circleLabel: { alignItems: 'center', justifyContent: 'center' },
  circlePercent: { fontSize: 22, fontWeight: '900', color: theme.colors.title },
  circleHint: { fontSize: 12, color: theme.colors.text },
  barRow: { marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 10 },
  barLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  badge: { color: theme.colors.primary, fontWeight: '800' as const },
  barName: { color: theme.colors.title },
  barMeterBG: { backgroundColor: theme.colors.primary + '33', borderRadius: 10, height: 10, width: 130, overflow: 'hidden' },
  barMeterFG: { backgroundColor: theme.colors.primary, height: 10 },
  barValue: { color: theme.colors.text, width: 30, textAlign: 'right' as const },
});
