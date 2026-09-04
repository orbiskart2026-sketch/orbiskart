from django.db import models
from django.contrib.auth.models import User
import uuid

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
    commission_rate = models.DecimalField(max_digits=5, decimal_places=2, default=5.00)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.store_name} ({self.user.username})"


# --- 3. Category Model ---
class Category(models.Model):
    name = models.CharField(max_length=200)

    def __str__(self):
        return self.name


# --- 4. Product Model (HSN + GST Slabs) ---
class Product(models.Model):
    GST_CHOICES = [
        (0.00, '0% (Exempt)'),
        (5.00, '5% (Essential/Apparel)'),
        (12.00, '12% (Processed Goods)'),
        (18.00, '18% (Standard/Electronics)'),
        (28.00, '28% (Luxury Goods)'),
    ]

    vendor = models.ForeignKey(VendorProfile, on_delete=models.CASCADE, related_name='products', null=True, blank=True)
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    original_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    
    hsn_code = models.CharField(max_length=10, default='851830')
    gst_rate = models.DecimalField(max_digits=5, decimal_places=2, choices=GST_CHOICES, default=18.00)

    image = models.ImageField(upload_to='products/', null=True, blank=True)
    stock = models.IntegerField(default=10)

    def __str__(self):
        return f"{self.title} (HSN: {self.hsn_code} | {self.gst_rate}%)"


# --- 5. Cart Model ---
class Cart(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Cart of {self.user.username}"


# --- 6. Cart Item Model ---
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
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Order #{self.id} - {self.user.username} ({self.get_payment_method_display()})"

# --- 8. Order Item Model (HSN, Courier, PG & GST Ledger) ---
class OrderItem(models.Model):
    order = models.ForeignKey(Order, related_name='items', on_delete=models.CASCADE)
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    vendor = models.ForeignKey(VendorProfile, related_name='order_items', on_delete=models.SET_NULL, null=True, blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    quantity = models.PositiveIntegerField(default=1)

    # Tax & Marketplace Fees
    hsn_code = models.CharField(max_length=10, blank=True, null=True)
    product_gst_rate = models.DecimalField(max_digits=5, decimal_places=2, default=18.00)
    taxable_product_value = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    product_gst_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)

    commission_rate = models.DecimalField(max_digits=5, decimal_places=2, default=5.00)
    platform_commission = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    payment_gateway_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    shipping_and_return_fee = models.DecimalField(max_digits=10, decimal_places=2, default=60.00)

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

        # Product GST
        self.taxable_product_value = total_gross / (1 + (self.product_gst_rate / 100))
        self.product_gst_amount = total_gross - self.taxable_product_value

        # Fees
        self.platform_commission = (total_gross * self.commission_rate) / 100
        self.payment_gateway_fee = (total_gross * 2) / 100
        self.shipping_and_return_fee = 60.00 * self.quantity

        # 18% GST on services
        services_subtotal = self.platform_commission + self.payment_gateway_fee + self.shipping_and_return_fee
        self.gst_on_platform_fee = (services_subtotal * 18) / 100

        self.total_deductions = services_subtotal + self.gst_on_platform_fee
        self.vendor_payout = max(total_gross - self.total_deductions, 0)

        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.quantity} x {self.product.title} (Payout: ₹{self.vendor_payout})"


# --- 9. Review Model ---
class Review(models.Model):
    product = models.ForeignKey(Product, related_name='reviews', on_delete=models.CASCADE)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    rating = models.IntegerField(default=5)
    comment = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.username} - {self.product.title} ({self.rating}★)"
