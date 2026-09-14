from django.urls import path
from .views import (
    RegisterAPIView,
    ProductListView,
    ProductDetailView,
    CartView,
    AddToCartView,
    UpdateCartItemView,
    RemoveFromCartView,
    CreateOrderView,
    VerifyOrderOTPView,
    UserOrdersListView,
    DownloadInvoicePDFView,
    AddProductReviewView,
    SellerDashboardSummaryView,
    CreateRazorpayOrderView,
    VerifyRazorpayPaymentView,
    UtilityBillEngineView,
    CentralEcoMasterLedgerView,
)

urlpatterns = [
    # Auth
    path('auth/register/', RegisterAPIView.as_view(), name='user-register'),

    # Products
    path('products/', ProductListView.as_view(), name='product-list'),
    path('products/<int:pk>/', ProductDetailView.as_view(), name='product-detail'),
    path('products/<int:pk>/review/', AddProductReviewView.as_view(), name='product-review'),

    # Cart
    path('cart/', CartView.as_view(), name='cart-view'),
    path('cart/add/', AddToCartView.as_view(), name='cart-add'),
    path('cart/update/', UpdateCartItemView.as_view(), name='cart-update'),
    path('cart/remove/', RemoveFromCartView.as_view(), name='cart-remove'),

    # Orders, 2-Way OTP & GST Tax Invoice
    path('orders/', UserOrdersListView.as_view(), name='user-orders'),
    path('orders/create/', CreateOrderView.as_view(), name='order-create'),
    path('orders/<int:order_id>/verify-otp/', VerifyOrderOTPView.as_view(), name='verify-otp'),
    path('orders/<int:order_id>/invoice/', DownloadInvoicePDFView.as_view(), name='download-invoice'),

    # Seller Transparency Dashboard
    path('seller/dashboard/', SellerDashboardSummaryView.as_view(), name='seller-dashboard'),

    # Razorpay Live Payment
    path('payment/create-order/', CreateRazorpayOrderView.as_view(), name='razorpay-create-order'),
    path('payment/verify/', VerifyRazorpayPaymentView.as_view(), name='razorpay-verify-payment'),

    # BBPS Utility Bills & Services
    path('pay/bill/', UtilityBillEngineView.as_view(), name='utility-bill-pay'),

    # Central ECO Master Ledger API (Admin Dashboard Sync)
    path('api/admin/eco-master-ledger/', CentralEcoMasterLedgerView.as_view(), name='eco-master-ledger'),
    path('admin/eco-master-ledger/', CentralEcoMasterLedgerView.as_view(), name='eco-master-ledger-alt'),
]