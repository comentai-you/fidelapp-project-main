import { shareProgressViaWhatsApp } from '@/lib/share';
import { useStore } from '@/state/store';
import { useLocalSearchParams } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

export default function CustomerDetail() {
  const { cid } = useLocalSearchParams<{ cid: string }>();
  const { state, addStamp, resetCustomer } = useStore();

  const customer = state.customers.find(c => c.id === cid);
  const program = useMemo(
    () => state.programs.find(p => p?.id === customer?.programId),
    [state.programs, customer]
  );

  const [pinInput, setPinInput] = useState('');

  if (!customer || !program) {
    return <View style={s.container}><Text>Cliente ou programa não encontrado.</Text></View>;
  }

  const canRedeem = customer.stamps >= program.totalStamps;

  function handleStamp() {
    // ✅ narrow explícito pro TS
    if (!program || !customer) return;

    if (pinInput !== program.pin) {
      Alert.alert('PIN incorreto.');
      return;
    }
    addStamp(customer.id);
    setPinInput('');
  }

  function handleRedeem() {
    // ✅ narrow explícito pro TS
    if (!program || !customer) return;

    if (!canRedeem) return;
    if (pinInput !== program.pin) {
      Alert.alert('PIN incorreto.');
      return;
    }
    resetCustomer(customer.id);
    setPinInput('');
    Alert.alert('Benefício resgatado e cartela zerada!');
  }

  async function handleShare() {
    // ✅ narrow explícito pro TS (coerência)
    if (!program || !customer) return;

    await shareProgressViaWhatsApp({
      phone: customer.phone,
      programName: program.name,
      stamps: customer.stamps,
      total: program.totalStamps,
      reward: program.reward,
    });
  }

  const cells = Array.from({ length: program.totalStamps }, (_, i) => i);

  return (
    <View style={s.container}>
      <Text style={s.title}>{customer.name}</Text>
      <Text style={s.sub}>{program.name} • {customer.stamps}/{program.totalStamps} selos</Text>

      <View style={s.grid}>
        {cells.map((i) => {
          const active = i < customer.stamps;
          return (
            <View key={i} style={[s.selo, active && s.seloAtivo]}>
              <Text style={[s.seloText, active && s.seloTextAtivo]}>{i + 1}</Text>
            </View>
          );
        })}
      </View>

      <TextInput
        value={pinInput}
        onChangeText={setPinInput}
        placeholder="PIN do lojista"
        secureTextEntry
        keyboardType="number-pad"
        style={s.input}
        maxLength={6}
      />

      <View style={s.row}>
        <Pressable style={[s.btn, s.btnPrimary]} onPress={handleStamp}>
          <Text style={s.btnPrimaryText}>Dar 1 selo</Text>
        </Pressable>
        <Pressable
          style={[s.btn, canRedeem ? s.btnSuccess : s.btnDisabled]}
          onPress={handleRedeem}
          disabled={!canRedeem}
        >
          <Text style={[s.btnText, { color: canRedeem ? '#fff' : '#64748b' }]}>
            Resgatar
          </Text>
        </Pressable>
      </View>

      <Pressable style={[s.share]} onPress={handleShare}>
        <Text style={s.shareText}>Compartilhar progresso (WhatsApp)</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  title: { fontSize: 20, fontWeight: '800', color: '#111' },
  sub: { color: '#475569', marginTop: 4, marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
  selo: { width: 56, height: 56, borderRadius: 16, borderWidth: 2, borderColor: '#0ea5e9', alignItems: 'center', justifyContent: 'center' },
  seloAtivo: { backgroundColor: '#0ea5e9' },
  seloText: { fontWeight: '700', color: '#0ea5e9' },
  seloTextAtivo: { color: '#fff' },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginTop: 8 },
  row: { flexDirection: 'row', gap: 10, marginTop: 12 },
  btn: { flex: 1, padding: 12, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
  btnText: { fontWeight: '700' },
  btnPrimary: { backgroundColor: '#0ea5e9', borderColor: '#0ea5e9' },
  btnPrimaryText: { color: '#fff', fontWeight: '700' },
  btnSuccess: { backgroundColor: '#16a34a', borderColor: '#16a34a' },
  btnDisabled: { backgroundColor: '#e2e8f0', borderColor: '#e2e8f0' },
  share: { marginTop: 12, padding: 12, borderRadius: 10, backgroundColor: '#7c3aed', alignItems: 'center' },
  shareText: { color: '#fff', fontWeight: '700' },
});
