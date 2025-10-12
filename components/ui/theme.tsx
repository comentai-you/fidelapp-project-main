// components/ui/theme.ts
export const theme = {
  colors: {
    // superfícies
    bg: '#F6F7FB',
    card: '#FFFFFF',
    border: '#E5E7EB',

    // tipografia
    title: '#0F172A',
    text: '#475569',
    muted: '#94A3B8',

    // ações/feedback
    primary: '#0EA5E9',
    success: '#10B981',
    warn: '#F59E0B',

     // NOVOS (para estados desabilitados)
    disabledBg: '#E5E7EB',  // fundo cinza claro
    disabledFg: '#9CA3AF',  // texto cinza claro

    // navegação (tab bar)
    tabBarBg: '#0B1220',
    tabBarInactive: '#94A3B8',
    tabBarBorder: '#0B1220',
  },
  radius: { sm: 8, md: 12, lg: 16 },
  space: { xs: 8, sm: 12, md: 16, lg: 20, xl: 24 },
  shadow: {
    card: {
      elevation: 2,
      shadowColor: '#000',
      shadowOpacity: 0.08,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 3 },
    },
  },
  font: { h1: 28, h2: 20, body: 15, small: 13 },
};
