// lib/stats.ts
// Importa só o TIPO do estado para evitar ciclo de runtime com a store
import type { Customer, State } from '@/state/store';

export type KPI = {
  totalPrograms: number;
  totalCustomers: number;
  totalStampsGiven: number;   // soma dos stamps atuais (proxy de carimbos ativos)
  totalRedemptions: number;   // quantidade de resgates (lista local)
  topCustomers: Array<{ id: string; name: string; stamps: number; programId: string }>;
};

/**
 * Calcula KPIs a partir do estado local (offline-first).
 * Não faz chamadas externas nem depende do Supabase.
 */
export function computeKPIs(state: State): KPI {
  const totalPrograms = state.programs.length;
  const totalCustomers = state.customers.length;

  const totalStampsGiven = state.customers.reduce((acc, c) => acc + (c.stamps || 0), 0);
  const totalRedemptions = state.redemptions.length;

  const topCustomers = pickTopByStamps(state.customers, 3);

  return {
    totalPrograms,
    totalCustomers,
    totalStampsGiven,
    totalRedemptions,
    topCustomers,
  };
}

/** Utilitário: pega top N clientes ordenados por stamps (desc) */
function pickTopByStamps(list: Customer[], n: number) {
  return [...list]
    .sort((a, b) => (b.stamps || 0) - (a.stamps || 0))
    .slice(0, n)
    .map(c => ({ id: c.id, name: c.name, stamps: c.stamps || 0, programId: c.programId }));
}
