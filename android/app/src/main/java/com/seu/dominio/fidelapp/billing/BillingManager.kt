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
                    queryAvailableSubscriptions()
                } else {
                    Log.w(TAG, "Billing setup failed: ${billingResult.debugMessage}")
                }
            }
            override fun onBillingServiceDisconnected() { Log.w(TAG, "Billing disconnected") }
        })
    }

    // adiciona callback para devolver a lista ao chamador quando quiser
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

    billingClient.queryProductDetailsAsync(params) { result, list ->
        if (result.responseCode == BillingClient.BillingResponseCode.OK) {
            // notifica o listener (compatibilidade) e também chama o callback direto
            listener.onProductsLoaded(list)
            callback(list)
        } else {
            listener.onProductsLoaded(emptyList())
            callback(emptyList())
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
                listener.onPurchaseSuccess(purchase)
            }
        } else {
            listener.onPurchaseFailed("Purchase state not PURCHASED")
        }
    }

    fun queryActiveSubscriptions(callback: (List<Purchase>) -> Unit) {
        billingClient.queryPurchasesAsync(
            QueryPurchasesParams.newBuilder().setProductType(BillingClient.ProductType.SUBS).build()
        ) { result, purchases ->
            if (result.responseCode == BillingClient.BillingResponseCode.OK) {
                callback(purchases)
            } else {
                callback(emptyList())
            }
        }
    }

    fun end() { if (billingClient.isReady) billingClient.endConnection() }
}
