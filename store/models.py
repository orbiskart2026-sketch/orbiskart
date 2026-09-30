import uuid
from decimal import Decimal, ROUND_HALF_UP
from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from django.db.models.signals import post_save
from django.dispatch import receiver


# --- 1. Role-Based Access Profile ---
class UserProfile(models.Model):
    ROLE_CHOICES = [
        ('ADMIN', 'Admin'),
        ('STAFF', 'Staff / Core Team'),
        ('VENDOR', 'Vendor / Seller'),
        ('CUSTOMER', 'Customer'),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='CUSTOMER')
    phone_number = models.CharField(max_length=15, blank=True, null=True)
    is_verified = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.user.username} - {self.get_role_display()}"


# --- 2. Advanced Vendor / Seller Profile (KYC & Business Setup) ---
class VendorProfile(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='vendor_profile')
    
    shop_name = models.CharField(max_length=255, unique=True)
    store_name = models.CharField(max_length=255, blank=True, null=True)
    owner_name = models.CharField(max_length=255, default='')
    mobile_number = models.CharField(max_length=15, default='')
    email = models.EmailField(blank=True, null=True)
    business_email = models.EmailField(blank=True, null=True)
    
    business_address = models.TextField(default='', blank=True)
    street_address = models.TextField(default='', blank=True)
    city_district = models.CharField(max_length=100, default='')
    state = models.CharField(max_length=100, default='Jharkhand')
    pin_code = models.CharField(max_length=10, default='', blank=True)

    gstin_number = models.CharField(max_length=15, blank=True, null=True)
    gstin = models.CharField(max_length=15, blank=True, null=True)
    msme_udyam_number = models.CharField(max_length=50, blank=True, null=True)
    msme_number = models.CharField(max_length=50, blank=True, null=True)
    pan_number = models.CharField(max_length=10, blank=True, null=True)
    id_proof_number = models.CharField(max_length=50, blank=True, null=True)

    pan_doc = models.FileField(upload_to='seller_kyc/pan/', null=True, blank=True)
    identity_proof = models.FileField(upload_to='seller_docs/identity/', blank=True, null=True)
    identity_proof_doc = models.FileField(upload_to='seller_kyc/identity/', null=True, blank=True)
    business_document = models.FileField(upload_to='seller_docs/business/', blank=True, null=True)
    business_proof_doc = models.FileField(upload_to='seller_kyc/business/', null=True, blank=True)
    shop_gps_photo = models.ImageField(upload_to='seller_docs/shop_gps/', blank=True, null=True)
    store_photo = models.ImageField(upload_to='seller_stores/', null=True, blank=True)

    bank_name = models.CharField(max_length=100, default='')
    bank_holder_name = models.CharField(max_length=255, blank=True, null=True)
    bank_account_name = models.CharField(max_length=150, default='')
    bank_account_number = models.CharField(max_length=30, default='')
    ifsc_code = models.CharField(max_length=11, default='')
    bank_ifsc_code = models.CharField(max_length=11, default='')
    bank_cheque_doc = models.FileField(upload_to='seller_kyc/bank/', null=True, blank=True)
    bank_account_verified = models.BooleanField(default=False)
    penny_drop_verified = models.BooleanField(default=False)
    penny_drop_utr = models.CharField(max_length=100, blank=True, null=True)

    is_verified_seller = models.BooleanField(default=False)
    is_approved = models.BooleanField(default=False)
    terms_accepted = models.BooleanField(default=False)

    wallet_balance = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    commission_rate = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('3.00'))
    quality_score = models.DecimalField(max_digits=3, decimal_places=1, default=Decimal('5.0'))
    is_orbiskart_mall = models.BooleanField(default=False)

    created_at = models.DateTimeField(default=timezone.now)

    def save(self, *args, **kwargs):
        if self.shop_name and not self.store_name:
            self.store_name = self.shop_name
        elif self.store_name and not self.shop_name:
            self.shop_name = self.store_name
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.shop_name or self.store_name}"


@receiver(post_save, sender=User)
def create_seller_profile_automatically(sender, instance, created, **kwargs):
    if created:
        base_store_name = f"{instance.username}_store"
        store_name = base_store_name
        counter = 1
        while VendorProfile.objects.filter(shop_name=store_name).exists():
            store_name = f"{base_store_name}_{counter}"
            counter += 1

        VendorProfile.objects.get_or_create(
    user=instance,
    defaults={
        'shop_name': store_name,
        'store_name': store_name,
        'email': instance.email or f"{instance.username}@orbiskart.com",
        'business_email': instance.email or f"{instance.username}@orbiskart.com",

        # SECURITY: New seller is NOT trusted automatically
        'is_verified_seller': False,
        'is_approved': False,

        # SECURITY: Never give an automatic wallet balance
        'wallet_balance': Decimal('0.00')
    }
)


# --- 3. Govt Official HSN / SAC Master Database ---
class GovtHSNMaster(models.Model):
    hsn_code = models.CharField(max_length=8, unique=True)
    description = models.CharField(max_length=255)
    gst_rate = models.DecimalField(max_digits=5, decimal_places=2)
    cess_rate = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('0.00'))
    last_updated_gov = models.DateField(auto_now=True)

    def __str__(self):
        return f"{self.hsn_code} - {self.gst_rate}%"


# --- 4. Dynamic Category & Tax Policy ---
class Category(models.Model):
    name = models.CharField(max_length=200)

    class Meta:
        verbose_name_plural = "Categories"

    def __str__(self):
        return self.name


class CategoryPolicy(models.Model):
    category = models.ForeignKey(Category, on_delete=models.CASCADE, related_name='policies', null=True, blank=True)
    name = models.CharField(max_length=100, unique=True)
    hsn_master = models.ForeignKey(GovtHSNMaster, on_delete=models.SET_NULL, null=True, blank=True)
    hsn_code = models.CharField(max_length=20, default='851830')
    gst_rate = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('18.00'))
    platform_fee_percent = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('3.00'))
    settlement_days = models.IntegerField(default=7)

    def save(self, *args, **kwargs):
        if self.hsn_master:
            self.hsn_code = self.hsn_master.hsn_code
            self.gst_rate = self.hsn_master.gst_rate
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


# --- 5. Multi-Courier Shipping Rate Card ---
class ShippingRateCard(models.Model):
    ZONE_CHOICES = [
        ('Zone A', 'Zone A - Local'),
        ('Zone B', 'Zone B - Regional'),
        ('Zone C', 'Zone C - National Metro'),
        ('Zone D', 'Zone D - Rest of India'),
        ('Zone E', 'Zone E - Special'),
    ]

    courier_partner = models.CharField(max_length=50, default='Delhivery')
    zone = models.CharField(max_length=50, choices=ZONE_CHOICES, default='Zone B')
    min_weight_grams = models.IntegerField(default=0)
    max_weight_grams = models.IntegerField(default=500)
    forward_charge = models.DecimalField(max_digits=7, decimal_places=2, default=Decimal('45.00'))
    per_additional_500g = models.DecimalField(max_digits=7, decimal_places=2, default=Decimal('20.00'))
    rto_charge = models.DecimalField(max_digits=7, decimal_places=2, default=Decimal('40.00'))
    cod_charge = models.DecimalField(max_digits=7, decimal_places=2, default=Decimal('0.00'))
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.courier_partner} | {self.zone}"


# --- 6. Transparent Product Model ---
class Product(models.Model):
    vendor = models.ForeignKey(VendorProfile, on_delete=models.SET_NULL, null=True, blank=True, related_name='products')
    seller = models.ForeignKey(User, on_delete=models.CASCADE, related_name='seller_products', null=True, blank=True)
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True, related_name='products')
    category_policy = models.ForeignKey(CategoryPolicy, on_delete=models.SET_NULL, null=True, blank=True)
    hsn_record = models.ForeignKey(GovtHSNMaster, on_delete=models.SET_NULL, null=True, blank=True)

    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    price = models.DecimalField(max_digits=12, decimal_places=2)
    original_price = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)

    image = models.ImageField(upload_to='products/', null=True, blank=True)
    video = models.FileField(upload_to='product_videos/', null=True, blank=True)

    hsn_code = models.CharField(max_length=20, default='851830')
    gst_rate = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('18.00'))
    weight_grams = models.IntegerField(default=300)
    stock = models.IntegerField(default=10)

    package_length_cm = models.DecimalField(max_digits=6, decimal_places=2, default=Decimal('10.00'))
    package_width_cm = models.DecimalField(max_digits=6, decimal_places=2, default=Decimal('10.00'))
    package_height_cm = models.DecimalField(max_digits=6, decimal_places=2, default=Decimal('5.00'))
    package_photo = models.ImageField(upload_to='weight_freeze_docs/', null=True, blank=True)
    is_weight_frozen = models.BooleanField(default=True)

    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(default=timezone.now)

    def save(self, *args, **kwargs):
        if self.hsn_record:
            self.hsn_code = self.hsn_record.hsn_code
            self.gst_rate = self.hsn_record.gst_rate
        elif self.category_policy:
            self.hsn_code = self.category_policy.hsn_code
            self.gst_rate = self.category_policy.gst_rate
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.title}"


class ProductImage(models.Model):
    product = models.ForeignKey(Product, related_name='additional_images', on_delete=models.CASCADE)
    image = models.ImageField(upload_to='products/gallery/')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Image for {self.product.title}"


# --- 7. Cart & Items ---
class Cart(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    created_at = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f"Cart of {self.user.username}"


class CartItem(models.Model):
    cart = models.ForeignKey(Cart, related_name='items', on_delete=models.CASCADE)
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField(default=1)

    def __str__(self):
        return f"{self.quantity} x {self.product.title}"


# --- 8. Order Model ---
class Order(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    base_price = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    tax_amount = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    delivery_fee = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    total_price = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    payment_method = models.CharField(max_length=30, default='COD')
    shipping_address = models.TextField(default='')
    shipping_pincode = models.CharField(max_length=10, blank=True, null=True)
    status = models.CharField(max_length=50, default='Confirmed')

    courier_partner = models.CharField(max_length=100, default='Delhivery Express')
    awb_number = models.CharField(max_length=100, blank=True, null=True)
    delivery_otp = models.CharField(max_length=6, blank=True, null=True)
    return_otp = models.CharField(max_length=6, blank=True, null=True)

    settlement_due_date = models.DateTimeField(null=True, blank=True)
    is_settled_to_vendor = models.BooleanField(default=False)
    vendor_utr = models.CharField(max_length=100, null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f"Order #{self.id}"


class OrderShippingReconciliation(models.Model):
    order = models.OneToOneField(Order, on_delete=models.CASCADE, related_name='shipping_recon')
    courier_partner = models.CharField(max_length=50, default='Delhivery')
    awb_number = models.CharField(max_length=100, blank=True, null=True)
    estimated_weight_g = models.IntegerField(default=500)
    actual_billed_weight_g = models.IntegerField(null=True, blank=True)
    estimated_charge = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('50.00'))
    actual_billed_charge = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    is_discrepancy = models.BooleanField(default=False)
    status = models.CharField(max_length=30, default='Estimated')
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Recon #{self.order.id}"


class OrderItem(models.Model):
    order = models.ForeignKey(Order, related_name='items', on_delete=models.CASCADE)
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    vendor = models.ForeignKey(VendorProfile, related_name='order_items', on_delete=models.SET_NULL, null=True, blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    quantity = models.PositiveIntegerField(default=1)
    vendor_payout = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))

    def __str__(self):
        return f"{self.quantity} x {self.product.title}"


class SellerDeductionSlip(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    vendor = models.ForeignKey(VendorProfile, on_delete=models.CASCADE, related_name='deduction_slips')
    order = models.ForeignKey(Order, on_delete=models.CASCADE)
    slip_number = models.CharField(max_length=50, unique=True)
    final_settlement_amount = models.DecimalField(max_digits=12, decimal_places=2)
    created_at = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f"Slip {self.slip_number}"


class Review(models.Model):
    product = models.ForeignKey(Product, related_name='reviews', on_delete=models.CASCADE)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    rating = models.IntegerField(default=5)
    comment = models.TextField()
    created_at = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f"{self.user.username} - {self.product.title}"


class ImmutableMasterTransaction(models.Model):
    tx_id = models.CharField(max_length=100, unique=True, editable=False)
    user = models.ForeignKey(User, on_delete=models.PROTECT, related_name='immutable_txs', null=True, blank=True)
    service_type = models.CharField(max_length=50, default='ECOMMERCE_ORDER')
    gross_amount = models.DecimalField(max_digits=12, decimal_places=2)
    net_payout = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    status = models.CharField(max_length=30, default='SUCCESS')
    created_at = models.DateTimeField(auto_now_add=True, editable=False)

    def __str__(self):
        return f"{self.tx_id} - ₹{self.gross_amount}"