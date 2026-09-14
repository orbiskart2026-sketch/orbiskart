from decimal import Decimal, ROUND_HALF_UP
from django.test import TestCase
from django.contrib.auth.models import User
from .models import (
    GovtHSNMaster,
    Category,
    CategoryPolicy,
    ShippingRateCard,
    VendorProfile,
    Product,
    Order,
    OrderItem,
    SellerDeductionSlip,
)

class DynamicGovernmentAndLogisticsTest(TestCase):
    def setUp(self):
        # 1. टेस्ट यूज़र्स
        self.buyer = User.objects.create_user(username='buyer_real', password='Pass@123real')
        self.vendor_user = User.objects.create_user(username='vendor_real', password='Pass@123real')

        # 2. वेंडर प्रोफ़ाइल (एडमिन द्वारा तय कमीशन: 3%)
        self.vendor = VendorProfile.objects.create(
            user=self.vendor_user,
            store_name="Real Testing Hub",
            business_email="real@orbiskart.com",
            commission_rate=Decimal('3.00')
        )

        # 3. सरकारी आधिकारिक HSN मास्टर (18% GST)
        self.hsn = GovtHSNMaster.objects.create(
            hsn_code="851830",
            description="Headphones, earphones and combined microphone/speaker sets",
            gst_rate=Decimal('18.00'),
            cess_rate=Decimal('0.00')
        )

        # 4. कैटेगरी और डायनामिक पॉलिसी (सरकारी HSN से लिंक)
        self.category = Category.objects.create(name="Electronics")
        self.policy = CategoryPolicy.objects.create(
            category=self.category,
            name="Electronics Policy",
            hsn_master=self.hsn,
            platform_fee_percent=Decimal('3.00'),
            settlement_days=7
        )

        # 5. कूरियर रेट कार्ड (वज़न व ज़ोन के आधार पर ऑटोमैटिक)
        self.rate_card = ShippingRateCard.objects.create(
            zone="Regional",
            min_weight_grams=0,
            max_weight_grams=500,
            forward_charge=Decimal('50.00'),
            rto_charge=Decimal('40.00')
        )

        # 6. प्रोडक्ट (400 ग्राम, ₹1000 मूल्य, सरकारी HSN से लिंक्ड)
        self.product = Product.objects.create(
            vendor=self.vendor,
            category=self.category,
            category_policy=self.policy,
            hsn_record=self.hsn,
            title="Real Wireless Earbuds",
            price=Decimal('1000.00'),
            weight_grams=400
        )

    def test_government_tax_and_transparency_ledger(self):
        """सत्यापन: सरकारी HSN से सही GST दर और लेजर गणना"""
        # जाँचें कि प्रोडक्ट ने HSN मास्टर से 18% GST अपने आप उठाया
        self.assertEqual(self.product.gst_rate, Decimal('18.00'))
        self.assertEqual(self.product.hsn_code, "851830")

        ledger = self.product.calculate_transparency_ledger()

        # 1000 रुपये पर गणितीय सत्यापन
        gross = Decimal('1000.00')
        expected_base = (gross / Decimal('1.18')).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        expected_gst = gross - expected_base

        self.assertEqual(ledger['gross_price'], 1000.0)
        self.assertEqual(Decimal(str(ledger['gst_amount'])), expected_gst)
        self.assertEqual(ledger['forward_courier'], 50.0)
        self.assertGreater(ledger['net_seller_payout'], 0)

    def test_automated_order_and_zero_hidden_fee_slip(self):
        """सत्यापन: ऑर्डर पर ऑटोमैटिक डिडक्शन स्लिप और 100% पारदर्शिता"""
        order = Order.objects.create(
            user=self.buyer,
            total_price=Decimal('1000.00'),
            payment_method='UPI',
            shipping_address='Real House, Ranchi, Jharkhand',
            status='Confirmed',
            delivery_otp='123456',
            return_otp='654321'
        )

        item = OrderItem.objects.create(
            order=order,
            product=self.product,
            price=Decimal('1000.00'),
            quantity=1
        )

        # OrderItem सेव होते ही ऑटो-कैलकुलेशन की पुष्टि
        self.assertEqual(item.hsn_code, "851830")
        self.assertEqual(item.product_gst_rate, Decimal('18.00'))
        self.assertEqual(item.shipping_and_return_fee, Decimal('50.00'))

        # पारदर्शी स्लिप दर्ज करना
        slip = SellerDeductionSlip.objects.create(
            vendor=self.vendor,
            order=order,
            slip_number=f"SLIP-AUTO-{order.id}",
            gross_order_amount=item.price,
            gst_collected=item.product_gst_amount,
            courier_charge=item.shipping_and_return_fee,
            platform_and_pg_fee=item.platform_commission + item.payment_gateway_fee,
            rto_risk_deduction=Decimal('0.00'),
            final_settlement_amount=item.vendor_payout,
            is_settled_to_bank=False
        )

        self.assertEqual(slip.order.id, order.id)
        self.assertEqual(slip.vendor.store_name, "Real Testing Hub")
        self.assertEqual(slip.courier_charge, Decimal('50.00'))
        self.assertEqual(slip.final_settlement_amount, item.vendor_payout)