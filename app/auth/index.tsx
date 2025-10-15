// app/auth.tsx
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { signInWithEmail, signOut, signUpWithEmail } from '@/lib/auth';
import { useSession } from '@/state/session';

/** ✅ Componente de Input fora do componente principal (não remonta a cada render) */
type KeyboardType = 'default' | 'email-address' | 'numeric' | 'phone-pad';
type InputProps = {
  value: string;
  onChangeText: (t: string) => void;
  placeholder: string;
  secure?: boolean;
  keyboardType?: KeyboardType;
  autoFocus?: boolean;
};
const InputField: React.FC<InputProps> = ({
  value,
  onChangeText,
  placeholder,
  secure = false,
  keyboardType = 'default',
  autoFocus = false,
}) => (
  <TextInput
    value={value}
    onChangeText={onChangeText}
    placeholder={placeholder}
    secureTextEntry={secure}
    keyboardType={keyboardType}
    autoCapitalize="none"
    autoCorrect={false}
    autoFocus={autoFocus}
    blurOnSubmit={false}
    style={{
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderWidth: 1,
      borderColor: 'rgba(0,0,0,0.15)',
      borderRadius: 12,
      backgroundColor: '#fff',
    }}
    placeholderTextColor="rgba(0,0,0,0.35)"
  />
);

/** 🔎 Regras visuais da senha (tempo real) */
function PasswordRules({ password }: { password: string }) {
  const hasLen = password.length >= 6;
  const hasUpper = /[A-Z]/.test(password);
  const hasDigit = /\d/.test(password);

  const Row = ({ ok, text }: { ok: boolean; text: string }) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <Text style={{ color: ok ? '#16a34a' : '#ef4444' }}>{ok ? '✔︎' : '✖︎'}</Text>
      <Text style={{ color: 'rgba(0,0,0,0.7)', fontSize: 13 }}>{text}</Text>
    </View>
  );

  return (
    <View style={{ marginTop: 4, gap: 4 }}>
      <Row ok={hasLen} text="Pelo menos 6 caracteres" />
      <Row ok={hasUpper} text="Pelo menos 1 letra maiúscula" />
      <Row ok={hasDigit} text="Pelo menos 1 número" />
    </View>
  );
}

export default function AuthScreen() {
  const router = useRouter();
  const { session } = useSession();

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // refs para focar após trocar de modo
  const emailRef = useRef<TextInput>(null);

  // 🔔 Deep link fidelapp://auth (confirmação de e-mail)
  useEffect(() => {
    const checkInitial = async () => {
      const url = await Linking.getInitialURL();
      if (url && url.includes('/auth')) {
        Alert.alert('Tudo certo!', 'E-mail confirmado. Agora é só entrar com sua senha.');
        setMode('signin');
      }
    };
    checkInitial();

    const sub = Linking.addEventListener('url', ({ url }) => {
      if (url.includes('/auth')) {
        Alert.alert('Tudo certo!', 'E-mail confirmado. Agora é só entrar com sua senha.');
        setMode('signin');
      }
    });
    return () => sub.remove();
  }, []);

  function toggleMode() {
    setErr(null);
    setBusy(false);
    // limpa os campos e troca o modo
    setEmail('');
    setPassword('');
    setMode((m) => (m === 'signin' ? 'signup' : 'signin'));
    // foca no e-mail no próximo frame
    setTimeout(() => emailRef.current?.focus(), 50);
  }

  async function handleSubmit() {
    setErr(null);
    if (!email || !password) {
      setErr('Preencha e-mail e senha.');
      return;
    }

    // ✅ Validação amigável no front ao criar conta
    if (mode === 'signup') {
      const hasLen = password.length >= 6;
      const hasUpper = /[A-Z]/.test(password);
      const hasDigit = /\d/.test(password);
      if (!hasLen || !hasUpper || !hasDigit) {
        setErr('A senha deve ter pelo menos 6 caracteres, incluindo 1 letra maiúscula e 1 número.');
        return;
      }
    }

    setBusy(true);
    try {
      if (mode === 'signin') {
        await signInWithEmail(email.trim(), password);
        router.replace('/cards' as never);
      } else {
        await signUpWithEmail(email.trim(), password);
        Alert.alert(
          'Confirme seu e-mail',
          'Enviamos um link de confirmação. Toque no link do e-mail e, ao voltar, entre com sua senha.'
        );
        setMode('signin');
        setPassword('');
        setTimeout(() => emailRef.current?.focus(), 50);
      }
    } catch (e: any) {
      // Pega mensagens amigáveis vindas do lib/auth.ts também
      setErr(e?.message ?? 'Falha de autenticação');
    } finally {
      setBusy(false);
    }
  }

  async function handleSignOut() {
    setBusy(true);
    setErr(null);
    try {
      await signOut();
      router.replace('/auth' as never);
    } catch (e: any) {
      setErr(e?.message ?? 'Erro ao sair');
    } finally {
      setBusy(false);
    }
  }

  // ✅ Já logado
  if (session) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
        <StatusBar style="dark" backgroundColor="#ffffff" />
        <KeyboardAvoidingView
          behavior={Platform.select({ ios: 'padding', android: undefined })}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={{ flexGrow: 1, padding: 20, justifyContent: 'center', gap: 16, backgroundColor: '#fff' }}
            keyboardShouldPersistTaps="always"
            keyboardDismissMode="none"
          >
            <Text style={{ fontSize: 22, fontWeight: '700' }}>Você já está conectado</Text>
            <Text style={{ opacity: 0.7 }}>{session.user.email}</Text>

            <Pressable
              onPress={handleSignOut}
              style={{
                backgroundColor: '#111',
                paddingVertical: 14,
                borderRadius: 12,
                alignItems: 'center',
              }}
              disabled={busy}
            >
              {busy ? <ActivityIndicator /> : <Text style={{ color: '#fff', fontWeight: '700' }}>Sair</Text>}
            </Pressable>

            {err ? <Text style={{ color: 'crimson' }}>{err}</Text> : null}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // 🔐 Formulário
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <StatusBar style="dark" backgroundColor="#ffffff" />
      <KeyboardAvoidingView
        behavior={Platform.select({ ios: 'padding', android: undefined })}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, padding: 20, justifyContent: 'center', gap: 16, backgroundColor: '#fff' }}
          keyboardShouldPersistTaps="always"
          keyboardDismissMode="none"
        >
          <Text style={{ fontSize: 22, fontWeight: '700' }}>
            {mode === 'signin' ? 'Entrar' : 'Criar conta'}
          </Text>

          <View style={{ gap: 12 }}>
            <InputField
              value={email}
              onChangeText={setEmail}
              placeholder="seu@email.com"
              keyboardType="email-address"
              autoFocus
              // @ts-ignore: RN types don't expose ref on our wrapper - fine.
              ref={emailRef}
            />
            <InputField
              value={password}
              onChangeText={setPassword}
              placeholder="Senha (mín. 6, 1 maiús., 1 número)"
              secure
            />
            {/* Mostra as regras somente no modo de cadastro */}
            {mode === 'signup' ? <PasswordRules password={password} /> : null}
          </View>

          {err ? <Text style={{ color: 'crimson' }}>{err}</Text> : null}

          <Pressable
            onPress={handleSubmit}
            style={{
              backgroundColor: '#111',
              paddingVertical: 14,
              borderRadius: 12,
              alignItems: 'center',
              opacity: busy ? 0.7 : 1,
            }}
            disabled={busy}
          >
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={{ color: '#fff', fontWeight: '700' }}>
                {mode === 'signin' ? 'Entrar' : 'Criar conta'}
              </Text>
            )}
          </Pressable>

          <Pressable onPress={toggleMode}>
            <Text style={{ textAlign: 'center', marginTop: 8 }}>
              {mode === 'signin' ? 'Não tem conta? Criar agora' : 'Já tem conta? Entrar'}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
