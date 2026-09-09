from django.urls import path
from . import views

urlpatterns = [
    # 1. ऑथेंटिकेशन
    path('register/', views.RegisterAPIView.as_view(), name='api-register'),

    # 2. प्रोडक्ट्स लिस्टिंग एवं सेलर अपलोड (GET/POST)
    path('products/', views.ProductListView.as_view(), name='api-product-list'),

    # 3. सिंगल प्रोडक्ट डिटेल (ID आधारित)
    path('products/<int:pk>/', views.ProductDetailView.as_view(), name='api-product-detail'),

    # 4. कार्ट प्रबंधन
    path('cart/', views.CartView.as_view(), name='api-cart'),
    path('cart/add/', views.AddToCartView.as_view(), name='api-cart-add'),
    path('cart/update/', views.UpdateCartItemView.as_view(), name='api-cart-update'),
    path('cart/remove/', views.RemoveFromCartView.as_view(), name='api-cart-remove'),

    # 5. ऑर्डर और चेकआउट (ऑटो जनरेटेड OTP सहित)
    path('orders/create/', views.CreateOrderView.as_view(), name='api-order-create'),
    path('orders/', views.UserOrdersListView.as_view(), name='api-user-orders'),

    # 6. फ्रॉड रोकथाम: डिलीवरी एवं रिटर्न 6-अंकीय OTP सत्यापन
    path('orders/<int:order_id>/verify-otp/', views.VerifyOrderOTPView.as_view(), name='api-verify-order-otp'),

    # 7. GST इनवॉइस PDF डाउनलोड
    path('orders/<int:order_id>/invoice/', views.DownloadInvoicePDFView.as_view(), name='api-download-invoice'),

    # 8. रिव्यू और रेटिंग सबमिशन
    path('products/<int:pk>/reviews/add/', views.AddProductReviewView.as_view(), name='api-add-review'),
]