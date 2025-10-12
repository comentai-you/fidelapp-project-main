import * as Linking from 'expo-linking';

export function buildWhatsAppLink(phone: string, message: string) {
  const clean = phone.replace(/\D/g, '');
  const text = encodeURIComponent(message);
  // Ajuste o 55 se quiser forçar DDI Brasil:
  return `https://wa.me/${clean}?text=${text}`;
}

export async function shareProgressViaWhatsApp(params: {
  phone: string; programName: string; stamps: number; total: number; reward?: string;
}) {
  const { phone, programName, stamps, total, reward } = params;
  const remaining = Math.max(total - stamps, 0);
  const msg = `Você tem ${stamps}/${total} selos no *${programName}*.` +
    (remaining > 0 ? ` Faltam ${remaining} para ganhar` : ` 🎉 Benefício liberado!`) +
    (reward ? `: ${reward}` : '');
  const url = buildWhatsAppLink(phone, msg);
  await Linking.openURL(url);
}
