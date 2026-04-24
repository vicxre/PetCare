# PetCare

Учебный проект PetCare с фронтендом на статических HTML/CSS/JS-страницах и двумя вариантами backend:

- `backend_django` — основной и актуальный backend на Django + MySQL
- `backend` — старый backend на Node.js + Express + MySQL
- `src` — фронтенд

## Структура проекта

```text
PetCare/
  backend/          legacy backend на Node.js
  backend_django/   основной backend на Django
  src/              фронтенд
```

## Что запускать

Для текущей версии проекта используйте `backend_django`.

Запуск backend в `cmd`:

```cmd
cd /d C:\Users\kir\Desktop\PetCare\backend_django
.venv\Scripts\activate
python manage.py runserver 3000
```

Проверка:

```text
http://localhost:3000/api/health
```

Фронтенд:

```cmd
cd /d C:\Users\kir\Desktop\PetCare\src
start main.html
```

## База данных

Если база ещё не импортирована:

```cmd
cd /d C:\Users\kir\Desktop\PetCare\backend
mysql -u root -p < dbpets.sql
```

Ожидаемая база по умолчанию: `mydb`.

## Конфигурация

- `backend_django/.env.example` — пример настроек Django
- `backend/.env.example` — пример настроек Node.js backend

Для Django используется MySQL-пользователь, совместимый с `mysql_native_password`, чтобы проект запускался без `cryptography`.

## Дополнительно

- Подробности по Django backend: `backend_django/README.md`
- Подробности по legacy Node backend: `backend/README.md`
