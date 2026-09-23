from django.apps import AppConfig
from django.contrib.auth import get_user_model
from django.db.utils import OperationalError, ProgrammingError

class StoreConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'store'

    def ready(self):
        # 1. Signals को यहाँ रजिस्टर करना अनिवार्य है ताकि यूजर बनते ही VendorProfile बन जाए
        try:
            import store.signals
        except ImportError:
            pass

        # 2. Default Superuser Create करने का सुरक्षित ब्लॉक
        try:
            User = get_user_model()
            username = 'Orbiskart'
            email = 'Orbiskart2026@gmail.com'
            password = 'Naresh@1992'
            
            # Check करें कि यूजर पहले से है या नहीं, और क्या डेटाबेस टेबल्स तैयार हैं
            if not User.objects.filter(username=username).exists():
                User.objects.create_superuser(username=username, email=email, password=password)
        except (OperationalError, ProgrammingError):
            # यह एरर तब बचती है जब डेटाबेस माइग्रेशन अभी तक रन नहीं हुआ होता है
            pass
        except Exception:
            pass