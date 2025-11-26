// app/plans.tsx
import { Header } from '@/components/ui/Header';
import { Button } from '@/components/ui/button';
import { Card as UICard } from '@/components/ui/card';
import { theme } from '@/components/ui/theme';
import { useToast } from '@/components/ui/toast';
import { buy, initIAP, loadProducts, onPurchaseFailed, onPurchaseSuccess } from '@/lib/iap';
import { useStore } from '@/state/store';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

// Duplicamos os limites aqui para não tocar na store
const LIMITS = {
  freemium: { title: 'Freemium', price: 'R$0', programs: 1, customersPerProgram: 10, desc: 'Para começar' },
  start:    { title: 'Start',    price: 'R$29,90', programs: 5, customersPerProgram: 30, desc: 'Para crescer' },
  pro:      { title: 'Pro',      price: 'R$49,90', programs: 10, customersPerProgram: 60, desc: 'Para escalar' },
} as const;

type PlanKey = keyof typeof LIMITS;

export default function PlansScreen() {
  const { state, setPlan } = useStore();
  const [gProducts, setGProducts] = React.useState<Record<string, any>>({});
  const [purchaseInProgress, setPurchaseInProgress] = React.useState(false);
  const [selectedPlanPending, setSelectedPlanPending] = React.useState<PlanKey | null>(null);
  const toast = useToast();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // usar number | null evita erro TS em RN
  const timeoutRef = React.useRef<number | null>(null);

  const handleBack = () => {
    if (router.canGoBack()) router.back();
    else router.push('/(tabs)/cards' as never);
  };

  const usage = useMemo(() => {
    const programs = state.programs.length;
    const byProgram: Record<string, number> = {};
    state.customers.forEach(c => {
      byProgram[c.programId] = (byProgram[c.programId] ?? 0) + 1;
    });
    const maxCustomersInOneProgram = Object.values(byProgram).reduce((m, n) => Math.max(m, n), 0);
    return { programs, maxCustomersInOneProgram };
  }, [state.programs, state.customers]);

  React.useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        await initIAP();
      } catch (e) {
        console.warn("initIAP falhou", e);
        toast("Erro ao iniciar sistema de pagamentos.", "error");
      }

      try {
        const prods = await loadProducts();
        if (!mounted) return;
        const mapped = Object.fromEntries(prods.map((p: any) => [p.productId, p]));
        setGProducts(mapped);
      } catch (err) {
        console.warn("loadProducts erro", err);
      }
    }

    const okSub = onPurchaseSuccess(async (p: any) => {
      console.log("IAP success event:", p);

      // chama o backend para validar e salvar no Supabase
      try {
        // exemplo: endpoint hospedado em /api/validate-subscription (Vercel) — ajustar URL conforme deploy
        const res = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_URL || 'https://your-backend.example.com'}/api/validate-subscription`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            purchaseToken: p.token || p.purchaseToken || p.purchase_token,
            productId: p.productId,
          }),
        });

        const json = await res.json();
        if (!res.ok) throw new Error(json?.message || 'validation failed');

        // backend validou e gravou no Supabase — só então atualizamos localmente
        if (json.productId === 'fidelapp_start_mensal') {
          setPlan('start');
          toast("Assinatura Start ativada com sucesso!", 'success');
        } else if (json.productId === 'fidelapp_pro_mensal') {
          setPlan('pro');
          toast("Assinatura Pro ativada com sucesso!", 'success');
        } else {
          toast("Assinatura ativada (produto desconhecido).", 'info');
        }
      } catch (err) {
        console.warn("Erro validando compra no backend:", err);
        toast("Não foi possível validar a compra no servidor.", 'error');
      } finally {
        setPurchaseInProgress(false);
        setSelectedPlanPending(null);
        if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
      }
    });

    const failSub = onPurchaseFailed((e: any) => {
      console.warn("IAP failed event:", e);
      toast("Não foi possível finalizar a compra.", 'error');
      setPurchaseInProgress(false);
      setSelectedPlanPending(null);
      if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
    });

    init();

    return () => {
      mounted = false;
      okSub.remove();
      failSub.remove();
      if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
    };
  }, [toast, setPlan]);

  function canApply(plan: PlanKey) {
    const limits = LIMITS[plan];
    if (usage.programs > limits.programs) return false;
    if (usage.maxCustomersInOneProgram > limits.customersPerProgram) return false;
    return true;
  }

  async function onSelect(plan: PlanKey) {
    if (!canApply(plan)) {
      const limits = LIMITS[plan];
      toast(
        `Este plano permite até ${limits.programs} cartão(ões) e ${limits.customersPerProgram} clientes por cartão. ` +
        `Ajuste seus dados para mudar para ${limits.title}.`,
        'info'
      );
      return;
    }

    if (plan === 'freemium') {
      setPlan('freemium');
      toast('Você voltou para o plano gratuito.', 'success');
      return;
    }

    const productId = plan === 'start' ? 'fidelapp_start_mensal' : 'fidelapp_pro_mensal';
    const p = gProducts[productId];
    if (!p) {
      toast("Produtos ainda carregando. Tente novamente.", "info");
      return;
    }

    if (purchaseInProgress) {
      toast("Uma compra já está em andamento. Aguarde...", "info");
      return;
    }

    try {
      setPurchaseInProgress(true);
      setSelectedPlanPending(plan);
      timeoutRef.current = global.setTimeout(() => {
        setPurchaseInProgress(false);
        setSelectedPlanPending(null);
        toast("Tempo esgotado ao processar a compra. Tente novamente.", "error");
        timeoutRef.current = null;
      }, 60000) as unknown as number;

      await buy(productId);
      // aqui aguardamos evento de sucesso do natve -> backend validado -> setPlan
    } catch (err) {
      console.warn("Erro ao iniciar compra:", err);
      toast("Erro ao iniciar a compra.", 'error');
      setPurchaseInProgress(false);
      setSelectedPlanPending(null);
      if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <Pressable
        onPress={handleBack}
        style={{
          position: 'absolute',
          top: insets.top + 10,
          left: 16,
          zIndex: 20,
          backgroundColor: theme.colors.card,
          borderRadius: 999,
          padding: 4,
          elevation: 4,
          shadowColor: '#000',
          shadowOpacity: 0.2,
          shadowRadius: 4,
          shadowOffset: { width: 0, height: 2 },
        }}
        accessibilityRole="button"
        accessibilityLabel="Voltar"
      >
        <Ionicons name="chevron-back" size={26} color={theme.colors.title} />
      </Pressable>

      <View style={{ paddingLeft: 44 }}>
        <Header title="Planos" subtitle="Escolha o plano ideal para seu negócio" />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <Text style={{ color: theme.colors.text, marginBottom: 12 }}>
          Seu plano atual:{' '}
          <Text style={{ color: theme.colors.title, fontWeight: '800' }}>
            {LIMITS[state.plan as PlanKey].title}
          </Text>
        </Text>

        {(Object.keys(LIMITS) as PlanKey[]).map((key) => {
          const plan = LIMITS[key];
          const active = state.plan === key;
          const blocked = !canApply(key);
          const isPendingThis = purchaseInProgress && selectedPlanPending === key;

          return (
            <UICard key={key} style={{ marginBottom: 14 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={{ color: theme.colors.title, fontSize: 18, fontWeight: '800' }}>{plan.title}</Text>
                  <Text style={{ color: theme.colors.text, marginTop: 4 }}>{plan.desc}</Text>
                  <View style={{ height: 8 }} />
                  <Text style={{ color: theme.colors.title, fontWeight: '800' }}>
                    {(
                      (key === 'start' ? gProducts['fidelapp_start_mensal'] :
                       key === 'pro' ? gProducts['fidelapp_pro_mensal'] : null
                      )?.price || plan.price
                    )}/mês
                  </Text>

                  <Text style={{ color: theme.colors.text, marginTop: 8 }}>
                    • Até <Text style={{ color: theme.colors.title, fontWeight: '800' }}>{plan.programs}</Text> cartão(ões)
                  </Text>
                  <Text style={{ color: theme.colors.text }}>
                    • Até <Text style={{ color: theme.colors.title, fontWeight: '800' }}>{plan.customersPerProgram}</Text> clientes por cartão
                  </Text>
                </View>

                <View style={{ width: 140, alignItems: 'center' }}>
                  <Button
                    title={ active ? 'Plano atual' : isPendingThis ? 'Finalizando...' : 'Selecionar' }
                    onPress={() => onSelect(key)}
                    disabled={active || blocked || (purchaseInProgress && !isPendingThis)}
                    variant={active ? 'outline' : undefined}
                  />
                  {isPendingThis && <View style={{ marginTop: 6 }}><ActivityIndicator /></View>}
                  {blocked && !active && (
                    <Text style={{ color: theme.colors.muted, fontSize: 12, marginTop: 6 }}>
                      Ajuste seus dados para habilitar.
                    </Text>
                  )}
                </View>
              </View>

              {active && (
                <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderColor: theme.colors.border }}>
                  <Text style={{ color: theme.colors.text }}>
                    Você usa{' '}
                    <Text style={{ color: theme.colors.title, fontWeight: '800' }}>{usage.programs}</Text> cartão(ões).
                  </Text>
                  <Text style={{ color: theme.colors.text }}>
                    Maior cartão tem{' '}
                    <Text style={{ color: theme.colors.title, fontWeight: '800' }}>{usage.maxCustomersInOneProgram}</Text> clientes.
                  </Text>
                </View>
              )}
            </UICard>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}
