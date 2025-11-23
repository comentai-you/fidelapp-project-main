package com.seu.dominio.fidelapp.iap

import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.seu.dominio.fidelapp.billing.BillingManager
import com.android.billingclient.api.ProductDetails

class IAPModule(private val reactCtx: ReactApplicationContext)
    : ReactContextBaseJavaModule(reactCtx), BillingManager.BillingListener {

    private var billing: BillingManager? = null
    private val products = mutableMapOf<String, ProductDetails>()

    override fun getName(): String = "IAPModule"

    @ReactMethod
    fun init(promise: Promise) {
        try {
            billing = BillingManager(reactCtx, this)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("init_error", e)
        }
    }

    @ReactMethod
    fun loadProducts(promise: Promise) {
        val b = billing ?: run {
            promise.reject("no_billing", "Billing not initialized")
            return
        }

        // Usa a nova assinatura com callback
        b.queryAvailableSubscriptions { list ->
            val arr = Arguments.createArray()
            list.forEach { pd ->
                val map = Arguments.createMap()
                map.putString("productId", pd.productId)
                map.putString("title", pd.title)
                map.putString("description", pd.description)

                val price = pd.subscriptionOfferDetails
                    ?.firstOrNull()
                    ?.pricingPhases
                    ?.pricingPhaseList
                    ?.firstOrNull()
                    ?.formattedPrice ?: "R$?"

                map.putString("price", price)
                arr.pushMap(map)

                products[pd.productId] = pd
            }
            promise.resolve(arr)
        }
    }

    @ReactMethod
    fun buy(productId: String, promise: Promise) {
        val pd = products[productId]
        val activity = reactCtx.currentActivity ?: run {
            promise.reject("no_activity", "No activity")
            return
        }

        if (pd == null) {
            promise.reject("no_product", "Product not found")
            return
        }

        billing?.launchPurchase(activity, pd)
        promise.resolve(true)
    }

    /* ------------------------------ EVENTS ------------------------------ */

    // Implementação obrigatória da interface
    override fun onProductsLoaded(products: List<ProductDetails>) {
        // opcional: emitir um evento JS sempre que produtos forem carregados
        // (você já resolve a Promise no loadProducts via callback, então pode ser noop)
        val arr = Arguments.createArray()
        products.forEach { pd ->
            val m = Arguments.createMap()
            m.putString("productId", pd.productId)
            m.putString("title", pd.title)
            m.putString("description", pd.description)
            arr.pushMap(m)
        }
        reactCtx.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit("IAP_products_loaded", arr)
    }

    override fun onPurchaseSuccess(purchase: com.android.billingclient.api.Purchase) {
        val map = Arguments.createMap()
        map.putString("productId", purchase.products.firstOrNull())
        map.putString("token", purchase.purchaseToken)

        reactCtx.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit("IAP_purchase_success", map)
    }

    override fun onPurchaseFailed(message: String) {
        val map = Arguments.createMap()
        map.putString("error", message)

        reactCtx.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit("IAP_purchase_failed", map)
    }
}
