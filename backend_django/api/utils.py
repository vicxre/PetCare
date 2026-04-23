import json
from decimal import Decimal, InvalidOperation

from django.http import JsonResponse


def json_error(message: str, status: int = 400, **extra):
    payload = {"message": message}
    payload.update(extra)
    return JsonResponse(payload, status=status)


def parse_json(request):
    if not request.body:
        return {}

    try:
        return json.loads(request.body.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError):
        return None


def normalize_text(value):
    return str(value or "").strip()


def normalize_optional_text(value):
    text = normalize_text(value)
    return text or None


def normalize_decimal(value, field_label: str):
    text = normalize_text(value).replace(",", ".")
    if text == "":
        return None, None

    try:
        return Decimal(text), None
    except InvalidOperation:
        return None, f"{field_label} должен быть числом"
