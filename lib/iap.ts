// lib/iap.ts
import { Platform } from 'react-native';
import * as RNIap from 'react-native-iap';

// Use EXACTAMENTE estes IDs no Play Console depois
export const SUBS_IDS = ['start_monthly', 'pro_monthly'] as const;

// Helper para checar se a fn existe nessa versão da lib
const has = (fn: string) => typeof (RNIap as any)[fn] === 'function';

export async function initIAP() {
  try {
    // v12+ → initConnection()
    if (has('initConnection')) {
      await (RNIap as any).initConnection();
    }

    // Android: algumas versões expõem flushFailedPurchasesCachedAsPendingAndroid
    if (Platform.OS === 'android' && has('flushFailedPurchasesCachedAsPendingAndroid')) {
      try {
        await (RNIap as any).flushFailedPurchasesCachedAsPendingAndroid();
      } catch {}
    }
  } catch {}
}

export async function closeIAP() {
  try {
    if (has('endConnection')) {
      await (RNIap as any).endConnection();
    }
  } catch {}
}

/** Lista assinaturas disponíveis (compat com várias assinaturas de API) */
export async function fetchSubscriptions() {
  try {
    if (has('getSubscriptions')) {
      // Algumas versões: getSubscriptions({ skus })
      try {
        return await (RNIap as any).getSubscriptions({ skus: [...SUBS_IDS] });
      } catch {
        // Outras versões: getSubscriptions(skus)
        return await (RNIap as any).getSubscriptions([...SUBS_IDS]);
      }
    }

    // Versões mais antigas podem não ter getSubscriptions separado.
    // Fallback: tentar getProducts/getItemsByType (não deve ser necessário p/ maioria)
    if (has('getProducts')) {
      return await (RNIap as any).getProducts([...SUBS_IDS]);
    }
    return [];
  } catch {
    return [];
  }
}

/** Dispara a compra/assinatura */
export async function buy(subId: (typeof SUBS_IDS)[number]) {
  // API recente: requestSubscription({ sku })
  if (has('requestSubscription')) {
    try {
      return await (RNIap as any).requestSubscription({ sku: subId });
    } catch (e) {
      throw e;
    }
  }

  // Fallback: algumas versões só têm requestPurchase para qualquer item
  if (has('requestPurchase')) {
    try {
      // a assinatura pode exigir offerToken em versões novas; para smoke test basta sku
      return await (RNIap as any).requestPurchase({
        sku: subId,
        // iOS flags ignoradas no Android
        andDangerouslyFinishTransactionAutomaticallyIOS: true,
      });
    } catch (e) {
      throw e;
    }
  }

  throw new Error('IAP: nenhuma função de compra disponível nesta versão do pacote.');
}

/** Restaura compras/assinaturas do usuário */
export async function restore() {
  try {
    if (has('getAvailablePurchases')) {
      return await (RNIap as any).getAvailablePurchases();
    }
    if (has('getPurchaseHistory')) {
      return await (RNIap as any).getPurchaseHistory();
    }
    return [];
  } catch {
    return [];
  }
}
