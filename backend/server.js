const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const dotenv = require("dotenv");
const pool = require("./db");

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 3000);
const SALT_ROUNDS = 12;

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/api/auth/register", async (req, res) => {
  const { login, password, nickname } = req.body || {};

  if (!login || !password || !nickname) {
    return res.status(400).json({ message: "Заполните e-mail, пароль и имя" });
  }

  if (String(password).length < 6) {
    return res.status(400).json({ message: "Пароль должен быть минимум 6 символов" });
  }

  try {
    const hashedPassword = await bcrypt.hash(String(password), SALT_ROUNDS);

    const [result] = await pool.query(
      "INSERT INTO users (login, password, nickname) VALUES (?, ?, ?)",
      [String(login).trim(), hashedPassword, String(nickname).trim()]
    );

    return res.status(201).json({
      message: "Пользователь создан",
      user: {
        user_id: result.insertId,
        login: String(login).trim(),
        nickname: String(nickname).trim(),
        role: "user"
      }
    });
  } catch (error) {
    if (error && error.code === "ER_DUP_ENTRY") {
      const duplicateKey = String(error.message || "");
      if (duplicateKey.includes("login_UNIQUE")) {
        return res.status(409).json({ message: "Такая почта уже зарегистрирована", field: "login" });
      }
      if (duplicateKey.includes("nickname_UNIQUE")) {
        return res.status(409).json({ message: "Такой ник уже существует", field: "nickname" });
      }
      return res.status(409).json({ message: "Такой e-mail уже зарегистрирован" });
    }
    return res.status(500).json({ message: "Ошибка сервера", error: error.message });
  }
});

app.post("/api/auth/login", async (req, res) => {
  const { login, password } = req.body || {};

  if (!login || !password) {
    return res.status(400).json({ message: "Введите e-mail и пароль" });
  }

  try {
    const [rows] = await pool.query(
      "SELECT user_id, login, nickname, role, password FROM users WHERE login = ? LIMIT 1",
      [String(login).trim()]
    );

    if (!rows.length) {
      return res.status(401).json({ message: "Неверный логин или пароль" });
    }

    const user = rows[0];
    const isPasswordValid = await bcrypt.compare(String(password), user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ message: "Неверный логин или пароль" });
    }

    return res.json({
      message: "Успешный вход",
      user: {
        user_id: user.user_id,
        login: user.login,
        nickname: user.nickname,
        role: user.role
      }
    });
  } catch (error) {
    return res.status(500).json({ message: "Ошибка сервера", error: error.message });
  }
});

app.put("/api/users/:userId", async (req, res) => {
  const userId = Number(req.params.userId);
  const { login, nickname, password } = req.body || {};
  const normalizedLogin = String(login || "").trim();
  const normalizedNickname = String(nickname || "").trim();

  if (!userId || !normalizedLogin || !normalizedNickname) {
    return res.status(400).json({ message: "Заполните user_id, e-mail и имя" });
  }

  if (password && String(password).length < 6) {
    return res.status(400).json({ message: "Пароль должен быть минимум 6 символов" });
  }

  try {
    const [userRows] = await pool.query("SELECT user_id FROM users WHERE user_id = ? LIMIT 1", [userId]);
    if (!userRows.length) {
      return res.status(404).json({ message: "Пользователь не найден" });
    }

    const [loginRows] = await pool.query("SELECT user_id FROM users WHERE login = ? AND user_id <> ? LIMIT 1", [
      normalizedLogin,
      userId
    ]);
    if (loginRows.length) {
      return res.status(409).json({ message: "Почта уже зарегистрирована" });
    }

    if (password) {
      const hashedPassword = await bcrypt.hash(String(password), SALT_ROUNDS);
      await pool.query("UPDATE users SET login = ?, nickname = ?, password = ? WHERE user_id = ?", [
        normalizedLogin,
        normalizedNickname,
        hashedPassword,
        userId
      ]);
    } else {
      await pool.query("UPDATE users SET login = ?, nickname = ? WHERE user_id = ?", [
        normalizedLogin,
        normalizedNickname,
        userId
      ]);
    }

    const [updatedRows] = await pool.query("SELECT user_id, login, nickname, role FROM users WHERE user_id = ? LIMIT 1", [userId]);
    return res.json({
      message: "Профиль обновлен",
      user: updatedRows[0]
    });
  } catch (error) {
    if (error && error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ message: "Почта уже зарегистрирована" });
    }
    return res.status(500).json({ message: "Ошибка сервера", error: error.message });
  }
});

app.get("/api/pets", async (req, res) => {
  const ownerId = Number(req.query.owner_id);

  if (!ownerId) {
    return res.status(400).json({ message: "Нужен owner_id" });
  }

  try {
    const [rows] = await pool.query(
      `SELECT p.pets_id, p.name, p.birth_date, p.weight, p.color, p.notes,
              b.breed_name
       FROM pets p
       JOIN breeds b ON b.breed_id = p.breed_id
       WHERE p.owner_id = ?
       ORDER BY p.pets_id DESC`,
      [ownerId]
    );

    return res.json({ pets: rows });
  } catch (error) {
    return res.status(500).json({ message: "Ошибка сервера", error: error.message });
  }
});

async function resolveBreedId(connection, breedName) {
  const normalizedBreed = String(breedName || "").trim();
  const [breedRows] = await connection.query("SELECT breed_id FROM breeds WHERE breed_name = ? LIMIT 1", [normalizedBreed]);
  if (breedRows.length) {
    return breedRows[0].breed_id;
  }

  const [insertBreedResult] = await connection.query("INSERT INTO breeds (breed_name) VALUES (?)", [normalizedBreed]);
  return insertBreedResult.insertId;
}

app.post("/api/pets", async (req, res) => {
  const { owner_id, name, birth_date, breed_name, weight, color, notes } = req.body || {};
  const ownerId = Number(owner_id);
  const normalizedName = String(name || "").trim();
  const normalizedBreed = String(breed_name || "").trim();
  const normalizedColor = color ? String(color).trim() : null;
  const normalizedNotes = notes ? String(notes).trim() : null;
  const normalizedWeightRaw = String(weight ?? "").trim().replace(",", ".");
  const normalizedWeight =
    normalizedWeightRaw === "" ? null : Number.isFinite(Number(normalizedWeightRaw)) ? Number(normalizedWeightRaw) : NaN;

  if (!ownerId || !normalizedName || !normalizedBreed) {
    return res.status(400).json({ message: "Заполните owner_id, name, breed_name" });
  }

  if (!Number.isFinite(ownerId) || ownerId <= 0) {
    return res.status(400).json({ message: "Некорректный owner_id" });
  }

  if (!Number.isFinite(normalizedWeight) && normalizedWeight !== null) {
    return res.status(400).json({ message: "Вес должен быть числом (например 5.5)" });
  }

  try {
    const [ownerRows] = await pool.query("SELECT user_id FROM users WHERE user_id = ? LIMIT 1", [ownerId]);
    if (!ownerRows.length) {
      return res.status(400).json({ message: "Пользователь owner_id не найден" });
    }

    const connection = await pool.getConnection();
    let breedId;
    try {
      breedId = await resolveBreedId(connection, normalizedBreed);
    } finally {
      connection.release();
    }

    const [result] = await pool.query(
      `INSERT INTO pets (name, birth_date, owner_id, breed_id, weight, color, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        normalizedName,
        birth_date || null,
        ownerId,
        breedId,
        normalizedWeight,
        normalizedColor,
        normalizedNotes
      ]
    );

    return res.status(201).json({
      message: "Питомец добавлен",
      pet: {
        pets_id: result.insertId,
        name: normalizedName,
        birth_date: birth_date || null,
        owner_id: ownerId,
        breed_name: normalizedBreed,
        weight: normalizedWeight,
        color: normalizedColor,
        notes: normalizedNotes
      }
    });
  } catch (error) {
    if (error && error.code === "ER_NO_REFERENCED_ROW_2") {
      return res.status(400).json({ message: "Неверная ссылка на владельца или породу" });
    }
    return res.status(500).json({ message: "Ошибка сервера", error: `${error.code || "UNKNOWN"}: ${error.message}` });
  }
});

app.put("/api/pets/:petId", async (req, res) => {
  const petId = Number(req.params.petId);
  const { owner_id, name, birth_date, breed_name, weight, color, notes } = req.body || {};
  const ownerId = Number(owner_id);
  const normalizedName = String(name || "").trim();
  const normalizedBreed = String(breed_name || "").trim();
  const normalizedColor = color ? String(color).trim() : null;
  const normalizedNotes = notes ? String(notes).trim() : null;
  const normalizedWeightRaw = String(weight ?? "").trim().replace(",", ".");
  const normalizedWeight =
    normalizedWeightRaw === "" ? null : Number.isFinite(Number(normalizedWeightRaw)) ? Number(normalizedWeightRaw) : NaN;

  if (!petId || !ownerId || !normalizedName || !normalizedBreed) {
    return res.status(400).json({ message: "Заполните pet_id, owner_id, name, breed_name" });
  }

  if (!Number.isFinite(normalizedWeight) && normalizedWeight !== null) {
    return res.status(400).json({ message: "Вес должен быть числом (например 5.5)" });
  }

  let connection;

  try {
    const [petRows] = await pool.query("SELECT pets_id, owner_id FROM pets WHERE pets_id = ? LIMIT 1", [petId]);
    if (!petRows.length) {
      return res.status(404).json({ message: "Питомец не найден" });
    }
    if (Number(petRows[0].owner_id) !== ownerId) {
      return res.status(403).json({ message: "Нельзя редактировать чужого питомца" });
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    const breedId = await resolveBreedId(connection, normalizedBreed);

    await connection.query(
      `UPDATE pets
       SET name = ?, birth_date = ?, breed_id = ?, weight = ?, color = ?, notes = ?
       WHERE pets_id = ?`,
      [normalizedName, birth_date || null, breedId, normalizedWeight, normalizedColor, normalizedNotes, petId]
    );

    await connection.commit();

    return res.json({
      message: "Питомец обновлен",
      pet: {
        pets_id: petId,
        name: normalizedName,
        birth_date: birth_date || null,
        owner_id: ownerId,
        breed_name: normalizedBreed,
        weight: normalizedWeight,
        color: normalizedColor,
        notes: normalizedNotes
      }
    });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    return res.status(500).json({ message: "Ошибка сервера", error: `${error.code || "UNKNOWN"}: ${error.message}` });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

app.delete("/api/pets/:petId", async (req, res) => {
  const petId = Number(req.params.petId);
  const ownerId = Number(req.query.owner_id);

  if (!petId || !ownerId) {
    return res.status(400).json({ message: "Нужны pet_id и owner_id" });
  }

  let connection;

  try {
    const [petRows] = await pool.query("SELECT pets_id, owner_id FROM pets WHERE pets_id = ? LIMIT 1", [petId]);
    if (!petRows.length) {
      return res.status(404).json({ message: "Питомец не найден" });
    }
    if (Number(petRows[0].owner_id) !== ownerId) {
      return res.status(403).json({ message: "Нельзя удалить чужого питомца" });
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [vacsRows] = await connection.query("SELECT id FROM vacs WHERE pet_id = ?", [petId]);
    const vacIds = vacsRows.map((row) => row.id);

    await connection.query("DELETE FROM pet_health WHERE pet_id = ?", [petId]);
    if (vacIds.length) {
      await connection.query("DELETE FROM pet_health WHERE vacs_id IN (?)", [vacIds]);
    }
    await connection.query("DELETE FROM vacs WHERE pet_id = ?", [petId]);
    await connection.query("DELETE FROM pets WHERE pets_id = ?", [petId]);

    await connection.commit();

    return res.json({ message: "Питомец удален" });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    return res.status(500).json({ message: "Ошибка сервера", error: `${error.code || "UNKNOWN"}: ${error.message}` });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

app.get("/api/vaccinations/upcoming", async (req, res) => {
  const ownerId = Number(req.query.owner_id);
  const days = Number(req.query.days || 60);

  if (!ownerId) {
    return res.status(400).json({ message: "Нужен owner_id" });
  }

  try {
    const [rows] = await pool.query(
      `SELECT v.id AS vaccination_id, p.pets_id AS pet_id, p.name AS pet_name, p.color AS pet_color, ph.v_date, v.v_type, v.price
       FROM pet_health ph
       JOIN pets p ON p.pets_id = ph.pet_id
       JOIN vacs v ON v.id = ph.vacs_id
       WHERE p.owner_id = ?
         AND ph.v_date >= CURDATE()
         AND ph.v_date <= DATE_ADD(CURDATE(), INTERVAL ? DAY)
       ORDER BY ph.v_date ASC
       LIMIT 20`,
      [ownerId, days]
    );

    return res.json({ vaccinations: rows });
  } catch (error) {
    return res.status(500).json({ message: "Ошибка сервера", error: error.message });
  }
});

app.get("/api/vaccinations", async (req, res) => {
  const ownerId = Number(req.query.owner_id);

  if (!ownerId) {
    return res.status(400).json({ message: "Нужен owner_id" });
  }

  try {
    const [rows] = await pool.query(
      `SELECT v.id AS vaccination_id, p.pets_id AS pet_id, p.name AS pet_name, p.color AS pet_color,
              ph.v_date, v.v_type, v.price
       FROM pet_health ph
       JOIN pets p ON p.pets_id = ph.pet_id
       JOIN vacs v ON v.id = ph.vacs_id
       WHERE p.owner_id = ?
       ORDER BY ph.v_date DESC, ph.id DESC`,
      [ownerId]
    );

    return res.json({ vaccinations: rows });
  } catch (error) {
    return res.status(500).json({ message: "Ошибка сервера", error: error.message });
  }
});

app.delete("/api/vaccinations/:vaccinationId", async (req, res) => {
  const vaccinationId = Number(req.params.vaccinationId);
  const ownerId = Number(req.query.owner_id);

  if (!vaccinationId || !ownerId) {
    return res.status(400).json({ message: "Нужны vaccination_id и owner_id" });
  }

  let connection;

  try {
    const [vaccRows] = await pool.query(
      `SELECT v.id
       FROM vacs v
       JOIN pets p ON p.pets_id = v.pet_id
       WHERE v.id = ? AND p.owner_id = ?
       LIMIT 1`,
      [vaccinationId, ownerId]
    );

    if (!vaccRows.length) {
      return res.status(404).json({ message: "Вакцинация не найдена" });
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    await connection.query("DELETE FROM pet_health WHERE vacs_id = ?", [vaccinationId]);
    await connection.query("DELETE FROM vacs WHERE id = ?", [vaccinationId]);

    await connection.commit();
    return res.json({ message: "Вакцинация удалена" });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    return res.status(500).json({ message: "Ошибка сервера", error: `${error.code || "UNKNOWN"}: ${error.message}` });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

app.post("/api/vaccinations", async (req, res) => {
  const { owner_id, pet_id, v_type, v_date, price } = req.body || {};
  const ownerId = Number(owner_id);
  const petId = Number(pet_id);
  const vaccineType = String(v_type || "").trim();
  const vaccineDate = String(v_date || "").trim();
  const normalizedPriceRaw = String(price ?? "").trim().replace(",", ".");
  const normalizedPrice =
    normalizedPriceRaw === "" ? null : Number.isFinite(Number(normalizedPriceRaw)) ? Number(normalizedPriceRaw) : NaN;

  if (!ownerId || !petId || !vaccineType || !vaccineDate) {
    return res.status(400).json({ message: "Заполните owner_id, pet_id, v_type, v_date" });
  }

  if (!Number.isFinite(normalizedPrice) && normalizedPrice !== null) {
    return res.status(400).json({ message: "Цена должна быть числом (например 1200)" });
  }

  let connection;

  try {
    const [petRows] = await pool.query("SELECT pets_id, owner_id FROM pets WHERE pets_id = ? LIMIT 1", [petId]);
    if (!petRows.length) {
      return res.status(400).json({ message: "Питомец не найден" });
    }
    if (Number(petRows[0].owner_id) !== ownerId) {
      return res.status(403).json({ message: "Питомец не принадлежит этому пользователю" });
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [insertVacsResult] = await connection.query(
      "INSERT INTO vacs (v_type, pet_id, price) VALUES (?, ?, ?)",
      [vaccineType, petId, normalizedPrice]
    );

    await connection.query("INSERT INTO pet_health (pet_id, vacs_id, v_date) VALUES (?, ?, ?)", [
      petId,
      insertVacsResult.insertId,
      vaccineDate
    ]);

    await connection.commit();

    return res.status(201).json({
      message: "Вакцинация добавлена",
      vaccination: {
        id: insertVacsResult.insertId,
        pet_id: petId,
        v_type: vaccineType,
        price: normalizedPrice,
        v_date: vaccineDate
      }
    });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    return res.status(500).json({ message: "Ошибка сервера", error: `${error.code || "UNKNOWN"}: ${error.message}` });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

app.listen(PORT, () => {
  console.log(`Backend запущен: http://localhost:${PORT}`);
});
