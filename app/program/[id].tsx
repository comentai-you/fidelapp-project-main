// app/program/[id].tsx
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  BackHandler,
  Easing,
  FlatList,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Card as UICard } from '@/components/ui/card';
import { Header } from '@/components/ui/Header';
import { theme } from '@/components/ui/theme';
import { useToast } from '@/components/ui/toast';
import useKeyboard from '@/hooks/useKeyboard';
import type { LoyaltyProgram } from '@/state/store';
import { useStore } from '@/state/store';

// utils
const onlyDigits = (s: string) => (s || '').replace(/\D/g, '');
const circles = (n: number) => Array.from({ length: n }, (_, i) => i);
const FOOTER_H = 92; // altura aproximada do rodapé com os 2 botões


function useSheetAnim(isOpen: boolean) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, {
      toValue: isOpen ? 1 : 0,
      duration: 160,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [isOpen, anim]);
  return {
    opacity: anim,
    transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
  } as const;
}

function Highlight({ text, q }: { text: string; q: string }) {
  if (!q) return <Text style={{ color: theme.colors.title, fontWeight: '700' }}>{text}</Text>;
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  if (i < 0) return <Text style={{ color: theme.colors.title, fontWeight: '700' }}>{text}</Text>;
  const before = text.slice(0, i);
  const mid = text.slice(i, i + q.length);
  const after = text.slice(i + q.length);
  return (
    <Text style={{ color: theme.colors.title, fontWeight: '700' }}>
      {before}
      <Text style={{ backgroundColor: '#fde68a', color: theme.colors.title }}>{mid}</Text>
      {after}
    </Text>
  );
}

export default function ProgramDetail() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id || '';
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const kbHeight = useKeyboard();

  const toast = useToast();
  const {
    state,
    addCustomer,
    addStamp,
    resetCustomer,
    removeCustomer,
    removeProgram,
    updateProgram, // <- edição real
  } = useStore();

  const program = state.programs.find((p) => p.id === id);

  useEffect(() => {
    if (!id) router.replace('/(tabs)/cards');
  }, [id, router]);

  // --------- IMPORTANTE: a partir daqui, os hooks SEMPRE são chamados ----------
  const customers = useMemo(
    () => (program ? state.customers.filter((c) => c.programId === program.id) : []),
    [state.customers, program?.id]
  );

  const [loading, setLoading] = useState({
    save: false,
    stamp: false,
    redeem: false,
    quick: false,
    quickRedeem: false,
    edit: false,
  });

  // micro “bump” no selo recém-preenchido
  const [flash, setFlash] = useState<{ id: string; index: number } | null>(null);
  const flashAnim = useRef(new Animated.Value(0)).current;
  function triggerFlash(customerId: string, index: number) {
    setFlash({ id: customerId, index });
    flashAnim.setValue(0);
    Animated.sequence([
      Animated.timing(flashAnim, { toValue: 1, duration: 140, useNativeDriver: true, easing: Easing.out(Easing.quad) }),
      Animated.timing(flashAnim, { toValue: 0, duration: 180, useNativeDriver: true, easing: Easing.in(Easing.quad) }),
    ]).start(() => setFlash(null));
  }

  // confete simples
  const [confettiBurst, setConfettiBurst] = useState<Array<{ id: number; x: number; rot: number }>>([]);
  function fireConfetti() {
    const parts = Array.from({ length: 18 }, (_, i) => ({
      id: i,
      x: Math.random() * 260 - 130,
      rot: Math.random() * 360,
    }));
    setConfettiBurst(parts);
    setTimeout(() => setConfettiBurst([]), 1000);
  }

  // novo cliente
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [phoneMasked, setPhoneMasked] = useState('');
  function formatPhoneBR(digits: string) {
    const d = digits.slice(0, 11);
    const dd = d.slice(0, 2);
    const nine = d.slice(2, 3);
    const left = d.slice(3, 7);
    const right = d.slice(7, 11);
    let res = '';
    if (dd) res += `(${dd}) `;
    if (nine) res += `${nine}`;
    if (left) res += `${left}`;
    if (right) res += `-${right}`;
    return res.replace(/^(\(\d{2}\)\s?)(\d)(\d{4})(-?)(\d{0,4}).*$/, '$1$2$3-$5');
  }
  function onPhoneChange(v: string) {
    const digits = onlyDigits(v);
    setPhoneMasked(formatPhoneBR(digits));
  }

  async function saveCustomer() {
  if (!program) return;
  if (loading.save) return;

  const digits = onlyDigits(phoneMasked);
  if (!name.trim()) return Alert.alert('Informe o nome do cliente.');
  if (digits.length !== 11 || digits[2] !== '9') {
    return Alert.alert('Telefone inválido', 'Informe um celular válido: (DD) 9XXXX-XXXX');
  }

  // 👉 normaliza para E.164 (Brasil)
  const e164 = `55${digits}`;

  // 👉 BLOQUEIO: número duplicado no mesmo programa
  // (lista `customers` já está filtrada pelo programId atual)
  const duplicate = customers.some((c) => c.phone === e164);
  if (duplicate) {
    return Alert.alert(
      'Número já cadastrado',
      'Já existe um cliente com este telefone neste programa.'
    );
  }

  try {
    setLoading((s) => ({ ...s, save: true }));

    // cria de fato
    addCustomer({ name: name.trim(), phone: e164, programId: program.id });

    // sucesso → limpa, fecha e toast
    setName('');
    setPhoneMasked('');
    setCreating(false);
    toast('Cliente salvo!', 'success');
  } finally {
    setLoading((s) => ({ ...s, save: false }));
  }
}


  // sheet geral (carimbar/resgatar)
  const [carimbarOpen, setCarimbarOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pin, setPin] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim().toLowerCase()), 250);
    return () => clearTimeout(t);
  }, [query]);

  const carimbarList = useMemo(() => {
    const q = debouncedQuery;
    if (!q) return customers;
    return customers.filter((c) => c.name.toLowerCase().includes(q));
  }, [customers, debouncedQuery]);

  const selectedCustomer = useMemo(
    () => customers.find((c) => c.id === selectedId) || null,
    [customers, selectedId]
  );

  const [showPin, setShowPin] = useState(false);
  const [showQuickPin, setShowQuickPin] = useState(false);
  const [showQuickRedeemPin, setShowQuickRedeemPin] = useState(false);

  async function doStamp() {
    if (!program) return;
    if (!selectedCustomer || loading.stamp) return;
    try {
      setLoading((s) => ({ ...s, stamp: true }));
      if (pin !== program.pin) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return Alert.alert('PIN incorreto', 'Verifique o PIN do programa.');
      }
      const justFilledIndex = selectedCustomer.stamps;
      addStamp(selectedCustomer.id);
      triggerFlash(selectedCustomer.id, justFilledIndex);

      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setPin('');
      toast(`Selo carimbado para ${selectedCustomer.name}!`, 'success');
    } finally {
      setLoading((s) => ({ ...s, stamp: false }));
    }
  }

  async function doRedeem(cId?: string) {
    if (!program) return;
    if (loading.redeem) return;
    const target = cId ? customers.find((c) => c.id === cId) : selectedCustomer;
    if (!target) return;
    try {
      setLoading((s) => ({ ...s, redeem: true }));
      if (pin !== program.pin) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return Alert.alert('PIN incorreto', 'Verifique o PIN do programa.');
      }
      if (target.stamps < program.totalStamps) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        return Alert.alert('Atenção', 'Cliente ainda não completou os selos.');
      }
      resetCustomer(target.id);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setPin('');
      toast(`Prêmio resgatado: ${program.reward}`, 'success');
    } finally {
      setLoading((s) => ({ ...s, redeem: false }));
    }
  }

  function shareProgress(cId: string, customMsg?: string) {
    const c = customers.find((x) => x.id === cId);
    if (!c || !program) return;
    const msg = encodeURIComponent(
      customMsg ??
        `Olá ${c.name}! Você tem ${c.stamps}/${program.totalStamps} selos no *${program.name}*.\nPrêmio: ${program.reward}\n\nVolte e carimbe mais um selo!`
    );
    Linking.openURL(`https://wa.me/${c.phone}?text=${msg}`);
  }

  function shareCongrats(cId: string) {
    if (!program) return;
    const c = customers.find((x) => x.id === cId);
    if (!c) return;
    const msg = `🎉 Parabéns, ${c.name}! Você completou sua cartela do *${program.name}* e ganhou: *${program.reward}*. Obrigado por ser nosso cliente! 🙌`;
    shareProgress(cId, msg);
  }

  function onRemoveCustomer(cId: string) {
    Alert.alert('Remover cliente?', 'Essa ação não pode ser desfeita.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Remover', style: 'destructive', onPress: () => removeCustomer(cId) },
    ]);
  }

  // Quick +1
  const [quickStampOpen, setQuickStampOpen] = useState(false);
  const [quickId, setQuickId] = useState<string | null>(null);
  const [quickPin, setQuickPin] = useState('');

  const quickCustomer = useMemo(
    () => (quickId ? customers.find((c) => c.id === quickId) || null : null),
    [customers, quickId]
  );

  async function doQuickStamp() {
    if (!program) return;
    if (!quickCustomer || loading.quick) return;
    try {
      setLoading((s) => ({ ...s, quick: true }));
      if (quickPin !== program.pin) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return Alert.alert('PIN incorreto', 'Verifique o PIN do programa.');
      }
      const justFilledIndex = quickCustomer.stamps;
      addStamp(quickCustomer.id);
      triggerFlash(quickCustomer.id, justFilledIndex);

      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setQuickPin('');
      setQuickStampOpen(false);
      toast(`+1 selo para ${quickCustomer.name}!`, 'success');
    } finally {
      setLoading((s) => ({ ...s, quick: false }));
    }
  }

  // Quick Redeem
  const [quickRedeemOpen, setQuickRedeemOpen] = useState(false);
  const [quickRedeemId, setQuickRedeemId] = useState<string | null>(null);
  const [quickRedeemPin, setQuickRedeemPin] = useState('');

  const quickRedeemCustomer = useMemo(
    () => (quickRedeemId ? customers.find((c) => c.id === quickRedeemId) || null : null),
    [customers, quickRedeemId]
  );

  async function doQuickRedeem() {
    if (!program) return;
    if (!quickRedeemCustomer || loading.quickRedeem) return;
    try {
      setLoading((s) => ({ ...s, quickRedeem: true }));
      if (quickRedeemPin !== program.pin) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return Alert.alert('PIN incorreto', 'Verifique o PIN do programa.');
      }
      if (quickRedeemCustomer.stamps < program.totalStamps) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        return Alert.alert('Atenção', 'Cliente ainda não completou os selos.');
      }

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      fireConfetti();
      setTimeout(() => {
        shareCongrats(quickRedeemCustomer.id);
      }, 250);

      setTimeout(() => {
        resetCustomer(quickRedeemCustomer.id);
        setQuickRedeemPin('');
        setQuickRedeemOpen(false);
        toast(`Prêmio resgatado: ${program.reward}`, 'success');
      }, 600);
    } finally {
      setLoading((s) => ({ ...s, quickRedeem: false }));
    }
  }

  // Sheet de edição do programa
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState(program?.name ?? '');
  const [editTotal, setEditTotal] = useState(String(program?.totalStamps ?? ''));
  const [editReward, setEditReward] = useState(program?.reward ?? '');
  const [editPin, setEditPin] = useState(program?.pin ?? '');

  function openEdit() {
    if (!program) return;
    setEditName(program.name);
    setEditTotal(String(program.totalStamps));
    setEditReward(program.reward);
    setEditPin(program.pin);
    setEditOpen(true);
  }

  function handleRemoveProgram() {
    if (!program) return;
    Alert.alert('Excluir programa?', 'Isso removerá o cartão e TODOS os clientes vinculados.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: () => {
          removeProgram(program.id);
          toast('Programa removido com sucesso', 'success');
          router.replace('/(tabs)/cards');
        },
      },
    ]);
  }

  async function handleSaveEdit() {
    if (!program) return;
    if (loading.edit) return;
    const total = parseInt(onlyDigits(editTotal) || '0', 10);
    if (!editName.trim()) return Alert.alert('Informe o nome do programa.');
    if (!Number.isFinite(total) || total < 1 || total > 30) {
      return Alert.alert('Quantidade de selos inválida', 'Use um número entre 1 e 30.');
    }
    if (!editReward.trim()) return Alert.alert('Informe o benefício.');
    if (!/^\d{4,6}$/.test(editPin)) return Alert.alert('PIN inválido', 'Use 4 a 6 dígitos.');

    try {
      setLoading((s) => ({ ...s, edit: true }));
      updateProgram(program.id, {
        name: editName.trim(),
        totalStamps: total,
        reward: editReward.trim(),
        pin: editPin,
      });
      setEditOpen(false);
      toast('Programa atualizado!', 'success');
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } finally {
      setLoading((s) => ({ ...s, edit: false }));
    }
  }

  // BackHandler: fecha sheets
  useEffect(() => {
    const onBack = () => {
      if (creating || carimbarOpen || quickStampOpen || quickRedeemOpen || editOpen) {
        setCreating(false);
        setCarimbarOpen(false);
        setQuickStampOpen(false);
        setQuickRedeemOpen(false);
        setEditOpen(false);
        setPin('');
        setQuickPin('');
        setQuickRedeemPin('');
        setSelectedId(null);
        setQuickId(null);
        setQuickRedeemId(null);
        setShowPin(false);
        setShowQuickPin(false);
        setShowQuickRedeemPin(false);
        return true;
      }
      return false;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBack);
    return () => sub.remove();
  }, [creating, carimbarOpen, quickStampOpen, quickRedeemOpen, editOpen]);

  // safe areas
  const safeBottom = Math.max(insets.bottom + 20, 20);
  const sheetBottom = Math.max(safeBottom, kbHeight + 12);

  // anims
  const creatingAnim = useSheetAnim(creating);
  const carimbarAnim = useSheetAnim(carimbarOpen);
  const quickAnim = useSheetAnim(quickStampOpen);
  const quickRedeemAnim = useSheetAnim(quickRedeemOpen);
  const editAnim = useSheetAnim(editOpen);

  // ---------- Fallback DEPOIS dos hooks ----------
  if (!program) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <Text style={{ color: theme.colors.title, fontSize: 18, fontWeight: '700', textAlign: 'center' }}>
          Programa não encontrado
        </Text>
        <Text style={{ color: theme.colors.text, marginTop: 8, textAlign: 'center' }}>
          O programa pode ter sido removido. Volte e selecione novamente.
        </Text>
        <View style={{ height: 16 }} />
        <Button title="Voltar" onPress={() => router.replace('/(tabs)/cards')} />
      </SafeAreaView>
    );
  }

  const prog: LoyaltyProgram = program;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Header back title={prog.name} subtitle={`${prog.totalStamps} selos • ${prog.reward}`} />

        {/* Confetti overlay */}
        {confettiBurst.length > 0 && (
          <View pointerEvents="none" style={StyleSheet.absoluteFill}>
            {confettiBurst.map((p) => {
              const dropY = new Animated.Value(0);
              const rot = new Animated.Value(0);
              Animated.parallel([
                Animated.timing(dropY, { toValue: 1, duration: 900, easing: Easing.out(Easing.quad), useNativeDriver: true }),
                Animated.timing(rot, { toValue: 1, duration: 900, easing: Easing.linear, useNativeDriver: true }),
              ]).start();
              const translateY = dropY.interpolate({ inputRange: [0, 1], outputRange: [-20, 200] });
              const translateX = new Animated.Value(p.x);
              const rotate = rot.interpolate({ inputRange: [0, 1], outputRange: [`${p.rot}deg`, `${p.rot + 180}deg`] });
              return (
                <Animated.View
                  key={p.id}
                  style={{
                    position: 'absolute',
                    top: 80,
                    left: '50%',
                    transform: [{ translateX }, { translateY }, { rotate }],
                  }}
                >
                  <View
                    style={{
                      width: 8,
                      height: 12,
                      borderRadius: 2,
                      backgroundColor: ['#f43f5e', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6'][p.id % 5],
                    }}
                  />
                </Animated.View>
              );
            })}
          </View>
        )}

        <FlatList
          data={customers}
          keyExtractor={(c) => c.id}
          contentContainerStyle={{ padding: 16, paddingBottom: FOOTER_H + safeBottom, // evita o overlap e NÃO rola com a lista
}}
          // 👇 separador entre cards (resolve “colado”)
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          ListHeaderComponent={
            <UICard style={{ marginBottom: 12 }}>
              <Text style={{ color: theme.colors.title, fontSize: 16, fontWeight: '800' }}>{prog.name}</Text>
              <Text style={{ color: theme.colors.text, marginTop: 4 }}>
                {prog.totalStamps} selos • {prog.reward}
              </Text>

              <View style={{ height: 12 }} />
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Button title="Editar programa" onPress={openEdit} />
                </View>
                <View style={{ flex: 1 }}>
                  <Button variant="outline" title="Remover programa" onPress={handleRemoveProgram} />
                </View>
              </View>
            </UICard>
          }
          ListEmptyComponent={
            <View style={{ paddingVertical: 24 }}>
              <Text style={{ color: theme.colors.title, fontSize: 16, fontWeight: '800' }}>Nenhum cliente ainda</Text>
              <Text style={{ color: theme.colors.text, marginTop: 6 }}>Cadastre clientes para começar a carimbar selos.</Text>
            </View>
          }
          renderItem={({ item }) => {
            const canRedeem = item.stamps >= prog.totalStamps;
            const isFlashingAt = (i: number) => flash?.id === item.id && flash.index === i;
            const scaleFromAnim = flashAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.25] });
            const shadowOpacityFromAnim = flashAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.25] });

            return (
              <UICard>
                <Text style={{ color: theme.colors.title, fontSize: 16, fontWeight: '800' }}>{item.name}</Text>
                <Text style={{ color: theme.colors.text, marginTop: 4 }}>
                  {item.stamps}/{prog.totalStamps} selos
                </Text>

                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                  {circles(prog.totalStamps).map((i) => {
                    const filled = i < item.stamps;
                    const circle = (
                      <View
                        style={{
                          width: 12,
                          height: 12,
                          borderRadius: 6,
                          backgroundColor: filled ? theme.colors.primary : 'transparent',
                          borderWidth: 1,
                          borderColor: theme.colors.border,
                        }}
                      />
                    );
                    if (isFlashingAt(i)) {
                      return (
                        <Animated.View
                          key={i}
                          style={{
                            transform: [{ scale: scaleFromAnim }],
                            shadowColor: theme.colors.primary,
                            shadowOpacity: shadowOpacityFromAnim as unknown as number,
                            shadowRadius: 6,
                            shadowOffset: { width: 0, height: 0 },
                          }}
                        >
                          {circle}
                        </Animated.View>
                      );
                    }
                    return <View key={i}>{circle}</View>;
                  })}
                </View>

                <View style={{ height: 12 }} />

                <View style={styles.actionsRow}>
                  <View style={styles.actionCol}>
                    <Button
                      title={loading.quick && quickCustomer?.id === item.id ? 'Carimbando…' : 'Carimbar'}
                      onPress={() => {
                        setQuickStampOpen(true);
                        setQuickId(item.id);
                      }}
                      disabled={loading.quick || canRedeem}
                    />
                  </View>
                  <View style={styles.actionCol}>
                    <Button
                      variant="ghost"
                      title="Resgatar"
                      onPress={() => {
                        setQuickRedeemOpen(true);
                        setQuickRedeemId(item.id);
                      }}
                      disabled={!canRedeem}
                    />
                  </View>
                  <View style={styles.actionCol}>
                    <Button variant="ghost" title="Compartilhar" onPress={() => shareProgress(item.id)} />
                  </View>
                  <View style={styles.actionCol}>
                    <Button variant="outline" title="Remover" onPress={() => onRemoveCustomer(item.id)} />
                  </View>
                </View>
              </UICard>
            );
          }}
        />

        {!carimbarOpen && !creating && !quickStampOpen && !quickRedeemOpen && !editOpen && (
          <View style={[styles.fabs, { bottom: safeBottom }]}>
            <View style={{ flex: 1 }}>
              <Button title="+ Novo cliente" onPress={() => setCreating(true)} />
            </View>
            <View style={{ width: 12 }} />
            <View style={{ flex: 1 }}>
              <Button title="Carimbar" onPress={() => { setCarimbarOpen(true); setSelectedId(null); }} />
            </View>
          </View>
        )}

        {/* Novo cliente */}
        {creating && (
          <Animated.View style={[styles.sheet, { bottom: sheetBottom }, creatingAnim]}>
            <Text style={styles.sheetTitle}>Novo cliente</Text>
            <TextInput
              style={styles.input}
              placeholder="Nome do cliente"
              placeholderTextColor={theme.colors.muted}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              returnKeyType="done"
            />
            <TextInput
              style={styles.input}
              placeholder="Telefone (DD) 9XXXX-XXXX"
              placeholderTextColor={theme.colors.muted}
              keyboardType="phone-pad"
              value={phoneMasked}
              onChangeText={onPhoneChange}
              returnKeyType="done"
            />

            <View style={styles.sheetRow}>
              <Button variant="ghost" title="Cancelar" onPress={() => setCreating(false)} />
              <Button title={loading.save ? 'Salvando…' : 'Salvar'} onPress={saveCustomer} disabled={loading.save} />
            </View>
          </Animated.View>
        )}

        {/* Sheet geral: carimbar/resgatar */}
        {carimbarOpen && (
          <Animated.View style={[styles.sheet, { bottom: sheetBottom }, carimbarAnim]}>
            <Text style={styles.sheetTitle}>Carimbar / Resgatar</Text>

            <TextInput
              style={styles.input}
              placeholder="Buscar cliente"
              placeholderTextColor={theme.colors.muted}
              value={query}
              onChangeText={setQuery}
              autoCapitalize="words"
              returnKeyType="search"
            />

            <View style={{ maxHeight: 200, marginTop: 8 }}>
              <FlatList
                data={carimbarList}
                keyExtractor={(c) => c.id}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => (
                  <Pressable
                    onPress={() => setSelectedId(item.id)}
                    style={[styles.selectItem, selectedId === item.id && { borderColor: theme.colors.primary }]}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <Highlight text={item.name} q={debouncedQuery} />
                    <Text style={{ color: theme.colors.text }}>
                      {item.stamps}/{prog.totalStamps}
                    </Text>
                  </Pressable>
                )}
                ListEmptyComponent={<Text style={{ color: theme.colors.text, paddingVertical: 8 }}>Nenhum cliente encontrado.</Text>}
              />
            </View>

            <View style={styles.pinRow}>
              <TextInput
                style={[styles.input, styles.pinInput]}
                placeholder="PIN do programa"
                placeholderTextColor={theme.colors.muted}
                secureTextEntry={!showPin}
                value={pin}
                onChangeText={setPin}
                maxLength={6}
                keyboardType="number-pad"
                textContentType="oneTimeCode"
                autoCorrect={false}
                autoCapitalize="none"
              />
              <Pressable onPress={() => setShowPin((v) => !v)} style={styles.pinToggle} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                <Text style={styles.pinToggleText}>{showPin ? 'Esconder' : 'Mostrar'}</Text>
              </Pressable>
            </View>

            <View style={styles.sheetRow}>
              <Button
                variant="ghost"
                title="Fechar"
                onPress={() => {
                  setCarimbarOpen(false);
                  setSelectedId(null);
                  setPin('');
                  setQuery('');
                  setShowPin(false);
                }}
              />
              <Button
                title={loading.stamp ? 'Carimbando…' : '+1 Selo'}
                onPress={doStamp}
                disabled={loading.stamp || (!!selectedCustomer && selectedCustomer.stamps >= prog.totalStamps)}
              />
              <Button variant="ghost" title={loading.redeem ? 'Resgatando…' : 'Resgatar'} onPress={() => doRedeem()} disabled={loading.redeem} />
            </View>
          </Animated.View>
        )}

        {/* Quick +1 */}
        {quickStampOpen && (
          <Animated.View style={[styles.sheet, { bottom: sheetBottom }, quickAnim]}>
            <Text style={styles.sheetTitle}>Adicionar +1 selo</Text>
            <Text style={{ color: theme.colors.text }}>{quickCustomer ? `Cliente: ${quickCustomer.name}` : 'Selecione um cliente'}</Text>

            <View style={styles.pinRow}>
              <TextInput
                style={[styles.input, styles.pinInput]}
                placeholder="PIN do programa"
                placeholderTextColor={theme.colors.muted}
                secureTextEntry={!showQuickPin}
                value={quickPin}
                onChangeText={setQuickPin}
                maxLength={6}
                keyboardType="number-pad"
                textContentType="oneTimeCode"
                autoCorrect={false}
                autoCapitalize="none"
              />
              <Pressable onPress={() => setShowQuickPin((v) => !v)} style={styles.pinToggle} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                <Text style={styles.pinToggleText}>{showQuickPin ? 'Esconder' : 'Mostrar'}</Text>
              </Pressable>
            </View>

            <View style={styles.sheetRow}>
              <Button
                variant="ghost"
                title="Cancelar"
                onPress={() => {
                  setQuickStampOpen(false);
                  setQuickId(null);
                  setQuickPin('');
                  setShowQuickPin(false);
                }}
              />
              <Button
                title={loading.quick ? 'Carimbando…' : 'Confirmar +1'}
                onPress={doQuickStamp}
                disabled={loading.quick || (!!quickCustomer && quickCustomer.stamps >= prog.totalStamps)}
              />
            </View>
          </Animated.View>
        )}

        {/* Quick Redeem */}
        {quickRedeemOpen && (
          <Animated.View style={[styles.sheet, { bottom: sheetBottom }, quickRedeemAnim]}>
            <Text style={styles.sheetTitle}>Resgatar prêmio</Text>
            <Text style={{ color: theme.colors.text }}>{quickRedeemCustomer ? `Cliente: ${quickRedeemCustomer.name}` : 'Selecione um cliente'}</Text>
            <Text style={{ color: theme.colors.text, marginTop: 6 }}>
              Ao confirmar, este cliente receberá o prêmio: <Text style={{ fontWeight: '800', color: theme.colors.title }}>{prog.reward}</Text>
            </Text>

            <View style={styles.pinRow}>
              <TextInput
                style={[styles.input, styles.pinInput]}
                placeholder="PIN do programa"
                placeholderTextColor={theme.colors.muted}
                secureTextEntry={!showQuickRedeemPin}
                value={quickRedeemPin}
                onChangeText={setQuickRedeemPin}
                maxLength={6}
                keyboardType="number-pad"
                textContentType="oneTimeCode"
                autoCorrect={false}
                autoCapitalize="none"
              />
              <Pressable
                onPress={() => setShowQuickRedeemPin((v) => !v)}
                style={styles.pinToggle}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Text style={styles.pinToggleText}>{showQuickRedeemPin ? 'Esconder' : 'Mostrar'}</Text>
              </Pressable>
            </View>

            <View style={styles.sheetRow}>
              <Button
                variant="ghost"
                title="Cancelar"
                onPress={() => {
                  setQuickRedeemOpen(false);
                  setQuickRedeemId(null);
                  setQuickRedeemPin('');
                  setShowQuickRedeemPin(false);
                }}
              />
              <Button
                title={loading.quickRedeem ? 'Resgatando…' : 'Confirmar resgate'}
                onPress={doQuickRedeem}
                disabled={loading.quickRedeem || !quickRedeemCustomer || quickRedeemCustomer.stamps < prog.totalStamps}
              />
            </View>
          </Animated.View>
        )}

        {/* Editar Programa */}
        {editOpen && (
          <Animated.View style={[styles.sheet, { bottom: sheetBottom }, editAnim]}>
            <Text style={styles.sheetTitle}>Editar programa</Text>

            <TextInput
              style={styles.input}
              placeholder="Nome do programa"
              placeholderTextColor={theme.colors.muted}
              value={editName}
              onChangeText={setEditName}
              autoCapitalize="sentences"
              returnKeyType="done"
            />

            <TextInput
              style={styles.input}
              placeholder="Quantidade de selos"
              placeholderTextColor={theme.colors.muted}
              value={editTotal}
              onChangeText={setEditTotal}
              keyboardType="number-pad"
              returnKeyType="done"
            />

            <TextInput
              style={styles.input}
              placeholder="Benefício (ex: 1 serviço grátis)"
              placeholderTextColor={theme.colors.muted}
              value={editReward}
              onChangeText={setEditReward}
              returnKeyType="done"
            />

            <TextInput
              style={styles.input}
              placeholder="PIN do programa (4–6 dígitos)"
              placeholderTextColor={theme.colors.muted}
              value={editPin}
              onChangeText={setEditPin}
              keyboardType="number-pad"
              secureTextEntry
              maxLength={6}
              returnKeyType="done"
            />

            <View style={styles.sheetRow}>
              <Button variant="ghost" title="Cancelar" onPress={() => setEditOpen(false)} />
              <Button title={loading.edit ? 'Salvando…' : 'Salvar alterações'} onPress={handleSaveEdit} disabled={loading.edit} />
            </View>
          </Animated.View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  actionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  actionCol: { flexBasis: '48%', flexGrow: 1 },
  fabs: {
  position: 'absolute',
  left: 16,
  right: 16,
  // o bottom já vem dinâmico pelo estilo inline: { bottom: safeBottom }
  flexDirection: 'row',
  zIndex: 100,        // iOS
  elevation: 20,      // Android
},
  sheet: {
    position: 'absolute',
    left: 16,
    right: 16,
    backgroundColor: theme.colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: theme.colors.title, marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 10,
    backgroundColor: theme.colors.card,
    color: theme.colors.title,
    fontSize: 15,
  },
  pinRow: { marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 8 },
  pinInput: { flex: 1, fontVariant: ['tabular-nums'], letterSpacing: 1 },
  pinToggle: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.card,
  },
  pinToggleText: { color: theme.colors.primary, fontWeight: '700' },
  sheetRow: { flexDirection: 'row', gap: 10, marginTop: 12, alignItems: 'center', justifyContent: 'space-between' },
  selectItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: theme.colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
