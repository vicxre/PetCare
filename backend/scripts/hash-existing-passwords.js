const bcrypt = require("bcryptjs");
const pool = require("../db");

const SALT_ROUNDS = 12;

async function run() {
  const [rows] = await pool.query("SELECT user_id, password FROM users");

  let updated = 0;

  for (const row of rows) {
    const plainPassword = String(row.password || "");
    const looksHashed = plainPassword.startsWith("$2a$") || plainPassword.startsWith("$2b$") || plainPassword.startsWith("$2y$");

    if (looksHashed) {
      continue;
    }

    const hashed = await bcrypt.hash(plainPassword, SALT_ROUNDS);
    await pool.query("UPDATE users SET password = ? WHERE user_id = ?", [hashed, row.user_id]);
    updated += 1;
  }

  console.log(`Готово. Обновлено пользователей: ${updated}`);
  await pool.end();
}

run().catch(async (error) => {
  console.error("Ошибка миграции паролей:", error);
  try {
    await pool.end();
  } catch (_e) {
    // ignore pool close errors
  }
  process.exit(1);
});
