// app/(tabs)/menu.tsx
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Header } from '@/components/ui/Header';
import { theme } from '@/components/ui/theme';
import { signOut } from '@/lib/auth';
import { supabase } from '@/lib/supabaseClient'; // ✅ para fechar canais no sign out
import { useSession } from '@/state/session';
import { useStore } from '@/state/store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context'; // ✅ troca p/ safe-area-context

// 🔗 CORRIGIDO: use o alias do projeto
import { PRIVACY_URL, TERMS_URL } from '../constants/legal';

// 👇 NOVO: seletor para regra de anúncios (free-only)
import { shouldShowAds } from '@/state/store';

const BUSINESS_TYPES = [
  'Barbearia','Salão de Beleza','Cafeteria','Padaria','Restaurante','Pizzaria','Hamburgueria',
  'Lanchonete','Sorveteria','Açaíteria','Supermercado','Mercearia','Drogaria/Farmácia',
  'Pet Shop','Clínica Veterinária','Academia','Studio de Pilates','Autopeças','Oficina Mecânica',
  'Loja de Roupas','Loja de Calçados','Papelaria','Armarinho','Loja de Celulares',
  'Assistência Técnica','Perfumaria/Cosméticos','Loja de Informática','Lan House',
  'Cursos/Escola','Lavanderia','Serviços Gerais',
];

export default function MenuScreen() {
  const { state, updateProfile, resetStore } = useStore();
  const profile = state.profile;
  const router = useRouter();

  const { session } = useSession();
  const [signingOut, setSigningOut] = useState(false);

  const [ownerName, setOwnerName] = useState(profile.ownerName);
  const [storeName, setStoreName] = useState(profile.storeName);
  const [phone, setPhone] = useState(profile.phone);
  const [email, setEmail] = useState(profile.email);
  const [businessType, setBusinessType] = useState(profile.businessType);
  const [openList, setOpenList] = useState(false);

  const isProfileComplete = !!(
    profile.ownerName &&
    profile.storeName &&
    profile.phone &&
    profile.email &&
    profile.businessType
  );
  const [editing, setEditing] = useState(!isProfileComplete);

  // 👇 NOVO: decide se mostra anúncios neste screen (plano freemium)
  const showAds = shouldShowAds(state.plan);

  function save() {
    updateProfile({ ownerName, storeName, phone, email, businessType });
    Alert.alert('Pronto!', 'Seu perfil foi atualizado.');
    setOpenList(false);
    setEditing(false);
  }

  function handleSupport() {
    Linking.openURL('https://wa.me/5561999686641?text=Olá! Preciso de ajuda com o FideLApp.');
  }

  async function viewOnboardingAgain() {
    await AsyncStorage.removeItem('@seen_onboarding');
    router.replace('/onboarding' as never);
  }

  async function handleSignOut() {
    try {
      setSigningOut(true);

      // Fecha canais Realtime (opcional)
      try {
        supabase.getChannels().forEach((ch) => supabase.removeChannel(ch));
      } catch {}

      await signOut();

      Alert.alert('Saiu da conta', 'Você desconectou com sucesso.');

      // Não navegue aqui; o guard global redireciona para /auth
      // (app/_layout.tsx faz <Redirect href="/auth" /> quando !session)
    } catch (e: any) {
      Alert.alert('Erro ao sair', e?.message ?? 'Tente novamente.');
    } finally {
      setSigningOut(false);
    }
  }

  const ProfileView = useMemo(() => (
    <View>
      <Text style={s.label}>Seu nome</Text>
      <Text style={s.value}>{ownerName || '—'}</Text>

      <Text style={s.label}>Nome da loja</Text>
      <Text style={s.value}>{storeName || '—'}</Text>

      <Text style={s.label}>Telefone (E.164)</Text>
      <Text style={s.value}>{phone || '—'}</Text>

      <Text style={s.label}>E-mail</Text>
      <Text style={s.value}>{email || '—'}</Text>

      <Text style={s.label}>Tipo de negócio</Text>
      <Text style={s.value}>{businessType || '—'}</Text>

      <View style={{ height: 10 }} />
      <View style={{ flexDirection: 'row', gap: theme.space.sm }}>
        <Button variant="ghost" title="Editar perfil" onPress={() => setEditing(true)} />
        <Button variant="ghost" title="Resetar tudo" onPress={() => resetStore()} />
      </View>
    </View>
  ), [ownerName, storeName, phone, email, businessType, resetStore]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <Header title="Menu" subtitle="Configurações e informações do app" />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: theme.space.lg, gap: theme.space.lg }}
        showsVerticalScrollIndicator={false}
      >
        <Card>
          <Text style={s.sectionTitle}>Perfil</Text>

          {editing ? (
            <View>
              <Text style={s.label}>Seu nome</Text>
              <TextInput
                style={s.input}
                value={ownerName}
                onChangeText={setOwnerName}
                placeholder="Ex: João Silva"
                placeholderTextColor={theme.colors.muted}
              />

              <Text style={s.label}>Nome da loja</Text>
              <TextInput
                style={s.input}
                value={storeName}
                onChangeText={setStoreName}
                placeholder="Ex: Barbearia do João"
                placeholderTextColor={theme.colors.muted}
              />

              <Text style={s.label}>Telefone (E.164)</Text>
              <TextInput
                style={s.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="Ex: 5561999999999"
                keyboardType="phone-pad"
                placeholderTextColor={theme.colors.muted}
              />

              <Text style={s.label}>E-mail</Text>
              <TextInput
                style={s.input}
                value={email}
                onChangeText={setEmail}
                placeholder="email@exemplo.com"
                keyboardType="email-address"
                placeholderTextColor={theme.colors.muted}
              />

              <Text style={s.label}>Tipo de negócio</Text>
              <Pressable onPress={() => setOpenList(v => !v)} style={[s.input, { justifyContent: 'center' }]}>
                <Text style={{ color: businessType ? theme.colors.title : theme.colors.muted }}>
                  {businessType || 'Selecione seu ramo'}
                </Text>
              </Pressable>

              {openList && (
                <View style={s.listBox}>
                  <ScrollView style={{ maxHeight: 260 }} nestedScrollEnabled showsVerticalScrollIndicator>
                    {BUSINESS_TYPES.map((b) => (
                      <Pressable
                        key={b}
                        onPress={() => { setBusinessType(b); setOpenList(false); }}
                        style={s.listItem}
                      >
                        <Text style={{ color: theme.colors.title }}>{b}</Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              )}

              <View style={{ height: 10 }} />
              <View style={{ flexDirection: 'row', gap: theme.space.sm }}>
                <Button variant="ghost" title="Resetar tudo" onPress={() => resetStore()} />
                <Button title="Salvar perfil" onPress={save} />
              </View>
            </View>
          ) : (
            ProfileView
          )}
        </Card>

        {/* 🔐 Conta & Acesso */}
        <Card>
          <Text style={s.sectionTitle}>Conta & Acesso</Text>
          {session ? (
            <View style={{ gap: 10 }}>
              <Text style={{ color: theme.colors.text }}>Logado como:</Text>
              <Text style={s.value}>{session.user.email}</Text>

              <View style={{ height: 10 }} />
              <Button
                title={signingOut ? 'Saindo...' : 'Sair da conta'}
                onPress={handleSignOut}
                disabled={signingOut}
              />
            </View>
          ) : (
            <View style={{ gap: 10 }}>
              <Text style={{ color: theme.colors.text }}>
                Você ainda não está conectado.
              </Text>
              <Button
                title="Entrar / Criar conta"
                onPress={() => router.push('/auth' as never)}
              />
            </View>
          )}
        </Card>

        <Card>
          <Text style={s.sectionTitle}>Ajuda e suporte</Text>
          <Button variant="ghost" title="Falar no WhatsApp" onPress={handleSupport} />
        </Card>

        <Card>
          <Text style={s.sectionTitle}>Planos & Legal</Text>
          <View style={{ gap: 8 }}>
            <Button title="Planos" onPress={() => router.push('/plans' as never)} />
            <Button variant="ghost" title="Termos de Uso" onPress={() => Linking.openURL(TERMS_URL)} />
            <Button variant="ghost" title="Política de Privacidade" onPress={() => Linking.openURL(PRIVACY_URL)} />
            <Button variant="outline" title="Ver Onboarding novamente" onPress={viewOnboardingAgain} />
          </View>
        </Card>

        {/* 👇 NOVO: placeholder do banner de anúncio (apenas no plano freemium) */}
        {showAds && (
          <View style={{
            height: 60,
            backgroundColor: '#eef6ff',
            borderTopWidth: 1,
            borderColor: '#dbeafe',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 8,
          }}>
            <Text style={{ color: '#2563eb', fontWeight: '700' }}>
              Espaço para anúncio (somente no plano gratuito)
            </Text>
          </View>
        )}

        <Text style={s.version}>Versão 1.0.0 • FideLApp</Text>
        <View style={{ height: 60 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  sectionTitle: { fontSize: 16, fontWeight: '800', color: theme.colors.title, marginBottom: 10 },
  label: { color: theme.colors.text, fontSize: 14, marginBottom: 6, marginTop: 14 },
  input: {
    borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.md,
    paddingHorizontal: theme.space.md, paddingVertical: 12,
    backgroundColor: theme.colors.card, color: theme.colors.title, fontSize: theme.font.body,
  },
  value: {
    borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.md,
    paddingHorizontal: theme.space.md, paddingVertical: 12,
    backgroundColor: theme.colors.card, color: theme.colors.title, fontSize: theme.font.body,
  },
  listBox: {
    borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.md,
    backgroundColor: theme.colors.card, marginTop: 8,
  },
  listItem: { paddingHorizontal: theme.space.md, paddingVertical: 12, borderBottomWidth: 1, borderColor: theme.colors.border },
  version: { textAlign: 'center', color: theme.colors.text, fontSize: 13, marginTop: 10 },
});
