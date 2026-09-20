from django.apps import AppConfig
from django.contrib.auth import get_user_model
import os

class StoreConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'store'

    def ready(self):
        try:
            User = get_user_model()
            username = 'Orbiskart'
            email = 'Orbiskart2026@gmail.com'
            password = 'Naresh@1992'
            if not User.objects.filter(username=username).exists():
                User.objects.create_superuser(username=username, email=email, password=password)
        except Exception:
            pass