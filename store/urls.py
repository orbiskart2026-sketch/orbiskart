from django.urls import path
from .views import (
    RegisterAPIView, 
    ProductListView, 
    ProductDetailView,
    AddProductReviewView,
    CartView, 
    AddToCartView, 
    UpdateCartItemView, 
    RemoveFromCartView, 
    CreateOrderView,
    UserOrdersListView,
    DownloadInvoicePDFView
)

urlpatterns = [
    path('register/', RegisterAPIView.as_view(), name='register'),
    path('products/', ProductListView.as_view(), name='product-list'),
    path('products/<int:pk>/', ProductDetailView.as_view(), name='product-detail'),
    path('products/<int:pk>/reviews/', AddProductReviewView.as_view(), name='add-review'),
    path('cart/', CartView.as_view(), name='cart-view'),
    path('cart/add/', AddToCartView.as_view(), name='cart-add'),
    path('cart/update/', UpdateCartItemView.as_view(), name='cart-update'),
    path('cart/remove/', RemoveFromCartView.as_view(), name='cart-remove'),
    path('orders/create/', CreateOrderView.as_view(), name='order-create'),
    path('orders/my-orders/', UserOrdersListView.as_view(), name='my-orders'),
    path('orders/<int:order_id>/invoice/', DownloadInvoicePDFView.as_view(), name='download-invoice'),
]