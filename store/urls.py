from django.urls import path
from . import views

urlpatterns = [
    # 1. ऑथेंटिकेशन (रजिस्ट्रेशन)
    path('api/register/', views.RegisterAPIView.as_view(), name='api-register'),

    # 2. प्रोडक्ट्स (लिस्टिंग, फ़िल्टर व सर्च)
    path('api/products/', views.ProductListView.as_view(), name='api-product-list'),

    # 3. सिंगल प्रोडक्ट डिटेल (ID आधारित ऑटोमैटिक फ़ेच)
    path('api/products/<int:pk>/', views.ProductDetailView.as_view(), name='api-product-detail'),

    # 4. कार्ट प्रबंधन (देखना, जोड़ना, मात्रा बदलना, हटाना)
    path('api/cart/', views.CartView.as_view(), name='api-cart'),
    path('api/cart/add/', views.AddToCartView.as_view(), name='api-cart-add'),
    path('api/cart/update/', views.UpdateCartItemView.as_view(), name='api-cart-update'),
    path('api/cart/remove/', views.RemoveFromCartView.as_view(), name='api-cart-remove'),

    # 5. ऑर्डर और चेकआउट
    path('api/orders/create/', views.CreateOrderView.as_view(), name='api-order-create'),
    path('api/orders/', views.UserOrdersListView.as_view(), name='api-user-orders'),

    # 6. GST इनवॉइस PDF डाउनलोड
    path('api/orders/<int:order_id>/invoice/', views.DownloadInvoicePDFView.as_view(), name='api-download-invoice'),

    # 7. रिव्यू और रेटिंग सबमिशन
    path('api/products/<int:pk>/reviews/add/', views.AddProductReviewView.as_view(), name='api-add-review'),
]