// hooks/useRedemptionsRealtime.ts
import { supabase } from '@/lib/supabaseClient';
import { useStore } from '@/state/store';
import { useEffect } from 'react';

export function useRedemptionsRealtime() {
  const { state, appendRedemption } = useStore();

  useEffect(() => {
    const channel = supabase
      .channel('redemptions-inserts')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'redemptions' },
        (payload) => {
          const r = payload.new as {
            id: string;
            program_id: string;
            customer_id: string;
            created_at: string;
          };

          // evita duplicar caso já esteja no estado
          if (state.redemptions.some(x => x.id === r.id)) return;

          appendRedemption({
            id: r.id,
            programId: r.program_id,
            customerId: r.customer_id,
            createdAt: r.created_at,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [state.redemptions, appendRedemption]);
}
