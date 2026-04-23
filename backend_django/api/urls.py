from django.urls import path

from . import views

urlpatterns = [
    path("health", views.health),
    path("auth/register", views.register),
    path("auth/login", views.login),
    path("users/<int:user_id>", views.update_user),
    path("pets", views.pets_endpoint),
    path("pets/<int:pet_id>", views.pet_detail_endpoint),
    path("vaccinations/upcoming", views.vaccinations_upcoming),
    path("vaccinations", views.vaccinations_endpoint),
    path("vaccinations/<int:vaccination_id>", views.vaccination_detail_endpoint),
]
