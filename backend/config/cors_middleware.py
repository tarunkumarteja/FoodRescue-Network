"""
Lightweight CORS middleware for development and testing.
Handles OPTIONS preflight requests and appends standard CORS headers.
"""
from django.http import HttpResponse
from django.conf import settings
from django.utils.cache import patch_vary_headers


class SimpleCorsMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        origin = request.headers.get('Origin')
        allowed_origin = origin if origin in settings.CORS_ALLOWED_ORIGINS else None
        if request.method == 'OPTIONS':
            response = HttpResponse()
            if allowed_origin:
                response['Access-Control-Allow-Origin'] = allowed_origin
                patch_vary_headers(response, ('Origin',))
            response['Access-Control-Allow-Methods'] = 'GET, POST, PUT, PATCH, DELETE, OPTIONS'
            response['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-CSRFToken, X-Requested-With'
            response['Access-Control-Max-Age'] = '86400'
            return response

        response = self.get_response(request)
        if allowed_origin:
            response['Access-Control-Allow-Origin'] = allowed_origin
            response['Access-Control-Allow-Methods'] = 'GET, POST, PUT, PATCH, DELETE, OPTIONS'
            response['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-CSRFToken, X-Requested-With'
            patch_vary_headers(response, ('Origin',))
        return response
