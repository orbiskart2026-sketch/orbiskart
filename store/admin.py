from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.models import User
from .models import Category, Product, Cart, CartItem, Order, OrderItem, Review, UserProfile, VendorProfile

# 1. User के अंदर ही UserProfile (Role) जोड़ना
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


# 3. Product Admin with Multi-Vendor Isolation
@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ('title', 'vendor', 'category', 'price', 'stock')
    list_filter = ('category', 'vendor')
    search_fields = ('title', 'vendor__store_name')

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        # सुपरयूज़र या एडमिन को सारे प्रोडक्ट्स दिखेंगे
        if request.user.is_superuser or (hasattr(request.user, 'profile') and request.user.profile.role == 'ADMIN'):
            return qs
        # वेंडर केवल अपनी लिस्टिंग देख सकेगा (Zero Data Leak)
        if hasattr(request.user, 'vendor_profile'):
            return qs.filter(vendor=request.user.vendor_profile)
        return qs.none()

    def save_model(self, request, obj, form, change):
        # अगर वेंडर नया प्रोडक्ट जोड़े तो वह अपने-आप उसी वेंडर से लिंक हो जाए
        if not obj.vendor and hasattr(request.user, 'vendor_profile'):
            obj.vendor = request.user.vendor_profile
        super().save_model(request, obj, form, change)


# 4. बाकी मॉडल्स का रजिस्ट्रेशन
admin.site.register(Category)
admin.site.register(Order)
admin.site.register(OrderItem)
admin.site.register(Cart)
admin.site.register(CartItem)
admin.site.register(Review)