# Backend (Node.js + MySQL)

## 1) Импорт готовой базы `dbpets.sql`

В PowerShell:

```powershell
cd c:\Users\kir\Desktop\PetCare\backend
mysql -u root -p < .\dbpets.sql
```

После этого в MySQL появится база `mydb` с таблицами из дампа.

## 2) Настройка backend

```powershell
cd c:\Users\kir\Desktop\PetCare\backend
copy .env.example .env
npm install
npm start
```

Если пароль у MySQL есть, укажи его в `.env` в `DB_PASSWORD`.

## 3) Хэширование уже существующих паролей

В дампе есть тестовый пользователь с обычным паролем. Чтобы перевести старые значения в bcrypt-хэш:

```powershell
cd c:\Users\kir\Desktop\PetCare\backend
npm run hash-passwords
```

## API

- `POST /api/auth/register`
  - body: `{ "login": "mail@example.com", "password": "123456", "nickname": "kir" }`
- `POST /api/auth/login`
  - body: `{ "login": "mail@example.com", "password": "123456" }`
