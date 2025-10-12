// lib/sync.ts
import { supabase } from '@/lib/supabaseClient';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ProgramRow = {
  id: string;
  user_id: string;
  name: string;
  total_stamps: number;
  reward: string | null;
  pin: string | null;
  cover: string | null;
  created_at: string;
  updated_at: string;
};

export type CustomerRow = {
  id: string;
  program_id: string;
  user_id: string;
  name: string;
  stamps: number;
  phone: string | null;
  created_at: string;
  updated_at: string;
};

export type RedemptionRow = {
  id: string;
  user_id: string;
  program_id: string;
  customer_id: string;
  type: 'stamp' | 'redeem' | 'remove_stamp';
  delta: number | null;
  note: string | null;
  created_at: string;
};

const LAST_PULL_KEY = '@sync/last_pull_at';
const LAST_PUSH_KEY = '@sync/last_push_at';

export async function getAuthUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user?.id ?? null;
}

/** PULL: baixa do Supabase tudo atualizado depois de `since` (já filtrado por RLS) */
export async function pullFromSupabase(since?: string) {
  const uid = await getAuthUserId();
  if (!uid) return { programs: [], customers: [], redemptions: [] };

  const { data: programs, error: pErr } = since
    ? await supabase
        .from('programs')
        .select('*')
        .eq('user_id', uid)
        .gt('updated_at', since)
        .order('updated_at', { ascending: true })
    : await supabase
        .from('programs')
        .select('*')
        .eq('user_id', uid)
        .order('updated_at', { ascending: true });
  if (pErr) throw pErr;

  const { data: customers, error: cErr } = since
    ? await supabase
        .from('customers')
        .select('*')
        .eq('user_id', uid)
        .gt('updated_at', since)
        .order('updated_at', { ascending: true })
    : await supabase
        .from('customers')
        .select('*')
        .eq('user_id', uid)
        .order('updated_at', { ascending: true });
  if (cErr) throw cErr;

  const { data: redemptions, error: rErr } = since
    ? await supabase
        .from('redemptions')
        .select('*')
        .eq('user_id', uid)
        .gt('created_at', since)
        .order('created_at', { ascending: true })
    : await supabase
        .from('redemptions')
        .select('*')
        .eq('user_id', uid)
        .order('created_at', { ascending: true });
  if (rErr) throw rErr;

  const now = new Date().toISOString();
  await AsyncStorage.setItem(LAST_PULL_KEY, now);

  return {
    programs: (programs ?? []) as ProgramRow[],
    customers: (customers ?? []) as CustomerRow[],
    redemptions: (redemptions ?? []) as RedemptionRow[],
    pulled_at: now,
  };
}

/** PUSH: envia dados do usuário logado (user_id) respeitando RLS */
export async function pushToSupabase(input: {
  programs?: Partial<ProgramRow>[];
  customers?: Partial<CustomerRow>[];
  redemptions?: Partial<RedemptionRow>[];
}) {
  const uid = await getAuthUserId();
  if (!uid) throw new Error('Usuário não autenticado');

  const out: {
    programs?: ProgramRow[];
    customers?: CustomerRow[];
    redemptions?: RedemptionRow[];
  } = {};

  if (input.programs?.length) {
    const withUser = input.programs.map((p) => ({ ...p, user_id: uid }));
    const { data, error } = await supabase
      .from('programs')
      .upsert(withUser, { onConflict: 'id' })
      .select('*');
    if (error) throw error;
    out.programs = data as ProgramRow[];
  }

  if (input.customers?.length) {
    const withUser = input.customers.map((c) => ({ ...c, user_id: uid }));
    const { data, error } = await supabase
      .from('customers')
      .upsert(withUser, { onConflict: 'id' })
      .select('*');
    if (error) throw error;
    out.customers = data as CustomerRow[];
  }

  if (input.redemptions?.length) {
    const withUser = input.redemptions.map((r) => ({ ...r, user_id: uid }));
    const { data, error } = await supabase
      .from('redemptions')
      .insert(withUser)
      .select('*');
    if (error) throw error;
    out.redemptions = data as RedemptionRow[];
  }

  const now = new Date().toISOString();
  await AsyncStorage.setItem(LAST_PUSH_KEY, now);

  return { ...out, pushed_at: now };
}

/** Sync simples: faz um pull (com since opcional) */
export async function simpleSync(opts?: { sinceLastPull?: boolean }) {
  const since = opts?.sinceLastPull
    ? await AsyncStorage.getItem(LAST_PULL_KEY)
    : undefined;
  return await pullFromSupabase(since ?? undefined);
}
