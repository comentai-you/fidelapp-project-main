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
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';


// Duplicamos os limites aqui para não tocar na store
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
  const toast = useToast();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // 🔙 Função de voltar com fallback seguro
  const handleBack = () => {
    if (router.canGoBack()) router.back();
    else  router.push('/(tabs)/cards' as never); // fallback para Home
  };

  // Uso atual (para validar downgrade/upgrade)
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
  async function init() {
    await initIAP();
    const prods = await loadProducts();

    const mapped = Object.fromEntries(
      prods.map(p => [p.productId, p])
    );

    setGProducts(mapped);
  }

  // listeners
  const subOK = onPurchaseSuccess((p) => {
    console.log("Compra concluída", p);
    if (p.productId === 'fidelapp_start_mensal') {
      setPlan('start');
    } else if (p.productId === 'fidelapp_pro_mensal') {
      setPlan('pro');
    }
    toast("Assinatura ativada com sucesso!", 'success');
  });

  const subFail = onPurchaseFailed((e) => {
    console.warn("Falha na compra", e);
    toast("Não foi possível finalizar a compra.",'error');
  });

  init();

  return () => {
    subOK.remove();
    subFail.remove();
  };
}, []);


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
      `Este plano permite até ${limits.programs} cartão(ões) e ${limits.customersPerProgram} clientes por cartão. `,
      'info'
    );
    return;
  }

  // freemium continua local SEM compra
  if (plan === 'freemium') {
    setPlan('freemium');
    toast('Você voltou para o plano gratuito.', 'success');
    return;
  }

  // planos pagos → precisa dos produtos reais
  const productId =
    plan === 'start'
      ? 'fidelapp_start_mensal'
      : 'fidelapp_pro_mensal';

  const p = gProducts[productId];
  if (!p) {
    toast("Produtos ainda carregando. Tente novamente.", "info");
    return;
  }

  try {
    await buy(productId);
  } catch (err) {
    console.warn(err);
    toast("Erro ao iniciar a compra.", 'error');
  }
}


  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      {/* 🔙 Botão Voltar */}
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

      {/* Header deslocado para não ficar sob a seta */}
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

        {/* Cards dos planos */}
        {(Object.keys(LIMITS) as PlanKey[]).map((key) => {
          const plan = LIMITS[key];
          const active = state.plan === key;
          const blocked = !canApply(key);

          return (
            <UICard key={key} style={{ marginBottom: 14, opacity: active ? 1 : 1 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={{ color: theme.colors.title, fontSize: 18, fontWeight: '800' }}>{plan.title}</Text>
                  <Text style={{ color: theme.colors.text, marginTop: 4 }}>{plan.desc}</Text>
                  <View style={{ height: 8 }} />
                  <Text style={{ color: theme.colors.title, fontWeight: '800' }}>
  {(
    // tenta pegar o preço do produto do Play; se não existir, usa o price estático da constante
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

                <View style={{ width: 140 }}>
                  <Button
                    title={active ? 'Plano atual' : 'Selecionar'}
                    onPress={() => onSelect(key)}
                    disabled={active || blocked}
                    variant={active ? 'outline' : undefined}
                  />
                  {blocked && !active && (
                    <Text style={{ color: theme.colors.muted, fontSize: 12, marginTop: 6 }}>
                      Ajuste seus dados para habilitar.
                    </Text>
                  )}
                </View>
              </View>

              {/* Resumo do uso atual */}
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
