from django.contrib import admin
from django.urls import path, re_path
from django.conf import settings
from django.views.static import serve

from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

from store.views import (
    # Customer / Products
    RegisterAPIView,
    ProductListView,
    ProductDetailView,

    # Cart
    CartView,
    AddToCartView,
    UpdateCartItemView,
    RemoveFromCartView,

    # Orders
    CreateOrderView,
    UserOrdersListView,
    VerifyOrderOTPView,
    DownloadInvoicePDFView,

    # Reviews
    AddProductReviewView,

    # Seller
    SellerDashboardSummaryView,
    VendorKYCUpdateView,
    RegisterSellerComplianceView,
    VerifyBankDetailsView,
    SellerLogoutView,

    # New Sequential Seller OTP
    SendWhatsAppOTPView,
    VerifyWhatsAppOTPView,
    SendEmailOTPView,
    VerifyEmailOTPView,

    # Meta WhatsApp Webhook
    MetaWhatsAppWebhookView,

    # Razorpay
    CreateRazorpayOrderView,
    VerifyRazorpayPaymentView,

    # Admin / Ledger
    CentralEcoMasterLedgerView,
    UtilityBillEngineView,
)


urlpatterns = [
    # =========================================================
    # DJANGO ADMIN
    # =========================================================
    path(
        "admin/",
        admin.site.urls,
    ),

    # =========================================================
    # AUTH / JWT
    # =========================================================
    path(
        "api/token/",
        TokenObtainPairView.as_view(),
        name="token_obtain_pair",
    ),
    path(
        "api/token/refresh/",
        TokenRefreshView.as_view(),
        name="token_refresh",
    ),

    # =========================================================
    # CUSTOMER REGISTRATION
    # =========================================================
    path(
        "api/register/",
        RegisterAPIView.as_view(),
        name="api-register",
    ),

    # =========================================================
    # PRODUCTS
    # =========================================================
    path(
        "api/products/",
        ProductListView.as_view(),
        name="api-products",
    ),
    path(
        "api/products/<int:pk>/",
        ProductDetailView.as_view(),
        name="api-product-detail",
    ),

    # =========================================================
    # CART
    # =========================================================
    path(
        "api/cart/",
        CartView.as_view(),
        name="api-cart",
    ),
    path(
        "api/cart/add/",
        AddToCartView.as_view(),
        name="api-add-to-cart",
    ),
    path(
        "api/cart/update/",
        UpdateCartItemView.as_view(),
        name="api-update-cart",
    ),
    path(
        "api/cart/remove/",
        RemoveFromCartView.as_view(),
        name="api-remove-from-cart",
    ),

    # =========================================================
    # ORDERS
    # =========================================================
    path(
        "api/orders/create/",
        CreateOrderView.as_view(),
        name="api-create-order",
    ),
    path(
        "api/orders/",
        UserOrdersListView.as_view(),
        name="api-user-orders",
    ),
    path(
        "api/orders/<int:order_id>/verify-otp/",
        VerifyOrderOTPView.as_view(),
        name="api-order-verify-otp",
    ),
    path(
        "api/orders/<int:order_id>/invoice/",
        DownloadInvoicePDFView.as_view(),
        name="api-order-invoice",
    ),

    # =========================================================
    # PRODUCT REVIEWS
    # =========================================================
    path(
        "api/products/<int:pk>/review/",
        AddProductReviewView.as_view(),
        name="api-product-review",
    ),

    # =========================================================
    # SELLER OTP - STEP 1: WHATSAPP
    # =========================================================
    path(
        "api/seller/send-whatsapp-otp/",
        SendWhatsAppOTPView.as_view(),
        name="seller-send-whatsapp-otp",
    ),
    path(
        "api/seller/verify-whatsapp-otp/",
        VerifyWhatsAppOTPView.as_view(),
        name="seller-verify-whatsapp-otp",
    ),

    # =========================================================
    # SELLER OTP - STEP 2: EMAIL
    # =========================================================
    path(
        "api/seller/send-email-otp/",
        SendEmailOTPView.as_view(),
        name="seller-send-email-otp",
    ),
    path(
        "api/seller/verify-email-otp/",
        VerifyEmailOTPView.as_view(),
        name="seller-verify-email-otp",
    ),

    # =========================================================
    # SELLER REGISTRATION
    # =========================================================
    path(
        "api/seller/register/",
        RegisterSellerComplianceView.as_view(),
        name="seller-register",
    ),
    path(
        "api/seller/register-full/",
        RegisterSellerComplianceView.as_view(),
        name="seller-register-full",
    ),

    # =========================================================
    # SELLER ACCOUNT
    # =========================================================
    path(
        "api/seller/dashboard/",
        SellerDashboardSummaryView.as_view(),
        name="seller-dashboard",
    ),
    path(
        "api/seller/kyc/",
        VendorKYCUpdateView.as_view(),
        name="seller-kyc-update",
    ),
    path(
        "api/seller/verify-bank/",
        VerifyBankDetailsView.as_view(),
        name="seller-verify-bank",
    ),
    path(
        "api/seller/logout/",
        SellerLogoutView.as_view(),
        name="seller-logout",
    ),

    # =========================================================
    # META WHATSAPP WEBHOOK
    # =========================================================
    path(
        "api/whatsapp/webhook/",
        MetaWhatsAppWebhookView.as_view(),
        name="meta-whatsapp-webhook",
    ),

    # =========================================================
    # RAZORPAY
    # =========================================================
    path(
        "api/payment/razorpay/create/",
        CreateRazorpayOrderView.as_view(),
        name="razorpay-create-order",
    ),
    path(
        "api/payment/razorpay/verify/",
        VerifyRazorpayPaymentView.as_view(),
        name="razorpay-verify-payment",
    ),

    # =========================================================
    # UTILITY
    # =========================================================
    path(
        "api/utility/process/",
        UtilityBillEngineView.as_view(),
        name="utility-process",
    ),

    # =========================================================
    # SUPER ADMIN / LEDGER
    # =========================================================
    path(
        "api/admin/eco-master-ledger/",
        CentralEcoMasterLedgerView.as_view(),
        name="eco-master-ledger-api",
    ),

    # =========================================================
    # MEDIA
    # =========================================================
    re_path(
        r"^media/(?P<path>.*)$",
        serve,
        {"document_root": settings.MEDIA_ROOT},
    ),
]