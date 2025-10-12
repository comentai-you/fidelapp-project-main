// components/layout/KeyboardSpacer.tsx
import React, { useEffect, useState } from 'react';
import { Keyboard, Platform, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const KeyboardSpacer: React.FC = () => {
  const insets = useSafeAreaInsets();
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const onShow = (e: any) => {
      const kb = e?.endCoordinates?.height ?? 0;
      setHeight(kb + (insets.bottom || 0));
    };
    const onHide = () => setHeight(0);

    const s = Keyboard.addListener(showEvt, onShow);
    const h = Keyboard.addListener(hideEvt, onHide);
    return () => {
      s.remove();
      h.remove();
    };
  }, [insets.bottom]);

  return <View style={{ height }} />;
};
