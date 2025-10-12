// components/layout/Page.tsx
import { KeyboardSpacer } from '@/components/layout/KeyboardSpacer';
import { theme } from '@/components/ui/theme';
import React from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Props = {
  children: React.ReactNode;
  scrollable?: boolean;
  contentContainerStyle?: ViewStyle;
};

export const Page: React.FC<Props> = ({ children, scrollable = false, contentContainerStyle }) => {
  const Body = scrollable ? ScrollView : React.Fragment;
  const bodyProps = scrollable
    ? {
        style: { flex: 1 },
        contentContainerStyle: [{ padding: theme.space.lg, paddingBottom: theme.space.xl }, contentContainerStyle],
        keyboardShouldPersistTaps: 'handled' as const,
        showsVerticalScrollIndicator: false,
      }
    : {};

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg }} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* @ts-ignore */}
        <Body {...bodyProps}>{children}</Body>
        <KeyboardSpacer />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};
