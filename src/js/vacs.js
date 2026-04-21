const API_BASE = "http://localhost:3000/api";
const MONTH_NAMES = [
    "Январь",
    "Февраль",
    "Март",
    "Апрель",
    "Май",
    "Июнь",
    "Июль",
    "Август",
    "Сентябрь",
    "Октябрь",
    "Ноябрь",
    "Декабрь"
];

const vaccListEl = document.getElementById("vaccList");
const searchEl = document.getElementById("vaccSearch");
const profileBtn = document.getElementById("profileBtn");
const vacsHeaderAvatar = document.getElementById("vacsHeaderAvatar");
const monthNameEl = document.getElementById("monthName");
const calendarGridEl = document.getElementById("calendarGrid");
const prevMonthBtn = document.getElementById("prevMonthBtn");
const nextMonthBtn = document.getElementById("nextMonthBtn");

const addModal = document.getElementById("addVaccModal");
const openAddModalBtn = document.getElementById("openAddModalBtn");
const closeModalBtn = document.getElementById("closeModalBtn");
const addVaccForm = document.getElementById("addVaccForm");
const petSelect = document.getElementById("petSelect");
const dayVaccModal = document.getElementById("dayVaccModal");
const closeDayModalBtn = document.getElementById("closeDayModalBtn");
const dayVaccTitle = document.getElementById("dayVaccTitle");
const dayVaccList = document.getElementById("dayVaccList");
const EMPTY_AVATAR = "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=";

let pets = [];
let vaccinations = [];
let filteredVaccinations = [];
let calendarDate = new Date();

function getOwnerId() {
    try {
        const user = JSON.parse(localStorage.getItem("user"));
        return user && user.user_id ? Number(user.user_id) : null;
    } catch (_error) {
        return null;
    }
}

function updateHeaderAvatar() {
    if (!vacsHeaderAvatar) return;

    try {
        const user = JSON.parse(localStorage.getItem("user")) || {};
        if (user.avatar) {
            vacsHeaderAvatar.src = user.avatar;
            vacsHeaderAvatar.classList.remove("avatar-empty");
            return;
        }
    } catch (_error) {
        // ignore parse errors and show placeholder
    }

    vacsHeaderAvatar.src = EMPTY_AVATAR;
    vacsHeaderAvatar.classList.add("avatar-empty");
}

function normalizePetColor(colorText) {
    if (!colorText) return "#2e98a8";
    const c = String(colorText).trim().toLowerCase();
    const map = {
        "белый": "#f4f4f4",
        "черный": "#1f2933",
        "рыжий": "#f08a3e",
        "серый": "#7c8793",
        "коричневый": "#8a6143",
        "бежевый": "#d7b98f",
        "голубой": "#74bdd6",
        "зеленый": "#47a37b",
        "синий": "#2f6fa3",
        "красный": "#d14f45",
        "orange": "#f08a3e",
        "gray": "#7c8793",
        "grey": "#7c8793",
        "black": "#1f2933",
        "white": "#f4f4f4",
        "brown": "#8a6143",
        "beige": "#d7b98f",
        "blue": "#2f6fa3",
        "green": "#47a37b",
        "red": "#d14f45"
    };

    if (map[c]) return map[c];
    if (c.startsWith("#")) return c;
    return "#2e98a8";
}

function formatDate(dateValue) {
    const d = new Date(dateValue);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleDateString("ru-RU");
}

function getDayKey(dateValue) {
    const d = new Date(dateValue);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function renderVaccList(items) {
    if (!vaccListEl) return;

    if (!items.length) {
        vaccListEl.innerHTML = '<p class="empty-message">Вакцинаций пока нет.</p>';
        return;
    }

    vaccListEl.innerHTML = items.map((item) => `
        <article class="vacc-card">
            <div class="left-fields">
                <div class="left-field">Питомец</div>
                <div class="left-field">Название вакцинации</div>
                <div class="left-field">Стоимость</div>
            </div>
            <div class="right-fields">
                <div class="right-field">${item.pet_name}</div>
                <div class="right-field">${item.v_type}</div>
                <div class="right-field">${item.price == null ? "-" : `${item.price} р`}</div>
            </div>
        </article>
    `).join("");
}

function buildDayStyle(colors) {
    if (!colors.length) return "";
    if (colors.length === 1) return colors[0];

    const step = 100 / colors.length;
    const stops = colors.map((color, i) => {
        const start = (i * step).toFixed(2);
        const end = ((i + 1) * step).toFixed(2);
        return `${color} ${start}% ${end}%`;
    });

    return `linear-gradient(135deg, ${stops.join(", ")})`;
}

function renderCalendar() {
    if (!monthNameEl || !calendarGridEl) return;

    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    monthNameEl.textContent = `${MONTH_NAMES[month]} ${year}`;

    const monthVaccinations = vaccinations.filter((item) => {
        const d = new Date(item.v_date);
        return d.getFullYear() === year && d.getMonth() === month;
    });

    const dayColors = {};
    monthVaccinations.forEach((item) => {
        const key = getDayKey(item.v_date);
        if (!dayColors[key]) {
            dayColors[key] = [];
        }
        dayColors[key].push(normalizePetColor(item.pet_color));
    });

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startOffset = (firstDay.getDay() + 6) % 7;
    const daysInMonth = lastDay.getDate();
    const today = new Date();
    const todayKey = getDayKey(today);

    const cells = [];
    for (let i = 0; i < startOffset; i += 1) {
        cells.push('<div class="day-cell empty"></div>');
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
        const date = new Date(year, month, day);
        const dayKey = getDayKey(date);
        const colors = dayColors[dayKey] || [];
        const isVacc = colors.length > 0;
        const isToday = dayKey === todayKey;
        const bg = buildDayStyle(colors);

        cells.push(`
            <button
                class="day-cell ${isVacc ? "vacc" : ""} ${isToday ? "today" : ""}"
                type="button"
                ${isVacc ? `data-day-key="${dayKey}"` : "disabled"}
                style="${isVacc ? `background:${bg};` : ""}"
                aria-label="${isVacc ? `Показать вакцинации за ${formatDate(date)}` : `Дата ${day}`}"
            >
                ${day}
                ${isVacc ? '<span class="day-dot"></span>' : ""}
            </button>
        `);
    }

    calendarGridEl.innerHTML = cells.join("");
}

function openDayVaccModal(dayKey) {
    if (!dayVaccModal || !dayVaccList || !dayVaccTitle) return;

    const dayItems = vaccinations.filter((item) => getDayKey(item.v_date) === dayKey);
    const formattedDate = formatDate(dayKey);
    dayVaccTitle.textContent = `Вакцинации на ${formattedDate}`;

    if (!dayItems.length) {
        dayVaccList.innerHTML = '<p class="empty-message">На эту дату вакцинаций нет.</p>';
    } else {
        dayVaccList.innerHTML = dayItems
            .map(
                (item) => `
                    <article class="day-vacc-item">
                        <h4>${item.pet_name}</h4>
                        <p>Вакцинация: ${item.v_type}</p>
                        <p>Стоимость: ${item.price == null ? "-" : `${item.price} р`}</p>
                        <p>Дата: ${formatDate(item.v_date)}</p>
                    </article>
                `
            )
            .join("");
    }

    dayVaccModal.classList.remove("hidden");
}

function closeDayVaccModal() {
    if (dayVaccModal) {
        dayVaccModal.classList.add("hidden");
    }
}

function filterVaccinations() {
    const query = (searchEl ? searchEl.value : "").trim().toLowerCase();
    if (!query) {
        filteredVaccinations = [...vaccinations];
    } else {
        filteredVaccinations = vaccinations.filter((item) => {
            return (
                String(item.pet_name).toLowerCase().includes(query) ||
                String(item.v_type).toLowerCase().includes(query) ||
                String(item.price ?? "").toLowerCase().includes(query)
            );
        });
    }
    renderVaccList(filteredVaccinations);
}

function openModal() {
    if (addModal) addModal.classList.remove("hidden");
}

function closeModal() {
    if (addModal) addModal.classList.add("hidden");
    if (addVaccForm) addVaccForm.reset();
}

function fillPetSelect() {
    if (!petSelect) return;

    if (!pets.length) {
        petSelect.innerHTML = '<option value="">Нет питомцев</option>';
        return;
    }

    petSelect.innerHTML = pets.map((pet) => `<option value="${pet.pets_id}">${pet.name}</option>`).join("");
}

async function loadPets(ownerId) {
    const response = await fetch(`${API_BASE}/pets?owner_id=${ownerId}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Ошибка загрузки питомцев");
    pets = data.pets || [];
    fillPetSelect();
}

async function loadVaccinations(ownerId) {
    const response = await fetch(`${API_BASE}/vaccinations?owner_id=${ownerId}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Ошибка загрузки вакцинаций");
    vaccinations = data.vaccinations || [];
    filterVaccinations();
    renderCalendar();
}

async function addVaccination(event) {
    event.preventDefault();
    const ownerId = getOwnerId();
    if (!ownerId) {
        alert("Сначала войдите в аккаунт");
        window.location.href = "enter.html";
        return;
    }

    const payload = {
        owner_id: ownerId,
        pet_id: Number(petSelect.value),
        v_type: document.getElementById("vaccineTypeInput").value.trim(),
        v_date: document.getElementById("vaccineDateInput").value,
        price: document.getElementById("vaccinePriceInput").value
    };

    try {
        const response = await fetch(`${API_BASE}/vaccinations`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Ошибка добавления вакцинации");

        closeModal();
        await loadVaccinations(ownerId);
        alert("Вакцинация добавлена");
    } catch (error) {
        alert(error.message);
    }
}

if (profileBtn) {
    profileBtn.addEventListener("click", () => {
        window.location.href = "profile.html";
    });
}

if (searchEl) {
    searchEl.addEventListener("input", filterVaccinations);
}

if (prevMonthBtn) {
    prevMonthBtn.addEventListener("click", () => {
        calendarDate = new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1);
        renderCalendar();
    });
}

if (nextMonthBtn) {
    nextMonthBtn.addEventListener("click", () => {
        calendarDate = new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1);
        renderCalendar();
    });
}

if (openAddModalBtn) {
    openAddModalBtn.addEventListener("click", openModal);
}

if (closeModalBtn) {
    closeModalBtn.addEventListener("click", closeModal);
}

if (addModal) {
    addModal.addEventListener("click", (event) => {
        if (event.target === addModal) {
            closeModal();
        }
    });
}

if (calendarGridEl) {
    calendarGridEl.addEventListener("click", (event) => {
        const dayButton = event.target.closest("button[data-day-key]");
        if (!dayButton) return;

        openDayVaccModal(dayButton.dataset.dayKey);
    });
}

if (closeDayModalBtn) {
    closeDayModalBtn.addEventListener("click", closeDayVaccModal);
}

if (dayVaccModal) {
    dayVaccModal.addEventListener("click", (event) => {
        if (event.target === dayVaccModal) {
            closeDayVaccModal();
        }
    });
}

if (addVaccForm) {
    addVaccForm.addEventListener("submit", addVaccination);
}

window.addEventListener("DOMContentLoaded", async () => {
    const ownerId = getOwnerId();
    if (!ownerId) {
        alert("Сначала войдите в аккаунт");
        window.location.href = "enter.html";
        return;
    }

    updateHeaderAvatar();

    try {
        await loadPets(ownerId);
        await loadVaccinations(ownerId);
    } catch (error) {
        alert(error.message);
    }
});
