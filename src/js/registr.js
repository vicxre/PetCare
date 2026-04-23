const form = document.getElementById("registerForm");
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

form.addEventListener("submit", async function(e) {
    e.preventDefault();

    let valid = true;

    const name = document.getElementById("name");
    const email = document.getElementById("email");
    const password = passwordInput;
    const agree = document.getElementById("agree");

    // ошибки
    const nameError = document.getElementById("nameError");
    const emailError = document.getElementById("emailError");
    const passwordError = document.getElementById("passwordError");
    const agreeError = document.getElementById("agreeError");

    // NAME
    if (name.value.trim().length < 2) {
        nameError.textContent = "Минимум 2 символа";
        valid = false;
    } else {
        nameError.textContent = "";
    }

    // EMAIL (регулярки)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.value)) {
        emailError.textContent = "Некорректный email";
        valid = false;
    } else {
        emailError.textContent = "";
    }

    // PASSWORD
    if (password.value.length < 6) {
        passwordError.textContent = "Минимум 6 символов";
        valid = false;
    } else {
        passwordError.textContent = "";
    }

    // CHECKBOX (🔥 главное условие)
    if (!agree.checked) {
        agreeError.textContent = "Необходимо согласие";
        valid = false;
    } else {
        agreeError.textContent = "";
    }

    if (valid) {
        nameError.textContent = "";
        emailError.textContent = "";
        try {
            const response = await fetch(`${API_BASE}/auth/register`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    login: email.value.trim(),
                    password: password.value,
                    nickname: name.value.trim()
                })
            });

            const data = await response.json();

            if (!response.ok) {
                if (response.status === 409) {
                    const serverMessage = data.message || "Пользователь уже существует";
                    if (data.field === "login") {
                        emailError.textContent = serverMessage;
                    } else if (data.field === "nickname") {
                        nameError.textContent = serverMessage;
                    } else {
                        emailError.textContent = serverMessage;
                    }
                    return;
                }
                emailError.textContent = data.message || "Ошибка регистрации";
                return;
            }

            const avatars = getStoredAvatars();
            const mergedUser = {
                ...data.user,
                avatar: avatars[avatarKeyFor(data.user)] || data.user.avatar || ""
            };

            localStorage.setItem("user", JSON.stringify(mergedUser));
            alert("Регистрация успешна");
            window.location.href = "main.html";
        } catch (error) {
            alert("Не удалось подключиться к серверу");
        }
    }
});
