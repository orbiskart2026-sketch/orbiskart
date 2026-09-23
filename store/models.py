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


# --- 2. Advanced Vendor / Seller Profile (KYC, Business Docs & Penny Drop Setup) ---
class VendorProfile(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='vendor_profile')
    store_name = models.CharField(max_length=255, unique=True)
    store_photo = models.ImageField(upload_to='seller_stores/', null=True, blank=True)
    business_email = models.EmailField(blank=True, null=True)
    contact_number = models.CharField(max_length=15, default='')

    # विस्तृत दुकान / वेयरहाउस पता
    street_address = models.TextField(default='', blank=True)
    city_district = models.CharField(max_length=100, default='')
    state = models.CharField(max_length=100, default='Jharkhand')
    pincode = models.CharField(max_length=10, default='')

    # टैक्स व पहचान अनुपालन (KYC)
    gstin = models.CharField(max_length=15, blank=True, null=True)
    msme_number = models.CharField(max_length=50, blank=True, null=True)
    pan_number = models.CharField(max_length=10, blank=True, null=True)
    id_proof_number = models.CharField(max_length=50, blank=True, null=True)

    # सुरक्षित दस्तावेज़ (KYC & Business Proof)
    pan_doc = models.FileField(upload_to='seller_kyc/pan/', null=True, blank=True)
    identity_proof_doc = models.FileField(upload_to='seller_kyc/identity/', null=True, blank=True)
    business_proof_doc = models.FileField(upload_to='seller_kyc/business/', null=True, blank=True)

    # बैंकिंग, बैलेंस व ₹1 पेनी-ड्रॉप सत्यापन
    bank_name = models.CharField(max_length=100, default='')
    bank_account_name = models.CharField(max_length=150, default='')
    bank_account_number = models.CharField(max_length=30, default='')
    bank_ifsc_code = models.CharField(max_length=11, default='')
    bank_cheque_doc = models.FileField(upload_to='seller_kyc/bank/', null=True, blank=True)
    bank_account_verified = models.BooleanField(default=False)

    # ₹1 Penny Drop ट्रायल सत्यापन
    penny_drop_verified = models.BooleanField(default=False)
    penny_drop_utr = models.CharField(max_length=100, blank=True, null=True)
    is_approved = models.BooleanField(default=True)  # मोबाइल ऐप व टेस्टिंग सुगमता के लिए डिफ़ॉल्ट True

    wallet_balance = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    commission_rate = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('3.00'))
    quality_score = models.DecimalField(max_digits=3, decimal_places=1, default=Decimal('5.0'))
    is_orbiskart_mall = models.BooleanField(default=False)

    created_at = models.DateTimeField(default=timezone.now)

    def __str__(self):
        status_text = "सत्यापित एवं सक्रिय" if self.is_approved else "₹1 ट्रायल / सत्यापन लंबित"
        return f"{self.store_name} ({status_text})"


# --- Automatic Signal: जैसे ही यूजर बने, सेलर प्रोफाइल अपने आप बन जाए ---
@receiver(post_save, sender=User)
def create_seller_profile_automatically(sender, instance, created, **kwargs):
    if created:
        # यूनिक स्टोर नेम जनरेट करना ताकि डुप्लीकेट एरर न आए
        base_store_name = f"{instance.username}_store"
        store_name = base_store_name
        counter = 1
        while VendorProfile.objects.filter(store_name=store_name).exists():
            store_name = f"{base_store_name}_{counter}"
            counter += 1

        VendorProfile.objects.get_or_create(
            user=instance,
            defaults={
                'store_name': store_name,
                'business_email': instance.email or f"{instance.username}@orbiskart.com",
                'is_approved': True,
                'wallet_balance': Decimal('1500.00')  # टेस्टिंग के लिए प्रारंभिक वॉलेट बैलेंस
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
        return f"{self.hsn_code} - {self.description} ({self.gst_rate}%)"


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
        return f"{self.name} (HSN: {self.hsn_code}, GST: {self.gst_rate}%)"


# --- 5. Multi-Courier Shipping Rate Card ---
class ShippingRateCard(models.Model):
    ZONE_CHOICES = [
        ('Zone A', 'Zone A - Local (Within City)'),
        ('Zone B', 'Zone B - Regional (Within State)'),
        ('Zone C', 'Zone C - National Metro'),
        ('Zone D', 'Zone D - Rest of India'),
        ('Zone E', 'Zone E - Special (NE, J&K)'),
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
        return f"{self.courier_partner} | {self.zone} (Base: ₹{self.forward_charge}, +500g: ₹{self.per_additional_500g})"


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
        return f"{self.title} (₹{self.price})"


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
    PAYMENT_CHOICES = [
        ('COD', 'Cash on Delivery'),
        ('UPI', 'UPI / QR Code'),
        ('Razorpay-Prepaid', 'Razorpay Prepaid Online'),
        ('NET_BANKING', 'Internet Banking'),
    ]

    STATUS_CHOICES = [
        ('Confirmed', 'Confirmed'),
        ('Packed', 'Packed'),
        ('Shipped', 'Shipped'),
        ('Out for Delivery', 'Out for Delivery'),
        ('Delivered', 'Delivered'),
        ('Cancelled', 'Cancelled'),
        ('Return Requested', 'Return Requested'),
        ('Returned & Refunded', 'Returned & Refunded'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE)
    base_price = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    tax_amount = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    delivery_fee = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    total_price = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    payment_method = models.CharField(max_length=30, choices=PAYMENT_CHOICES, default='COD')
    shipping_address = models.TextField(default='')
    shipping_pincode = models.CharField(max_length=10, blank=True, null=True)
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default='Confirmed')

    courier_partner = models.CharField(max_length=100, default='Delhivery Express')
    courier_contact = models.CharField(max_length=20, default='1800-102-1234')
    rider_name = models.CharField(max_length=100, blank=True, null=True)
    rider_contact = models.CharField(max_length=20, blank=True, null=True)
    awb_number = models.CharField(max_length=100, blank=True, null=True)
    live_tracking_url = models.URLField(max_length=500, blank=True, null=True)

    delivery_otp = models.CharField(max_length=6, blank=True, null=True)
    return_otp = models.CharField(max_length=6, blank=True, null=True)

    settlement_due_date = models.DateTimeField(null=True, blank=True)
    is_settled_to_vendor = models.BooleanField(default=False)
    vendor_utr = models.CharField(max_length=100, null=True, blank=True)

    it_call_no = models.CharField(max_length=20, default='+91-1800-889-2026')
    support_reference_no = models.CharField(max_length=50, blank=True, null=True)
    created_at = models.DateTimeField(default=timezone.now)

    def save(self, *args, **kwargs):
        if not self.support_reference_no:
            self.support_reference_no = f"ORB-SUP-{uuid.uuid4().hex[:8].upper()}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Order #{self.id} - {self.user.username} ({self.status})"


# --- 9. Multi-Courier Reconciliation ---
class OrderShippingReconciliation(models.Model):
    STATUS_CHOICES = [
        ('Estimated', 'अनुमानित (Estimated)'),
        ('In-Transit', 'मार्ग में (In-Transit)'),
        ('Delivered', 'डिलीवर (Delivered)'),
        ('Billed_Discrepancy', 'वजन अंतर (Discrepancy)'),
        ('Settled', 'बिल सेटल (Settled)'),
    ]

    order = models.OneToOneField(Order, on_delete=models.CASCADE, related_name='shipping_recon')
    courier_partner = models.CharField(max_length=50, default='Delhivery')
    awb_number = models.CharField(max_length=100, blank=True, null=True)
    estimated_weight_g = models.IntegerField(default=500)
    actual_billed_weight_g = models.IntegerField(null=True, blank=True)
    estimated_charge = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('50.00'))
    actual_billed_charge = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    is_discrepancy = models.BooleanField(default=False)
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='Estimated')
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Recon #{self.order.id} - {self.courier_partner}"


# --- 10. Order Items ---
class OrderItem(models.Model):
    order = models.ForeignKey(Order, related_name='items', on_delete=models.CASCADE)
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    vendor = models.ForeignKey(VendorProfile, related_name='order_items', on_delete=models.SET_NULL, null=True, blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    quantity = models.PositiveIntegerField(default=1)
    vendor_payout = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))

    def __str__(self):
        return f"{self.quantity} x {self.product.title}"


# --- 11. Seller Deduction Slip ---
class SellerDeductionSlip(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    vendor = models.ForeignKey(VendorProfile, on_delete=models.CASCADE, related_name='deduction_slips')
    order = models.ForeignKey(Order, on_delete=models.CASCADE)
    slip_number = models.CharField(max_length=50, unique=True)
    final_settlement_amount = models.DecimalField(max_digits=12, decimal_places=2)
    created_at = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f"Slip {self.slip_number}"


# --- 12. Reviews ---
class Review(models.Model):
    product = models.ForeignKey(Product, related_name='reviews', on_delete=models.CASCADE)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    rating = models.IntegerField(default=5)
    comment = models.TextField()
    created_at = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f"{self.user.username} - {self.product.title}"


# --- 13. Immutable Master Transaction ---
class ImmutableMasterTransaction(models.Model):
    tx_id = models.CharField(max_length=100, unique=True, editable=False)
    user = models.ForeignKey(User, on_delete=models.PROTECT, related_name='immutable_txs', null=True, blank=True)
    service_type = models.CharField(max_length=50, default='ECOMMERCE_ORDER')
    gross_amount = models.DecimalField(max_digits=12, decimal_places=2)
    net_payout = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    status = models.CharField(max_length=30, default='SUCCESS')
    created_at = models.DateTimeField(auto_now_add=True, editable=False)

    def delete(self, *args, **kwargs):
        raise PermissionError("कानूनी नियम: यह वित्तीय ट्रांजेक्शन कभी डिलीट नहीं किया जा सकता।")

    def __str__(self):
        return f"{self.tx_id} - ₹{self.gross_amount}"
    from django.db.models.signals import post_save
from django.dispatch import receiver

@receiver(post_save, sender=User)
def create_vendor_profile(sender, instance, created, **kwargs):
    if created and not hasattr(instance, 'vendor_profile'):
        VendorProfile.objects.create(
            user=instance,
            store_name=f"{instance.username} Store",
            business_email=instance.email or f"{instance.username}@orbiskart.com",
            contact_number="9999999999"
        )