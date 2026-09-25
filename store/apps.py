from django.apps import AppConfig
from django.db.models.signals import post_migrate

def create_default_superuser(sender, **kwargs):
    from django.contrib.auth import get_user_model
    User = get_user_model()
    username = 'Orbiskart'
    email = 'Orbiskart2026@gmail.com'
    password = 'Naresh@1992'
    
    try:
        if not User.objects.filter(username=username).exists():
            User.objects.create_superuser(username=username, email=email, password=password)
            print("Default superuser created successfully.")
    except Exception:
        pass

class StoreConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'store'

    def ready(self):
        # 1. Signals ko register karna taaki user bante hi VendorProfile ban jaye
        try:
            import store.signals
        except ImportError:
            pass
        
        # 2. Default Superuser Create karne ka safe block (migrations ke baad chalega)
        post_migrate.connect(create_default_superuser, sender=self)