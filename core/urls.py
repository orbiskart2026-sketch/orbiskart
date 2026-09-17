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
    path('admin/', admin.site.urls),
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/admin/eco-master-ledger/', CentralEcoMasterLedgerView.as_view(), name='eco_master_ledger_api'),
    path('admin/eco-master-ledger/', CentralEcoMasterLedgerView.as_view(), name='eco_master_ledger_direct'),
    path('api/', include('store.urls')),
    
    # मीडिया फाइल्स (इमेज/फ़ोटो) को लाइव सर्व करने का पक्का नियम
    re_path(r'^media/(?P<path>.*)$', serve, {'document_root': settings.MEDIA_ROOT}),
]