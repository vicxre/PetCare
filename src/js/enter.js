const form = document.getElementById("loginForm");
const passwordInput = document.getElementById("password");
const passwordToggle = document.querySelector("[data-password-toggle]");
const API_BASE = "http://localhost:3000/api";

function getStoredAvatars() {
    try {
        return JSON.parse(localStorage.getItem("userAvatars")) || {};
    } catch (_error) {
        return {};
    }
}

function avatarKeyFor(user) {
    if (!user) return "";
    return String(user.login || user.email || user.user_id || "").trim().toLowerCase();
}

if (passwordInput && passwordToggle) {
    passwordToggle.addEventListener("click", function() {
        const isHidden = passwordInput.type === "password";
        passwordInput.type = isHidden ? "text" : "password";
        passwordToggle.textContent = isHidden ? "Скрыть" : "Показать";
        passwordToggle.setAttribute("aria-label", isHidden ? "Скрыть пароль" : "Показать пароль");
    });
}

if (form) {
    form.addEventListener("submit", async function(e) {
        e.preventDefault();

        const email = document.getElementById("email").value;
        const password = passwordInput.value;

        if (!email.includes("@")) {
            alert("Email должен содержать @");
            return;
        }

        if (password.length < 6) {
            alert("Пароль минимум 6 символов");
            return;
        }

        try {
            const response = await fetch(`${API_BASE}/auth/login`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    login: email.trim(),
                    password
                })
            });

            const data = await response.json();

            if (!response.ok) {
                alert(data.message || "Ошибка входа");
                return;
            }

            const avatars = getStoredAvatars();
            const mergedUser = {
                ...data.user,
                avatar: avatars[avatarKeyFor(data.user)] || data.user.avatar || ""
            };

            localStorage.setItem("user", JSON.stringify(mergedUser));
            alert(`Успешный вход, ${mergedUser.nickname}`);
            window.location.href = "main.html";
        } catch (error) {
            alert("Не удалось подключиться к серверу");
        }
    });
}
