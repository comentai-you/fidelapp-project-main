package com.seu.dominio.fidelapp.iap

import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.seu.dominio.fidelapp.billing.BillingManager
import com.android.billingclient.api.ProductDetails

class IAPModule(private val reactCtx: ReactApplicationContext)
    : ReactContextBaseJavaModule(reactCtx), BillingManager.BillingListener {

    private var billing: BillingManager? = null
    private val products = mutableMapOf<String, ProductDetails>()

    // PROMISE DE COMPRA
    private var purchasePromise: Promise? = null

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

        b.queryAvailableSubscriptions { list ->
            val arr = Arguments.createArray()
            
            list.forEach { pd ->
                val map = Arguments.createMap()
                map.putString("productId", pd.productId)
                map.putString("title", pd.title)
                map.putString("description", pd.description)

                // --- 1. PREÇO FORMATADO (Pegando da primeira oferta) ---
                val firstOffer = pd.subscriptionOfferDetails?.firstOrNull()
                val price = firstOffer
                    ?.pricingPhases
                    ?.pricingPhaseList
                    ?.firstOrNull()
                    ?.formattedPrice ?: "R$?"

                map.putString("price", price)

                // --- 2. [CORREÇÃO CRÍTICA] ENVIAR OFERTAS PARA O JS ---
                // O plans.tsx precisa ler "subscriptionOfferDetails" para pegar o token
                val offersArr = Arguments.createArray()
                pd.subscriptionOfferDetails?.forEach { details ->
                    val offerMap = Arguments.createMap()
                    offerMap.putString("offerToken", details.offerToken)
                    // Você pode adicionar mais detalhes da oferta aqui se precisar
                    offersArr.pushMap(offerMap)
                }
                map.putArray("subscriptionOfferDetails", offersArr)
                // -----------------------------------------------------

                arr.pushMap(map)
                products[pd.productId] = pd
            }
            promise.resolve(arr)
        }
    }

    // --- 3. [CORREÇÃO CRÍTICA] RECEBER O OFFER TOKEN ---
    @ReactMethod
    fun buy(productId: String, offerToken: String, promise: Promise) {
        val pd = products[productId]
        val activity = reactCtx.currentActivity ?: run {
            promise.reject("no_activity", "No activity")
            return
        }

        if (pd == null) {
            promise.reject("no_product", "Product not found")
            return
        }

        if (purchasePromise != null) {
            promise.reject("purchase_pending", "A purchase is already in progress")
            return
        }

        // Salva promise para resolver apenas após confirmação real!
        purchasePromise = promise

        // ATENÇÃO: O método launchPurchase no seu BillingManager deve aceitar (Activity, ProductDetails, String)
        billing?.launchPurchase(activity, pd, offerToken)
    }

    /* ------------------------------ EVENTS ------------------------------ */

    override fun onProductsLoaded(products: List<ProductDetails>) {
        // Este evento é opcional se você usa apenas a Promise do loadProducts,
        // mas mantivemos para compatibilidade.
        val arr = Arguments.createArray()
        products.forEach { pd ->
            val m = Arguments.createMap()
            m.putString("productId", pd.productId)
            m.putString("title", pd.title)
            
            // Injetando offers aqui também caso use via evento
            val offersArr = Arguments.createArray()
            pd.subscriptionOfferDetails?.forEach { details ->
               val oMap = Arguments.createMap()
               oMap.putString("offerToken", details.offerToken)
               offersArr.pushMap(oMap)
            }
            m.putArray("subscriptionOfferDetails", offersArr)

            arr.pushMap(m)
        }
        reactCtx.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit("IAP_products_loaded", arr)
    }

    override fun onPurchaseSuccess(purchase: com.android.billingclient.api.Purchase) {
        val map = Arguments.createMap()
        // O productId vem numa lista, pegamos o primeiro
        map.putString("productId", purchase.products.firstOrNull())
        map.putString("token", purchase.purchaseToken)
        map.putString("purchaseToken", purchase.purchaseToken) // Redundância para garantir compatibilidade

        // Evento para JS
        if (reactCtx.hasActiveCatalystInstance()) {
            reactCtx.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit("IAP_purchase_success", map)
        }

        // Resolve a promise REAL da compra
        purchasePromise?.resolve(map)
        purchasePromise = null
    }

    override fun onPurchaseFailed(message: String) {
        val map = Arguments.createMap()
        map.putString("error", message)

        if (reactCtx.hasActiveCatalystInstance()) {
            reactCtx.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit("IAP_purchase_failed", map)
        }

        // Rejeita promise da compra
        purchasePromise?.reject("purchase_failed", message)
        purchasePromise = null
    }
}