from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.models import User
from .models import Category, Product, Cart, CartItem, Order, OrderItem, Review, UserProfile, VendorProfile

# 1. User Profile Inline
class UserProfileInline(admin.StackedInline):
    model = UserProfile
    can_delete = False
    verbose_name_plural = 'Role & Profile'

class UserAdmin(BaseUserAdmin):
    inlines = (UserProfileInline,)

admin.site.unregister(User)
admin.site.register(User, UserAdmin)


# 2. Vendor Profile Admin
@admin.register(VendorProfile)
class VendorProfileAdmin(admin.ModelAdmin):
    list_display = ('store_name', 'user', 'business_email', 'bank_account_verified', 'commission_rate', 'created_at')
    search_fields = ('store_name', 'business_email', 'user__username')


# 3. Product Admin with HSN, GST & Vendor Isolation
@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ('title', 'vendor', 'category', 'price', 'hsn_code', 'gst_rate', 'stock')
    list_filter = ('category', 'gst_rate', 'vendor')
    search_fields = ('title', 'hsn_code', 'vendor__store_name')

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        if request.user.is_superuser or (hasattr(request.user, 'profile') and request.user.profile.role == 'ADMIN'):
            return qs
        if hasattr(request.user, 'vendor_profile'):
            return qs.filter(vendor=request.user.vendor_profile)
        return qs.none()

    def save_model(self, request, obj, form, change):
        if not obj.vendor and hasattr(request.user, 'vendor_profile'):
            obj.vendor = request.user.vendor_profile
        super().save_model(request, obj, form, change)


# 4. Order Item Admin (Complete Transparency Ledger)
@admin.register(OrderItem)
class OrderItemAdmin(admin.ModelAdmin):
    list_display = (
        'id', 'product', 'vendor', 'hsn_code', 'price', 
        'taxable_product_value', 'product_gst_amount', 
        'platform_commission', 'payment_gateway_fee', 
        'shipping_and_return_fee', 'gst_on_platform_fee', 
        'total_deductions', 'vendor_payout'
    )
    list_filter = ('vendor', 'product_gst_rate')
    readonly_fields = (
        'hsn_code', 'product_gst_rate', 'taxable_product_value', 
        'product_gst_amount', 'platform_commission', 
        'payment_gateway_fee', 'shipping_and_return_fee', 
        'gst_on_platform_fee', 'total_deductions', 'vendor_payout', 
        'commission_rate'
    )

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        if request.user.is_superuser or (hasattr(request.user, 'profile') and request.user.profile.role == 'ADMIN'):
            return qs
        if hasattr(request.user, 'vendor_profile'):
            return qs.filter(vendor=request.user.vendor_profile)
        return qs.none()


# 5. Core Models Registration
admin.site.register(Category)
admin.site.register(Order)
admin.site.register(Cart)
admin.site.register(CartItem)
admin.site.register(Review)