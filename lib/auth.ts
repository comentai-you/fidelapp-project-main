// lib/auth.ts
import { supabase } from '@/lib/supabaseClient';

// Regra: mínimo 6 caracteres, pelo menos 1 letra maiúscula e 1 número
const PASSWORD_RULE = /^(?=.*[A-Z])(?=.*\d).{6,}$/;

export async function signUpWithEmail(email: string, password: string) {
  // Validação local antes de chamar o Supabase
  if (!PASSWORD_RULE.test(password)) {
    throw new Error('A senha deve ter pelo menos 6 caracteres, incluindo 1 letra maiúscula e 1 número.');
  }

  // Não enviamos emailRedirectTo aqui porque o template do Supabase
  // já força o redirect_to para a bridge (GitHub Pages).
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    // options: { emailRedirectTo: '...' } // ← mantido REMOVIDO (Caminho B)
  });
  if (error) throw error;
  return data;
}

export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
