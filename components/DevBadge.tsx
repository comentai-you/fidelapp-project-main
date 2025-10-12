// components/DevBadge.tsx
import { theme } from '@/components/ui/theme';
import { useStore } from '@/state/store';
import React from 'react';
import { Pressable, Text, View } from 'react-native';

export function DevBadge() {
  const { state, forceReloadUser } = useStore();

  return (
    <Pressable
      onPress={forceReloadUser}
      style={{
        position: 'absolute',
        right: 12,
        bottom: 12,
        backgroundColor: theme.colors.card,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: theme.colors.border,
        shadowColor: '#000',
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 2,
      }}
    >
      <View>
        <Text style={{ color: theme.colors.title, fontWeight: '700' }}>
          {state.plan.toUpperCase()}
        </Text>

        {/* Subtexto com cor existente no tema */}
        <Text style={{ color: theme.colors.muted, fontSize: 12 }}>
          Prog: {state.limits.maxPrograms} | Cli: {state.limits.maxCustomersPerProgram}
        </Text>

        {/* Ação em destaque usando a cor primária do app */}
        <Text style={{ color: theme.colors.primary, fontSize: 12, marginTop: 4 }}>
          ↻ Toque para recarregar
        </Text>
      </View>
    </Pressable>
  );
}
