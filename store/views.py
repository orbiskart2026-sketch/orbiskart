import io
import random
from decimal import Decimal, ROUND_HALF_UP

from django.db import models, transaction
from django.http import HttpResponse
from django.contrib.auth.models import User

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser

from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

from .models import Category, CategoryPolicy, ShippingRateCard, Product, Cart, CartItem, Order, OrderItem, Review
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

            # सर्च फ़िल्टर
            search_query = request.query_params.get('search', '').strip()
            if search_query:
                queryset = queryset.filter(
                    models.Q(title__icontains=search_query) | 
                    models.Q(description__icontains=search_query)
                )

            # कैटेगरी फ़िल्टर
            category_id = request.query_params.get('category', '').strip()
            if category_id and category_id.lower() != 'all':
                queryset = queryset.filter(category_id=category_id)

            # सॉर्टिंग
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

    # सेलर मोबाइल ऐप से डायरेक्ट अपलोड
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

            gst_divisor = Decimal('1.18')
            base_price = (subtotal / gst_divisor).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
            tax_amount = (subtotal - base_price).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
            delivery_fee = Decimal('0.00')
            discount_amount = max(Decimal('0.00'), original_subtotal - subtotal).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
            total_price = subtotal + delivery_fee

            # 6-अंकीय सुरक्षित डिलीवरी व रिटर्न OTP जनरेशन
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
                'delivery_otp': order.delivery_otp
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

            otp_type = request.data.get('type', 'DELIVERY')  # 'DELIVERY' या 'RETURN'
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

            # Header Banner
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

            # Customer & Shipping Section
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

            # Items Table
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

            # Totals
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

            # Footer
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