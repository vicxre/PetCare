const form = document.getElementById("registerForm");
const API_BASE = "http://localhost:3000/api";

form.addEventListener("submit", async function(e) {
    e.preventDefault();

    let valid = true;

    const name = document.getElementById("name");
    const email = document.getElementById("email");
    const password = document.getElementById("password");
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
                alert(data.message || "Ошибка регистрации");
                return;
            }

            alert("Регистрация успешна");
            window.location.href = "enter.html";
        } catch (error) {
            alert("Не удалось подключиться к серверу");
        }
    }
});
