# store/permissions.py

from rest_framework import permissions

class IsApprovedSeller(permissions.BasePermission):
    """
    केवल वही सेलर डेटा देख या एडिट कर सकता है जो एडमिन द्वारा APPROVED हो
    और केवल अपने ही डेटा तक सीमित रहे।
    """
    message = "आपकी दुकान अभी समीक्षाधीन है या अनुमति नहीं है।"

    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        
        vendor = getattr(request.user, 'vendor_profile', None)
        return bool(vendor and vendor.is_approved and vendor.status == 'APPROVED')

    def has_object_permission(self, request, view, obj):
        # सुपर एडमिन को पूरा एक्सेस
        if request.user.is_staff or request.user.is_superuser:
            return True
        
        # सेलर केवल अपना ही प्रोडक्ट या ऑर्डर देख सकता है
        vendor = getattr(request.user, 'vendor_profile', None)
        if hasattr(obj, 'vendor'):
            return obj.vendor == vendor
        if hasattr(obj, 'seller'):
            return obj.seller == request.user
        return False