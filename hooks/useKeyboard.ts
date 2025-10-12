// hooks/useKeyboard.ts
import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

/**
 * Retorna a altura do teclado (em px).
 * - Android: usamos a altura real do teclado
 * - iOS: devolve 0 (deixamos o KeyboardAvoidingView cuidar disso)
 */
export default function useKeyboard(): number {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === 'android' ? 'keyboardDidShow' : 'keyboardWillShow';
    const hideEvent = Platform.OS === 'android' ? 'keyboardDidHide' : 'keyboardWillHide';

    const show = Keyboard.addListener(showEvent, (e) => {
      setHeight(e?.endCoordinates?.height ?? 0);
    });
    const hide = Keyboard.addListener(hideEvent, () => setHeight(0));

    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return Platform.OS === 'ios' ? 0 : height;
}
