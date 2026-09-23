from django.urls import path
from .views import (
    RegisterAPIView, ProductListView, ProductDetailView, 
    CartView, AddToCartView, UpdateCartItemView, RemoveFromCartView,
    CreateOrderView, VerifyOrderOTPView, UserOrdersListView, 
    DownloadInvoicePDFView, AddProductReviewView, SellerDashboardSummaryView,
    CreateRazorpayOrderView, VerifyRazorpayPaymentView, UtilityBillEngineView,
    CentralEcoMasterLedgerView, SellerRegisterAPIView, SellerProfileUpdateAPIView,
    VerifyBankAccountAPIView, DownloadSellerDeductionSlipPDFView, ProcessAutomatedT3SettlementView
)

urlpatterns = [
    path('register/', RegisterAPIView.as_view(), name='api_register'),
    path('products/', ProductListView.as_view(), name='api_products'),
    path('products/<int:pk>/', ProductDetailView.as_view(), name='api_product_detail'),
    path('cart/', CartView.as_view(), name='api_cart'),
    path('cart/add/', AddToCartView.as_view(), name='api_cart_add'),
    path('cart/update/', UpdateCartItemView.as_view(), name='api_cart_update'),
    path('cart/remove/', RemoveFromCartView.as_view(), name='api_cart_remove'),
    path('orders/create/', CreateOrderView.as_view(), name='api_order_create'),
    path('orders/verify-otp/<int:order_id>/', VerifyOrderOTPView.as_view(), name='api_verify_otp'),
    path('orders/my/', UserOrdersListView.as_view(), name='api_my_orders'),
    path('orders/invoice/<int:order_id>/', DownloadInvoicePDFView.as_view(), name='api_download_invoice'),
    path('products/<int:pk>/review/', AddProductReviewView.as_view(), name='api_add_review'),
    
    # --- Seller Onboarding & Hub APIs ---
    path('seller/register/', SellerRegisterAPIView.as_view(), name='api_seller_register'),
    path('seller-profile/', SellerDashboardSummaryView.as_view(), name='api_seller_profile_summary'),
    path('seller/update/', SellerProfileUpdateAPIView.as_view(), name='api_seller_update'),
    path('seller/verify-bank/', VerifyBankAccountAPIView.as_view(), name='api_verify_bank'),
    path('seller/deduction-slip/<int:order_id>/', DownloadSellerDeductionSlipPDFView.as_view(), name='api_deduction_slip_pdf'),
    path('seller/settle-t3/', ProcessAutomatedT3SettlementView.as_view(), name='api_t3_settlement'),

    # --- Razorpay & Utilities ---
    path('payment/razorpay/create/', CreateRazorpayOrderView.as_view(), name='api_rzp_create'),
    path('payment/razorpay/verify/', VerifyRazorpayPaymentView.as_view(), name='api_rzp_verify'),
    path('utility/pay/', UtilityBillEngineView.as_view(), name='api_utility_pay'),
    path('admin/eco-master-ledger/', CentralEcoMasterLedgerView.as_view(), name='eco_master_ledger_api'),
]