// lib/activity.ts
import type { State } from '@/state/store';

export type ActivityItem = {
  id: string;
  label: string;
  when: string;       // ISO
};

export function getRecentActivity(state: State, limit = 20): ActivityItem[] {
  // junta infos de customer/program ao item
  const cById = new Map(state.customers.map(c => [c.id, c]));
  const pById = new Map(state.programs.map(p => [p.id, p]));

  const items = state.redemptions
    .slice() // cópia
    .sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1))
    .slice(0, limit)
    .map(r => {
      const c = cById.get(r.customerId);
      const p = pById.get(r.programId);
      const label = `${c?.name ?? 'Cliente'} resgatou no cartão ${p?.name ?? '—'}`;
      return { id: r.id, label, when: r.createdAt };
    });

  return items;
}
