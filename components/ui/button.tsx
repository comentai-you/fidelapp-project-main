// components/ui/button.tsx
import React from 'react';
import { Pressable, PressableProps, StyleSheet, Text, ViewStyle } from 'react-native';
import { theme } from './theme';

type Variant = 'solid' | 'outline' | 'ghost';

type Props = {
  title: string;
  onPress?: () => void;
  disabled?: boolean;
  variant?: Variant;
  style?: ViewStyle | ViewStyle[];
  /** 🆕 Acessibilidade */
  accessibilityLabel?: string;
} & Omit<PressableProps, 'style' | 'onPress' | 'disabled'>;

export const Button: React.FC<Props> = ({
  title,
  onPress,
  disabled,
  variant = 'solid',
  style,
  accessibilityLabel, // 🆕
  ...rest
}) => {
  const vStyles =
    variant === 'outline'
      ? [s.base, s.outline]
      : variant === 'ghost'
      ? [s.base, s.ghost]
      : [s.base, s.solid];

  const disabledStyle = disabled ? s.disabled : null;

  return (
    <Pressable
      {...rest}
      onPress={disabled ? undefined : onPress}
      style={({ pressed }) => [
        vStyles,
        pressed && !disabled ? s.pressed : null,
        disabledStyle,
        style,
      ]}
      accessible
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title} // 🆕
      disabled={disabled}
      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }} // toque confortável
    >
      <Text
        style={[
          s.text,
          variant === 'ghost' ? s.textGhost : null,
          variant === 'outline' ? s.textOutline : null,
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );
};

const s = StyleSheet.create({
  base: {
    borderRadius: theme.radius.lg,
    paddingVertical: 12,
    paddingHorizontal: theme.space.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  solid: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  outline: {
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
  },
  ghost: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
  },
  text: {
    fontWeight: '800',
    color: '#fff',
  },
  textOutline: {
    color: theme.colors.title,
  },
  textGhost: {
    color: theme.colors.title,
  },
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    opacity: 0.6,
  },
});
