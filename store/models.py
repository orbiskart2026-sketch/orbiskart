import uuid
from decimal import Decimal, ROUND_HALF_UP
from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone


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


# --- 2. Advanced Vendor / Seller Profile (KYC, Banking & Mall) ---
class VendorProfile(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='vendor_profile')
    store_name = models.CharField(max_length=255, unique=True)
    store_photo = models.ImageField(upload_to='seller_stores/', null=True, blank=True)
    business_email = models.EmailField()
    contact_number = models.CharField(max_length=15, default='')

    # टैक्स व पहचान अनुपालन (KYC)
    gstin = models.CharField(max_length=15, blank=True, null=True)
    pan_number = models.CharField(max_length=10, blank=True, null=True)
    pan_doc = models.FileField(upload_to='seller_kyc/pan/', null=True, blank=True)
    identity_proof_doc = models.FileField(upload_to='seller_kyc/identity/', null=True, blank=True)

    # बैंकिंग, बैलेंस व सेटलमेंट
    bank_name = models.CharField(max_length=100, default='')
    bank_account_name = models.CharField(max_length=150, default='')
    bank_account_number = models.CharField(max_length=30, default='')
    bank_ifsc_code = models.CharField(max_length=11, default='')
    bank_cheque_doc = models.FileField(upload_to='seller_kyc/bank/', null=True, blank=True)
    bank_account_verified = models.BooleanField(default=False)

    wallet_balance = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    commission_rate = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('3.00'))

    # क्वालिटी स्कोर व वेरिफिकेशन बैज
    is_approved = models.BooleanField(default=False)
    quality_score = models.DecimalField(max_digits=3, decimal_places=1, default=Decimal('5.0'))

    # OrbisKart Mall व वेयरहाउस लोकेशन
    is_orbiskart_mall = models.BooleanField(default=False)
    warehouse_lat = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    warehouse_lng = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)

    created_at = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f"{self.store_name} ({'सत्यापित' if self.is_approved else 'सत्यापन लंबित'})"


# --- 3. Govt Official HSN / SAC Master Database ---
class GovtHSNMaster(models.Model):
    hsn_code = models.CharField(max_length=8, unique=True, help_text="सरकार द्वारा निर्धारित 6 या 8 अंकों का HSN/SAC कोड")
    description = models.CharField(max_length=255, help_text="वस्तु या सेवा का आधिकारिक विवरण")
    gst_rate = models.DecimalField(max_digits=5, decimal_places=2, help_text="सरकारी GST दर (उदा: 5.00, 12.00, 18.00)")
    cess_rate = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('0.00'), help_text="अतिरिक्त उपकर (यदि लागू हो)")
    last_updated_gov = models.DateField(auto_now=True)

    class Meta:
        verbose_name = "Govt HSN Master"
        verbose_name_plural = "Govt HSN Masters"

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
    hsn_master = models.ForeignKey(GovtHSNMaster, on_delete=models.SET_NULL, null=True, blank=True, help_text="सरकारी HSN मास्टर से ऑटोमैटिक GST")
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


# --- 5. Dynamic Shipping Rate Card ---
class ShippingRateCard(models.Model):
    zone = models.CharField(max_length=50, default='Regional')
    min_weight_grams = models.IntegerField(default=0)
    max_weight_grams = models.IntegerField(default=500)
    forward_charge = models.DecimalField(max_digits=7, decimal_places=2, default=Decimal('50.00'))
    rto_charge = models.DecimalField(max_digits=7, decimal_places=2, default=Decimal('40.00'))

    def __str__(self):
        return f"{self.zone} ({self.min_weight_grams}g-{self.max_weight_grams}g) - Forward: ₹{self.forward_charge}"


# --- 6. Transparent Product Model ---
class Product(models.Model):
    vendor = models.ForeignKey(VendorProfile, on_delete=models.SET_NULL, null=True, blank=True, related_name='products')
    seller = models.ForeignKey(User, on_delete=models.CASCADE, related_name='seller_products', null=True, blank=True)
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True, related_name='products')
    category_policy = models.ForeignKey(CategoryPolicy, on_delete=models.SET_NULL, null=True, blank=True)
    hsn_record = models.ForeignKey(GovtHSNMaster, on_delete=models.SET_NULL, null=True, blank=True, help_text="सरकारी डेटाबेस से ऑटोमैटिक HSN")

    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    price = models.DecimalField(max_digits=12, decimal_places=2)
    original_price = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)

    hsn_code = models.CharField(max_length=20, default='851830')
    gst_rate = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('18.00'))
    weight_grams = models.IntegerField(default=300)
    image = models.ImageField(upload_to='products/', null=True, blank=True)
    stock = models.IntegerField(default=10)
    created_at = models.DateTimeField(default=timezone.now)

    def save(self, *args, **kwargs):
        if self.hsn_record:
            self.hsn_code = self.hsn_record.hsn_code
            self.gst_rate = self.hsn_record.gst_rate
        elif self.category_policy:
            self.hsn_code = self.category_policy.hsn_code
            self.gst_rate = self.category_policy.gst_rate
        super().save(*args, **kwargs)

    def calculate_transparency_ledger(self):
        gross = Decimal(str(self.price))
        rate = self.gst_rate
        plat_rate = self.category_policy.platform_fee_percent if self.category_policy else (
            self.vendor.commission_rate if self.vendor else Decimal('3.00')
        )
        days = self.category_policy.settlement_days if self.category_policy else 7

        gst_divisor = Decimal('1') + (rate / Decimal('100'))
        taxable_base = (gross / gst_divisor).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        product_gst = gross - taxable_base

        pg_fee = (gross * Decimal('0.02')).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        pg_tax = (pg_fee * Decimal('0.18')).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        total_pg = pg_fee + pg_tax

        plat_fee = (gross * (plat_rate / Decimal('100'))).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        plat_tax = (plat_fee * Decimal('0.18')).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        total_platform = plat_fee + plat_tax

        rate_card = ShippingRateCard.objects.filter(
            max_weight_grams__gte=self.weight_grams
        ).order_by('max_weight_grams').first()

        fwd_ship = rate_card.forward_charge if rate_card else Decimal('50.00')
        rto_cost = rate_card.rto_charge if rate_card else Decimal('40.00')

        net_payout = gross - total_pg - total_platform - fwd_ship

        return {
            "gross_price": float(gross),
            "gst_amount": float(product_gst),
            "gst_rate": float(rate),
            "gateway_charge": float(total_pg),
            "platform_fee": float(total_platform),
            "forward_courier": float(fwd_ship),
            "rto_penalty_risk": float(rto_cost),
            "net_seller_payout": float(net_payout),
            "settlement_period": f"{days} वर्किंग डेज"
        }

    def __str__(self):
        return f"{self.title} (₹{self.price})"


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


# --- 8. Order Model (With Logistics & Fraud Prevention OTP) ---
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
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default='Confirmed')

    courier_partner = models.CharField(max_length=100, default='Delhivery Express')
    courier_contact = models.CharField(max_length=20, default='1800-102-1234')
    rider_name = models.CharField(max_length=100, blank=True, null=True)
    rider_contact = models.CharField(max_length=20, blank=True, null=True)
    awb_number = models.CharField(max_length=100, blank=True, null=True)
    live_tracking_url = models.URLField(max_length=500, blank=True, null=True)

    delivery_otp = models.CharField(max_length=6, blank=True, null=True)
    return_otp = models.CharField(max_length=6, blank=True, null=True)

    it_call_no = models.CharField(max_length=20, default='+91-1800-889-2026')
    support_reference_no = models.CharField(max_length=50, blank=True, null=True)
    created_at = models.DateTimeField(default=timezone.now)

    def save(self, *args, **kwargs):
        if not self.support_reference_no:
            self.support_reference_no = f"ORB-SUP-{uuid.uuid4().hex[:8].upper()}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Order #{self.id} - {self.user.username} ({self.status})"


# --- 9. Order Item & Live Transparency Deduction Engine ---
class OrderItem(models.Model):
    order = models.ForeignKey(Order, related_name='items', on_delete=models.CASCADE)
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    vendor = models.ForeignKey(VendorProfile, related_name='order_items', on_delete=models.SET_NULL, null=True, blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    quantity = models.PositiveIntegerField(default=1)

    hsn_code = models.CharField(max_length=20, blank=True, null=True)
    product_gst_rate = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('18.00'))
    taxable_product_value = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    product_gst_amount = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))

    commission_rate = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('3.00'))
    platform_commission = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    payment_gateway_fee = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    shipping_and_return_fee = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('50.00'))

    gst_on_platform_fee = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    total_deductions = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    vendor_payout = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))

    def save(self, *args, **kwargs):
        if not self.vendor and self.product.vendor:
            self.vendor = self.product.vendor
            self.commission_rate = self.product.vendor.commission_rate

        self.hsn_code = self.product.hsn_code
        self.product_gst_rate = self.product.gst_rate

        total_gross = self.price * Decimal(str(self.quantity))

        divisor = Decimal('1') + (self.product_gst_rate / Decimal('100'))
        self.taxable_product_value = (total_gross / divisor).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        self.product_gst_amount = total_gross - self.taxable_product_value

        self.platform_commission = ((total_gross * self.commission_rate) / Decimal('100')).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        self.payment_gateway_fee = ((total_gross * Decimal('2.00')) / Decimal('100')).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

        self.shipping_and_return_fee = (Decimal('50.00') * Decimal(str(self.quantity))).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

        services_subtotal = self.platform_commission + self.payment_gateway_fee + self.shipping_and_return_fee
        self.gst_on_platform_fee = ((services_subtotal * Decimal('18.00')) / Decimal('100')).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

        self.total_deductions = services_subtotal + self.gst_on_platform_fee
        self.vendor_payout = max(total_gross - self.total_deductions, Decimal('0.00'))

        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.quantity} x {self.product.title} (Payout: ₹{self.vendor_payout})"


# --- 10. Seller Deduction Cutting Slip (Zero Hidden Cuts) ---
class SellerDeductionSlip(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    vendor = models.ForeignKey(VendorProfile, on_delete=models.CASCADE, related_name='deduction_slips')
    order = models.ForeignKey(Order, on_delete=models.CASCADE)
    slip_number = models.CharField(max_length=50, unique=True)
    gross_order_amount = models.DecimalField(max_digits=12, decimal_places=2)
    gst_collected = models.DecimalField(max_digits=10, decimal_places=2)
    courier_charge = models.DecimalField(max_digits=10, decimal_places=2)
    platform_and_pg_fee = models.DecimalField(max_digits=10, decimal_places=2)
    rto_risk_deduction = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    final_settlement_amount = models.DecimalField(max_digits=12, decimal_places=2)
    is_settled_to_bank = models.BooleanField(default=False)
    settlement_reference_utr = models.CharField(max_length=100, blank=True, null=True)
    created_at = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f"Slip {self.slip_number} - ₹{self.final_settlement_amount}"


# --- 11. Reviews ---
class Review(models.Model):
    product = models.ForeignKey(Product, related_name='reviews', on_delete=models.CASCADE)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    rating = models.IntegerField(default=5)
    comment = models.TextField()
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.username} - {self.product.title} ({self.rating}★)"
    from django.db import models
from django.contrib.auth.models import User
from decimal import Decimal

class ImmutableMasterTransaction(models.Model):
    TRANSACTION_TYPES = [
        ('ECOMMERCE_ORDER', 'E-Commerce Order'),
        ('UTILITY_BILL', 'BBPS Utility Bill'),
        ('RECHARGE', 'Mobile/DTH Recharge'),
        ('GAS_BOOKING', 'LPG Gas Booking'),
        ('LOAN_REPAYMENT', 'Loan EMI Repayment'),
        ('SELLER_PAYOUT', 'Vendor Bank Settlement'),
    ]

    tx_id = models.CharField(max_length=100, unique=True, editable=False)
    user = models.ForeignKey(User, on_delete=models.PROTECT, related_name='immutable_txs')
    service_type = models.CharField(max_length=50, choices=TRANSACTION_TYPES)
    
    # Financial Breakdown
    gross_amount = models.DecimalField(max_digits=12, decimal_places=2)
    gateway_fee = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    platform_commission = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    gst_on_commission = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    tcs_tax = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    net_payout = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))

    # Security & Audit
    operator_ref = models.CharField(max_length=150, blank=True, null=True) # BBPS / Bank UTR
    status = models.CharField(max_length=30, default='SUCCESS')
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, editable=False)

    # सुरक्षा नियम: यह रिकॉर्ड कभी डिलीट नहीं हो सकता
    def delete(self, *args, **kwargs):
        raise PermissionError("कानूनी नियम: यह वित्तीय ट्रांजेक्शन कभी डिलीट नहीं किया जा सकता।")

    def __str__(self):
        return f"{self.tx_id} - {self.service_type} - ₹{self.gross_amount}"