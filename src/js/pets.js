const API_BASE = "http://localhost:3000/api";
const petsContainer = document.getElementById("petsContainer");

function getOwnerId() {
    try {
        const user = JSON.parse(localStorage.getItem("user"));
        return user && user.user_id ? Number(user.user_id) : null;
    } catch (_error) {
        return null;
    }
}

function renderPets(pets) {
    if (!petsContainer) return;

    if (!pets.length) {
        petsContainer.innerHTML = '<p class="empty">Питомцев пока нет.</p>';
        return;
    }

    petsContainer.innerHTML = pets.map((pet) => `
        <article class="pet-item">
            <strong>${pet.name}</strong>
            <span>Порода: ${pet.breed_name || "не указана"}</span>
            <span>Дата рождения: ${pet.birth_date ? new Date(pet.birth_date).toLocaleDateString("ru-RU") : "не указана"}</span>
            <span>Вес: ${pet.weight ?? "не указан"}</span>
            <span>Окрас: ${pet.color || "не указан"}</span>
        </article>
    `).join("");
}

async function loadPets() {
    const ownerId = getOwnerId();
    if (!ownerId) {
        if (petsContainer) {
            petsContainer.innerHTML = '<p class="empty">Сначала войдите в аккаунт.</p>';
        }
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/pets?owner_id=${ownerId}`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Ошибка загрузки");
        renderPets(data.pets || []);
    } catch (error) {
        if (petsContainer) {
            petsContainer.innerHTML = `<p class="empty">${error.message}</p>`;
        }
    }
}

window.addEventListener("DOMContentLoaded", loadPets);
