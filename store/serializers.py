from rest_framework import serializers
from django.contrib.auth.models import User
from django.db.models import Avg
from .models import (
    Category, CategoryPolicy, ShippingRateCard, 
    Product, Cart, CartItem, Order, OrderItem, Review
)

# 1. कैटगरी एवं पॉलिसी
class CategoryPolicySerializer(serializers.ModelSerializer):
    class Meta:
        model = CategoryPolicy
        fields = '__all__'

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name']

# 2. रिव्यूज
class ReviewSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = Review
        fields = ['id', 'user', 'username', 'rating', 'comment', 'created_at']

# 3. उत्पाद (पारदर्शी लेजर और रेटिंग्स सहित)
class ProductSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    reviews = ReviewSerializer(many=True, read_only=True)
    average_rating = serializers.SerializerMethodField()
    total_reviews = serializers.SerializerMethodField()
    transparency_ledger = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Product
        fields = [
            'id', 'title', 'description', 'price', 'original_price', 
            'weight_grams', 'hsn_code', 'gst_rate', 'stock', 'image',
            'category', 'category_name', 'category_policy', 
            'transparency_ledger', 'reviews', 'average_rating', 'total_reviews',
            'created_at'
        ]

    def get_average_rating(self, obj):
        avg = obj.reviews.aggregate(Avg('rating'))['rating__avg']
        return round(avg, 1) if avg else 0.0

    def get_total_reviews(self, obj):
        return obj.reviews.count()

    def get_transparency_ledger(self, obj):
        return obj.calculate_transparency_ledger()

# 4. कार्ट प्रबंधन
class CartItemSerializer(serializers.ModelSerializer):
    product = ProductSerializer(read_only=True)

    class Meta:
        model = CartItem
        fields = ['id', 'product', 'quantity']

class CartSerializer(serializers.ModelSerializer):
    items = CartItemSerializer(many=True, read_only=True)

    class Meta:
        model = Cart
        fields = ['id', 'user', 'items', 'created_at']

# 5. ऑर्डर और वित्तीय लेजर (HSN, कूरियर व पेआउट्स)
class OrderItemSerializer(serializers.ModelSerializer):
    product = ProductSerializer(read_only=True)
    product_title = serializers.ReadOnlyField(source='product.title')

    class Meta:
        model = OrderItem
        fields = [
            'id', 'product', 'product_title', 'price', 'quantity',
            'hsn_code', 'product_gst_rate', 'taxable_product_value',
            'product_gst_amount', 'commission_rate', 'platform_commission',
            'payment_gateway_fee', 'shipping_and_return_fee',
            'gst_on_platform_fee', 'total_deductions', 'vendor_payout'
        ]

# 6. मुख्य ऑर्डर (सुरक्षित OTP और कूरियर AWB सहित)
class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = [
            'id', 'user', 'base_price', 'tax_amount', 'delivery_fee', 
            'discount_amount', 'total_price', 'payment_method', 
            'shipping_address', 'status', 'courier_partner', 
            'courier_contact', 'awb_number', 'delivery_otp', 
            'return_otp', 'created_at', 'items'
        ]
        # OTP केवल बैकएंड सत्यापन और अधिकृत लॉजिस्टिक्स के लिए सुरक्षित रहेगा
        extra_kwargs = {
            'delivery_otp': {'write_only': True},
            'return_otp': {'write_only': True}
        }