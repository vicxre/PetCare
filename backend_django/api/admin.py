from django.contrib import admin

from .models import Breed, Pet, PetHealth, UserAccount, Vaccination


@admin.register(UserAccount)
class UserAccountAdmin(admin.ModelAdmin):
    list_display = ("user_id", "login", "nickname", "role")
    search_fields = ("login", "nickname", "role")
    ordering = ("user_id",)


@admin.register(Breed)
class BreedAdmin(admin.ModelAdmin):
    list_display = ("breed_id", "breed_name")
    search_fields = ("breed_name",)
    ordering = ("breed_id",)


@admin.register(Pet)
class PetAdmin(admin.ModelAdmin):
    list_display = ("pets_id", "name", "owner", "breed", "birth_date", "weight")
    list_filter = ("breed",)
    search_fields = ("name", "owner__login", "owner__nickname", "breed__breed_name")
    ordering = ("pets_id",)


@admin.register(Vaccination)
class VaccinationAdmin(admin.ModelAdmin):
    list_display = ("id", "v_type", "pet", "price")
    search_fields = ("v_type", "pet__name")
    ordering = ("id",)


@admin.register(PetHealth)
class PetHealthAdmin(admin.ModelAdmin):
    list_display = ("id", "pet", "vacs", "v_date")
    list_filter = ("v_date",)
    search_fields = ("pet__name", "vacs__v_type")
    ordering = ("id",)
