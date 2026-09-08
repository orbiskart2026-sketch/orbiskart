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


# --- 2. Vendor / Seller Profile ---
class VendorProfile(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='vendor_profile')
    store_name = models.CharField(max_length=255, unique=True)
    business_email = models.EmailField()
    gstin = models.CharField(max_length=15, blank=True, null=True)
    bank_account_verified = models.BooleanField(default=False)
    commission_rate = models.DecimalField(max_digits=5, decimal_places=2, default=3.00)
    created_at = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f"{self.store_name} ({self.user.username})"


# --- 3. Dynamic Category & Tax Policy ---
class CategoryPolicy(models.Model):
    name = models.CharField(max_length=100, unique=True)
    hsn_code = models.CharField(max_length=20, default='851830')
    gst_rate = models.DecimalField(max_digits=5, decimal_places=2, default=18.00)
    platform_fee_percent = models.DecimalField(max_digits=5, decimal_places=2, default=3.00)
    settlement_days = models.IntegerField(default=7)

    def __str__(self):
        return f"{self.name} (GST: {self.gst_rate}%, Platform: {self.platform_fee_percent}%)"


class Category(models.Model):
    name = models.CharField(max_length=200)

    def __str__(self):
        return self.name


# --- 4. Dynamic Shipping Rate Card ---
class ShippingRateCard(models.Model):
    max_weight_grams = models.IntegerField(default=500, unique=True)
    forward_charge = models.DecimalField(max_digits=7, decimal_places=2, default=50.00)
    rto_charge = models.DecimalField(max_digits=7, decimal_places=2, default=40.00)

    def __str__(self):
        return f"Up to {self.max_weight_grams}g - Forward: ₹{self.forward_charge}, RTO: ₹{self.rto_charge}"


# --- 5. Transparent Product Model ---
class Product(models.Model):
    GST_CHOICES = [
        (Decimal('0.00'), '0% (Exempt)'),
        (Decimal('5.00'), '5% (Essential/Apparel)'),
        (Decimal('12.00'), '12% (Processed Goods)'),
        (Decimal('18.00'), '18% (Standard/Electronics)'),
        (Decimal('28.00'), '28% (Luxury Goods)'),
    ]

    vendor = models.ForeignKey(VendorProfile, on_delete=models.SET_NULL, null=True, blank=True, related_name='products')
    seller = models.ForeignKey(User, on_delete=models.CASCADE, related_name='seller_products', null=True, blank=True)
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True, related_name='products')
    category_policy = models.ForeignKey(CategoryPolicy, on_delete=models.SET_NULL, null=True, blank=True)

    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    price = models.DecimalField(max_digits=12, decimal_places=2)
    original_price = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)

    hsn_code = models.CharField(max_length=20, default='851830')
    gst_rate = models.DecimalField(max_digits=5, decimal_places=2, choices=GST_CHOICES, default=Decimal('18.00'))
    weight_grams = models.IntegerField(default=300)
    image = models.ImageField(upload_to='products/', null=True, blank=True)
    stock = models.IntegerField(default=10)
    created_at = models.DateTimeField(default=timezone.now)

    def calculate_transparency_ledger(self):
        gross = Decimal(str(self.price))
        rate = self.category_policy.gst_rate if self.category_policy else self.gst_rate
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


# --- 6. Cart & Items ---
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


# --- 7. Order Model ---
class Order(models.Model):
    PAYMENT_CHOICES = [
        ('COD', 'Cash on Delivery'),
        ('UPI', 'UPI / QR Code'),
        ('NET_BANKING', 'Internet Banking'),
        ('CREDIT_CARD', 'Credit Card'),
        ('DEBIT_CARD', 'Debit Card'),
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
    base_price = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    tax_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    delivery_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    total_price = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    payment_method = models.CharField(max_length=30, choices=PAYMENT_CHOICES, default='COD')
    shipping_address = models.TextField(default='')
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default='Confirmed')

    courier_partner = models.CharField(max_length=100, default='Delhivery Express')
    courier_contact = models.CharField(max_length=20, default='1800-102-1234')
    awb_number = models.CharField(max_length=100, blank=True, null=True)
    delivery_otp = models.CharField(max_length=6, blank=True, null=True)
    return_otp = models.CharField(max_length=6, blank=True, null=True)

    created_at = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f"Order #{self.id} - {self.user.username} ({self.status})"


# --- 8. Order Item (Transparency Ledger Engine) ---
class OrderItem(models.Model):
    order = models.ForeignKey(Order, related_name='items', on_delete=models.CASCADE)
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    vendor = models.ForeignKey(VendorProfile, related_name='order_items', on_delete=models.SET_NULL, null=True, blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    quantity = models.PositiveIntegerField(default=1)

    hsn_code = models.CharField(max_length=20, blank=True, null=True)
    product_gst_rate = models.DecimalField(max_digits=5, decimal_places=2, default=18.00)
    taxable_product_value = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    product_gst_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)

    commission_rate = models.DecimalField(max_digits=5, decimal_places=2, default=3.00)
    platform_commission = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    payment_gateway_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    shipping_and_return_fee = models.DecimalField(max_digits=10, decimal_places=2, default=50.00)

    gst_on_platform_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    total_deductions = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    vendor_payout = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)

    def save(self, *args, **kwargs):
        if not self.vendor and self.product.vendor:
            self.vendor = self.product.vendor
            self.commission_rate = self.product.vendor.commission_rate

        self.hsn_code = self.product.hsn_code
        self.product_gst_rate = self.product.gst_rate

        total_gross = self.price * self.quantity

        divisor = Decimal('1') + (self.product_gst_rate / Decimal('100'))
        self.taxable_product_value = (total_gross / divisor).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        self.product_gst_amount = total_gross - self.taxable_product_value

        self.platform_commission = ((total_gross * self.commission_rate) / Decimal('100')).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        self.payment_gateway_fee = ((total_gross * Decimal('2.00')) / Decimal('100')).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

        self.shipping_and_return_fee = (Decimal('50.00') * self.quantity).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

        services_subtotal = self.platform_commission + self.payment_gateway_fee + self.shipping_and_return_fee
        self.gst_on_platform_fee = ((services_subtotal * Decimal('18.00')) / Decimal('100')).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

        self.total_deductions = services_subtotal + self.gst_on_platform_fee
        self.vendor_payout = max(total_gross - self.total_deductions, Decimal('0.00'))

        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.quantity} x {self.product.title} (Payout: ₹{self.vendor_payout})"


# --- 9. Reviews ---
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