from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    CustomTokenObtainPairView, RegisterView, UserProfileView,
    OrganizationViewSet, VerificationRecordListView,
    FoodCategoryListView, FoodListingViewSet, ReservationViewSet,
    PickupViewSet, FeedbackViewSet, analytics_dashboard,
    demand_forecast_view, seed_demo_data
)

router = DefaultRouter()
router.register(r'organizations', OrganizationViewSet, basename='organization')
router.register(r'donations/listings', FoodListingViewSet, basename='food-listing')
router.register(r'reservations', ReservationViewSet, basename='reservation')
router.register(r'deliveries', PickupViewSet, basename='delivery')
router.register(r'feedback', FeedbackViewSet, basename='feedback')

urlpatterns = [
    # Auth Endpoints
    path('auth/token/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('auth/register/', RegisterView.as_view(), name='auth_register'),
    path('auth/profile/', UserProfileView.as_view(), name='auth_profile'),

    # Category & Verification Endpoints
    path('donations/categories/', FoodCategoryListView.as_view(), name='food_categories'),
    path('organizations/verifications/', VerificationRecordListView.as_view(), name='verification_records'),

    # Matching & Analytics
    path('analytics/dashboard/', analytics_dashboard, name='analytics_dashboard'),
    path('analytics/demand-forecast/', demand_forecast_view, name='demand_forecast'),

    # Seed Demo Scenario
    path('seed-demo/', seed_demo_data, name='seed_demo_data'),

    # ViewSet Router URLs
    path('', include(router.urls)),
]
