package com.seu.dominio.fidelapp.billing

import android.app.Activity
import android.content.Context
import android.util.Log
import com.android.billingclient.api.*

class BillingManager(
    private val context: Context,
    private val listener: BillingListener
) : PurchasesUpdatedListener {

    interface BillingListener {
        fun onProductsLoaded(products: List<ProductDetails>)
        fun onPurchaseSuccess(purchase: Purchase)
        fun onPurchaseFailed(errorMessage: String)
    }

    companion object {
        const val PRODUCT_START = "fidelapp_start_mensal"
        const val PRODUCT_PRO = "fidelapp_pro_mensal"
        private const val TAG = "BillingManager"
    }

    private var billingClient: BillingClient = BillingClient.newBuilder(context)
        .setListener(this)
        .enablePendingPurchases()
        .build()

    init { startConnection() }

    private fun startConnection() {
        billingClient.startConnection(object : BillingClientStateListener {
            override fun onBillingSetupFinished(billingResult: BillingResult) {
                if (billingResult.responseCode == BillingClient.BillingResponseCode.OK) {
                    Log.d(TAG, "Billing ready")
                    
                    // ✅ ALTERAÇÃO APLICADA: 
                    // Consulta e trata compras ativas/pendentes (não reconhecidas) ao iniciar.
                    queryActiveSubscriptions { purchases ->
                        // Trata cada compra ativa (incluindo as não reconhecidas)
                        purchases.forEach { handlePurchase(it) } 
                        
                        // Em seguida, carrega a lista de produtos (compatibilidade)
                        queryAvailableSubscriptions() 
                    }
                } else {
                    Log.w(TAG, "Billing setup failed: ${billingResult.debugMessage}")
                }
            }
            override fun onBillingServiceDisconnected() { Log.w(TAG, "Billing disconnected") }
        })
    }

    /**
     * Versão compatível sem callback — chama a outra versão e notifica apenas o listener interno.
     * Mantém compatibilidade com código que só chama queryAvailableSubscriptions().
     */
    fun queryAvailableSubscriptions() {
        queryAvailableSubscriptions { /* noop callback */ }
    }

    /**
     * Versão que aceita um callback com a lista de ProductDetails — usada pelo módulo Kotlin/JS.
     */
    fun queryAvailableSubscriptions(callback: (List<ProductDetails>) -> Unit) {
        val productList = listOf(
            QueryProductDetailsParams.Product.newBuilder()
                .setProductId(PRODUCT_START)
                .setProductType(BillingClient.ProductType.SUBS)
                .build(),
            QueryProductDetailsParams.Product.newBuilder()
                .setProductId(PRODUCT_PRO)
                .setProductType(BillingClient.ProductType.SUBS)
                .build()
        )
        val params = QueryProductDetailsParams.newBuilder().setProductList(productList).build()

        billingClient.queryProductDetailsAsync(params) { billingResult, list ->
            val safeList = list ?: emptyList()
            if (billingResult.responseCode == BillingClient.BillingResponseCode.OK) {
                // Primeiro notifica quem pediu diretamente
                try {
                    callback(safeList)
                } catch (e: Exception) {
                    Log.w(TAG, "Callback erro ao processar produtos: ${e.message}")
                }
                // Depois notifica o listener padrão (compatibilidade)
                listener.onProductsLoaded(safeList)
            } else {
                // garante fallback vazio
                try {
                    callback(emptyList())
                } catch (e: Exception) {
                    Log.w(TAG, "Callback erro ao processar produtos (fallback): ${e.message}")
                }
                listener.onProductsLoaded(emptyList())
            }
        }
    }

    fun launchPurchase(activity: Activity, productDetails: ProductDetails) {
        val offer = productDetails.subscriptionOfferDetails?.firstOrNull()
        if (offer == null) {
            listener.onPurchaseFailed("No offer available")
            return
        }
        val flowParams = BillingFlowParams.newBuilder()
            .setProductDetailsParamsList(
                listOf(BillingFlowParams.ProductDetailsParams.newBuilder()
                    .setProductDetails(productDetails)
                    .setOfferToken(offer.offerToken)
                    .build())
            ).build()

        val billingResult = billingClient.launchBillingFlow(activity, flowParams)
        Log.d(TAG, "launchBillingFlow result: ${billingResult.responseCode} ${billingResult.debugMessage}")
    }

    override fun onPurchasesUpdated(billingResult: BillingResult, purchases: MutableList<Purchase>?) {
        if (billingResult.responseCode == BillingClient.BillingResponseCode.OK && purchases != null) {
            purchases.forEach { handlePurchase(it) }
        } else if (billingResult.responseCode == BillingClient.BillingResponseCode.USER_CANCELED) {
            listener.onPurchaseFailed("User canceled")
        } else {
            listener.onPurchaseFailed("Purchase error: ${billingResult.debugMessage}")
        }
    }

    private fun handlePurchase(purchase: Purchase) {
        if (purchase.purchaseState == Purchase.PurchaseState.PURCHASED) {
            // Verifica se precisa reconhecer a compra (Obrigatório pelo Google)
            if (!purchase.isAcknowledged) {
                val ack = AcknowledgePurchaseParams.newBuilder().setPurchaseToken(purchase.purchaseToken).build()
                billingClient.acknowledgePurchase(ack) { ackResult ->
                    if (ackResult.responseCode == BillingClient.BillingResponseCode.OK) {
                        listener.onPurchaseSuccess(purchase)
                    } else {
                        listener.onPurchaseFailed("Acknowledge failed: ${ackResult.debugMessage}")
                    }
                }
            } else {
                // Compra já reconhecida (Ex: consulta ativa)
                listener.onPurchaseSuccess(purchase)
            }
        } else {
            listener.onPurchaseFailed("Purchase state not PURCHASED")
        }
    }

    /**
     * Consulta a lista de compras ativas (e não consumidas/não reconhecidas) para o tipo SUBS.
     */
    fun queryActiveSubscriptions(callback: (List<Purchase>) -> Unit) {
        billingClient.queryPurchasesAsync(
            QueryPurchasesParams.newBuilder().setProductType(BillingClient.ProductType.SUBS).build()
        ) { result, purchases ->
            if (result.responseCode == BillingClient.BillingResponseCode.OK) {
                callback(purchases ?: emptyList())
            } else {
                Log.e(TAG, "queryPurchasesAsync failed: ${result.debugMessage}")
                callback(emptyList())
            }
        }
    }

    fun end() { if (billingClient.isReady) billingClient.endConnection() }
}