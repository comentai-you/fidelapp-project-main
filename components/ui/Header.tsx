// components/ui/Header.tsx
import { theme } from '@/components/ui/theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = { title: string; subtitle?: string; back?: boolean };

export const Header: React.FC<Props> = ({ title, subtitle, back }) => {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  return (
    <View style={[s.container, { paddingTop: Math.max(insets.top, 12) + 8 }]}>
      <View style={s.row}>
        {back ? (
          <Pressable onPress={() => router.back()} hitSlop={12} style={s.backBtn}>
            <Ionicons name="chevron-back" size={22} color={theme.colors.title} />
          </Pressable>
        ) : <View style={{ width: 22 }} /> }
        <View style={{ flex: 1 }}>
          <Text style={s.title}>{title}</Text>
          {!!subtitle && <Text style={s.subtitle}>{subtitle}</Text>}
        </View>
        <View style={{ width: 22 }} />
      </View>
    </View>
  );
};

const s = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.bg,
    paddingHorizontal: theme.space.lg,
    paddingBottom: theme.space.sm,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  backBtn: { paddingRight: 4, paddingVertical: 4 },
  title: { fontSize: 22, fontWeight: '800', color: theme.colors.title },
  subtitle: { marginTop: 4, color: theme.colors.text, fontSize: 14 },
});
