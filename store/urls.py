from django.urls import path
from .views import (
    ProductListView, ProductDetailView, RegisterAPIView,
    CartView, AddToCartView, UpdateCartItemView, RemoveFromCartView,
    CreateOrderView, VerifyOrderOTPView, UserOrdersListView,
    DownloadInvoicePDFView, AddProductReviewView, SellerDashboardSummaryView,
    CreateRazorpayOrderView, VerifyRazorpayPaymentView, UtilityBillEngineView,
    CentralEcoMasterLedgerView, SellerRegisterAPIView, SellerProfileUpdateAPIView,
    VerifyBankAccountAPIView, DownloadSellerDeductionSlipPDFView,
    ProcessAutomatedT3SettlementView, ProductOnboardAPIView
)

urlpatterns = [
    path('register/', RegisterAPIView.as_view(), name='api-register'),
    path('products/', ProductListView.as_view(), name='api-product-list'),
    path('products/onboard/', ProductOnboardAPIView.as_view(), name='api-product-onboard'),
    path('products/<int:pk>/', ProductDetailView.as_view(), name='api-product-detail'),
    path('products/<int:pk>/review/', AddProductReviewView.as_view(), name='api-add-review'),
    
    path('cart/', CartView.as_view(), name='api-cart'),
    path('cart/add/', AddToCartView.as_view(), name='api-cart-add'),
    path('cart/update/', UpdateCartItemView.as_view(), name='api-cart-update'),
    path('cart/remove/', RemoveFromCartView.as_view(), name='api-cart-remove'),
    
    path('orders/create/', CreateOrderView.as_view(), name='api-create-order'),
    path('orders/my/', UserOrdersListView.as_view(), name='api-user-orders'),
    path('orders/<int:order_id>/verify-otp/', VerifyOrderOTPView.as_view(), name='api-verify-otp'),
    path('orders/<int:order_id>/invoice/', DownloadInvoicePDFView.as_view(), name='api-download-invoice'),
    
    path('seller/register/', SellerRegisterAPIView.as_view(), name='api-seller-register'),
    path('seller/profile/update/', SellerProfileUpdateAPIView.as_view(), name='api-seller-profile-update'),
    path('seller/dashboard/', SellerDashboardSummaryView.as_view(), name='api-seller-dashboard'),
    path('seller/verify-bank/', VerifyBankAccountAPIView.as_view(), name='api-verify-bank'),
    path('orders/<int:order_id>/deduction-slip/', DownloadSellerDeductionSlipPDFView.as_view(), name='api-deduction-slip'),
    
    path('payment/razorpay/create/', CreateRazorpayOrderView.as_view(), name='api-razorpay-create'),
    path('payment/razorpay/verify/', VerifyRazorpayPaymentView.as_view(), name='api-razorpay-verify'),
    
    path('utility/bill/', UtilityBillEngineView.as_view(), name='api-utility-bill'),
    path('eco/ledger/', CentralEcoMasterLedgerView.as_view(), name='api-eco-ledger'),
    path('settlement/t3/run/', ProcessAutomatedT3SettlementView.as_view(), name='api-t3-settlement'),
]