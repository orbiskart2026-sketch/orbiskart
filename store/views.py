import io

import os

import random

import secrets

import uuid

from decimal import Decimal, ROUND_HALF_UP



import requests

import razorpay



from django.conf import settings

from django.contrib.auth import logout

from django.contrib.auth.models import User

from django.core.cache import cache

from django.core.mail import send_mail

from django.db import models, transaction

from django.http import HttpResponse

from django.utils import timezone



from rest_framework import permissions, status

from rest_framework.parsers import FormParser, JSONParser, MultiPartParser

from rest_framework.response import Response

from rest_framework.views import APIView



from reportlab.lib import colors

from reportlab.lib.pagesizes import A4

from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet

from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle



from .models import (

    Category,

    CategoryPolicy,

    ShippingRateCard,

    Product,

    ProductImage,

    Cart,

    CartItem,

    Order,

    OrderItem,

    Review,

    VendorProfile,

    SellerDeductionSlip,

    ImmutableMasterTransaction,

    OrderShippingReconciliation,

)

from .serializers import (

    CategorySerializer,

    CategoryPolicySerializer,

    ProductSerializer,

    CartSerializer,

    OrderSerializer,

    ReviewSerializer,

)





# ---------------------------------------------------------------------

# Helpers

# ---------------------------------------------------------------------



def money(value):

    return Decimal(str(value or 0)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)





def normalize_mobile(value):

    mobile = re_digits(value)

    if len(mobile) == 10:

        mobile = "91" + mobile

    return mobile





def re_digits(value):

    return "".join(ch for ch in str(value or "") if ch.isdigit())





def seller_profile_for(user):

    if not user or not user.is_authenticated:

        return None

    return VendorProfile.objects.filter(user=user).first()





def get_best_courier_charge(buyer_pincode, total_weight_grams, payment_mode="PREPAID"):

    weight = max(500, int(total_weight_grams or 500))

    extra_slabs = max(0, (weight - 500 + 499) // 500)



    prefix = str(buyer_pincode or "")[:2]

    if prefix in ("82", "83"):

        target_zone = "Zone B"

    elif prefix in ("11", "40", "56"):

        target_zone = "Zone C"

    elif prefix in ("18", "19", "79"):

        target_zone = "Zone E"

    else:

        target_zone = "Zone D"



    rates = ShippingRateCard.objects.filter(zone=target_zone, is_active=True)

    options = []

    for rate in rates:

        base_rate = getattr(rate, "forward_charge", Decimal("50.00"))

        add_rate = getattr(rate, "per_additional_500g", Decimal("20.00"))

        cost = money(base_rate) + Decimal(extra_slabs) * money(add_rate)

        if str(payment_mode).upper() == "COD":

            cost += money(getattr(rate, "cod_charge", 0))

        options.append((money(cost), rate.courier_partner))



    if options:

        cost, courier = min(options, key=lambda item: item[0])

        return cost, courier, target_zone, weight



    fallback = money(Decimal("50.00") + Decimal(extra_slabs) * Decimal("20.00"))

    return fallback, "Auto-Aggregator", target_zone, weight





# ---------------------------------------------------------------------

# 1. Customer Registration

# ---------------------------------------------------------------------



class RegisterAPIView(APIView):

    permission_classes = [permissions.AllowAny]



    def post(self, request):

        username = str(request.data.get("username", "")).strip()

        email = str(request.data.get("email", "")).strip()

        password = str(request.data.get("password", ""))



        if not username or not password:

            return Response(

                {"error": "Username and Password are required"},

                status=status.HTTP_400_BAD_REQUEST,

            )

        if User.objects.filter(username=username).exists():

            return Response(

                {"error": "Username already exists"},

                status=status.HTTP_400_BAD_REQUEST,

            )



        user = User.objects.create_user(username=username, email=email, password=password)

        Cart.objects.get_or_create(user=user)

        return Response({"message": "User registered successfully"}, status=status.HTTP_201_CREATED)





# ---------------------------------------------------------------------

# 2. Products

# ---------------------------------------------------------------------



class ProductListView(APIView):

    parser_classes = [MultiPartParser, FormParser, JSONParser]



    def get_permissions(self):

        if self.request.method == "GET":

            return [permissions.AllowAny()]

        return [permissions.IsAuthenticated()]



    def get(self, request):

        default_categories = [

            "Electronics & Speakers", "Mobile & Accessories", "Fashion & Clothing",

            "Footwear & Shoes", "Home & Kitchen Appliances", "Grocery & Daily Needs",

            "Beauty & Personal Care", "Sports, Fitness & Toys", "Books, Stationery & Office",

            "Automotive & Tools", "Health & Wellness", "Furniture & Decor",

            "Jewellery & Watches", "Baby & Kids Care", "Computers & Laptops",

            "Gaming & VR", "Pet Supplies", "Industrial & Scientific",

            "Garden & Outdoor", "Gifting & Festive Items",

        ]

        for name in default_categories:

            Category.objects.get_or_create(name=name)



        queryset = (

            Product.objects

            .select_related("category", "category_policy", "vendor")

            .prefetch_related("additional_images")

            .filter(is_active=True)

        )



        search_query = request.query_params.get("search", "").strip()

        if search_query:

            queryset = queryset.filter(

                models.Q(title__icontains=search_query)

                | models.Q(description__icontains=search_query)

            )



        category_id = request.query_params.get("category", "").strip()

        if category_id and category_id.lower() != "all":

            queryset = queryset.filter(category_id=category_id)



        sort_by = request.query_params.get("sort", "").strip()

        if sort_by == "price_low":

            queryset = queryset.order_by("price")

        elif sort_by == "price_high":

            queryset = queryset.order_by("-price")

        else:

            queryset = queryset.order_by("-id")



        serializer = ProductSerializer(queryset, many=True, context={"request": request})

        categories = Category.objects.all().values("id", "name")

        return Response({"products": serializer.data, "categories": list(categories)})



    def post(self, request):

        profile = seller_profile_for(request.user)

        if not profile:

            return Response({"error": "Seller profile not found."}, status=status.HTTP_403_FORBIDDEN)

        if not profile.is_approved or not profile.is_verified_seller:

            return Response(

                {"error": "Seller account is pending admin approval."},

                status=status.HTTP_403_FORBIDDEN,

            )



        data = request.data

        title = str(data.get("title", "")).strip()

        price = data.get("price")

        if not title or price in (None, ""):

            return Response(

                {"error": "उत्पाद का नाम और मूल्य दर्ज करना अनिवार्य है।"},

                status=status.HTTP_400_BAD_REQUEST,

            )



        category = None

        category_id = data.get("category")

        if category_id:

            category = Category.objects.filter(id=category_id).first()



        policy = CategoryPolicy.objects.filter(category=category).first() if category else None

        if not policy:

            policy = CategoryPolicy.objects.first()



        with transaction.atomic():

            product = Product.objects.create(

                seller=request.user,

                vendor=profile,

                category=category,

                category_policy=policy,

                title=title,

                description=data.get("description", ""),

                price=money(price),

                original_price=money(data.get("original_price") or price),

                weight_grams=max(1, int(data.get("weight_grams") or 300)),

                package_length_cm=money(data.get("package_length_cm") or 10),

                package_width_cm=money(data.get("package_width_cm") or 10),

                package_height_cm=money(data.get("package_height_cm") or 5),

                package_photo=request.FILES.get("package_photo"),

                image=request.FILES.get("image"),

                video=request.FILES.get("video"),

                hsn_code=str(data.get("hsn_code") or "851830"),

                gst_rate=money(data.get("gst_rate") or 18),

                is_weight_frozen=True,

                is_active=True,

            )



            gallery = request.FILES.getlist("gallery_images") or request.FILES.getlist("extra_images")

            ProductImage.objects.bulk_create(

                [ProductImage(product=product, image=image) for image in gallery if image]

            )



        return Response(

            {

                "success": True,

                "message": f"उत्पाद #{product.id} सफलतापूर्वक लाइव हो गया!",

                "product_id": product.id,

                "title": product.title,

                "price": str(product.price),

                "is_active": product.is_active,

            },

            status=status.HTTP_201_CREATED,

        )





class ProductDetailView(APIView):

    permission_classes = [permissions.AllowAny]



    def get(self, request, pk):

        product = (

            Product.objects

            .select_related("category", "category_policy", "vendor")

            .prefetch_related("reviews__user", "additional_images")

            .filter(pk=pk, is_active=True)

            .first()

        )

        if not product:

            return Response({"error": "Product not found"}, status=status.HTTP_404_NOT_FOUND)

        return Response(ProductSerializer(product, context={"request": request}).data)





# ---------------------------------------------------------------------

# 3. Cart

# ---------------------------------------------------------------------



class CartView(APIView):

    permission_classes = [permissions.IsAuthenticated]



    def get(self, request):

        cart, _ = Cart.objects.get_or_create(user=request.user)

        return Response(CartSerializer(cart, context={"request": request}).data)





class AddToCartView(APIView):

    permission_classes = [permissions.IsAuthenticated]



    def post(self, request):

        try:

            quantity = int(request.data.get("quantity", 1))

        except (TypeError, ValueError):

            quantity = 1

        quantity = max(1, quantity)



        product = Product.objects.filter(id=request.data.get("product_id"), is_active=True).first()

        if not product:

            return Response({"error": "Product not found"}, status=status.HTTP_404_NOT_FOUND)

        if product.stock < quantity:

            return Response({"error": "Insufficient stock"}, status=status.HTTP_400_BAD_REQUEST)



        cart, _ = Cart.objects.get_or_create(user=request.user)

        item, created = CartItem.objects.get_or_create(cart=cart, product=product)

        item.quantity = quantity if created else item.quantity + quantity

        if item.quantity > product.stock:

            return Response({"error": "Insufficient stock"}, status=status.HTTP_400_BAD_REQUEST)

        item.save()

        return Response({"message": "Product added to cart"})





class UpdateCartItemView(APIView):

    permission_classes = [permissions.IsAuthenticated]



    def post(self, request):

        item = CartItem.objects.filter(

            id=request.data.get("item_id"), cart__user=request.user

        ).select_related("product").first()

        if not item:

            return Response({"error": "Item not found"}, status=status.HTTP_404_NOT_FOUND)



        action = request.data.get("action")

        if action == "increase":

            if item.quantity >= item.product.stock:

                return Response({"error": "Insufficient stock"}, status=status.HTTP_400_BAD_REQUEST)

            item.quantity += 1

            item.save()

        elif action == "decrease":

            if item.quantity > 1:

                item.quantity -= 1

                item.save()

            else:

                item.delete()

        else:

            return Response({"error": "Invalid action"}, status=status.HTTP_400_BAD_REQUEST)

        return Response({"message": "Cart updated successfully"})





class RemoveFromCartView(APIView):

    permission_classes = [permissions.IsAuthenticated]



    def post(self, request):

        item = CartItem.objects.filter(

            id=request.data.get("item_id"), cart__user=request.user

        ).first()

        if not item:

            return Response({"error": "Item not found"}, status=status.HTTP_404_NOT_FOUND)

        item.delete()

        return Response({"message": "Item removed successfully"})





# ---------------------------------------------------------------------

# 4. Checkout / Orders

# ---------------------------------------------------------------------



class CreateOrderView(APIView):

    permission_classes = [permissions.IsAuthenticated]



    def post(self, request):

        shipping_address = str(request.data.get("shipping_address", "")).strip()

        shipping_pincode = re_digits(request.data.get("shipping_pincode", ""))

        payment_method = str(request.data.get("payment_method", "COD")).upper()



        if not shipping_address:

            return Response({"error": "कृपया डिलीवरी पता दर्ज करें।"}, status=400)

        if shipping_pincode and len(shipping_pincode) != 6:

            return Response({"error": "Shipping PIN code invalid."}, status=400)



        cart = Cart.objects.filter(user=request.user).first()

        if not cart or not cart.items.exists():

            return Response({"error": "कार्ट में कोई सामान नहीं है।"}, status=400)



        with transaction.atomic():

            items = list(

                cart.items.select_related("product", "product__vendor").select_for_update()

            )

            for item in items:

                if not item.product.is_active or item.product.stock < item.quantity:

                    return Response(

                        {"error": f"{item.product.title} के लिए पर्याप्त stock नहीं है।"},

                        status=400,

                    )



            subtotal = sum((item.product.price * item.quantity for item in items), Decimal("0"))

            original_subtotal = sum(

                ((item.product.original_price or item.product.price) * item.quantity for item in items),

                Decimal("0"),

            )

            total_weight = sum((item.product.weight_grams or 500) * item.quantity for item in items)

            courier_charge, courier, zone, billed_weight = get_best_courier_charge(

                shipping_pincode, total_weight, payment_method

            )



            # Existing application currently treats displayed product prices as GST-inclusive.

            base_price = money(subtotal / Decimal("1.18"))

            tax_amount = money(subtotal - base_price)

            discount_amount = money(max(Decimal("0"), original_subtotal - subtotal))

            total_price = money(subtotal + courier_charge)



            order = Order.objects.create(

                user=request.user,

                base_price=base_price,

                tax_amount=tax_amount,

                delivery_fee=courier_charge,

                discount_amount=discount_amount,

                total_price=total_price,

                payment_method=payment_method,

                shipping_address=shipping_address,

                shipping_pincode=shipping_pincode,

                status="Confirmed" if payment_method == "COD" else "Pending Payment",

                delivery_otp=f"{random.randint(100000, 999999)}",

                return_otp=f"{random.randint(100000, 999999)}",

                courier_partner=courier,

                awb_number=f"AWB-{uuid.uuid4().hex[:10].upper()}",

            )



            OrderShippingReconciliation.objects.create(

                order=order,

                courier_partner=courier,

                awb_number=order.awb_number,

                estimated_weight_g=billed_weight,

                estimated_charge=courier_charge,

                status="Estimated",

            )



            for item in items:

                OrderItem.objects.create(

                    order=order,

                    product=item.product,

                    vendor=item.product.vendor,

                    price=item.product.price,

                    quantity=item.quantity,

                )

                item.product.stock -= item.quantity

                item.product.save(update_fields=["stock"])



            cart.items.all().delete()



        return Response(

            {

                "message": "Order placed successfully",

                "order_id": order.id,

                "status": order.status,

                "courier_partner": courier,

                "shipping_zone": zone,

                "delivery_fee": str(courier_charge),

                "total_price": str(order.total_price),

            },

            status=status.HTTP_201_CREATED,

        )





class VerifyOrderOTPView(APIView):

    permission_classes = [permissions.IsAuthenticated]



    def post(self, request, order_id):

        order = Order.objects.filter(id=order_id).first()

        if not order:

            return Response({"error": "ऑर्डर नहीं मिला।"}, status=404)



        # Customer may verify own return; staff can perform operational delivery verification.

        if not request.user.is_staff and order.user_id != request.user.id:

            return Response({"error": "Permission denied."}, status=403)



        entered = str(request.data.get("otp", "")).strip()

        otp_type = str(request.data.get("type", "DELIVERY")).upper()

        if not entered:

            return Response({"error": "OTP दर्ज करना अनिवार्य है।"}, status=400)



        if otp_type == "DELIVERY":

            if not secrets.compare_digest(str(order.delivery_otp or ""), entered):

                return Response({"error": "गलत डिलीवरी OTP।"}, status=400)

            order.status = "Delivered"

            order.settlement_due_date = timezone.now() + timezone.timedelta(days=3)

            order.delivery_otp = None

            order.save(update_fields=["status", "settlement_due_date", "delivery_otp"])

            recon = OrderShippingReconciliation.objects.filter(order=order).first()

            if recon:

                recon.status = "Delivered"

                recon.save(update_fields=["status", "updated_at"])

            return Response({"success": True, "message": "Delivery verified successfully."})



        if otp_type == "RETURN":

            if not secrets.compare_digest(str(order.return_otp or ""), entered):

                return Response({"error": "गलत रिटर्न OTP।"}, status=400)

            order.status = "Returned & Refunded"

            order.return_otp = None

            order.save(update_fields=["status", "return_otp"])

            return Response({"success": True, "message": "Return verified successfully."})



        return Response({"error": "अमान्य सत्यापन अनुरोध"}, status=400)





class UserOrdersListView(APIView):

    permission_classes = [permissions.IsAuthenticated]



    def get(self, request):

        orders = Order.objects.filter(user=request.user).order_by("-created_at")

        return Response(OrderSerializer(orders, many=True, context={"request": request}).data)





# ---------------------------------------------------------------------

# 5. Invoice

# ---------------------------------------------------------------------



class DownloadInvoicePDFView(APIView):

    permission_classes = [permissions.IsAuthenticated]



    def get(self, request, order_id):

        order = Order.objects.filter(id=order_id).first()

        if not order:

            return Response({"error": "Order not found"}, status=404)

        if not request.user.is_staff and order.user_id != request.user.id:

            return Response({"error": "Permission denied"}, status=403)



        buffer = io.BytesIO()

        doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=30, leftMargin=30, topMargin=30, bottomMargin=30)

        styles = getSampleStyleSheet()

        normal = ParagraphStyle("NormalStyle", parent=styles["Normal"], fontSize=9, leading=12)

        bold = ParagraphStyle("BoldStyle", parent=normal, fontName="Helvetica-Bold")

        story = [

            Paragraph("<b>OrbisKart Tax Invoice</b>", styles["Title"]),

            Spacer(1, 10),

            Paragraph(f"<b>Order ID:</b> #{order.id}", normal),

            Paragraph(f"<b>Date:</b> {order.created_at.strftime('%d-%b-%Y')}", normal),

            Paragraph(f"<b>Customer:</b> {order.user.username}", normal),

            Paragraph(f"<b>Shipping Address:</b> {order.shipping_address}", normal),

            Spacer(1, 12),

        ]



        rows = [["#", "Description", "HSN", "Qty", "Price", "Total"]]

        for idx, item in enumerate(order.items.select_related("product").all(), 1):

            rows.append([

                str(idx),

                item.product.title,

                item.product.hsn_code,

                str(item.quantity),

                f"Rs. {item.price}",

                f"Rs. {money(item.price * item.quantity)}",

            ])

        table = Table(rows, colWidths=[25, 220, 60, 40, 80, 80])

        table.setStyle(TableStyle([

            ("BACKGROUND", (0, 0), (-1, 0), colors.lightgrey),

            ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),

            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),

        ]))

        story.extend([

            table,

            Spacer(1, 12),

            Paragraph(f"<b>Taxable Base:</b> Rs. {order.base_price}", normal),

            Paragraph(f"<b>GST:</b> Rs. {order.tax_amount}", normal),

            Paragraph(f"<b>Shipping:</b> Rs. {order.delivery_fee}", normal),

            Paragraph(f"<b>Grand Total:</b> Rs. {order.total_price}", bold),

        ])

        doc.build(story)

        buffer.seek(0)

        response = HttpResponse(buffer, content_type="application/pdf")

        response["Content-Disposition"] = f'attachment; filename="Invoice_Order_{order.id}.pdf"'

        return response





# ---------------------------------------------------------------------

# 6. Reviews

# ---------------------------------------------------------------------



class AddProductReviewView(APIView):

    permission_classes = [permissions.IsAuthenticated]



    def post(self, request, pk):

        product = Product.objects.filter(pk=pk).first()

        if not product:

            return Response({"error": "Product not found"}, status=404)



        try:

            rating = int(request.data.get("rating", 5))

        except (TypeError, ValueError):

            return Response({"error": "Invalid rating"}, status=400)



        comment = str(request.data.get("comment", "")).strip()

        if not comment:

            return Response({"error": "कृपया अपनी समीक्षा लिखें।"}, status=400)

        if rating < 1 or rating > 5:

            return Response({"error": "रेटिंग 1 से 5 स्टार के बीच होनी चाहिए।"}, status=400)



        review = Review.objects.create(

            product=product, user=request.user, rating=rating, comment=comment

        )

        return Response(

            ReviewSerializer(review, context={"request": request}).data,

            status=status.HTTP_201_CREATED,

        )





# ---------------------------------------------------------------------

# 7. Seller Dashboard - seller data isolation enforced

# ---------------------------------------------------------------------



class SellerDashboardSummaryView(APIView):

    permission_classes = [permissions.IsAuthenticated]



    def get(self, request):

        profile = seller_profile_for(request.user)

        if not profile:

            return Response({"error": "Seller profile not found."}, status=404)



        seller_orders = Order.objects.filter(items__vendor=profile).distinct()

        account = profile.bank_account_number or ""

        masked = f"XXXXXX{account[-4:]}" if len(account) >= 4 else "N/A"



        slips = SellerDeductionSlip.objects.filter(vendor=profile).select_related("order").order_by("-created_at")[:10]

        slip_data = [

            {

                "slip_number": slip.slip_number,

                "order_id": slip.order_id,

                "net_settled": str(slip.final_settlement_amount),

                "created_at": slip.created_at.isoformat(),

            }

            for slip in slips

        ]



        return Response({

            "store_name": profile.store_name or profile.shop_name,

            "is_approved": profile.is_approved,

            "is_verified_seller": profile.is_verified_seller,

            "penny_drop_verified": profile.penny_drop_verified,

            "is_orbiskart_mall": profile.is_orbiskart_mall,

            "wallet_balance": str(profile.wallet_balance),

            "quality_score": str(profile.quality_score),

            "orders_summary": {

                "total": seller_orders.count(),

                "delivered": seller_orders.filter(status="Delivered").count(),

                "returns": seller_orders.filter(status__icontains="Return").count(),

            },

            "banking": {

                "bank_name": profile.bank_name or "",

                "account_masked": masked,

                "ifsc": profile.bank_ifsc_code or profile.ifsc_code or "",

                "is_verified": bool(profile.bank_account_verified or profile.penny_drop_verified),

            },

            "deduction_slips": slip_data,

        })





# ---------------------------------------------------------------------

# 8. Razorpay

# ---------------------------------------------------------------------



class CreateRazorpayOrderView(APIView):

    permission_classes = [permissions.IsAuthenticated]



    def post(self, request):

        order_id = request.data.get("order_id")

        order = Order.objects.filter(id=order_id, user=request.user).first()

        if not order:

            return Response({"error": "Valid order_id is required."}, status=400)

        if order.status != "Pending Payment":

            return Response({"error": "Order is not awaiting payment."}, status=400)



        client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))

        payment_data = {

            "amount": int(money(order.total_price) * 100),

            "currency": "INR",

            "receipt": f"orbiskart_order_{order.id}",

        }

        rp_order = client.order.create(data=payment_data)

        cache.set(

            f"razorpay_order:{rp_order['id']}",

            {"user_id": request.user.id, "order_id": order.id, "amount": payment_data["amount"]},

            timeout=1800,

        )

        return Response({

            "razorpay_order_id": rp_order["id"],

            "amount": rp_order["amount"],

            "currency": rp_order["currency"],

            "key_id": settings.RAZORPAY_KEY_ID,

        })





class VerifyRazorpayPaymentView(APIView):

    permission_classes = [permissions.IsAuthenticated]



    def post(self, request):

        rp_order_id = request.data.get("razorpay_order_id")

        payment_id = request.data.get("razorpay_payment_id")

        signature = request.data.get("razorpay_signature")

        cached = cache.get(f"razorpay_order:{rp_order_id}")



        if not cached or cached.get("user_id") != request.user.id:

            return Response({"error": "Payment session invalid or expired."}, status=400)



        order = Order.objects.filter(id=cached["order_id"], user=request.user).first()

        if not order:

            return Response({"error": "Order not found."}, status=404)



        client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))

        try:

            client.utility.verify_payment_signature({

                "razorpay_order_id": rp_order_id,

                "razorpay_payment_id": payment_id,

                "razorpay_signature": signature,

            })

        except razorpay.errors.SignatureVerificationError:

            return Response({"error": "भुगतान सत्यापन विफल: अमान्य सिग्नेचर।"}, status=400)



        with transaction.atomic():

            order = Order.objects.select_for_update().get(id=order.id)

            if order.status != "Confirmed":

                order.status = "Confirmed"

                order.payment_method = "Razorpay-Prepaid"

                order.save(update_fields=["status", "payment_method"])



                # Current SellerDeductionSlip model stores the final amount only.

                for item in order.items.select_related("vendor", "product", "product__category_policy"):

                    if not item.vendor:

                        continue

                    gross = money(item.price * item.quantity)

                    pg_charge = money(gross * Decimal("0.02"))

                    commission = item.vendor.commission_rate

                    if item.product.category_policy:

                        commission = item.product.category_policy.platform_fee_percent

                    platform_fee = money(gross * Decimal(commission) / Decimal("100"))

                    item_weight = (item.product.weight_grams or 500) * item.quantity

                    courier_charge, _, _, _ = get_best_courier_charge(

                        order.shipping_pincode, item_weight, "PREPAID"

                    )

                    net = max(Decimal("0"), gross - pg_charge - platform_fee - courier_charge)



                    SellerDeductionSlip.objects.get_or_create(

                        slip_number=f"SLIP-{order.id}-{item.id}",

                        defaults={

                            "vendor": item.vendor,

                            "order": order,

                            "final_settlement_amount": money(net),

                        },

                    )

                    item.vendor_payout = money(net)

                    item.save(update_fields=["vendor_payout"])



        cache.delete(f"razorpay_order:{rp_order_id}")

        return Response({"success": True, "message": "भुगतान सफलतापूर्वक सत्यापित हुआ।"})





# ---------------------------------------------------------------------

# 9. Utility / Admin Ledger

# ---------------------------------------------------------------------



class UtilityBillEngineView(APIView):

    permission_classes = [permissions.IsAuthenticated]



    def post(self, request):

        service = str(request.data.get("service_type", "")).strip()

        amount = money(request.data.get("amount"))

        if not service or amount <= 0:

            return Response({"error": "अमान्य service या राशि"}, status=400)



        tx = ImmutableMasterTransaction.objects.create(

            tx_id=f"TXN-{uuid.uuid4().hex[:12].upper()}",

            user=request.user,

            service_type=service,

            gross_amount=amount,

            status="SUCCESS",

        )

        return Response({

            "success": True,

            "tx_id": tx.tx_id,

            "operator_ref": f"BBPS-{uuid.uuid4().hex[:10].upper()}",

            "message": f"{service} सफलतापूर्वक प्रोसेस हो गया!",

        })





class CentralEcoMasterLedgerView(APIView):

    permission_classes = [permissions.IsAdminUser]



    def get(self, request):

        orders = Order.objects.prefetch_related("items__product", "items__vendor").order_by("-created_at")

        records = []

        gross_volume = Decimal("0")

        seller_payable = Decimal("0")



        for order in orders:

            gross = money(order.total_price)

            gross_volume += gross

            payout = sum((item.vendor_payout for item in order.items.all()), Decimal("0"))

            seller_payable += payout

            records.append({

                "order_id": f"ORD-{order.id}",

                "date": order.created_at.isoformat(),

                "buyer": order.user.username,

                "gross_amount": str(gross),

                "delivery_fee": str(order.delivery_fee),

                "seller_payable": str(money(payout)),

                "status": order.status,

                "courier_partner": order.courier_partner,

                "awb_number": order.awb_number,

            })



        return Response({

            "kpi_summary": {

                "gross_sales": str(money(gross_volume)),

                "seller_payable_total": str(money(seller_payable)),

            },

            "audit_records": records,

        })





# ---------------------------------------------------------------------

# 10. Seller OTP + Registration

# ---------------------------------------------------------------------



class SendWhatsAppOTPView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        mobile = normalize_mobile(
            request.data.get("mobile_number") or request.data.get("contact_number")
        )

        if not mobile or len(mobile) != 12:
            return Response(
                {"error": "वैध 10 अंकों का मोबाइल नंबर दर्ज करें।"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        throttle_key = f"seller_wa_throttle:{mobile}"
        if cache.get(throttle_key):
            return Response(
                {"error": "OTP दोबारा भेजने से पहले 60 सेकंड प्रतीक्षा करें।"},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )

        otp = f"{secrets.randbelow(900000) + 100000}"
        otp_key = f"seller_wa_otp:{mobile}"
        cache.set(otp_key, otp, timeout=300)
        cache.set(throttle_key, True, timeout=60)

        whatsapp_token = os.getenv("WHATSAPP_ACCESS_TOKEN", "").strip()
        whatsapp_url = os.getenv("WHATSAPP_API_URL", "").strip()
        template_name = os.getenv("WHATSAPP_OTP_TEMPLATE_NAME", "").strip()
        template_language = os.getenv("WHATSAPP_OTP_TEMPLATE_LANGUAGE", "en_US").strip()

        if not whatsapp_token or not whatsapp_url or not template_name:
            cache.delete(otp_key)
            return Response(
                {
                    "error": (
                        "WhatsApp OTP configuration incomplete. "
                        "WHATSAPP_ACCESS_TOKEN, WHATSAPP_API_URL और "
                        "WHATSAPP_OTP_TEMPLATE_NAME जांचें।"
                    )
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        payload = {
            "messaging_product": "whatsapp",
            "to": mobile,
            "type": "template",
            "template": {
                "name": template_name,
                "language": {"code": template_language},
                "components": [
                    {
                        "type": "body",
                        "parameters": [{"type": "text", "text": otp}],
                    },
                    {
                        "type": "button",
                        "sub_type": "url",
                        "index": "0",
                        "parameters": [{"type": "text", "text": otp}],
                    },
                ],
            },
        }

        try:
            response = requests.post(
                whatsapp_url,
                json=payload,
                headers={
                    "Authorization": f"Bearer {whatsapp_token}",
                    "Content-Type": "application/json",
                },
                timeout=10,
            )
        except requests.RequestException:
            cache.delete(otp_key)
            return Response(
                {"error": "WhatsApp service से संपर्क नहीं हो सका।"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        if not response.ok:
            cache.delete(otp_key)
            return Response(
                {
                    "error": "WhatsApp OTP भेजने में विफलता।",
                    "provider_status": response.status_code,
                },
                status=status.HTTP_502_BAD_GATEWAY,
            )

        return Response(
            {"success": True, "message": "WhatsApp OTP भेज दिया गया है।"},
            status=status.HTTP_200_OK,
        )


class VerifyWhatsAppOTPView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        mobile = normalize_mobile(
            request.data.get("mobile_number") or request.data.get("contact_number")
        )
        entered_otp = str(request.data.get("otp", "")).strip()

        if not mobile or len(mobile) != 12 or not entered_otp:
            return Response(
                {"error": "वैध मोबाइल नंबर और OTP दोनों आवश्यक हैं।"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        fail_key = f"seller_wa_fail:{mobile}"
        failures = int(cache.get(fail_key, 0))
        if failures >= 5:
            return Response(
                {"error": "बहुत अधिक गलत OTP प्रयास। 15 मिनट बाद पुनः प्रयास करें।"},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )

        otp_key = f"seller_wa_otp:{mobile}"
        stored_otp = cache.get(otp_key)
        if not stored_otp:
            return Response(
                {"error": "WhatsApp OTP expired है। नया OTP भेजें।"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not secrets.compare_digest(str(stored_otp), entered_otp):
            cache.set(fail_key, failures + 1, timeout=900)
            return Response(
                {"error": "गलत WhatsApp OTP।"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        verification_token = secrets.token_urlsafe(32)
        cache.set(
            f"seller_wa_verified:{mobile}",
            verification_token,
            timeout=900,
        )
        cache.delete(otp_key)
        cache.delete(fail_key)

        return Response(
            {
                "success": True,
                "message": "WhatsApp नंबर सत्यापित हो गया।",
                "whatsapp_verification_token": verification_token,
            },
            status=status.HTTP_200_OK,
        )


class SendEmailOTPView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        mobile = normalize_mobile(request.data.get("mobile_number"))
        email = str(
            request.data.get("email") or request.data.get("business_email") or ""
        ).strip().lower()
        whatsapp_verification_token = str(
            request.data.get("whatsapp_verification_token", "")
        ).strip()

        if not mobile or len(mobile) != 12 or not email:
            return Response(
                {"error": "वैध मोबाइल नंबर और ईमेल आवश्यक हैं।"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        verified_token = cache.get(f"seller_wa_verified:{mobile}")
        if (
            not verified_token
            or not whatsapp_verification_token
            or not secrets.compare_digest(
                str(verified_token), whatsapp_verification_token
            )
        ):
            return Response(
                {"error": "पहले WhatsApp OTP verification पूरा करें।"},
                status=status.HTTP_403_FORBIDDEN,
            )

        throttle_key = f"seller_email_throttle:{mobile}:{email}"
        if cache.get(throttle_key):
            return Response(
                {"error": "Email OTP दोबारा भेजने से पहले 60 सेकंड प्रतीक्षा करें।"},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )

        otp = f"{secrets.randbelow(900000) + 100000}"
        otp_key = f"seller_email_otp:{mobile}:{email}"
        cache.set(otp_key, otp, timeout=300)
        cache.set(throttle_key, True, timeout=60)

        try:
            send_mail(
                subject="OrbisKart Seller Email Verification",
                message=(
                    f"Your OrbisKart seller verification OTP is {otp}. "
                    "This OTP is valid for 5 minutes. Do not share it with anyone."
                ),
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[email],
                fail_silently=False,
            )
        except Exception:
            cache.delete(otp_key)
            return Response(
                {"error": "Email OTP भेजने में विफलता।"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        return Response(
            {"success": True, "message": "Email OTP भेज दिया गया है।"},
            status=status.HTTP_200_OK,
        )


class VerifyEmailOTPView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        mobile = normalize_mobile(request.data.get("mobile_number"))
        email = str(
            request.data.get("email") or request.data.get("business_email") or ""
        ).strip().lower()
        entered_otp = str(request.data.get("otp", "")).strip()
        whatsapp_verification_token = str(
            request.data.get("whatsapp_verification_token", "")
        ).strip()

        if not mobile or len(mobile) != 12 or not email or not entered_otp:
            return Response(
                {"error": "मोबाइल नंबर, ईमेल और OTP आवश्यक हैं।"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        wa_token = cache.get(f"seller_wa_verified:{mobile}")
        if (
            not wa_token
            or not whatsapp_verification_token
            or not secrets.compare_digest(str(wa_token), whatsapp_verification_token)
        ):
            return Response(
                {"error": "WhatsApp verification session invalid या expired है।"},
                status=status.HTTP_403_FORBIDDEN,
            )

        fail_key = f"seller_email_fail:{mobile}:{email}"
        failures = int(cache.get(fail_key, 0))
        if failures >= 5:
            return Response(
                {"error": "बहुत अधिक गलत OTP प्रयास। 15 मिनट बाद पुनः प्रयास करें।"},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )

        otp_key = f"seller_email_otp:{mobile}:{email}"
        stored_otp = cache.get(otp_key)
        if not stored_otp:
            return Response(
                {"error": "Email OTP expired है। नया OTP भेजें।"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not secrets.compare_digest(str(stored_otp), entered_otp):
            cache.set(fail_key, failures + 1, timeout=900)
            return Response(
                {"error": "गलत Email OTP।"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        registration_token = secrets.token_urlsafe(48)
        cache.set(
            f"seller_registration_verified:{mobile}:{email}",
            registration_token,
            timeout=900,
        )
        cache.delete(otp_key)
        cache.delete(fail_key)

        return Response(
            {
                "success": True,
                "message": "Email सफलतापूर्वक सत्यापित हो गया।",
                "registration_verification_token": registration_token,
            },
            status=status.HTTP_200_OK,
        )


# Temporary compatibility aliases so existing core/urls.py does not break
# before the new four OTP routes are added there.
SendOtpView = SendWhatsAppOTPView
VerifyOtpView = VerifyWhatsAppOTPView



class RegisterSellerComplianceView(APIView):

    permission_classes = [permissions.AllowAny]

    parser_classes = [MultiPartParser, FormParser, JSONParser]



    def post(self, request):

        data = request.data

        username = str(data.get("username", "")).strip()

        password = str(data.get("password", ""))

        email = str(data.get("email", "")).strip().lower()

        mobile = normalize_mobile(data.get("mobile_number"))

        shop_name = str(data.get("shop_name") or data.get("store_name") or "").strip()

        registration_verification_token = str(
            data.get("registration_verification_token", "")
        ).strip()



        if not username or not password or not email or not mobile or not shop_name:

            return Response(

                {"error": "Username, password, email, mobile number और shop name अनिवार्य हैं।"},

                status=400,

            )

        if len(password) < 8:

            return Response({"error": "Password कम से कम 8 characters का होना चाहिए।"}, status=400)



        server_registration_token = cache.get(
            f"seller_registration_verified:{mobile}:{email}"
        )
        if (
            not server_registration_token
            or not registration_verification_token
            or not secrets.compare_digest(
                str(server_registration_token), registration_verification_token
            )
        ):
            return Response(
                {
                    "error": (
                        "सुरक्षा त्रुटि: WhatsApp और Email verification "
                        "पूरा करना अनिवार्य है।"
                    )
                },
                status=status.HTTP_403_FORBIDDEN,
            )



        if User.objects.filter(username=username).exists():

            return Response({"error": "यह username पहले से पंजीकृत है।"}, status=400)

        if VendorProfile.objects.filter(shop_name=shop_name).exists():

            return Response({"error": "यह shop name पहले से पंजीकृत है।"}, status=400)



        with transaction.atomic():

            user = User.objects.create_user(

                username=username,

                email=email,

                password=password,

                first_name=str(data.get("owner_name", "")).strip(),

            )



            # Signal may already have created the profile.

            vendor, _ = VendorProfile.objects.get_or_create(

                user=user,

                defaults={"shop_name": shop_name},

            )

            vendor.shop_name = shop_name

            vendor.store_name = shop_name

            vendor.owner_name = str(data.get("owner_name", "")).strip()

            vendor.mobile_number = mobile

            vendor.email = email

            vendor.business_email = email

            vendor.business_address = str(data.get("business_address", "")).strip()

            vendor.street_address = str(data.get("street_address", "")).strip()

            vendor.city_district = str(data.get("city_district", "")).strip()

            vendor.state = str(data.get("state", "Jharkhand")).strip()

            vendor.pin_code = re_digits(data.get("pincode") or data.get("pin_code"))



            gstin = str(data.get("gstin_number") or data.get("gstin") or "").strip().upper()

            msme = str(data.get("msme_udyam_number") or data.get("msme_number") or "").strip().upper()

            vendor.gstin_number = gstin or None

            vendor.gstin = gstin or None

            vendor.msme_udyam_number = msme or None

            vendor.msme_number = msme or None

            vendor.pan_number = str(data.get("pan_number", "")).strip().upper() or None



            vendor.bank_name = str(data.get("bank_name", "")).strip()

            vendor.bank_account_number = re_digits(data.get("bank_account_number"))

            ifsc = str(data.get("ifsc_code") or data.get("bank_ifsc_code") or "").strip().upper()

            vendor.ifsc_code = ifsc

            vendor.bank_ifsc_code = ifsc

            vendor.bank_holder_name = str(data.get("bank_holder_name", "")).strip() or None



            for field in ("shop_gps_photo", "pan_doc", "identity_proof", "business_document"):

                if field in request.FILES:

                    setattr(vendor, field, request.FILES[field])



            vendor.terms_accepted = str(data.get("terms_accepted", "")).lower() in ("true", "1", "yes")

            vendor.penny_drop_verified = False

            vendor.bank_account_verified = False

            vendor.is_approved = False

            vendor.is_verified_seller = False

            vendor.wallet_balance = Decimal("0.00")

            vendor.save()



            profile = getattr(user, "profile", None)

            if profile:

                profile.role = "VENDOR"

                profile.phone_number = mobile

                profile.is_verified = True

                profile.save(update_fields=["role", "phone_number", "is_verified"])



            cache.delete(f"seller_registration_verified:{mobile}:{email}")
            cache.delete(f"seller_wa_verified:{mobile}")



        return Response(

            {

                "success": True,

                "message": "Seller application received. Admin approval के बाद selling सक्रिय होगी।",

                "status": "PENDING",

                "username": user.username,

                "store_name": vendor.store_name,

            },

            status=status.HTTP_201_CREATED,

        )





# ---------------------------------------------------------------------

# 11. Bank lookup / verification

# NOTE: IFSC lookup is real; account-holder verification is NOT faked.

# ---------------------------------------------------------------------



class VerifyBankDetailsView(APIView):

    permission_classes = [permissions.IsAuthenticated]



    def post(self, request):

        profile = seller_profile_for(request.user)

        if not profile:

            return Response({"error": "Seller profile not found."}, status=403)



        account_number = re_digits(request.data.get("bank_account_number") or request.data.get("account_number"))

        ifsc = str(request.data.get("ifsc_code") or request.data.get("ifsc") or "").strip().upper()

        if not account_number or not ifsc:

            return Response({"error": "खाता संख्या और IFSC अनिवार्य हैं।"}, status=400)



        bank_name = ""

        try:

            response = requests.get(f"https://ifsc.razorpay.com/{ifsc}", timeout=8)

            if response.ok:

                bank_name = response.json().get("BANK", "")

        except requests.RequestException:

            pass



        # Do not claim penny-drop success without a real payout/account-validation provider.

        profile.bank_name = bank_name

        profile.bank_account_number = account_number

        profile.ifsc_code = ifsc

        profile.bank_ifsc_code = ifsc

        profile.bank_account_verified = False

        profile.penny_drop_verified = False

        profile.save(update_fields=[

            "bank_name", "bank_account_number", "ifsc_code", "bank_ifsc_code",

            "bank_account_verified", "penny_drop_verified"

        ])



        return Response({

            "status": "PENDING_VERIFICATION",

            "message": "IFSC lookup पूरा हुआ। वास्तविक penny-drop verification provider integration आवश्यक है।",

            "bank_name": bank_name,

            "is_verified": False,

        })





# ---------------------------------------------------------------------

# 12. Seller logout / KYC

# ---------------------------------------------------------------------



class SellerLogoutView(APIView):

    permission_classes = [permissions.IsAuthenticated]



    def post(self, request):

        logout(request)

        return Response({"message": "सफलतापूर्वक लॉगआउट हुए।"})





class VendorKYCUpdateView(APIView):

    permission_classes = [permissions.IsAuthenticated]

    parser_classes = [MultiPartParser, FormParser, JSONParser]



    def post(self, request):

        profile = seller_profile_for(request.user)

        if not profile:

            return Response({"error": "Seller profile not found."}, status=404)



        data = request.data

        editable = {

            "owner_name", "business_address", "street_address", "city_district",

            "state", "pin_code", "gstin_number", "gstin", "msme_udyam_number",

            "msme_number", "pan_number", "bank_name", "bank_holder_name",

            "bank_account_number", "ifsc_code", "bank_ifsc_code",

        }

        for field in editable:

            if field in data:

                setattr(profile, field, str(data.get(field, "")).strip())



        for field in ("shop_gps_photo", "pan_doc", "identity_proof", "business_document"):

            if field in request.FILES:

                setattr(profile, field, request.FILES[field])



        # Material KYC changes require fresh admin review.

        profile.is_approved = False

        profile.is_verified_seller = False

        profile.save()

        return Response({

            "success": True,

            "message": "KYC update saved. Re-approval pending.",

            "is_approved": False,

        })
    # ---------------------------------------------------------------------
# 13. META WHATSAPP WEBHOOK
# ---------------------------------------------------------------------

class MetaWhatsAppWebhookView(APIView):
    """
    Meta WhatsApp Cloud API Webhook.

    GET  -> Meta webhook verification
    POST -> WhatsApp webhook events/status updates
    """

    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def get(self, request):
        mode = request.query_params.get("hub.mode")
        verify_token = request.query_params.get("hub.verify_token")
        challenge = request.query_params.get("hub.challenge")

        expected_token = os.getenv(
            "WHATSAPP_WEBHOOK_VERIFY_TOKEN", ""
        ).strip()

        if (
            mode == "subscribe"
            and expected_token
            and verify_token
            and challenge
            and secrets.compare_digest(
                verify_token.strip(),
                expected_token
            )
        ):
            return HttpResponse(
                challenge,
                content_type="text/plain",
                status=200,
            )

        return HttpResponse(
            "Webhook verification failed",
            content_type="text/plain",
            status=403,
        )

    def post(self, request):
        """
        Receive WhatsApp Cloud API webhook events.
        """

        try:
            payload = request.data

            if payload.get("object") != "whatsapp_business_account":
                return Response(
                    {"status": "ignored"},
                    status=status.HTTP_200_OK,
                )

            return Response(
                {"status": "EVENT_RECEIVED"},
                status=status.HTTP_200_OK,
            )

        except Exception:
            return Response(
                {"status": "EVENT_RECEIVED"},
                status=status.HTTP_200_OK,
            )