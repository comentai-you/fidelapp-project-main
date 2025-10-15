import { formatBRPhone, normalizePhone } from '@/state/store';
import React from 'react';
import { TextInput } from 'react-native';

type Props = {
  value: string;              // valor CRU (apenas dígitos)
  onChange: (digits: string) => void;
  placeholder?: string;
};

export function PhoneField({ value, onChange, placeholder = '(xx) 9xxxx-xxxx' }: Props) {
  return (
    <TextInput
      keyboardType="phone-pad"
      value={formatBRPhone(value)}
      placeholder={placeholder}
      onChangeText={(txt) => onChange(normalizePhone(txt))}
      maxLength={18} // suficiente para máscara
      autoCorrect={false}
      autoCapitalize="none"
      style={{ /* seu estilo */ }}
    />
  );
}
