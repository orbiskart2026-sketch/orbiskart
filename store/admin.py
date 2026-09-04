from django.contrib import admin
from .models import Category, Product, Cart, CartItem, Order, OrderItem, Review

# ...बाकी कोड...
admin.site.register(Review)
class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = ['product', 'price', 'quantity']

@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'total_price', 'payment_method', 'status', 'created_at']
    list_editable = ['status']
    list_filter = ['status', 'payment_method', 'created_at']
    search_fields = ['id', 'user__username', 'shipping_address']
    inlines = [OrderItemInline]

admin.site.register(Category)
admin.site.register(Product)
admin.site.register(Cart)
admin.site.register(CartItem)