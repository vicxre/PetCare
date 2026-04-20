const API_BASE = "http://localhost:3000/api";
const petsContainer = document.getElementById("petsContainer");
const petsSearchInput = document.getElementById("petsSearchInput");
const petsSortSelect = document.getElementById("petsSortSelect");
const editPetModal = document.getElementById("editPetModal");
const closeEditModalBtn = document.getElementById("closeEditModalBtn");
const editPetForm = document.getElementById("editPetForm");

let allPets = [];
let filteredPets = [];

function getOwnerId() {
    try {
        const user = JSON.parse(localStorage.getItem("user"));
        return user && user.user_id ? Number(user.user_id) : null;
    } catch (_error) {
        return null;
    }
}

function formatDate(dateValue) {
    if (!dateValue) return "не указана";
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return "не указана";
    return date.toLocaleDateString("ru-RU");
}

function renderPets(pets) {
    if (!petsContainer) return;

    if (!pets.length) {
        petsContainer.innerHTML = '<p class="empty">Питомцев пока нет.</p>';
        return;
    }

    petsContainer.innerHTML = pets
        .map((pet) => {
            return `
                <article class="pet-item" data-pet-id="${pet.pets_id}">
                    <div class="pet-title">${pet.name}</div>
                    <div class="pet-meta">
                        <div class="pet-meta-item"><strong>Порода:</strong> ${pet.breed_name || "не указана"}</div>
                        <div class="pet-meta-item"><strong>Дата рождения:</strong> ${formatDate(pet.birth_date)}</div>
                        <div class="pet-meta-item"><strong>Вес:</strong> ${pet.weight ?? "не указан"} кг</div>
                        <div class="pet-meta-item"><strong>Окрас:</strong> ${pet.color || "не указан"}</div>
                        <div class="pet-meta-item"><strong>Заметки:</strong> ${pet.notes || "нет"}</div>
                    </div>
                    <div class="pet-actions">
                        <button class="pet-action-btn edit" data-action="edit" data-pet-id="${pet.pets_id}">Изменить</button>
                        <button class="pet-action-btn delete" data-action="delete" data-pet-id="${pet.pets_id}">Удалить</button>
                    </div>
                </article>
            `;
        })
        .join("");
}

function openEditModal(pet) {
    if (!editPetModal || !pet) return;

    document.getElementById("editPetId").value = pet.pets_id;
    document.getElementById("editPetName").value = pet.name || "";
    document.getElementById("editPetBirthDate").value = pet.birth_date ? String(pet.birth_date).slice(0, 10) : "";
    document.getElementById("editPetBreed").value = pet.breed_name || "";
    document.getElementById("editPetWeight").value = pet.weight ?? "";
    document.getElementById("editPetColor").value = pet.color || "";
    document.getElementById("editPetNotes").value = pet.notes || "";
    editPetModal.classList.remove("hidden");
}

function closeEditModal() {
    if (editPetModal) {
        editPetModal.classList.add("hidden");
    }
    if (editPetForm) {
        editPetForm.reset();
    }
}

function applyFilter() {
    const query = String(petsSearchInput ? petsSearchInput.value : "").trim().toLowerCase();
    const tokens = query ? query.split(/\s+/).filter(Boolean) : [];
    const sortType = petsSortSelect ? petsSortSelect.value : "newest";

    filteredPets = [...allPets].filter((pet) => {
        if (!tokens.length) return true;

        const haystack = [
            pet.name || "",
            pet.breed_name || "",
            pet.color || "",
            pet.notes || ""
        ]
            .join(" ")
            .toLowerCase();

        return tokens.every((token) => haystack.includes(token));
    });

    filteredPets.sort((a, b) => {
        if (sortType === "name-asc") return String(a.name || "").localeCompare(String(b.name || ""), "ru");
        if (sortType === "name-desc") return String(b.name || "").localeCompare(String(a.name || ""), "ru");
        if (sortType === "weight-asc") return (Number(a.weight) || 0) - (Number(b.weight) || 0);
        if (sortType === "weight-desc") return (Number(b.weight) || 0) - (Number(a.weight) || 0);
        if (sortType === "oldest") return Number(a.pets_id) - Number(b.pets_id);
        return Number(b.pets_id) - Number(a.pets_id);
    });

    renderPets(filteredPets);
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
        allPets = data.pets || [];
        applyFilter();
    } catch (error) {
        if (petsContainer) {
            petsContainer.innerHTML = `<p class="empty">${error.message}</p>`;
        }
    }
}

async function deletePet(petId) {
    const ownerId = getOwnerId();
    if (!ownerId) {
        alert("Сначала войдите в аккаунт");
        return;
    }

    const confirmDelete = window.confirm("Удалить питомца? Это действие необратимо.");
    if (!confirmDelete) return;

    try {
        const response = await fetch(`${API_BASE}/pets/${petId}?owner_id=${ownerId}`, {
            method: "DELETE"
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Ошибка удаления");
        await loadPets();
    } catch (error) {
        alert(error.message);
    }
}

async function savePetChanges(event) {
    event.preventDefault();

    const ownerId = getOwnerId();
    if (!ownerId) {
        alert("Сначала войдите в аккаунт");
        return;
    }

    const petId = Number(document.getElementById("editPetId").value);
    const payload = {
        owner_id: ownerId,
        name: document.getElementById("editPetName").value.trim(),
        birth_date: document.getElementById("editPetBirthDate").value || null,
        breed_name: document.getElementById("editPetBreed").value.trim(),
        weight: document.getElementById("editPetWeight").value,
        color: document.getElementById("editPetColor").value.trim(),
        notes: document.getElementById("editPetNotes").value.trim()
    };

    try {
        const response = await fetch(`${API_BASE}/pets/${petId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Ошибка обновления");

        closeEditModal();
        await loadPets();
    } catch (error) {
        alert(error.message);
    }
}

if (petsContainer) {
    petsContainer.addEventListener("click", (event) => {
        const button = event.target.closest("button[data-action]");
        if (!button) return;

        const petId = Number(button.dataset.petId);
        const action = button.dataset.action;

        if (action === "delete") {
            deletePet(petId);
            return;
        }

        if (action === "edit") {
            const pet = allPets.find((item) => Number(item.pets_id) === petId);
            openEditModal(pet);
        }
    });
}

if (petsSearchInput) {
    petsSearchInput.addEventListener("input", applyFilter);
}

if (petsSortSelect) {
    petsSortSelect.addEventListener("change", applyFilter);
}

if (closeEditModalBtn) {
    closeEditModalBtn.addEventListener("click", closeEditModal);
}

if (editPetModal) {
    editPetModal.addEventListener("click", (event) => {
        if (event.target === editPetModal) {
            closeEditModal();
        }
    });
}

if (editPetForm) {
    editPetForm.addEventListener("submit", savePetChanges);
}

window.addEventListener("DOMContentLoaded", loadPets);
