from django.db.models.signals import post_save
from django.contrib.auth.models import User
from django.dispatch import receiver
from .models import VendorProfile
from decimal import Decimal

@receiver(post_save, sender=User)
def create_vendor_profile_automatically(sender, instance, created, **kwargs):
    if created:
        # Unique store name generate karna taaki duplicate error na aaye
        base_store_name = f"{instance.username}_store"
        store_name = base_store_name
        counter = 1
        while VendorProfile.objects.filter(store_name=store_name).exists():
            store_name = f"{base_store_name}_{counter}"
            counter += 1

        VendorProfile.objects.get_or_create(
            user=instance,
            defaults={
                'store_name': store_name,
                'business_email': instance.email or f"{instance.username}@orbiskart.com",
                'is_approved': True,
                'wallet_balance': Decimal('1500.00')  # Testing ke liye default wallet balance
            }
        )