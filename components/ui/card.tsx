import { theme } from '@/components/ui/theme';
import React from 'react';
import { StyleSheet, View, ViewProps } from 'react-native';

/**
 * Card — componente visual reutilizável
 *
 * Usado em:
 *  - telas de Menu (preferências, ajuda, etc.)
 *  - listagem de clientes e programas
 *
 * Props:
 *  - children: conteúdo interno
 *  - style: estilos extras opcionais
 *  - elevated: ativa sombra suave
 */
export const Card: React.FC<ViewProps & { elevated?: boolean }> = ({
  children,
  style,
  elevated = true,
  ...rest
}) => {
  return (
    <View
      style={[
        s.base,
        elevated && s.shadow,
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
};

const s = StyleSheet.create({
  base: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.space.md,
  },

  // 🪄 Sombra refinada — leve, mas perceptível
  shadow: {
    elevation: 3,               // Android
    shadowColor: '#000',        // iOS e Android
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
});
