// lib/profile.ts
import { supabase } from '@/lib/supabaseClient';

export type AppUser = {
  id: string;
  name: string | null;
  avatar_url: string | null;
  plan: 'freemium' | 'start' | 'pro';
  max_programs: number;
  max_customers_per_program: number;
  created_at: string;
  updated_at: string;
};

export async function ensureUserProfile() {
  const { data: sessionRes, error: sErr } = await supabase.auth.getSession();
  if (sErr) throw sErr;
  const user = sessionRes.session?.user;
  if (!user) return null;

  // ✅ CORREÇÃO 1: Tenta ler o perfil da tabela 'profiles'
  const { data: existing, error: readErr } = await supabase
    .from('profiles') // <-- CORRIGIDO
    .select('*, max_programs, max_customers_per_program, plan') // Inclui as novas colunas
    .eq('id', user.id)
    .maybeSingle();

  if (readErr) throw readErr;
  if (existing) return existing as AppUser;

  // Se não existir, o SQL Trigger (que criamos antes) deveria ter criado o ID.
  // Se, por alguma razão, o perfil ainda estiver faltando, criamos com os valores padrão.
  const { data: created, error: insErr } = await supabase
    .from('profiles') // <-- CORRIGIDO
    .insert({
      id: user.id,
      plan: 'freemium',
      max_programs: 1,
      max_customers_per_program: 10,
    })
    .select('*')
    .single();

  if (insErr) throw insErr;
  return created as AppUser;
}