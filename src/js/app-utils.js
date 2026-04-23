const API_BASE = "http://localhost:3000/api";
const EMPTY_AVATAR = "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=";

function readStorageJson(key, fallbackValue) {
    try {
        return JSON.parse(localStorage.getItem(key)) || fallbackValue;
    } catch (_error) {
        return fallbackValue;
    }
}

function writeStorageJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}

function getStoredUser() {
    return readStorageJson("user", null);
}

function getOwnerId() {
    const user = getStoredUser();
    return user && user.user_id ? Number(user.user_id) : null;
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

function updateHeaderAvatar(imageElement) {
    const user = getStoredUser() || {};
    updateAvatarImage(imageElement, user.avatar || "");
}

function requireUserOrRedirect(message) {
    if (getOwnerId()) return true;

    alert(message || "Сначала войдите в аккаунт");
    window.location.href = "enter.html";
    return false;
}

function getPetPhotos() {
    return readStorageJson("petPhotos", {});
}

function savePetPhotos(photos) {
    writeStorageJson("petPhotos", photos);
}

function formatRuDate(dateValue, fallbackText = "не указана") {
    if (!dateValue) return fallbackText;
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return fallbackText;
    return date.toLocaleDateString("ru-RU");
}
