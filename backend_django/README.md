# PetCare Django Backend

Этот backend переписан с `Node.js + Express` на `Django + MySQL`, но оставляет те же маршруты `/api/...`, чтобы фронт из `src` продолжал работать без переписывания.

## Что здесь упрощено под защиту

- Используются обычные `function views`, а не DRF.
- Модели напрямую отображают уже существующие таблицы MySQL.
- Авторизация упрощена: вход и регистрация работают через те же `fetch`-запросы, что и раньше.
- Старые незахешированные пароли автоматически переводятся в хеш при успешном входе.

## Структура

- `petcare_django/settings.py` — настройка проекта и MySQL
- `api/models.py` — модели таблиц
- `api/views.py` — логика API
- `api/urls.py` — маршруты

## Установка

```cmd
cd /d C:\Users\kir\Desktop\PetCare\backend_django
python -m pip install Django==5.2.1 PyMySQL==1.1.1
```

Если хотите, можно ставить и через:

```cmd
python -m pip install -r requirements.txt
```

`.env` уже можно использовать готовый, он лежит в папке проекта.
Если нужно, его можно пересоздать из `.env.example`.

Пример:

```env
SECRET_KEY=django-insecure-change-me
DEBUG=True
DB_NAME=mydb
DB_USER=root
DB_PASSWORD=1989
DB_HOST=127.0.0.1
DB_PORT=3306
```

## База данных

Если база ещё не импортирована:

```cmd
cd /d C:\Users\kir\Desktop\PetCare\backend
mysql -u root -p < dbpets.sql
```

## Запуск

```cmd
cd /d C:\Users\kir\Desktop\PetCare\backend_django
python manage.py runserver 3000
```

Backend будет доступен по адресу:

```txt
http://localhost:3000/api/health
```

## Фронт

Фронт можно открыть как раньше:

```cmd
cd /d C:\Users\kir\Desktop\PetCare\src
start main.html
```

или через простой сервер:

```cmd
cd /d C:\Users\kir\Desktop\PetCare\src
python -m http.server 5500
```

## Что говорить на защите

1. `models.py` описывает таблицы MySQL в виде классов Django.
2. `urls.py` связывает URL с функциями.
3. `views.py` принимает запрос, проверяет данные, работает с БД через ORM и возвращает JSON.
4. Пароли хранятся не в открытом виде, а в виде хеша Django.
5. Фронт не пришлось переписывать, потому что API остался совместимым.
