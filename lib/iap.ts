// lib/iap.ts
import { NativeEventEmitter, NativeModules, Platform } from 'react-native';

const { IAPModule } = NativeModules;
const emitter = IAPModule ? new NativeEventEmitter(IAPModule) : null;

export type Product = { productId: string; title?: string; description?: string; price?: string };

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

export async function buy(productId: string): Promise<any> {
  if (!IAPModule) throw new Error('IAPModule not available');
  return IAPModule.buy(productId);
}

// retorna um subscription object que tem .remove()
export function onPurchaseSuccess(cb: (payload: { purchaseToken: string; productId: string }) => void) {
  if (!emitter) throw new Error('IAPModule emitter not available');
  return emitter.addListener('IAP_purchase_success', cb);
}

export function onPurchaseFailed(cb: (payload: any) => void) {
  if (!emitter) throw new Error('IAPModule emitter not available');
  return emitter.addListener('IAP_purchase_failed', cb);
}
