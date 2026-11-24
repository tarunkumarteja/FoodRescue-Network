from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    CustomTokenObtainPairView, RegisterView, UserProfileView,
    UserAdminViewSet, OrganizationViewSet, VerificationRecordListView,
    FoodCategoryListView, FoodListingViewSet, ReservationViewSet,
    PickupViewSet, DeliveryEventViewSet, FeedbackViewSet,
    NotificationViewSet, SimulationViewSet, analytics_dashboard,
    demand_forecast_view, seed_demo_data
)

router = DefaultRouter()
router.register(r'organizations', OrganizationViewSet, basename='organization')
router.register(r'donations/listings', FoodListingViewSet, basename='food-listing')
router.register(r'food-listings', FoodListingViewSet, basename='food-listing-alias')
router.register(r'reservations', ReservationViewSet, basename='reservation')
router.register(r'claims', ReservationViewSet, basename='claim-alias')
router.register(r'deliveries', PickupViewSet, basename='delivery')
router.register(r'pickups', PickupViewSet, basename='pickup-alias')
router.register(r'delivery-events', DeliveryEventViewSet, basename='delivery-event')
router.register(r'feedback', FeedbackViewSet, basename='feedback')
router.register(r'notifications', NotificationViewSet, basename='notification')
router.register(r'users', UserAdminViewSet, basename='user-admin')
router.register(r'simulation', SimulationViewSet, basename='simulation')

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
