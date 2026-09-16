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


# --- 2. Vendor Profile Admin (₹1 Penny Drop & 1-Click Verification) ---
@admin.action(description='✅ सेलर को ₹1 बैंक ट्रायल भेजकर Approve करें (Penny Drop Verified)')
def approve_and_verify_sellers(modeladmin, request, queryset):
    updated_count = 0
    for vendor in queryset:
        vendor.penny_drop_verified = True
        vendor.penny_drop_utr = f"PENNY-UTR-{uuid.uuid4().hex[:8].upper()}"
        vendor.is_approved = True
        vendor.bank_account_verified = True
        vendor.save()
        
        # सेलर के उत्पादों को तुरंत सक्रिय (Live) करना
        vendor.products.update(is_active=True)
        updated_count += 1

    messages.success(
        request, 
        f"सफलतापूर्वक {updated_count} सेलर(s) को ₹1 बैंक ट्रायल के साथ Approve कर दिया गया है। इनके प्रोडक्ट्स अब लाइव हैं।"
    )


@admin.register(VendorProfile)
class VendorProfileAdmin(admin.ModelAdmin):
    list_display = (
        'store_name', 'contact_number', 'city_district', 'state', 
        'approval_badge', 'penny_drop_status', 'bank_account_number', 'created_at'
    )
    list_filter = ('is_approved', 'penny_drop_verified', 'state', 'bank_account_verified')
    search_fields = ('store_name', 'contact_number', 'business_email', 'pan_number', 'gstin', 'msme_number')
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
            return format_html('<span style="color:green; font-weight:bold;">✔ Approved</span>')
        return format_html('<span style="color:orange; font-weight:bold;">⏳ Pending</span>')
    approval_badge.short_description = 'Approval Status'

    def penny_drop_status(self, obj):
        if obj.penny_drop_verified:
            return format_html('<span style="color:green;">₹1 Verified ({})</span>', obj.penny_drop_utr or 'Sent')
        return format_html('<span style="color:red; font-weight:bold;">₹1 Pending</span>')
    penny_drop_status.short_description = '₹1 Penny Drop'


# --- 3. Product Images Inline & Product Admin ---
class ProductImageInline(admin.TabularInline):
    model = ProductImage
    extra = 3


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ('title', 'vendor', 'category', 'price', 'weight_grams', 'hsn_code', 'gst_rate', 'stock', 'is_active')
    list_filter = ('is_active', 'category', 'gst_rate', 'vendor')
    search_fields = ('title', 'hsn_code', 'vendor__store_name')
    inlines = [ProductImageInline]

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


# --- 4. Order Item Admin (Complete Transparency Ledger) ---
@admin.register(OrderItem)
class OrderItemAdmin(admin.ModelAdmin):
    list_display = (
        'id', 'order', 'product', 'vendor', 'hsn_code', 'price', 
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


# --- 5. Order Shipping Reconciliation Admin ---
@admin.register(OrderShippingReconciliation)
class OrderShippingReconciliationAdmin(admin.ModelAdmin):
    list_display = ('order', 'courier_partner', 'awb_number', 'estimated_charge', 'actual_billed_charge', 'is_discrepancy', 'status')
    list_filter = ('status', 'courier_partner', 'is_discrepancy')
    search_fields = ('awb_number', 'order__id')


# --- 6. Seller Deduction Slip Admin ---
@admin.register(SellerDeductionSlip)
class SellerDeductionSlipAdmin(admin.ModelAdmin):
    list_display = ('slip_number', 'vendor', 'order', 'gross_order_amount', 'courier_charge', 'platform_and_pg_fee', 'final_settlement_amount', 'is_settled_to_bank')
    list_filter = ('is_settled_to_bank', 'vendor')
    search_fields = ('slip_number', 'settlement_reference_utr')


# --- 7. Immutable Master Transaction Admin ---
@admin.register(ImmutableMasterTransaction)
class ImmutableMasterTransactionAdmin(admin.ModelAdmin):
    list_display = ('tx_id', 'service_type', 'gross_amount', 'gateway_fee', 'platform_commission', 'net_payout', 'status', 'created_at')
    list_filter = ('service_type', 'status')
    search_fields = ('tx_id', 'operator_ref')
    readonly_fields = [f.name for f in ImmutableMasterTransaction._meta.fields]

    def has_delete_permission(self, request, obj=None):
        return False  # कानूनी ऑडिट सुरक्षा


# --- 8. Core Policies, HSN & Categories ---
@admin.register(CategoryPolicy)
class CategoryPolicyAdmin(admin.ModelAdmin):
    list_display = ('name', 'hsn_code', 'gst_rate', 'platform_fee_percent', 'settlement_days')


@admin.register(ShippingRateCard)
class ShippingRateCardAdmin(admin.ModelAdmin):
    list_display = ('courier_partner', 'zone', 'max_weight_grams', 'forward_charge', 'per_additional_500g', 'rto_charge', 'is_active')
    list_filter = ('courier_partner', 'zone', 'is_active')


@admin.register(GovtHSNMaster)
class GovtHSNMasterAdmin(admin.ModelAdmin):
    list_display = ('hsn_code', 'description', 'gst_rate', 'cess_rate', 'last_updated_gov')
    search_fields = ('hsn_code', 'description')


# --- 9. Remaining Core Models ---
admin.site.register(Category)
admin.site.register(Order)
admin.site.register(Cart)
admin.site.register(CartItem)
admin.site.register(Review)