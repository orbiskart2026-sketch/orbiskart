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


# --- 2. Vendor / Seller Profile (Isolated Ledger & Store) ---
class VendorProfile(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='vendor_profile')
    store_name = models.CharField(max_length=255, unique=True)
    business_email = models.EmailField()
    gstin = models.CharField(max_length=15, blank=True, null=True)
    bank_account_verified = models.BooleanField(default=False)
    commission_rate = models.DecimalField(max_digits=5, decimal_places=2, default=5.00) # Transparent fee %
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.store_name} ({self.user.username})"


# --- 3. Category Model ---
class Category(models.Model):
    name = models.CharField(max_length=200)

    def __str__(self):
        return self.name


# --- 4. Product Model (With Vendor Isolation) ---
class Product(models.Model):
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
    price = models.DecimalField(max_digits=10, decimal_places=2)
    original_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    image = models.ImageField(upload_to='products/', null=True, blank=True)
    stock = models.IntegerField(default=10)

    def __str__(self):
        return self.title


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


# --- 7. Order Model (With Live Tracking Statuses) ---
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


# --- 8. Order Item Model ---
class OrderItem(models.Model):
    order = models.ForeignKey(Order, related_name='items', on_delete=models.CASCADE)
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    quantity = models.PositiveIntegerField(default=1)

    def __str__(self):
        return f"{self.quantity} x {self.product.title}"


# --- 9. Product Review & Rating Model ---
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