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


admin.site.unregister(User)
admin.site.register(User, UserAdmin)


# --- 2. Vendor Profile Admin (1-Click Approval & Document Verification) ---
@admin.action(description='✅ सेलर को ₹1 बैंक ट्रायल के साथ Approve करें (Make Active)')
def approve_and_verify_sellers(modeladmin, request, queryset):
    updated_count = 0
    for vendor in queryset:
        vendor.penny_drop_verified = True
        vendor.penny_drop_utr = f"PENNY-UTR-{uuid.uuid4().hex[:8].upper()}"
        vendor.is_approved = True
        vendor.bank_account_verified = True
        vendor.save()
        
        # सेलर के सभी उत्पादों को तुरंत लाइव करना
        vendor.products.update(is_active=True)
        updated_count += 1

    messages.success(
        request, 
        f"सफलतापूर्वक {updated_count} सेलर(s) को Approve कर दिया गया है। इनके सभी उत्पाद अब लाइव हैं।"
    )


@admin.register(VendorProfile)
class VendorProfileAdmin(admin.ModelAdmin):
    list_display = (
        'store_name', 'contact_number', 'city_district', 'state', 
        'is_approved', 'penny_drop_verified', 'approval_badge', 'penny_drop_status', 
        'bank_account_number', 'wallet_balance', 'created_at'
    )
    list_filter = ('is_approved', 'penny_drop_verified', 'state', 'bank_account_verified')
    search_fields = ('store_name', 'contact_number', 'business_email', 'pan_number', 'gstin', 'msme_number', 'bank_account_number')
    list_editable = ('is_approved', 'penny_drop_verified')
    actions = [approve_and_verify_sellers]
    
    fieldsets = (
        ('दुकान व विक्रेता पहचान', {
            'fields': ('user', 'store_name', 'store_photo', 'contact_number', 'business_email')
        }),
        ('विस्तृत व्यावसायिक पता (Address Columns)', {
            'fields': ('street_address', 'city_district', 'state', 'pincode')
        }),
        ('टैक्स, पहचान व बिज़नेस प्रूफ (KYC Documents)', {
            'fields': (
                'gstin', 'msme_number', 'pan_number', 'id_proof_number',
                'pan_doc', 'identity_proof_doc', 'business_proof_doc'
            )
        }),
        ('बैंकिंग एवं ₹1 Penny Drop ट्रायल सत्यापन', {
            'fields': (
                'bank_name', 'bank_account_name', 'bank_account_number', 'bank_ifsc_code',
                'bank_cheque_doc', 'bank_account_verified', 'penny_drop_verified', 
                'penny_drop_utr', 'is_approved'
            )
        }),
        ('कमीशन व वॉलेट', {
            'fields': ('wallet_balance', 'commission_rate', 'quality_score', 'is_orbiskart_mall')
        }),
    )

    def approval_badge(self, obj):
        if obj.is_approved:
            return format_html('<span style="color:#10B981; font-weight:bold;">✔ Approved</span>')
        return format_html('<span style="color:#F59E0B; font-weight:bold;">⏳ Pending</span>')
    approval_badge.short_description = 'Approval Status'

    def penny_drop_status(self, obj):
        if obj.penny_drop_verified:
            return format_html('<span style="color:#10B981; font-weight:bold;">✔ Verified ({})</span>', obj.penny_drop_utr or 'Sent')
        return format_html('<span style="color:#EF4444; font-weight:bold;">⏳ Pending</span>')
    penny_drop_status.short_description = '₹1 Penny Drop'


# --- 3. Product Gallery Images Inline (With Preview) ---
class ProductImageInline(admin.TabularInline):
    model = ProductImage
    extra = 1
    readonly_fields = ('preview_thumbnail',)

    def preview_thumbnail(self, instance):
        if instance.image:
            return format_html('<img src="{}" style="height: 50px; width: 50px; object-fit: cover; border-radius: 6px; border: 1px solid #ddd;" />', instance.image.url)
        return "No Image"
    preview_thumbnail.short_description = "प्रिव्यू"


# --- 4. Product Admin (Fixed Visibility & Weight Freeze Display) ---
@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = (
        'id', 'thumbnail_preview', 'title', 'vendor_name', 'price', 
        'weight_grams', 'weight_freeze_badge', 'stock', 'is_active', 'created_at'
    )
    list_filter = ('is_active', 'is_weight_frozen', 'category', 'created_at')
    search_fields = ('id', 'title', 'description', 'vendor__store_name', 'hsn_code')
    list_editable = ('is_active', 'price', 'stock')
    inlines = [ProductImageInline]

    fieldsets = (
        ('मूल विवरण (Basic Info)', {
            'fields': ('seller', 'vendor', 'category', 'category_policy', 'title', 'description', 'price', 'original_price', 'stock', 'is_active')
        }),
        ('वज़न एवं Weight Freeze सुरक्षा', {
            'fields': ('weight_grams', 'package_length_cm', 'package_width_cm', 'package_height_cm', 'package_photo', 'is_weight_frozen')
        }),
        ('मीडिया (फ़ोटो एवं वीडियो)', {
            'fields': ('image', 'video')
        }),
        ('टैक्स व HSN कोड', {
            'fields': ('hsn_code', 'gst_rate')
        }),
    )

    def thumbnail_preview(self, obj):
        if obj.image:
            return format_html('<img src="{}" style="width: 42px; height: 42px; object-fit: cover; border-radius: 6px; border: 1px solid #ccc;" />', obj.image.url)
        return "📷 No Img"
    thumbnail_preview.short_description = "फ़ोटो"

    def vendor_name(self, obj):
        return obj.vendor.store_name if obj.vendor else "Direct Admin"
    vendor_name.short_description = "दुकान / सेलर"

    def weight_freeze_badge(self, obj):
        if obj.is_weight_frozen:
            return format_html('<span style="color:#10B981; font-weight:bold;">🔒 {}g ({}x{}x{})</span>', obj.weight_grams, obj.package_length_cm, obj.package_width_cm, obj.package_height_cm)
        return format_html('<span style="color:#EF4444;">Unfrozen</span>')
    weight_freeze_badge.short_description = "Weight Freeze"

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        if request.user.is_superuser or request.user.is_staff:
            return qs
        if hasattr(request.user, 'vendor_profile'):
            return qs.filter(vendor=request.user.vendor_profile)
        return qs


# --- 5. Order Item Inline & Order Admin ---
class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = ('product', 'vendor', 'price', 'quantity', 'vendor_payout')


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = (
        'id', 'user', 'total_price', 'delivery_fee', 'payment_method', 
        'status', 'delivery_otp', 'courier_partner', 'created_at'
    )
    list_filter = ('status', 'payment_method', 'courier_partner')
    search_fields = ('id', 'user__username', 'shipping_address', 'awb_number')
    inlines = [OrderItemInline]


# --- 6. Seller Deduction Slip Admin (Fixed) ---
@admin.register(SellerDeductionSlip)
class SellerDeductionSlipAdmin(admin.ModelAdmin):
    list_display = ('id', 'created_at', 'vendor', 'net_payout_amount', 'status')
    list_filter = ('status', 'vendor')
    search_fields = ('id', 'vendor__store_name')


# --- 7. Multi-Courier Shipping Rate Card Admin ---
@admin.register(ShippingRateCard)
class ShippingRateCardAdmin(admin.ModelAdmin):
    list_display = ('courier_partner', 'zone', 'max_weight_grams', 'forward_charge', 'per_additional_500g', 'rto_charge', 'is_active')
    list_filter = ('courier_partner', 'zone', 'is_active')


# --- 8. Immutable Master Transaction Admin (Fixed) ---
@admin.register(ImmutableMasterTransaction)
class ImmutableMasterTransactionAdmin(admin.ModelAdmin):
    list_display = ('id', 'created_at', 'order', 'amount', 'transaction_type', 'status')
    search_fields = ('id', 'order__id', 'transaction_type')
    list_filter = ('transaction_type', 'status', 'created_at')
    readonly_fields = [f.name for f in ImmutableMasterTransaction._meta.fields]

    def has_delete_permission(self, request, obj=None):
        return False  # कानूनी ऑडिट सुरक्षा


# --- 9. Govt HSN & Policies Admin ---
@admin.register(GovtHSNMaster)
class GovtHSNMasterAdmin(admin.ModelAdmin):
    list_display = ('hsn_code', 'description', 'gst_rate', 'cess_rate', 'last_updated_gov')
    search_fields = ('hsn_code', 'description')


@admin.register(CategoryPolicy)
class CategoryPolicyAdmin(admin.ModelAdmin):
    list_display = ('name', 'hsn_code', 'gst_rate', 'platform_fee_percent', 'settlement_days')


# --- 10. Remaining Models ---
admin.site.register(Category)
admin.site.register(Cart)
admin.site.register(CartItem)
admin.site.register(Review)
admin.site.register(OrderShippingReconciliation)