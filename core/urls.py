from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.views.static import serve
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)
from store.views import CentralEcoMasterLedgerView

urlpatterns = [
    # 1. Django Admin Panel
    path('admin/', admin.site.urls),

    # 2. JWT Authentication Endpoints
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    # 3. Central Eco Master Ledger (Admin & API Sync)
    path('api/admin/eco-master-ledger/', CentralEcoMasterLedgerView.as_view(), name='eco_master_ledger_api'),
    path('admin/eco-master-ledger/', CentralEcoMasterLedgerView.as_view(), name='eco_master_ledger_direct'),

    # 4. Store API Endpoints (Includes all mobile app routes under /api/)
    path('api/', include('store.urls')),

    # 5. Permanent Media Files Serving Path for Render Deployment
    re_path(r'^media/(?P<path>.*)$', serve, {'document_root': settings.MEDIA_ROOT}),
]