// lib/iap.ts
import { NativeEventEmitter, NativeModules, Platform } from 'react-native';

const { IAPModule } = NativeModules;
const emitter = IAPModule ? new NativeEventEmitter(IAPModule) : null;

// Atualizei a tipagem para incluir o que o plans.tsx está usando agora
export type Product = { 
  productId: string; 
  title?: string; 
  description?: string; 
  price?: string;
  subscriptionOfferDetails?: Array<{ offerToken: string }>; 
};

export async function initIAP(): Promise<boolean> {
  if (Platform.OS !== 'android' || !IAPModule) return false;
  try {
    const res = await IAPModule.init();
    return !!res;
  } catch (e) {
    console.warn('initIAP error', e);
    return false;
  }
}

export async function loadProducts(): Promise<Product[]> {
  if (!IAPModule) return [];
  try {
    const res = await IAPModule.loadProducts();
    return res || [];
  } catch (e) {
    console.warn('loadProducts error', e);
    return [];
  }
}

// 🛑 CORREÇÃO APLICADA: Adicionado offerToken como argumento
export async function buy(productId: string, offerToken: string): Promise<any> {
  if (!IAPModule) throw new Error('IAPModule not available');
  
  // Agora passamos o offerToken para o Kotlin
  return IAPModule.buy(productId, offerToken);
}

// retorna um subscription object que tem .remove()
export function onPurchaseSuccess(cb: (payload: { purchaseToken: string; productId: string }) => void) {
  // ✅ CORRIGIDO: Retorna um stub ({ remove: () => {} }) em vez de lançar um erro fatal (throw)
  if (!emitter) return { remove: () => {} }; 
  return emitter.addListener('IAP_purchase_success', cb);
}

export function onPurchaseFailed(cb: (payload: any) => void) {
  // ✅ CORRIGIDO: Retorna um stub ({ remove: () => {} }) em vez de lançar um erro fatal (throw)
  if (!emitter) return { remove: () => {} }; 
  return emitter.addListener('IAP_purchase_failed', cb);
}