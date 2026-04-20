const form = document.getElementById("profileForm");
const nameInput = document.getElementById("name");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const avatarInput = document.getElementById("avatarInput");
const avatarPreview = document.getElementById("avatarPreview");

function getStoredUser() {
    try {
        return JSON.parse(localStorage.getItem("user")) || {};
    } catch (_error) {
        return {};
    }
}

function setStoredUser(user) {
    localStorage.setItem("user", JSON.stringify(user));
}

function loadUserData() {
    const user = getStoredUser();

    if (!nameInput || !emailInput) return;

    // поддержка старых и новых полей пользователя
    nameInput.value = user.name || user.nickname || "";
    emailInput.value = user.email || user.login || "";

    if (avatarPreview && user.avatar) {
        avatarPreview.src = user.avatar;
    }
}

// загрузка данных
window.addEventListener("DOMContentLoaded", loadUserData);

// смена аватарки
if (avatarInput) {
    avatarInput.addEventListener("change", function() {
        const file = this.files && this.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(e) {
            if (avatarPreview) {
                avatarPreview.src = e.target.result;
            }

            const user = getStoredUser();
            user.avatar = e.target.result;
            setStoredUser(user);
        };

        reader.readAsDataURL(file);
    });
}

// отправка формы
if (form) {
    form.addEventListener("submit", function(e) {
        e.preventDefault();

        let valid = true;

        const nameError = document.getElementById("nameError");
        const emailError = document.getElementById("emailError");
        const passwordError = document.getElementById("passwordError");

        // NAME
        if (!nameInput || nameInput.value.trim().length < 2) {
            if (nameError) nameError.textContent = "Минимум 2 символа";
            valid = false;
        } else if (nameError) nameError.textContent = "";

        // EMAIL
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailInput || !emailRegex.test(emailInput.value.trim())) {
            if (emailError) emailError.textContent = "Некорректный email";
            valid = false;
        } else if (emailError) emailError.textContent = "";

        // PASSWORD
        if (passwordInput && passwordInput.value && passwordInput.value.length < 6) {
            if (passwordError) passwordError.textContent = "Минимум 6 символов";
            valid = false;
        } else if (passwordError) passwordError.textContent = "";

        if (valid) {
            const user = getStoredUser();

            user.name = nameInput.value.trim();
            user.nickname = nameInput.value.trim();
            user.email = emailInput.value.trim();
            user.login = emailInput.value.trim();

            if (passwordInput && passwordInput.value) {
                user.password = passwordInput.value;
            }

            setStoredUser(user);

            alert("Данные сохранены");
        }
    });
}

// ВЫХОД
const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
        localStorage.removeItem("user");
        window.location.href = "enter.html";
    });
}
