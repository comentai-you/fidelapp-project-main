// app/privacy.tsx
import { Header } from '@/components/ui/Header';
import { Card } from '@/components/ui/card';
import { theme } from '@/components/ui/theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

export default function PrivacyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handleBack = () => {
    if (router.canGoBack()) router.back();
    else router.push('/' as never); // fallback para Home
  };

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

      {/* desloca o Header para não ficar sob a seta */}
      <View style={{ paddingLeft: 44 }}>
        <Header title="Política de Privacidade" subtitle="FideLApp" />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: theme.space.lg, gap: theme.space.lg }}
        showsVerticalScrollIndicator={false}
      >
        <Card>
          <Text style={{ color: theme.colors.title, fontSize: 16, fontWeight: '800', marginBottom: 8 }}>
            Última atualização: 10/10/2025
          </Text>

          <View style={{ gap: 14 }}>
            <Text style={p()}>
              O FideLApp respeita sua privacidade. Esta política explica como coletamos, usamos e protegemos suas
              informações ao usar nosso aplicativo.
            </Text>

            <Section title="1. Informações que coletamos">
              <Bullet>Dados de perfil: nome, nome da loja, e-mail, telefone, tipo de negócio.</Bullet>
              <Bullet>Dados do programa de fidelidade: nome do programa, recompensa, PIN e total de selos.</Bullet>
              <Bullet>Dados de clientes: nome, telefone (E.164) e progresso de selos.</Bullet>
              <Bullet>Dados de uso: interações básicas dentro do app (de forma agregada/anônima, quando aplicável).</Bullet>
            </Section>

            <Section title="2. Como utilizamos os dados">
              <Bullet>Operar o app: criar programas, gerenciar clientes e selos.</Bullet>
              <Bullet>Comunicação via WhatsApp: abrir conversas usando o número cadastrado (sem envio automático).</Bullet>
              <Bullet>Melhorias de produto: ajustes de UX e estabilidade com base em métricas agregadas.</Bullet>
            </Section>

            <Section title="3. Armazenamento e sincronização">
              <Text style={p()}>
                Nesta fase, os dados são armazenados localmente no app. Em etapa futura (backend com Supabase), os dados
                poderão ser sincronizados com a nuvem para acesso multi-dispositivo. Quando isso ocorrer, você será
                informado e esta política será atualizada.
              </Text>
            </Section>

            <Section title="4. Compartilhamento de dados">
              <Bullet>Não vendemos seus dados.</Bullet>
              <Bullet>
                Podemos compartilhar dados estritamente necessários com provedores de infraestrutura quando houver backend
                (ex.: Supabase) para autenticação e sincronização.
              </Bullet>
              <Bullet>Podemos divulgar informações quando exigido por lei.</Bullet>
            </Section>

            <Section title="5. Segurança">
              <Text style={p()}>
                Adotamos medidas razoáveis para proteger seus dados. Nenhuma tecnologia é 100% segura, mas buscamos
                boas práticas de segurança e acesso mínimo necessário.
              </Text>
            </Section>

            <Section title="6. Seus direitos">
              <Bullet>Acessar e corrigir seus dados.</Bullet>
              <Bullet>Excluir seus dados (localmente ou, na fase de nuvem, mediante solicitação).</Bullet>
              <Bullet>Revogar consentimentos aplicáveis.</Bullet>
            </Section>

            <Section title="7. Crianças e adolescentes">
              <Text style={p()}>
                O app é destinado a uso por empreendedores/negócios. Se identificarmos cadastro de menor de idade,
                poderemos remover os dados.
              </Text>
            </Section>

            <Section title="8. Alterações desta política">
              <Text style={p()}>
                Podemos atualizar esta política para refletir mudanças no app. A versão vigente estará sempre nesta tela.
              </Text>
            </Section>

            <Section title="9. Contato">
              <Text style={p()}>
                Dúvidas ou solicitações sobre privacidade: WhatsApp 61 99968-6641.
              </Text>
            </Section>
          </View>
        </Card>

        <Text style={{ textAlign: 'center', color: theme.colors.text, fontSize: 13 }}>
          © {new Date().getFullYear()} FideLApp • Todos os direitos reservados
        </Text>

        <View style={{ height: 60 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function p() {
  return { color: theme.colors.text, fontSize: 14, lineHeight: 20 };
}

function Section({ title, children }: React.PropsWithChildren<{ title: string }>) {
  return (
    <View>
      <Text style={{ color: theme.colors.title, fontSize: 15, fontWeight: '800', marginBottom: 6 }}>{title}</Text>
      <View style={{ gap: 6 }}>{children}</View>
    </View>
  );
}

function Bullet({ children }: React.PropsWithChildren) {
  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      <Text style={{ color: theme.colors.text, fontSize: 14 }}>{'\u2022'}</Text>
      <Text style={p()}>{children}</Text>
    </View>
  );
}
