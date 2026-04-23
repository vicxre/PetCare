const petsList = document.getElementById("petsList");
const vaccList = document.getElementById("vaccList");
const searchInput = document.getElementById("searchInput");

const addPetBtn = document.getElementById("addPetBtn");
const morePetsBtn = document.getElementById("morePetsBtn");
const moreVaccBtn = document.getElementById("moreVaccBtn");
const profileBtn = document.getElementById("profileBtn");

const petModal = document.getElementById("petModal");
const closeModalBtn = document.getElementById("closeModalBtn");
const petForm = document.getElementById("petForm");
const uploadPhotoBtn = document.getElementById("uploadPhotoBtn");
const petPhotoInput = document.getElementById("petPhoto");
const photoName = document.getElementById("photoName");
const mainHeaderAvatar = document.getElementById("mainHeaderAvatar");

let allPets = [];
let selectedPhoto = null;

function formatDate(value) {
    return formatRuDate(value);
}

function getAgeText(birthDate) {
    if (!birthDate) return "не указан";
    const born = new Date(birthDate);
    if (Number.isNaN(born.getTime())) return "не указан";

    const now = new Date();
    let years = now.getFullYear() - born.getFullYear();
    const monthDiff = now.getMonth() - born.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < born.getDate())) {
        years -= 1;
    }
    return years < 0 ? "не указан" : `${years} лет`;
}

function petPhotoFor(petId) {
    const photos = getPetPhotos();
    return photos[String(petId)] || "img/cat chair.jpg";
}

function renderPets(items) {
    if (!petsList) return;

    if (!items.length) {
        petsList.innerHTML = '<p class="empty-message">Питомцы не найдены</p>';
        return;
    }

    petsList.innerHTML = items
        .map((pet) => {
            return `
                <article class="pet-item">
                    <img class="pet-photo" src="${petPhotoFor(pet.pets_id)}" alt="${pet.name}">
                    <div class="pet-info">
                        <div class="pet-field">Имя: ${pet.name}</div>
                        <div class="pet-field">Возраст: ${getAgeText(pet.birth_date)}</div>
                        <div class="pet-field">Порода: ${pet.breed_name || "не указана"}</div>
                    </div>
                </article>
            `;
        })
        .join("");
}

function renderVaccinations(items) {
    if (!vaccList) return;

    if (!items.length) {
        vaccList.innerHTML = `
            <div class="vacc-row">
                <span>Нет записей</span>
                <span>-</span>
                <span>-</span>
            </div>
        `;
        return;
    }

    vaccList.innerHTML = items
        .map((vacc) => {
            return `
                <div class="vacc-row">
                    <span>${vacc.pet_name}</span>
                    <span>${formatDate(vacc.v_date)}</span>
                    <span>${vacc.v_type}</span>
                </div>
            `;
        })
        .join("");
}

async function loadPets() {
    try {
        const ownerId = getOwnerId();
        if (!ownerId) {
            throw new Error("Сначала войдите в аккаунт");
        }
        const response = await fetch(`${API_BASE}/pets?owner_id=${ownerId}`);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "Не удалось загрузить питомцев");
        }

        allPets = data.pets || [];
        renderPets(allPets);
    } catch (error) {
        if (petsList) {
            petsList.innerHTML = `<p class="empty-message">${error.message}</p>`;
        }
    }
}

async function loadVaccinations() {
    try {
        const ownerId = getOwnerId();
        if (!ownerId) {
            throw new Error("Сначала войдите в аккаунт");
        }
        const response = await fetch(`${API_BASE}/vaccinations/upcoming?owner_id=${ownerId}&days=120`);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "Не удалось загрузить вакцинации");
        }

        renderVaccinations(data.vaccinations || []);
    } catch (error) {
        if (vaccList) {
            vaccList.innerHTML = `
                <div class="vacc-row">
                    <span>Ошибка</span>
                    <span>-</span>
                    <span>${error.message}</span>
                </div>
            `;
        }
    }
}

function filterPets(query) {
    const q = query.trim().toLowerCase();
    if (!q) {
        renderPets(allPets);
        return;
    }

    const filtered = allPets.filter((pet) => {
        return (
            String(pet.name).toLowerCase().includes(q) ||
            String(pet.breed_name || "").toLowerCase().includes(q) ||
            String(pet.color || "").toLowerCase().includes(q)
        );
    });

    renderPets(filtered);
}

function openModal() {
    if (petModal) {
        petModal.classList.remove("hidden");
    }
}

function closeModal() {
    if (petModal) {
        petModal.classList.add("hidden");
    }
    if (petForm) {
        petForm.reset();
    }
    selectedPhoto = null;
    if (photoName) {
        photoName.textContent = "Файл не выбран";
    }
}

async function handleAddPet(event) {
    event.preventDefault();

    const ownerId = getOwnerId();
    if (!ownerId) {
        alert("Сначала войдите в аккаунт");
        window.location.href = "enter.html";
        return;
    }

    const payload = {
        owner_id: ownerId,
        name: document.getElementById("petName").value.trim(),
        birth_date: document.getElementById("petBirthDate").value || null,
        breed_name: document.getElementById("petBreed").value.trim(),
        weight: document.getElementById("petWeight").value,
        color: document.getElementById("petColor").value.trim(),
        notes: document.getElementById("petNotes").value.trim()
    };

    try {
        const response = await fetch(`${API_BASE}/pets`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "Не удалось добавить питомца");
        }

        if (selectedPhoto && data.pet && data.pet.pets_id) {
            const photos = getPetPhotos();
            photos[String(data.pet.pets_id)] = selectedPhoto;
            savePetPhotos(photos);
        }

        closeModal();
        await loadPets();
        alert("Питомец добавлен");
    } catch (error) {
        alert(error.message);
    }
}

if (profileBtn) {
    profileBtn.addEventListener("click", () => {
        window.location.href = "profile.html";
    });
}

if (morePetsBtn) {
    morePetsBtn.addEventListener("click", () => {
        window.location.href = "pets.html";
    });
}

if (moreVaccBtn) {
    moreVaccBtn.addEventListener("click", () => {
        window.location.href = "vacs.html";
    });
}

if (searchInput) {
    searchInput.addEventListener("input", () => {
        filterPets(searchInput.value);
    });
}

if (addPetBtn) {
    addPetBtn.addEventListener("click", openModal);
}

if (closeModalBtn) {
    closeModalBtn.addEventListener("click", closeModal);
}

if (petModal) {
    petModal.addEventListener("click", (event) => {
        if (event.target === petModal) {
            closeModal();
        }
    });
}

if (uploadPhotoBtn && petPhotoInput) {
    uploadPhotoBtn.addEventListener("click", () => {
        petPhotoInput.click();
    });

    petPhotoInput.addEventListener("change", () => {
        const file = petPhotoInput.files && petPhotoInput.files[0];
        if (!file) return;

        photoName.textContent = file.name;
        const reader = new FileReader();
        reader.onload = (event) => {
            selectedPhoto = event.target.result;
        };
        reader.readAsDataURL(file);
    });
}

if (petForm) {
    petForm.addEventListener("submit", handleAddPet);
}

window.addEventListener("DOMContentLoaded", async () => {
    if (!getOwnerId()) {
        alert("Войдите в аккаунт, чтобы добавлять и просматривать питомцев");
        window.location.href = "enter.html";
        return;
    }
    updateHeaderAvatar(mainHeaderAvatar);
    await loadPets();
    await loadVaccinations();
});
