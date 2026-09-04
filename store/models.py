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
    commission_rate = models.DecimalField(max_digits=5, decimal_places=2, default=5.00) # Base Platform Fee %
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.store_name} ({self.user.username})"


# --- 3. Category Model ---
class Category(models.Model):
    name = models.CharField(max_length=200)

    def __str__(self):
        return self.name


# --- 4. Product Model (HSN Code & GST Rate Added) ---
class Product(models.Model):
    GST_CHOICES = [
        (0.00, '0% (Exempt / Food grains)'),
        (5.00, '5% (Essential / Apparel < ₹1000)'),
        (12.00, '12% (Processed items / Apparel > ₹1000)'),
        (18.00, '18% (Standard / Electronics / IT)'),
        (28.00, '28% (Luxury / Automobiles)'),
    ]

    vendor = models.ForeignKey(
        VendorProfile, 
        on_delete=models.CASCADE, 
        related_name='products',
        null=True, 
        blank=True
    )
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2) # Selling Price (Inclusive of Product GST)
    original_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    
    # HSN & GST Fields
    hsn_code = models.CharField(max_length=10, default='851830', help_text="HSN / SAC Code (e.g., 851830 for Headphones)")
    gst_rate = models.DecimalField(max_digits=5, decimal_places=2, choices=GST_CHOICES, default=18.00, help_text="Product GST Rate %")

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
        ('UPI', 'UPI / Online Payment'),
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
    payment_method = models.CharField(max_length=20, choices=PAYMENT_CHOICES, default='COD')
    shipping_address = models.TextField(default='')
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default='Confirmed')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Order #{self.id} - {self.user.username} ({self.status})"


# --- 8. Order Item Model (Full Marketplace Breakdown & Taxes) ---
class OrderItem(models.Model):
    order = models.ForeignKey(Order, related_name='items', on_delete=models.CASCADE)
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    vendor = models.ForeignKey(VendorProfile, related_name='order_items', on_delete=models.SET_NULL, null=True, blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2) # Selling Price
    quantity = models.PositiveIntegerField(default=1)

    # A. Product GST Details (From HSN Slab)
    hsn_code = models.CharField(max_length=10, blank=True, null=True)
    product_gst_rate = models.DecimalField(max_digits=5, decimal_places=2, default=18.00)
    taxable_product_value = models.DecimalField(max_digits=10, decimal_places=2, default=0.00) # Base Price without GST
    product_gst_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)   # Product Tax collected

    # B. Platform Charges (Amazon/Flipkart Model)
    commission_rate = models.DecimalField(max_digits=5, decimal_places=2, default=5.00)
    platform_commission = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    payment_gateway_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0.00) # 2%
    shipping_and_return_fee = models.DecimalField(max_digits=10, decimal_places=2, default=60.00) # ₹60 Courier/Return Reserve

    # C. Platform Service GST (18% on Fees)
    gst_on_platform_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    total_deductions = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)

    # D. Net Vendor Payout (Bank Credit)
    vendor_payout = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)

    def save(self, *args, **kwargs):
        if not self.vendor and self.product.vendor:
            self.vendor = self.product.vendor
            self.commission_rate = self.product.vendor.commission_rate

        self.hsn_code = self.product.hsn_code
        self.product_gst_rate = self.product.gst_rate

        total_gross = self.price * self.quantity

        # 1. Product GST (Reverse Calculation)
        self.taxable_product_value = total_gross / (1 + (self.product_gst_rate / 100))
        self.product_gst_amount = total_gross - self.taxable_product_value

        # 2. Platform Deductions
        self.platform_commission = (total_gross * self.commission_rate) / 100
        self.payment_gateway_fee = (total_gross * 2) / 100
        self.shipping_and_return_fee = 60.00 * self.quantity

        # 3. 18% GST on Platform Services
        services_subtotal = self.platform_commission + self.payment_gateway_fee + self.shipping_and_return_fee
        self.gst_on_platform_fee = (services_subtotal * 18) / 100

        # 4. Total Market Deductions & Final Payout
        self.total_deductions = services_subtotal + self.gst_on_platform_fee
        self.vendor_payout = max(total_gross - self.total_deductions, 0)

        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.quantity} x {self.product.title} (HSN: {self.hsn_code} | Payout: ₹{self.vendor_payout})"


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