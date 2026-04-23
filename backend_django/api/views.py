from datetime import timedelta

from django.contrib.auth.hashers import check_password, make_password
from django.db import IntegrityError, transaction
from django.http import JsonResponse
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from .models import Breed, Pet, PetHealth, UserAccount, Vaccination
from .utils import json_error, normalize_decimal, normalize_optional_text, normalize_text, parse_json


# Сериализация переводит объекты Django в JSON-словарь,
# который удобно отдавать фронтенду.
def serialize_user(user: UserAccount):
    return {
        "user_id": user.user_id,
        "login": user.login,
        "nickname": user.nickname,
        "role": user.role,
    }


def serialize_pet(pet: Pet):
    return {
        "pets_id": pet.pets_id,
        "name": pet.name,
        "birth_date": pet.birth_date.isoformat() if pet.birth_date else None,
        "owner_id": pet.owner_id,
        "breed_name": pet.breed.breed_name,
        "weight": float(pet.weight) if pet.weight is not None else None,
        "color": pet.color,
        "notes": pet.notes,
    }


def serialize_vaccination_entry(entry: PetHealth):
    return {
        "vaccination_id": entry.vacs.id,
        "pet_id": entry.pet.pets_id,
        "pet_name": entry.pet.name,
        "pet_color": entry.pet.color,
        "v_date": entry.v_date.isoformat(),
        "v_type": entry.vacs.v_type,
        "price": float(entry.vacs.price) if entry.vacs.price is not None else None,
    }


def get_or_create_breed(breed_name: str):
    breed, _created = Breed.objects.get_or_create(breed_name=breed_name)
    return breed


def password_is_hashed(raw_password: str):
    return raw_password.startswith("pbkdf2_")


def check_login_password(user: UserAccount, plain_password: str):
    stored_password = user.password or ""
    if password_is_hashed(stored_password):
        return check_password(plain_password, stored_password)

    if stored_password == plain_password:
        user.password = make_password(plain_password)
        user.save(update_fields=["password"])
        return True

    return False


# Проверка, что сервер жив.
@require_http_methods(["GET"])
def health(_request):
    return JsonResponse({"ok": True})


# AUTH
@csrf_exempt
@require_http_methods(["POST"])
def register(request):
    data = parse_json(request)
    if data is None:
        return json_error("Некорректный JSON")

    login = normalize_text(data.get("login"))
    password = normalize_text(data.get("password"))
    nickname = normalize_text(data.get("nickname"))

    if not login or not password or not nickname:
        return json_error("Заполните e-mail, пароль и имя")

    if len(password) < 6:
        return json_error("Пароль должен быть минимум 6 символов")

    try:
        user = UserAccount.objects.create(
            login=login,
            password=make_password(password),
            nickname=nickname,
            role="user",
        )
    except IntegrityError as error:
        message = str(error)
        if "login" in message.lower():
            return json_error("Такая почта уже зарегистрирована", status=409, field="login")
        if "nickname" in message.lower():
            return json_error("Такой ник уже существует", status=409, field="nickname")
        return json_error("Такой e-mail уже зарегистрирован", status=409)

    return JsonResponse(
        {
            "message": "Пользователь создан",
            "user": serialize_user(user),
        },
        status=201,
    )


@csrf_exempt
@require_http_methods(["POST"])
def login(request):
    data = parse_json(request)
    if data is None:
        return json_error("Некорректный JSON")

    login_value = normalize_text(data.get("login"))
    password = normalize_text(data.get("password"))

    if not login_value or not password:
        return json_error("Введите e-mail и пароль")

    user = UserAccount.objects.filter(login=login_value).first()
    if not user or not check_login_password(user, password):
        return json_error("Неверный логин или пароль", status=401)

    return JsonResponse(
        {
            "message": "Успешный вход",
            "user": serialize_user(user),
        }
    )


# PROFILE
@csrf_exempt
@require_http_methods(["PUT"])
def update_user(request, user_id: int):
    data = parse_json(request)
    if data is None:
        return json_error("Некорректный JSON")

    login_value = normalize_text(data.get("login"))
    nickname = normalize_text(data.get("nickname"))
    password = normalize_text(data.get("password"))

    if not user_id or not login_value or not nickname:
        return json_error("Заполните user_id, e-mail и имя")

    if password and len(password) < 6:
        return json_error("Пароль должен быть минимум 6 символов")

    user = UserAccount.objects.filter(user_id=user_id).first()
    if not user:
        return json_error("Пользователь не найден", status=404)

    if UserAccount.objects.filter(login=login_value).exclude(user_id=user_id).exists():
        return json_error("Почта уже зарегистрирована", status=409)

    user.login = login_value
    user.nickname = nickname
    if password:
        user.password = make_password(password)

    try:
        user.save()
    except IntegrityError:
        return json_error("Почта уже зарегистрирована", status=409)

    return JsonResponse({"message": "Профиль обновлен", "user": serialize_user(user)})


# PETS
@require_http_methods(["GET"])
def pets_list(request):
    owner_id = normalize_text(request.GET.get("owner_id"))
    if not owner_id.isdigit():
        return json_error("Нужен owner_id")

    pets = (
        Pet.objects.select_related("breed")
        .filter(owner_id=int(owner_id))
        .order_by("-pets_id")
    )
    return JsonResponse({"pets": [serialize_pet(pet) for pet in pets]})


@csrf_exempt
@require_http_methods(["POST"])
def pets_create(request):
    data = parse_json(request)
    if data is None:
        return json_error("Некорректный JSON")

    owner_id_raw = normalize_text(data.get("owner_id"))
    name = normalize_text(data.get("name"))
    breed_name = normalize_text(data.get("breed_name"))
    birth_date = normalize_optional_text(data.get("birth_date"))
    color = normalize_optional_text(data.get("color"))
    notes = normalize_optional_text(data.get("notes"))
    weight, weight_error = normalize_decimal(data.get("weight"), "Вес")

    if not owner_id_raw or not name or not breed_name:
        return json_error("Заполните owner_id, name, breed_name")

    if not owner_id_raw.isdigit() or int(owner_id_raw) <= 0:
        return json_error("Некорректный owner_id")

    if weight_error:
        return json_error("Вес должен быть числом (например 5.5)")

    owner = UserAccount.objects.filter(user_id=int(owner_id_raw)).first()
    if not owner:
        return json_error("Пользователь owner_id не найден")

    breed = get_or_create_breed(breed_name)
    pet = Pet.objects.create(
        owner=owner,
        name=name,
        birth_date=birth_date or None,
        breed=breed,
        weight=weight,
        color=color,
        notes=notes,
    )

    return JsonResponse({"message": "Питомец добавлен", "pet": serialize_pet(pet)}, status=201)


@csrf_exempt
@require_http_methods(["PUT"])
def pets_update(request, pet_id: int):
    data = parse_json(request)
    if data is None:
        return json_error("Некорректный JSON")

    owner_id_raw = normalize_text(data.get("owner_id"))
    name = normalize_text(data.get("name"))
    breed_name = normalize_text(data.get("breed_name"))
    birth_date = normalize_optional_text(data.get("birth_date"))
    color = normalize_optional_text(data.get("color"))
    notes = normalize_optional_text(data.get("notes"))
    weight, weight_error = normalize_decimal(data.get("weight"), "Вес")

    if not pet_id or not owner_id_raw or not name or not breed_name:
        return json_error("Заполните pet_id, owner_id, name, breed_name")

    if weight_error:
        return json_error("Вес должен быть числом (например 5.5)")

    pet = Pet.objects.select_related("owner", "breed").filter(pets_id=pet_id).first()
    if not pet:
        return json_error("Питомец не найден", status=404)

    if str(pet.owner_id) != owner_id_raw:
        return json_error("Нельзя редактировать чужого питомца", status=403)

    pet.name = name
    pet.birth_date = birth_date or None
    pet.breed = get_or_create_breed(breed_name)
    pet.weight = weight
    pet.color = color
    pet.notes = notes
    pet.save()

    return JsonResponse({"message": "Питомец обновлен", "pet": serialize_pet(pet)})


@csrf_exempt
@require_http_methods(["DELETE"])
def pets_delete(request, pet_id: int):
    owner_id = normalize_text(request.GET.get("owner_id"))
    if not pet_id or not owner_id.isdigit():
        return json_error("Нужны pet_id и owner_id")

    pet = Pet.objects.filter(pets_id=pet_id).first()
    if not pet:
        return json_error("Питомец не найден", status=404)

    if pet.owner_id != int(owner_id):
        return json_error("Нельзя удалить чужого питомца", status=403)

    with transaction.atomic():
        vaccination_ids = list(Vaccination.objects.filter(pet_id=pet_id).values_list("id", flat=True))
        PetHealth.objects.filter(pet_id=pet_id).delete()
        if vaccination_ids:
            PetHealth.objects.filter(vacs_id__in=vaccination_ids).delete()
        Vaccination.objects.filter(pet_id=pet_id).delete()
        pet.delete()

    return JsonResponse({"message": "Питомец удален"})


# Один и тот же URL /api/pets обслуживает и просмотр, и создание.
@csrf_exempt
@require_http_methods(["GET", "POST"])
def pets_endpoint(request):
    if request.method == "GET":
        return pets_list(request)
    return pets_create(request)


@csrf_exempt
@require_http_methods(["PUT", "DELETE"])
def pet_detail_endpoint(request, pet_id: int):
    if request.method == "PUT":
        return pets_update(request, pet_id)
    return pets_delete(request, pet_id)


# VACCINATIONS
@require_http_methods(["GET"])
def vaccinations_upcoming(request):
    owner_id = normalize_text(request.GET.get("owner_id"))
    days_text = normalize_text(request.GET.get("days") or "60")

    if not owner_id.isdigit():
        return json_error("Нужен owner_id")

    days = int(days_text) if days_text.isdigit() else 60
    today = timezone.localdate()
    limit_date = today + timedelta(days=days)

    entries = (
        PetHealth.objects.select_related("pet", "vacs")
        .filter(pet__owner_id=int(owner_id), v_date__gte=today, v_date__lte=limit_date)
        .order_by("v_date")[:20]
    )

    return JsonResponse({"vaccinations": [serialize_vaccination_entry(entry) for entry in entries]})


@require_http_methods(["GET"])
def vaccinations_list(request):
    owner_id = normalize_text(request.GET.get("owner_id"))
    if not owner_id.isdigit():
        return json_error("Нужен owner_id")

    entries = (
        PetHealth.objects.select_related("pet", "vacs")
        .filter(pet__owner_id=int(owner_id))
        .order_by("-v_date", "-id")
    )
    return JsonResponse({"vaccinations": [serialize_vaccination_entry(entry) for entry in entries]})


@csrf_exempt
@require_http_methods(["POST"])
def vaccinations_create(request):
    data = parse_json(request)
    if data is None:
        return json_error("Некорректный JSON")

    owner_id_raw = normalize_text(data.get("owner_id"))
    pet_id_raw = normalize_text(data.get("pet_id"))
    vaccine_type = normalize_text(data.get("v_type"))
    vaccine_date = normalize_text(data.get("v_date"))
    price, price_error = normalize_decimal(data.get("price"), "Цена")

    if not owner_id_raw or not pet_id_raw or not vaccine_type or not vaccine_date:
        return json_error("Заполните owner_id, pet_id, v_type, v_date")

    if price_error:
        return json_error("Цена должна быть числом (например 1200)")

    pet = Pet.objects.filter(pets_id=int(pet_id_raw)).first() if pet_id_raw.isdigit() else None
    if not pet:
        return json_error("Питомец не найден")

    if str(pet.owner_id) != owner_id_raw:
        return json_error("Питомец не принадлежит этому пользователю", status=403)

    with transaction.atomic():
        vaccination = Vaccination.objects.create(
            pet=pet,
            v_type=vaccine_type,
            price=price,
        )
        PetHealth.objects.create(
            pet=pet,
            vacs=vaccination,
            v_date=vaccine_date,
        )

    return JsonResponse(
        {
            "message": "Вакцинация добавлена",
            "vaccination": {
                "id": vaccination.id,
                "pet_id": pet.pets_id,
                "v_type": vaccination.v_type,
                "price": float(vaccination.price) if vaccination.price is not None else None,
                "v_date": vaccine_date,
            },
        },
        status=201,
    )


@csrf_exempt
@require_http_methods(["DELETE"])
def vaccinations_delete(request, vaccination_id: int):
    owner_id = normalize_text(request.GET.get("owner_id"))
    if not vaccination_id or not owner_id.isdigit():
        return json_error("Нужны vaccination_id и owner_id")

    vaccination = Vaccination.objects.select_related("pet").filter(id=vaccination_id).first()
    if not vaccination or vaccination.pet.owner_id != int(owner_id):
        return json_error("Вакцинация не найдена", status=404)

    with transaction.atomic():
        PetHealth.objects.filter(vacs_id=vaccination_id).delete()
        vaccination.delete()

    return JsonResponse({"message": "Вакцинация удалена"})


# Один и тот же URL /api/vaccinations обслуживает и список, и добавление.
@csrf_exempt
@require_http_methods(["GET", "POST"])
def vaccinations_endpoint(request):
    if request.method == "GET":
        return vaccinations_list(request)
    return vaccinations_create(request)


@csrf_exempt
@require_http_methods(["DELETE"])
def vaccination_detail_endpoint(request, vaccination_id: int):
    return vaccinations_delete(request, vaccination_id)
