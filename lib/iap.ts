import { NativeEventEmitter, NativeModules, Platform } from 'react-native';

const { IAPModule } = NativeModules;
const emitter = new NativeEventEmitter(IAPModule);

export type Product = { productId: string; title?: string; description?: string; price?: string };

export async function initIAP() {
  if (Platform.OS !== 'android') return false;
  return IAPModule.init();
}

export async function loadProducts(): Promise<Product[]> {
  const res = await IAPModule.loadProducts();
  return res;
}

export async function buy(productId: string) {
  return IAPModule.buy(productId);
}

export function onPurchaseSuccess(cb: (payload: { purchaseToken: string; productId: string }) => void) {
  return emitter.addListener('IAP_purchase_success', cb);
}

export function onPurchaseFailed(cb: (payload: any) => void) {
  return emitter.addListener('IAP_purchase_failed', cb);
}
