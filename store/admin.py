import uuid
from django.contrib import admin, messages
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.models import User
from django.utils.html import format_html

from .models import (
    Category, Product, ProductImage, Cart, CartItem, Order, OrderItem, Review, 
    UserProfile, VendorProfile, CategoryPolicy, ShippingRateCard,
    GovtHSNMaster, SellerDeductionSlip, ImmutableMasterTransaction,
    OrderShippingReconciliation
)

# --- 1. User Profile Inline ---
class UserProfileInline(admin.StackedInline):
    model = UserProfile
    can_delete = False
    verbose_name_plural = 'Role & Profile'

class UserAdmin(BaseUserAdmin):
    inlines = (UserProfileInline,)

try:
    admin.site.unregister(User)
except admin.sites.NotRegistered:
    pass
admin.site.register(User, UserAdmin)


# --- 2. Vendor Profile Admin with Rich UI Badges ---
@admin.action(description='✅ Select & Approve Vendors (Instant Live)')
def approve_and_verify_sellers(modeladmin, request, queryset):
    updated_count = 0
    for vendor in queryset:
        vendor.penny_drop_verified = True
        vendor.penny_drop_utr = f"UTR-{uuid.uuid4().hex[:8].upper()}"
        vendor.is_verified_seller = True
        vendor.is_approved = True
        vendor.bank_account_verified = True
        vendor.save()
        if hasattr(vendor, 'products'):
            vendor.products.update(is_active=True)
        updated_count += 1
    messages.success(request, f"Successfully approved {updated_count} vendor(s) with active status.")

@admin.register(VendorProfile)
class VendorProfileAdmin(admin.ModelAdmin):
    list_display = (
        'shop_name', 'user', 'mobile_number', 'city_district', 
        'approval_badge', 'penny_drop_status', 'wallet_balance', 'created_at'
    )
    list_filter = ('is_verified_seller', 'penny_drop_verified', 'state')
    search_fields = ('shop_name', 'user__username', 'mobile_number', 'pan_number', 'gstin_number')
    list_editable = ()
    actions = [approve_and_verify_sellers]

    def approval_badge(self, obj):
        if obj.is_verified_seller:
            return format_html('<span style="background-color: #DEF7EC; color: #03543F; padding: 4px 10px; border-radius: 6px; font-weight: bold; font-size: 11px;">✔ APPROVED</span>')
        return format_html('<span style="background-color: #FEF3C7; color: #92400E; padding: 4px 10px; border-radius: 6px; font-weight: bold; font-size: 11px;">⏳ PENDING</span>')
    approval_badge.short_description = 'Status'

    def penny_drop_status(self, obj):
        if obj.penny_drop_verified:
            return format_html('<span style="background-color: #E1EFFE; color: #1E429F; padding: 4px 10px; border-radius: 6px; font-weight: bold; font-size: 11px;">✔ VERIFIED</span>')
        return format_html('<span style="background-color: #FDE8E8; color: #9B1C1C; padding: 4px 10px; border-radius: 6px; font-weight: bold; font-size: 11px;">❌ UNVERIFIED</span>')
    penny_drop_status.short_description = 'Bank Penny-Drop'


# --- 3. Product Gallery Images Inline ---
class ProductImageInline(admin.TabularInline):
    model = ProductImage
    extra = 1
    readonly_fields = ('preview_thumbnail',)

    def preview_thumbnail(self, instance):
        if instance.image:
            return format_html('<img src="{}" style="height: 40px; width: 40px; object-fit: cover; border-radius: 4px;" />', instance.image.url)
        return "No Img"
    preview_thumbnail.short_description = "Preview"


# --- 4. Product Admin ---
@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ('id', 'thumbnail_preview', 'title', 'vendor', 'price', 'stock', 'is_active')
    list_filter = ('is_active', 'category')
    search_fields = ('id', 'title', 'description', 'vendor__shop_name')
    list_editable = ('is_active', 'price', 'stock')
    inlines = [ProductImageInline]

    def thumbnail_preview(self, obj):
        if obj.image:
            return format_html('<img src="{}" style="width: 36px; height: 36px; object-fit: cover; border-radius: 4px;" />', obj.image.url)
        return "📷"
    thumbnail_preview.short_description = "Img"


# --- 5. Order Admin ---
class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = ('product', 'vendor', 'price', 'quantity')

@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'total_price', 'payment_method', 'status_badge', 'created_at')
    list_filter = ('status', 'payment_method')
    search_fields = ('id', 'user__username', 'shipping_address', 'awb_number')
    inlines = [OrderItemInline]

    def status_badge(self, obj):
        colors = {
            'Delivered': '#DEF7EC; color: #03543F',
            'Confirmed': '#E1EFFE; color: #1E429F',
            'Pending Payment': '#FEF3C7; color: #92400E',
            'Cancelled': '#FDE8E8; color: #9B1C1C'
        }
        style = colors.get(obj.status, '#F3F4F6; color: #1F2937')
        return format_html(f'<span style="background-color: {style}; padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 11px;">{obj.status}</span>')
    status_badge.short_description = 'Order Status'


# --- 6. Other Registrations ---
admin.site.register(ShippingRateCard)
admin.site.register(GovtHSNMaster)
admin.site.register(CategoryPolicy)
admin.site.register(Category)
admin.site.register(Cart)
admin.site.register(CartItem)
admin.site.register(Review)
admin.site.register(SellerDeductionSlip)
admin.site.register(ImmutableMasterTransaction)
admin.site.register(OrderShippingReconciliation)