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
    SellerRegisterAPIView,                 # 100% सुरक्षित KYC ऑनबोर्डिंग
    SellerProfileUpdateAPIView,            # बैंक खाता / दुकान का नाम / पता बदलने का एंडपॉइंट
    VerifyBankAccountAPIView,              # बैंक खाताधारक का नाम ऑटो-फ़ेच करने का एंडपॉइंट
    DownloadSellerDeductionSlipPDFView,    # 1-क्लिक सेलर डिडक्शन स्लिप PDF इंजन
    ProcessAutomatedT3SettlementView,    # T+3 स्वचालित बैंक सेटलमेंट क्रॉन इंजन
)

urlpatterns = [
    # 1. Auth
    path('auth/register/', RegisterAPIView.as_view(), name='user-register'),

    # 2. Products (Multi-Image, Video & Instant Live)
    path('products/', ProductListView.as_view(), name='product-list'),
    path('products/<int:pk>/', ProductDetailView.as_view(), name='product-detail'),
    path('products/<int:pk>/review/', AddProductReviewView.as_view(), name='product-review'),

    # 3. Cart
    path('cart/', CartView.as_view(), name='cart-view'),
    path('cart/add/', AddToCartView.as_view(), name='cart-add'),
    path('cart/update/', UpdateCartItemView.as_view(), name='cart-update'),
    path('cart/remove/', RemoveFromCartView.as_view(), name='cart-remove'),

    # 4. Orders, 2-Way OTP & GST Tax Invoice
    path('orders/', UserOrdersListView.as_view(), name='user-orders'),
    path('orders/create/', CreateOrderView.as_view(), name='order-create'),
    path('orders/<int:order_id>/verify-otp/', VerifyOrderOTPView.as_view(), name='verify-otp'),
    path('orders/<int:order_id>/invoice/', DownloadInvoicePDFView.as_view(), name='download-invoice'),
    path('orders/<int:order_id>/seller-slip/', DownloadSellerDeductionSlipPDFView.as_view(), name='seller-deduction-slip'),

    # 5. Seller Hub, KYC Transparency & Bank Verification
    path('seller/dashboard/', SellerDashboardSummaryView.as_view(), name='seller-dashboard'),
    path('seller-profile/', SellerDashboardSummaryView.as_view(), name='seller-profile'),          # मोबाइल ऐप संगतता के लिए जोड़ा गया
    path('api/seller-profile/', SellerDashboardSummaryView.as_view(), name='api-seller-profile'),  # मोबाइल ऐप संगतता के लिए जोड़ा गया
    path('seller/register/', SellerRegisterAPIView.as_view(), name='seller-register'),
    path('api/seller/register/', SellerRegisterAPIView.as_view(), name='api-seller-register'),
    path('seller/profile/update/', SellerProfileUpdateAPIView.as_view(), name='seller-profile-update'),
    path('api/seller/profile/update/', SellerProfileUpdateAPIView.as_view(), name='api-seller-profile-update'),
    path('api/seller/verify-bank/', VerifyBankAccountAPIView.as_view(), name='verify-bank-account'),

    # 6. Razorpay Live Payment
    path('payment/create-order/', CreateRazorpayOrderView.as_view(), name='razorpay-create-order'),
    path('payment/verify/', VerifyRazorpayPaymentView.as_view(), name='razorpay-verify-payment'),

    # 7. BBPS Utility Bills & Services
    path('pay/bill/', UtilityBillEngineView.as_view(), name='utility-bill-pay'),

    # 8. Central ECO Master Ledger API (Admin Dashboard Sync)
    path('api/admin/eco-master-ledger/', CentralEcoMasterLedgerView.as_view(), name='eco-master-ledger'),
    path('admin/eco-master-ledger/', CentralEcoMasterLedgerView.as_view(), name='eco-master-ledger-alt'),

    # 9. Automated T+3 Settlement Cron Endpoint
    path('api/cron/process-t3-settlements/', ProcessAutomatedT3SettlementView.as_view(), name='process-t3-settlements'),
]