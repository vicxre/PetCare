const form = document.getElementById("loginForm");
const API_BASE = "http://localhost:3000/api";

if (form) {
    form.addEventListener("submit", async function(e) {
        e.preventDefault();

        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;

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

            localStorage.setItem("user", JSON.stringify(data.user));
            alert(`Успешный вход, ${data.user.nickname}`);
            window.location.href = "profile.html";
        } catch (error) {
            alert("Не удалось подключиться к серверу");
        }
    });
}
