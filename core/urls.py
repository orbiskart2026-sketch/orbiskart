from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)
from store.views import CentralEcoMasterLedgerView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # 1. बिना api/ के सीधा रूट
    path('admin/eco-master-ledger/', CentralEcoMasterLedgerView.as_view(), name='eco-master-ledger-root'),
    
    # 2. api/ के साथ सीधा रूट
    path('api/admin/eco-master-ledger/', CentralEcoMasterLedgerView.as_view(), name='eco-master-ledger-api'),
    
    path('api/', include('store.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)