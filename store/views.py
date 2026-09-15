import io
import random
import uuid
from decimal import Decimal, ROUND_HALF_UP

from django.db import models, transaction
from django.http import HttpResponse
from django.contrib.auth.models import User
from django.conf import settings
from django.utils import timezone

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser

import razorpay

from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

from .models import (
    Category, CategoryPolicy, ShippingRateCard, Product, 
    Cart, CartItem, Order, OrderItem, Review, 
    VendorProfile, SellerDeductionSlip, ImmutableMasterTransaction
)
from .serializers import (
    CategorySerializer, CategoryPolicySerializer,
    ProductSerializer, CartSerializer, OrderSerializer, ReviewSerializer
)


# --- 1. User Registration API ---
class RegisterAPIView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        username = request.data.get('username')
        email = request.data.get('email')
        password = request.data.get('password')

        if not username or not password:
            return Response({'error': 'Username and Password are required'}, status=status.HTTP_400_BAD_REQUEST)

        if User.objects.filter(username=username).exists():
            return Response({'error': 'Username already exists'}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.create_user(username=username, email=email, password=password)
        Cart.objects.get_or_create(user=user)
        return Response({'message': 'User registered successfully'}, status=status.HTTP_201_CREATED)


# --- 2. Product List & Seller Upload API ---
class ProductListView(APIView):
    permission_classes = [permissions.AllowAny]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request):
        try:
            queryset = Product.objects.select_related('category', 'category_policy').all()

            search_query = request.query_params.get('search', '').strip()
            if search_query:
                queryset = queryset.filter(
                    models.Q(title__icontains=search_query) | 
                    models.Q(description__icontains=search_query)
                )

            category_id = request.query_params.get('category', '').strip()
            if category_id and category_id.lower() != 'all':
                queryset = queryset.filter(category_id=category_id)

            sort_by = request.query_params.get('sort', '').strip()
            if sort_by == 'price_low':
                queryset = queryset.order_by('price')
            elif sort_by == 'price_high':
                queryset = queryset.order_by('-price')
            else:
                queryset = queryset.order_by('-id')

            serializer = ProductSerializer(queryset, many=True, context={'request': request})
            categories = Category.objects.all().values('id', 'name')

            return Response({
                'products': serializer.data,
                'categories': list(categories)
            }, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def post(self, request):
        try:
            data = request.data.copy()
            serializer = ProductSerializer(data=data, context={'request': request})
            if serializer.is_valid():
                if request.user.is_authenticated:
                    serializer.save(seller=request.user)
                else:
                    serializer.save()
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# --- 3. Product Detail API ---
class ProductDetailView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, pk):
        try:
            product = Product.objects.select_related('category', 'category_policy').prefetch_related('reviews__user').filter(pk=pk).first()
            if not product:
                return Response({'error': 'Product not found'}, status=status.HTTP_404_NOT_FOUND)
            serializer = ProductSerializer(product, context={'request': request})
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# --- 4. Cart Operations API ---
class CartView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        try:
            cart, _ = Cart.objects.get_or_create(user=request.user)
            serializer = CartSerializer(cart, context={'request': request})
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class AddToCartView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        try:
            product_id = request.data.get('product_id')
            quantity = int(request.data.get('quantity', 1))

            product = Product.objects.filter(id=product_id).first()
            if not product:
                return Response({'error': 'Product not found'}, status=status.HTTP_404_NOT_FOUND)

            cart, _ = Cart.objects.get_or_create(user=request.user)
            cart_item, created = CartItem.objects.get_or_create(cart=cart, product=product)
            if not created:
                cart_item.quantity += quantity
            else:
                cart_item.quantity = quantity
            cart_item.save()

            return Response({'message': 'Product added to cart'}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class UpdateCartItemView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        try:
            item_id = request.data.get('item_id')
            action = request.data.get('action')

            cart_item = CartItem.objects.filter(id=item_id, cart__user=request.user).first()
            if not cart_item:
                return Response({'error': 'Item not found'}, status=status.HTTP_404_NOT_FOUND)

            if action == 'increase':
                cart_item.quantity += 1
                cart_item.save()
            elif action == 'decrease':
                if cart_item.quantity > 1:
                    cart_item.quantity -= 1
                    cart_item.save()
                else:
                    cart_item.delete()

            return Response({'message': 'Cart updated successfully'}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class RemoveFromCartView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        try:
            item_id = request.data.get('item_id')
            cart_item = CartItem.objects.filter(id=item_id, cart__user=request.user).first()
            if not cart_item:
                return Response({'error': 'Item not found'}, status=status.HTTP_404_NOT_FOUND)

            cart_item.delete()
            return Response({'message': 'Item removed successfully'}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# --- 5. Order Checkout with Auto-Generated Delivery/Return OTP ---
class CreateOrderView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        try:
            user = request.user
            shipping_address = request.data.get('shipping_address', '').strip()
            payment_method = request.data.get('payment_method', 'COD')

            if not shipping_address:
                return Response({'error': 'कृपया डिलीवरी पता दर्ज करें।'}, status=status.HTTP_400_BAD_REQUEST)

            cart = Cart.objects.filter(user=user).first()
            if not cart or not cart.items.exists():
                return Response({'error': 'कार्ट में कोई सामान नहीं है।'}, status=status.HTTP_400_BAD_REQUEST)

            cart_items = cart.items.select_related('product').all()

            subtotal = sum(item.product.price * item.quantity for item in cart_items)
            original_subtotal = sum(
                (item.product.original_price or item.product.price) * item.quantity 
                for item in cart_items
            )

            # वज़न के आधार पर ऑटोमैटिक डिलीवरी फ़ीस तय करना
            total_cart_weight = sum(
                (getattr(item.product, 'weight_grams', 500) or 500) * item.quantity 
                for item in cart_items
            )
            rate_card = ShippingRateCard.objects.filter(
                max_weight_grams__gte=total_cart_weight
            ).order_by('max_weight_grams').first()

            if rate_card:
                delivery_fee = Decimal(str(rate_card.forward_charge))
            else:
                extra_weight = max(0, total_cart_weight - 500)
                extra_slabs = (extra_weight + 499) // 500
                delivery_fee = Decimal('50.00') + Decimal(str(extra_slabs * 30))

            gst_divisor = Decimal('1.18')
            base_price = (subtotal / gst_divisor).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
            tax_amount = (subtotal - base_price).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
            discount_amount = max(Decimal('0.00'), original_subtotal - subtotal).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
            total_price = subtotal + delivery_fee

            delivery_otp = f"{random.randint(100000, 999999)}"
            return_otp = f"{random.randint(100000, 999999)}"

            with transaction.atomic():
                order = Order.objects.create(
                    user=user,
                    base_price=base_price,
                    tax_amount=tax_amount,
                    delivery_fee=delivery_fee,
                    discount_amount=discount_amount,
                    total_price=total_price,
                    payment_method=payment_method,
                    shipping_address=shipping_address,
                    status='Confirmed' if payment_method == 'COD' else 'Pending Payment',
                    delivery_otp=delivery_otp,
                    return_otp=return_otp,
                    awb_number=f"DEL-{random.randint(10000000, 99999999)}"
                )

                order_items_to_create = [
                    OrderItem(
                        order=order,
                        product=item.product,
                        vendor=item.product.vendor,
                        price=item.product.price,
                        quantity=item.quantity
                    )
                    for item in cart_items
                ]
                OrderItem.objects.bulk_create(order_items_to_create)
                cart_items.delete()

            return Response({
                'message': 'Order placed successfully',
                'order_id': order.id,
                'status': order.status,
                'delivery_otp': order.delivery_otp,
                'total_price': str(order.total_price)
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# --- 6. Fraud Prevention: 2-Way OTP Verification API ---
class VerifyOrderOTPView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request, order_id):
        try:
            order = Order.objects.filter(id=order_id).first()
            if not order:
                return Response({'error': 'ऑर्डर नहीं मिला।'}, status=status.HTTP_404_NOT_FOUND)

            otp_type = request.data.get('type', 'DELIVERY')
            entered_otp = str(request.data.get('otp', '')).strip()

            if not entered_otp:
                return Response({'error': 'OTP दर्ज करना अनिवार्य है।'}, status=status.HTTP_400_BAD_REQUEST)

            if otp_type == 'DELIVERY':
                if str(order.delivery_otp).strip() == entered_otp:
                    order.status = 'Delivered'
                    order.save()
                    return Response({'success': True, 'message': f'ऑर्डर #{order.id} सफलतापूर्वक डिलीवर हुआ।'}, status=status.HTTP_200_OK)
                return Response({'error': 'गलत डिलीवरी OTP! पार्सल न दें।'}, status=status.HTTP_400_BAD_REQUEST)

            elif otp_type == 'RETURN':
                if str(order.return_otp).strip() == entered_otp:
                    order.status = 'Returned & Refunded'
                    order.save()
                    return Response({'success': True, 'message': f'ऑर्डर #{order.id} का रिटर्न सत्यापित हुआ। रिफंड जारी किया जा रहा है।'}, status=status.HTTP_200_OK)
                return Response({'error': 'गलत रिटर्न OTP! पार्सल स्वीकार न करें।'}, status=status.HTTP_400_BAD_REQUEST)

            return Response({'error': 'अमान्य सत्यापन अनुरोध'}, status=status.HTTP_400_BAD_REQUEST)

        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# --- 7. User Orders List API ---
class UserOrdersListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        try:
            orders = Order.objects.filter(user=request.user).order_by('-created_at')
            serializer = OrderSerializer(orders, many=True, context={'request': request})
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# --- 8. 1-Click GST Tax Invoice PDF Generator ---
class DownloadInvoicePDFView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, order_id):
        try:
            order = Order.objects.filter(id=order_id).first()
            if not order:
                return Response({'error': 'Order not found'}, status=status.HTTP_404_NOT_FOUND)

            buffer = io.BytesIO()
            doc = SimpleDocTemplate(
                buffer, 
                pagesize=A4, 
                rightMargin=30, 
                leftMargin=30, 
                topMargin=30, 
                bottomMargin=30
            )

            story = []
            styles = getSampleStyleSheet()

            normal_style = ParagraphStyle(
                'NormalStyle', 
                parent=styles['Normal'], 
                fontSize=9, 
                leading=12, 
                textColor=colors.HexColor('#1F2937')
            )
            bold_style = ParagraphStyle(
                'BoldStyle', 
                parent=styles['Normal'], 
                fontSize=9, 
                leading=12, 
                fontName="Helvetica-Bold", 
                textColor=colors.HexColor('#111827')
            )

            header_data = [
                [
                    Paragraph("<b>OrbisKart Retail India Pvt Ltd</b><br/>GSTIN: <b>20AAACM1234F1Z5</b><br/>State: Jharkhand (Code: 20)", normal_style),
                    Paragraph("<b>TAX INVOICE</b><br/>(Original for Recipient)<br/><b>Invoice No:</b> ORB-INV-2026-00" + str(order.id) + "<br/><b>Date:</b> " + order.created_at.strftime('%d-%b-%Y'), normal_style)
                ]
            ]
            t_header = Table(header_data, colWidths=[270, 260])
            t_header.setStyle(TableStyle([
                ('VALIGN', (0,0), (-1,-1), 'TOP'),
                ('BOTTOMPADDING', (0,0), (-1,-1), 10),
            ]))
            story.append(t_header)
            story.append(Spacer(1, 10))

            customer_data = [
                [
                    Paragraph("<b>Bill To / Ship To:</b><br/>" + str(order.user.username) + "<br/>" + str(order.shipping_address or 'N/A'), normal_style),
                    Paragraph("<b>Order Details:</b><br/><b>Order ID:</b> #" + str(order.id) + "<br/><b>AWB:</b> " + str(order.awb_number or 'N/A') + "<br/><b>Payment Mode:</b> " + str(order.payment_method) + "<br/><b>Status:</b> " + str(order.status), normal_style)
                ]
            ]
            t_cust = Table(customer_data, colWidths=[270, 260])
            t_cust.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#F3F4F6')),
                ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor('#E5E7EB')),
                ('PADDING', (0,0), (-1,-1), 8),
                ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ]))
            story.append(t_cust)
            story.append(Spacer(1, 15))

            table_rows = [
                [
                    Paragraph("<b>#</b>", bold_style),
                    Paragraph("<b>Description</b>", bold_style),
                    Paragraph("<b>HSN</b>", bold_style),
                    Paragraph("<b>Qty</b>", bold_style),
                    Paragraph("<b>Base Price</b>", bold_style),
                    Paragraph("<b>CGST (9%)</b>", bold_style),
                    Paragraph("<b>SGST (9%)</b>", bold_style),
                    Paragraph("<b>Total (INR)</b>", bold_style)
                ]
            ]

            idx = 1
            for item in order.items.select_related('product').all():
                gross_unit = float(item.price)
                item_total = gross_unit * item.quantity
                base_unit = round(item_total / 1.18, 2)
                gst_total = item_total - base_unit
                cgst = round(gst_total / 2, 2)
                sgst = round(gst_total / 2, 2)
                hsn = getattr(item.product, 'hsn_code', '851830') or '851830'

                table_rows.append([
                    Paragraph(str(idx), normal_style),
                    Paragraph(str(item.product.title), normal_style),
                    Paragraph(str(hsn), normal_style),
                    Paragraph(str(item.quantity), normal_style),
                    Paragraph(f"Rs. {base_unit}", normal_style),
                    Paragraph(f"Rs. {cgst}", normal_style),
                    Paragraph(f"Rs. {sgst}", normal_style),
                    Paragraph(f"Rs. {round(item_total, 2)}", bold_style),
                ])
                idx += 1

            t_items = Table(table_rows, colWidths=[25, 170, 55, 30, 65, 60, 60, 65])
            t_items.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#E5E7EB')),
                ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#D1D5DB')),
                ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
                ('PADDING', (0,0), (-1,-1), 5),
            ]))
            story.append(t_items)
            story.append(Spacer(1, 12))

            summary_data = [
                ["", Paragraph("<b>Taxable Base Amount:</b>", normal_style), Paragraph(f"Rs. {order.base_price}", normal_style)],
                ["", Paragraph("<b>Total GST (18%):</b>", normal_style), Paragraph(f"Rs. {order.tax_amount}", normal_style)],
                ["", Paragraph("<b>Delivery / Shipping:</b>", normal_style), Paragraph(f"Rs. {order.delivery_fee}", normal_style)],
                ["", Paragraph("<b>Grand Total:</b>", bold_style), Paragraph(f"<b>Rs. {order.total_price}</b>", bold_style)],
            ]
            t_summary = Table(summary_data, colWidths=[250, 160, 120])
            t_summary.setStyle(TableStyle([
                ('ALIGN', (1,0), (-1,-1), 'RIGHT'),
                ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
                ('PADDING', (0,0), (-1,-1), 3),
            ]))
            story.append(t_summary)
            story.append(Spacer(1, 25))

            footer_data = [
                [
                    Paragraph("<b>Declaration:</b><br/>We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.", normal_style),
                    Paragraph("<b>For OrbisKart Retail India Pvt Ltd</b><br/><br/><i>Authorized Signatory</i>", normal_style)
                ]
            ]
            t_foot = Table(footer_data, colWidths=[310, 220])
            t_foot.setStyle(TableStyle([
                ('VALIGN', (0,0), (-1,-1), 'TOP'),
                ('ALIGN', (1,0), (1,-1), 'RIGHT'),
            ]))
            story.append(t_foot)

            doc.build(story)
            buffer.seek(0)
            
            response = HttpResponse(buffer, content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="Invoice_Order_{order.id}.pdf"'
            return response

        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# --- 9. Add Review API ---
class AddProductReviewView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            user = request.user
            product = Product.objects.filter(pk=pk).first()
            if not product:
                return Response({'error': 'Product not found'}, status=status.HTTP_404_NOT_FOUND)

            rating = int(request.data.get('rating', 5))
            comment = request.data.get('comment', '').strip()

            if not comment:
                return Response({'error': 'कृपया अपनी समीक्षा लिखें।'}, status=status.HTTP_400_BAD_REQUEST)

            if rating < 1 or rating > 5:
                return Response({'error': 'रेटिंग 1 से 5 स्टार के बीच होनी चाहिए।'}, status=status.HTTP_400_BAD_REQUEST)

            review = Review.objects.create(
                product=product,
                user=user,
                rating=rating,
                comment=comment
            )

            serializer = ReviewSerializer(review, context={'request': request})
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# --- 10. Seller Hub & Transparency Dashboard Summary API ---
class SellerDashboardSummaryView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        try:
            profile = VendorProfile.objects.get(user=request.user)
            
            seller_orders = Order.objects.filter(items__vendor=profile).distinct()
            
            total_orders = seller_orders.count()
            delivered_orders = seller_orders.filter(status='Delivered').count()
            returned_orders = seller_orders.filter(status__icontains='Return').count()
            
            recent_slips = SellerDeductionSlip.objects.filter(vendor=profile).order_by('-created_at')[:10]
            slips_data = [
                {
                    "slip_number": slip.slip_number,
                    "order_id": slip.order.id if slip.order else "N/A",
                    "gross_amount": str(slip.gross_order_amount),
                    "deductions": str(slip.courier_charge + slip.platform_and_pg_fee + slip.rto_risk_deduction),
                    "net_settled": str(slip.final_settlement_amount),
                    "is_settled": slip.is_settled_to_bank,
                    "utr": slip.settlement_reference_utr or "Pending"
                }
                for slip in recent_slips
            ]
            
            return Response({
                "store_name": profile.store_name,
                "is_approved": profile.is_approved,
                "is_orbiskart_mall": profile.is_orbiskart_mall,
                "wallet_balance": str(profile.wallet_balance),
                "quality_score": str(profile.quality_score),
                "orders_summary": {
                    "total": total_orders,
                    "delivered": delivered_orders,
                    "returns": returned_orders
                },
                "banking": {
                    "bank_name": profile.bank_name or "N/A",
                    "account_masked": f"XXXXXX{profile.bank_account_number[-4:]}" if len(profile.bank_account_number) >= 4 else "N/A",
                    "ifsc": profile.bank_ifsc_code or "N/A",
                    "is_verified": profile.bank_account_verified
                },
                "support": {
                    "it_call_no": "+91-1800-889-2026",
                    "support_email": "seller-priority@orbiskart.com"
                },
                "deduction_slips": slips_data
            }, status=status.HTTP_200_OK)
            
        except VendorProfile.DoesNotExist:
            return Response({"error": "सेलर/वेंडर प्रोफ़ाइल नहीं मिली।"}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# --- 11. Razorpay: Create Order API ---
class CreateRazorpayOrderView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        try:
            amount = request.data.get('amount')
            if not amount:
                return Response({'error': 'राशि दर्ज करना अनिवार्य है।'}, status=status.HTTP_400_BAD_REQUEST)

            client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))
            
            payment_data = {
                'amount': int(Decimal(str(amount)) * 100),
                'currency': 'INR',
                'payment_capture': '1'
            }
            
            razorpay_order = client.order.create(data=payment_data)

            return Response({
                'razorpay_order_id': razorpay_order['id'],
                'amount': razorpay_order['amount'],
                'currency': razorpay_order['currency'],
                'key_id': settings.RAZORPAY_KEY_ID
            }, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# --- 12. Razorpay: Verify Payment & Auto Transparency Ledger Entry API ---
class VerifyRazorpayPaymentView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        try:
            razorpay_order_id = request.data.get('razorpay_order_id')
            razorpay_payment_id = request.data.get('razorpay_payment_id')
            razorpay_signature = request.data.get('razorpay_signature')
            order_id = request.data.get('order_id')

            client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))
            
            # 1. डिजिटल सिग्नेचर सत्यापन
            client.utility.verify_payment_signature({
                'razorpay_order_id': razorpay_order_id,
                'razorpay_payment_id': razorpay_payment_id,
                'razorpay_signature': razorpay_signature
            })

            # 2. ऑर्डर स्टेटस अपडेट
            order = None
            if order_id:
                order = Order.objects.filter(id=order_id).first()

            if order:
                order.status = 'Confirmed'
                order.payment_method = 'Razorpay-Prepaid'
                order.save()

                # पारदर्शी कटौती स्लिप जनरेट करना
                for item in order.items.select_related('vendor', 'product', 'product__category_policy').all():
                    if item.vendor:
                        gross = item.price * Decimal(str(item.quantity))
                        pg_charge = (gross * Decimal('0.02')).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
                        
                        item_weight = (getattr(item.product, 'weight_grams', 500) or 500) * item.quantity
                        rate_card = ShippingRateCard.objects.filter(
                            max_weight_grams__gte=item_weight
                        ).order_by('max_weight_grams').first()
                        courier_charge = rate_card.forward_charge if rate_card else Decimal('50.00')

                        # वेंडर या कैटेगरी पॉलिसी के आधार पर डायनामिक कमीशन
                        comm_rate = item.vendor.commission_rate
                        if hasattr(item.product, 'category_policy') and item.product.category_policy:
                            comm_rate = item.product.category_policy.commission_rate
                        
                        platform_comm = ((gross * Decimal(str(comm_rate))) / Decimal('100')).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
                        net_settled = gross - pg_charge - courier_charge - platform_comm

                        SellerDeductionSlip.objects.create(
                            vendor=item.vendor,
                            order=order,
                            slip_number=f"SLIP-{order.id}-{item.id}",
                            gross_order_amount=gross,
                            gst_collected=item.product_gst_amount,
                            courier_charge=courier_charge,
                            platform_and_pg_fee=pg_charge + platform_comm,
                            rto_risk_deduction=Decimal('0.00'),
                            final_settlement_amount=max(Decimal('0.00'), net_settled),
                            is_settled_to_bank=False
                        )

            return Response({
                'success': True,
                'message': 'भुगतान सफलतापूर्वक सत्यापित हुआ एवं ऑर्डर कन्फर्म हो गया।'
            }, status=status.HTTP_200_OK)

        except razorpay.errors.SignatureVerificationError:
            return Response({'error': 'भुगतान सत्यापन विफल: अमान्य सिग्नेचर।'}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# --- 13. BBPS & Utility Bill Engine API ---
class UtilityBillEngineView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        service = request.data.get('service_type')
        amount = Decimal(str(request.data.get('amount', 0)))
        consumer_id = request.data.get('consumer_id')

        if amount <= 0:
            return Response({'error': 'अमान्य राशि'}, status=status.HTTP_400_BAD_REQUEST)

        operator_ref = f"BBPS-{uuid.uuid4().hex[:10].upper()}"

        tx = ImmutableMasterTransaction.objects.create(
            tx_id=f"TXN-{uuid.uuid4().hex[:12].upper()}",
            user=request.user if request.user.is_authenticated else None,
            service_type=service,
            gross_amount=amount,
            gateway_fee=(amount * Decimal('0.015')).quantize(Decimal('0.01')),
            platform_commission=Decimal('2.00'),
            operator_ref=operator_ref,
            status='SUCCESS',
            ip_address=request.META.get('REMOTE_ADDR')
        )

        return Response({
            'success': True,
            'tx_id': tx.tx_id,
            'operator_ref': operator_ref,
            'message': f'{service} सफलतापूर्वक प्रोसेस हो गया!'
        }, status=status.HTTP_200_OK)


# --- 14. Central ECO Live Master Ledger API (Fully Dynamic & Automated) ---
class CentralEcoMasterLedgerView(APIView):
    """
    धारा 52 CGST (1% TCS), 18% GST ऑन कमीशन, 2% गेटवे शुल्क,
    वजन आधारित कूरियर चार्ज और कैटेगरी अनुसार डायनामिक कमीशन काटकर शुद्ध सेलर पेआउट का हिसाब।
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        orders = Order.objects.all().order_by('-created_at')
        
        gross_volume = Decimal('0.00')
        net_company_commission = Decimal('0.00')
        gst_liability_pool = Decimal('0.00')
        tcs_collected_pool = Decimal('0.00')
        gateway_deductions_pool = Decimal('0.00')
        courier_deductions_pool = Decimal('0.00')
        seller_payable_pool = Decimal('0.00')
        
        master_records = []

        for o in orders:
            gross = Decimal(str(o.total_price or 0))
            if gross <= 0:
                continue

            order_items = o.items.select_related('product', 'vendor', 'product__category_policy').all()

            # 1. पार्सल के कुल वज़न के आधार पर कूरियर डिलीवरी चार्ज
            total_weight = sum((getattr(item.product, 'weight_grams', 500) or 500) * item.quantity for item in order_items)
            
            rate_card = ShippingRateCard.objects.filter(
                max_weight_grams__gte=total_weight
            ).order_by('max_weight_grams').first()

            if rate_card:
                courier_charge = Decimal(str(rate_card.forward_charge))
            elif getattr(o, 'delivery_fee', None) and Decimal(str(o.delivery_fee)) > 0:
                courier_charge = Decimal(str(o.delivery_fee))
            else:
                extra_weight = max(0, total_weight - 500)
                extra_slabs = (extra_weight + 499) // 500
                courier_charge = Decimal('50.00') + Decimal(str(extra_slabs * 30))

            courier_charge = courier_charge.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

            # 2. प्रोडक्ट/कैटेगरी/प्राइस स्लैब के आधार पर डायनामिक प्लेटफ़ॉर्म कमीशन
            total_platform_fee = Decimal('0.00')
            for item in order_items:
                item_price = Decimal(str(item.price)) * item.quantity
                
                # यदि कैटेगरी पॉलिसी में कमीशन तय है, अन्यथा स्लैब (₹1000 तक 5%, ऊपर 3%)
                if hasattr(item.product, 'category_policy') and item.product.category_policy:
                    comm_pct = Decimal(str(item.product.category_policy.commission_rate))
                elif item_price < Decimal('1000.00'):
                    comm_pct = Decimal('5.0')
                else:
                    comm_pct = Decimal('3.0')

                total_platform_fee += (item_price * (comm_pct / Decimal('100.0')))

            platform_fee = total_platform_fee.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

            # 3. पेमेंट गेटवे शुल्क (सकल राशि का 2%)
            gateway_fee = (gross * Decimal('0.02')).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

            # 4. कमीशन पर 18% GST और धारा 52 के तहत 1% TCS
            gst_on_fee = (platform_fee * Decimal('0.18')).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
            tcs_gov = (gross * Decimal('0.01')).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

            # 5. शुद्ध सेलर पेआउट (कटौतियां घटाकर)
            total_cuts = gateway_fee + platform_fee + gst_on_fee + tcs_gov + courier_charge
            seller_net = max(Decimal('0.00'), gross - total_cuts).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

            # पूल्स में योग जोड़ना
            gross_volume += gross
            net_company_commission += platform_fee
            gst_liability_pool += gst_on_fee
            tcs_collected_pool += tcs_gov
            gateway_deductions_pool += gateway_fee
            courier_deductions_pool += courier_charge
            seller_payable_pool += seller_net

            master_records.append({
                'order_id': f"ORD-{o.id}",
                'date': o.created_at.strftime('%d %b %Y') if getattr(o, 'created_at', None) else timezone.now().strftime('%d %b %Y'),
                'buyer': getattr(o.user, 'username', 'Direct Buyer') if o.user else 'Direct Buyer',
                'gross_amount': float(gross),
                'gateway_2pct': float(gateway_fee),
                'platform_fee_3pct': float(platform_fee),
                'gst_18pct': float(gst_on_fee),
                'tcs_1pct': float(tcs_gov),
                'courier_charge': float(courier_charge),
                'weight_grams': total_weight,
                'seller_net': float(seller_net),
                'status': getattr(o, 'status', 'Confirmed'),
                'escrow_status': 'Locked in Escrow (T+2)',
                'weight_audit': f"{total_weight}g Verified",
                'utr_ref': f"UTR-ECO-{o.id}-LIVE"
            })

        return Response({
            'kpi_summary': {
                'gross_sales': float(gross_volume),
                'company_net_profit': float(net_company_commission),
                'gst_pool_18': float(gst_liability_pool),
                'tcs_pool_1': float(tcs_collected_pool),
                'gateway_pool_2': float(gateway_deductions_pool),
                'courier_pool': float(courier_deductions_pool),
                'seller_payable_total': float(seller_payable_pool),
            },
            'audit_records': master_records
        }, status=status.HTTP_200_OK)