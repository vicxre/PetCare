const form = document.getElementById("profileForm");
const nameInput = document.getElementById("name");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const avatarInput = document.getElementById("avatarInput");
const avatarPreview = document.getElementById("avatarPreview");
const headerAvatar = document.getElementById("headerAvatar");
const EMPTY_AVATAR = "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=";
const API_BASE = "http://localhost:3000/api";

function getStoredUser() {
    try {
        return JSON.parse(localStorage.getItem("user")) || {};
    } catch (_error) {
        return {};
    }
}

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

function setStoredUser(user) {
    localStorage.setItem("user", JSON.stringify(user));
}

function persistUserAvatar(user) {
    const key = avatarKeyFor(user);
    if (!key || !user || !user.avatar) return;

    const avatars = getStoredAvatars();
    avatars[key] = user.avatar;
    localStorage.setItem("userAvatars", JSON.stringify(avatars));
}

function updateAvatarImage(imageElement, avatar) {
    if (!imageElement) return;

    if (avatar) {
        imageElement.src = avatar;
        imageElement.classList.remove("avatar-empty");
        return;
    }

    imageElement.src = EMPTY_AVATAR;
    imageElement.classList.add("avatar-empty");
}

function loadUserData() {
    const user = getStoredUser();
    const storedAvatar = getStoredAvatars()[avatarKeyFor(user)] || user.avatar || "";

    if (!nameInput || !emailInput) return;

    // поддержка старых и новых полей пользователя
    nameInput.value = user.name || user.nickname || "";
    emailInput.value = user.email || user.login || "";

    if (storedAvatar && user.avatar !== storedAvatar) {
        user.avatar = storedAvatar;
        setStoredUser(user);
    }

    updateAvatarImage(avatarPreview, storedAvatar);
    updateAvatarImage(headerAvatar, storedAvatar);
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
            const user = getStoredUser();
            user.avatar = e.target.result;
            setStoredUser(user);
            persistUserAvatar(user);
            updateAvatarImage(avatarPreview, user.avatar);
            updateAvatarImage(headerAvatar, user.avatar);
        };

        reader.readAsDataURL(file);
    });
}

// отправка формы
if (form) {
    form.addEventListener("submit", async function(e) {
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

        if (!valid) return;

        const user = getStoredUser();
        if (!user.user_id) {
            alert("Не удалось определить пользователя. Войдите заново.");
            return;
        }

        try {
            const response = await fetch(`${API_BASE}/users/${user.user_id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    login: emailInput.value.trim(),
                    nickname: nameInput.value.trim(),
                    password: passwordInput && passwordInput.value ? passwordInput.value : undefined
                })
            });

            const data = await response.json();

            if (!response.ok) {
                if (response.status === 409) {
                    if (emailError) emailError.textContent = "Почта уже зарегистрирована";
                    return;
                }
                alert(data.message || "Не удалось сохранить профиль");
                return;
            }

            const updatedUser = {
                ...user,
                ...data.user,
                name: data.user.nickname,
                email: data.user.login,
                login: data.user.login,
                nickname: data.user.nickname
            };

            setStoredUser(updatedUser);
            persistUserAvatar(updatedUser);
            updateAvatarImage(avatarPreview, updatedUser.avatar);
            updateAvatarImage(headerAvatar, updatedUser.avatar);

            if (passwordInput) passwordInput.value = "";
            if (emailError) emailError.textContent = "";
            alert("Данные сохранены");
        } catch (_error) {
            alert("Не удалось подключиться к серверу");
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
