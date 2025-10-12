// hooks/useSupabaseBootstrap.ts
import { ensureUserProfile } from '@/lib/profile';
import { simpleSync } from '@/lib/sync';
import { useSession } from '@/state/session';
import { useEffect, useState } from 'react';

export function useSupabaseBootstrap() {
  const { session, loading } = useSession();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [firstPull, setFirstPull] = useState<Awaited<ReturnType<typeof simpleSync>> | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!session) {
      setReady(true);
      return;
    }

    let mounted = true;
    (async () => {
      try {
        await ensureUserProfile();
        const pulled = await simpleSync({ sinceLastPull: false });
        if (!mounted) return;
        setFirstPull(pulled); // se quiser, aqui você pode aplicar na store
        setReady(true);
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message || 'Falha ao inicializar Supabase');
        setReady(true);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [session, loading]);

  return { ready, error, firstPull, session };
}
