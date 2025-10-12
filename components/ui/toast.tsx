// components/ui/toast.tsx
import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type ToastType = 'success' | 'error' | 'info';
type Ctx = { show: (msg: string, type?: ToastType) => void };

const ToastCtx = createContext<Ctx | null>(null);

export function ToastProvider({ children }: React.PropsWithChildren) {
  const insets = useSafeAreaInsets();

  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState<string>('');
  const [type, setType] = useState<ToastType>('info');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hide = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setVisible(false);
    setMessage('');
  }, []);

  const show = useCallback((msg: string, t: ToastType = 'info') => {
    // Garante string e evita qualquer coisa que não seja texto
    const safe = String(msg ?? '');
    setMessage(safe);
    setType(t);
    setVisible(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(hide, 1800);
  }, [hide]);

  const value = useMemo<Ctx>(() => ({ show }), [show]);

  return (
    <ToastCtx.Provider value={value}>
      {children}

      {/* Modal transparente isola do resto da árvore (evita conflitos) */}
      <Modal visible={visible} transparent animationType="none" onRequestClose={hide}>
        <View style={styles.modalRoot} pointerEvents="none">
          <View style={[styles.top, { paddingTop: insets.top + 12 }]}>
            <View
              style={[
                styles.toast,
                type === 'success' && styles.success,
                type === 'error' && styles.error,
                type === 'info' && styles.info,
              ]}
            >
              {/* Sempre texto dentro de <Text> */}
              <Text style={styles.text}>{message}</Text>
            </View>
          </View>
        </View>
      </Modal>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx.show;
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  top: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: 16,
  },
  toast: {
    minWidth: 140,
    maxWidth: 360,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: '#0f172a',
    borderColor: '#0f172a',
    // sombra leve
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  text: { color: '#fff', fontWeight: '700' },
  success: { backgroundColor: '#16a34a', borderColor: '#16a34a' },
  error:   { backgroundColor: '#dc2626', borderColor: '#dc2626' },
  info:    { backgroundColor: '#0ea5e9', borderColor: '#0ea5e9' },
});
