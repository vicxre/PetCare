from pathlib import Path

from .env import load_env

BASE_DIR = Path(__file__).resolve().parent.parent
ENV = load_env(BASE_DIR / ".env")

SECRET_KEY = ENV.get("SECRET_KEY", "django-insecure-college-project")
DEBUG = ENV.get("DEBUG", "True").lower() == "true"
ALLOWED_HOSTS = ["127.0.0.1", "localhost"]

INSTALLED_APPS = [
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "api",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "api.middleware.SimpleCorsMiddleware",
]

ROOT_URLCONF = "petcare_django.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "petcare_django.wsgi.application"
ASGI_APPLICATION = "petcare_django.asgi.application"

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.mysql",
        "NAME": ENV.get("DB_NAME", "mydb"),
        "USER": ENV.get("DB_USER", "root"),
        "PASSWORD": ENV.get("DB_PASSWORD", ""),
        "HOST": ENV.get("DB_HOST", "127.0.0.1"),
        "PORT": int(ENV.get("DB_PORT", "3306")),
        "OPTIONS": {
            "charset": "utf8mb4",
        },
    }
}

LANGUAGE_CODE = "ru-ru"
TIME_ZONE = "Europe/Moscow"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
APPEND_SLASH = False
