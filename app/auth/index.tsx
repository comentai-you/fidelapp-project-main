// app/auth.tsx
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
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

// ✅ NEW: armazenamento seguro/assíncrono
import AsyncStorage from '@react-native-async-storage/async-storage'; // ✅ NEW
import * as SecureStore from 'expo-secure-store'; // ✅ NEW

import { signInWithEmail, signOut, signUpWithEmail } from '@/lib/auth';
import { useSession } from '@/state/session';

/** 🔧 Fundo opaco evita “escurecimento” visual por trás (Android/overlays) */
const BG = '#ffffff';

// ✅ NEW: chaves de persistência
const KEY_REMEMBER = 'auth_remember'; // '1' | '0'
const KEY_EMAIL = 'auth_email';
const KEY_PASSWORD = 'auth_password';

type KeyboardType = 'default' | 'email-address' | 'numeric' | 'phone-pad';
type InputProps = {
  value: string;
  onChangeText: (t: string) => void;
  placeholder: string;
  secure?: boolean;
  keyboardType?: KeyboardType;
  autoFocus?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  inputRef?: any;
};
const InputField: React.FC<InputProps> = ({
  value,
  onChangeText,
  placeholder,
  secure = false,
  keyboardType = 'default',
  autoFocus = false,
  inputRef,
}) => (
  <TextInput
    ref={inputRef}
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
      backgroundColor: BG,
    }}
    placeholderTextColor="rgba(0,0,0,0.35)"
    textContentType={secure ? 'password' : 'none'}
    autoComplete={secure ? 'password' : 'off'}
  />
);

/** 🔐 Campo de senha com botão “mostrar/ocultar” */
const PasswordInput = ({
  value,
  onChangeText,
  placeholder,
}: {
  value: string;
  onChangeText: (t: string) => void;
  placeholder: string;
}) => {
  const [hidden, setHidden] = useState(true);
  return (
    <View style={{ position: 'relative', justifyContent: 'center' }}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        secureTextEntry={hidden}
        autoCapitalize="none"
        autoCorrect={false}
        textContentType="password"
        autoComplete="password"
        style={{
          paddingVertical: 12,
          paddingHorizontal: 14,
          paddingRight: 44,
          borderWidth: 1,
          borderColor: 'rgba(0,0,0,0.15)',
          borderRadius: 12,
          backgroundColor: BG,
        }}
        placeholderTextColor="rgba(0,0,0,0.35)"
      />

      <Pressable
        onPress={() => setHidden((v) => !v)}
        style={{
          position: 'absolute',
          right: 8,
          height: '100%',
          justifyContent: 'center',
          paddingHorizontal: 8,
        }}
        accessibilityRole="button"
        accessibilityLabel={hidden ? 'Mostrar senha' : 'Ocultar senha'}
      >
        <Text style={{ opacity: 0.7 }}>{hidden ? '👁️' : '🙈'}</Text>
      </Pressable>
    </View>
  );
};

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

  // ✅ NEW: lembrar dados
  const [remember, setRemember] = useState(true); // ligado por padrão (ajuste se quiser)

  const emailRef = useRef<TextInput>(null);

  // 🔔 Deep link fidelapp://auth (confirmação de e-mail)
  const handledAuthRef = useRef(false);

  useEffect(() => {
    const showOnce = () => {
      if (handledAuthRef.current) return;
      handledAuthRef.current = true;
      Alert.alert('Tudo certo!', 'E-mail confirmado. Agora é só entrar com sua senha.');
      setMode('signin');
    };

    const checkInitial = async () => {
      const url = await Linking.getInitialURL();
      if (url && url.includes('/auth')) {
        showOnce();
      }
    };
    checkInitial();

    const sub = Linking.addEventListener('url', ({ url }) => {
      if (url.includes('/auth')) {
        showOnce();
      }
    });
    return () => sub.remove();
  }, []);

  // ✅ NEW: carregar credenciais salvas
  useEffect(() => {
    (async () => {
      try {
        const [r, savedEmail, savedPass] = await Promise.all([
          AsyncStorage.getItem(KEY_REMEMBER),
          AsyncStorage.getItem(KEY_EMAIL),
          SecureStore.getItemAsync(KEY_PASSWORD),
        ]);
        const on = r === '1';
        setRemember(on);
        if (on) {
          if (savedEmail) setEmail(savedEmail);
          if (savedPass) setPassword(savedPass);
        }
      } catch {}
    })();
  }, []);

  // ✅ NEW: salvar/limpar de acordo com a escolha
  async function persistChoice(rememberOn: boolean, e: string, p: string) {
    try {
      if (rememberOn) {
        await Promise.all([
          AsyncStorage.setItem(KEY_REMEMBER, '1'),
          AsyncStorage.setItem(KEY_EMAIL, e || ''),
          SecureStore.setItemAsync(KEY_PASSWORD, p || '', { keychainService: 'fidelapp.auth' }),
        ]);
      } else {
        await Promise.all([
          AsyncStorage.setItem(KEY_REMEMBER, '0'),
          AsyncStorage.removeItem(KEY_EMAIL),
          SecureStore.deleteItemAsync(KEY_PASSWORD),
        ]);
      }
    } catch {}
  }

  function toggleMode() {
    setErr(null);
    setBusy(false);
    setEmail('');
    setPassword('');
    setMode((m) => (m === 'signin' ? 'signup' : 'signin'));
    setTimeout(() => emailRef.current?.focus(), 50);
  }

  async function handleSubmit() {
    setErr(null);
    if (!email || !password) {
      setErr('Preencha e-mail e senha.');
      return;
    }

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
        // ✅ NEW: persiste a escolha após login OK
        await persistChoice(remember, email.trim(), password);
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
      <SafeAreaView style={{ flex: 1, backgroundColor: BG }}>
        <KeyboardAvoidingView
          behavior={Platform.select({ ios: 'padding', android: undefined })}
          style={{ flex: 1, backgroundColor: BG }}
        >
          <ScrollView
            contentContainerStyle={{
              flexGrow: 1,
              padding: 20,
              justifyContent: 'center',
              gap: 16,
            }}
            style={{ flex: 1, backgroundColor: BG }}
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
    <SafeAreaView style={{ flex: 1, backgroundColor: BG }}>
      <KeyboardAvoidingView
        behavior={Platform.select({ ios: 'padding', android: undefined })}
        style={{ flex: 1, backgroundColor: BG }}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            padding: 20,
            justifyContent: 'center',
            gap: 16,
          }}
          style={{ flex: 1, backgroundColor: BG }}
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
              inputRef={emailRef}
            />

            <PasswordInput
              value={password}
              onChangeText={setPassword}
              placeholder="Senha (mín. 6, 1 maiús., 1 número)"
            />

            {mode === 'signup' ? <PasswordRules password={password} /> : null}
          </View>

          {err ? <Text style={{ color: 'crimson' }}>{err}</Text> : null}

          {/* ✅ NEW: Lembrar meus dados */}
          <Pressable
            onPress={async () => {
              const next = !remember;
              setRemember(next);
              if (!next) {
                // se desmarcar, limpa imediatamente
                await AsyncStorage.setItem(KEY_REMEMBER, '0');
                await AsyncStorage.removeItem(KEY_EMAIL);
                await SecureStore.deleteItemAsync(KEY_PASSWORD);
              } else {
                // se marcar, salva o estado atual (se existir)
                await AsyncStorage.setItem(KEY_REMEMBER, '1');
                if (email) await AsyncStorage.setItem(KEY_EMAIL, email);
                if (password) await SecureStore.setItemAsync(KEY_PASSWORD, password, { keychainService: 'fidelapp.auth' });
              }
            }}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 }}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: remember }}
          >
            <View
              style={{
                width: 20,
                height: 20,
                borderRadius: 4,
                borderWidth: 1,
                borderColor: 'rgba(0,0,0,0.4)',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: remember ? '#111' : 'transparent',
              }}
            >
              {remember ? <Text style={{ color: '#fff', fontSize: 14 }}>✓</Text> : null}
            </View>
            <Text style={{ fontSize: 14 }}>Lembrar meus dados</Text>
          </Pressable>

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
