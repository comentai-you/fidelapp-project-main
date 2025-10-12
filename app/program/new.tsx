// app/program/new.tsx
// ... (restante igual ao que você já tem com Page e covers)
import { Page } from '@/components/layout/Page';
import { Header } from '@/components/ui/Header';
import { Button } from '@/components/ui/button';
import { theme } from '@/components/ui/theme';
import { useStore } from '@/state/store';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

const COVER_TEMPLATES = [
  { id: 'barber', label: 'Barbearia', src: require('../../assets/covers/barber.jpg') },
  { id: 'coffee', label: 'Cafeteria', src: require('../../assets/covers/coffee.jpg') }, // ajuste nome conforme seus arquivos
  { id: 'pet', label: 'Pet', src: require('../../assets/covers/pet.jpg') },
  { id: 'pizza', label: 'Pizzaria', src: require('../../assets/covers/pizza.jpg') },
  { id: 'Borracharia', label: 'Borracharia', src: require('../../assets/covers/Borracharia.jpg') },
  { id: 'Educação', label: 'Educação', src: require('../../assets/covers/Educação.jpg') },
  { id: 'Elétrica', label: 'Elétrica', src: require('../../assets/covers/Elétrica.jpg') },
  { id: 'Maquiagem', label: 'Maquiagem', src: require('../../assets/covers/Maquiagem.jpg') },
  { id: 'Mecanica', label: 'Mecanica', src: require('../../assets/covers/Mecanica.jpg') },
  { id: 'Reformas', label: 'Reformas', src: require('../../assets/covers/Reformas.jpg') },
  { id: 'Vestuário', label: 'Vestuário', src: require('../../assets/covers/Vestuário.jpg') },
  { id: 'Restaurantes', label: 'Restaurantes', src: require('../../assets/covers/Restaurantes.jpg') },
  { id: 'Beleza', label: 'Beleza', src: require('../../assets/covers/Beleza.jpg') },
  { id: 'Computação', label: 'Computação', src: require('../../assets/covers/Computação.jpg') },
  { id: 'Costura', label: 'Costura', src: require('../../assets/covers/Costura.jpg') },
  { id: 'Farmacias', label: 'Farmacias', src: require('../../assets/covers/Farmacias.jpg') },
  { id: 'Fitness', label: 'Fitness', src: require('../../assets/covers/Fitness.jpg') },
  { id: 'Floricultura', label: 'Floricultura', src: require('../../assets/covers/Floricultura.jpg') },
  { id: 'Manicure', label: 'Manicure', src: require('../../assets/covers/Manicure.jpg') },
];

export default function NewProgramScreen() {
  const router = useRouter();
  const { addProgram } = useStore();

  const [name, setName] = useState('');
  const [total, setTotal] = useState('10');
  const [reward, setReward] = useState('1 serviço grátis');
  const [pin, setPin] = useState('');
  const [cover, setCover] = useState<string | null>(COVER_TEMPLATES[0].id);

  function saveProgram() {
    const t = parseInt(total || '10', 10);
    if (!name.trim() || !pin.trim() || isNaN(t) || t <= 0) {
      Alert.alert('Preencha nome, PIN e quantidade válida de selos.');
      return;
    }
    addProgram({ name: name.trim(), totalStamps: t, reward: reward.trim(), pin: pin.trim(), cover: cover || undefined });
    router.replace('/(tabs)/cards');
  }

  return (
    <Page scrollable>
      <Header back title="Novo programa" subtitle="Defina as regras do seu cartão" />
      {/* ... restante igual (covers, inputs, footer) */}
      <Text style={s.label}>Modelo de capa</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
        {COVER_TEMPLATES.map((c) => {
          const selected = cover === c.id;
          return (
            <Pressable key={c.id} onPress={() => setCover(c.id)} style={[s.coverItem, selected && s.coverItemSelected]}>
              <Image source={c.src} style={s.coverImg} />
              <Text style={s.coverLabel}>{c.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <Text style={s.label}>Nome do programa</Text>
      <TextInput
        style={s.input}
        placeholder="Ex: Corte Fidelidade"
        placeholderTextColor={theme.colors.muted}
        value={name}
        onChangeText={setName}
      />

      <Text style={s.label}>Quantidade de selos</Text>
      <TextInput
        style={s.input}
        keyboardType="number-pad"
        placeholder="Ex: 5"
        placeholderTextColor={theme.colors.muted}
        value={total}
        onChangeText={setTotal}
      />

      <Text style={s.label}>Benefício</Text>
      <TextInput
        style={s.input}
        placeholder="Ex: 1 corte grátis"
        placeholderTextColor={theme.colors.muted}
        value={reward}
        onChangeText={setReward}
      />

      <Text style={s.label}>PIN do lojista</Text>
      <TextInput
        style={s.input}
        secureTextEntry
        maxLength={6}
        placeholder="6 dígitos"
        placeholderTextColor={theme.colors.muted}
        value={pin}
        onChangeText={setPin}
      />

      <View style={{ height: theme.space.lg }} />
      <View style={{ flexDirection: 'row', gap: theme.space.sm }}>
        <Button variant="ghost" title="Cancelar" onPress={() => router.back()} />
        <Button title="Salvar" onPress={saveProgram} />
      </View>
    </Page>
  );
}

const s = StyleSheet.create({
  label: { color: theme.colors.text, fontSize: 14, marginBottom: 6, marginTop: 14 },
  input: {
    borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.md,
    paddingHorizontal: theme.space.md, paddingVertical: 12,
    backgroundColor: theme.colors.card, color: theme.colors.title, fontSize: theme.font.body,
  },
  coverItem: {
    width: 120, borderRadius: theme.radius.md, overflow: 'hidden',
    borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.card,
  },
  coverItemSelected: { borderColor: theme.colors.primary },
  coverImg: { width: 120, height: 72 },
  coverLabel: { textAlign: 'center', paddingVertical: 8, color: theme.colors.title, fontWeight: '700', fontSize: 12 },
});
