const API_BASE = "http://localhost:3000/api";
const reportContainer = document.getElementById("reportContainer");

function getOwnerId() {
    try {
        const user = JSON.parse(localStorage.getItem("user"));
        return user && user.user_id ? Number(user.user_id) : null;
    } catch (_error) {
        return null;
    }
}

function renderReport({ petsCount, vaccinationsCount }) {
    if (!reportContainer) return;

    reportContainer.innerHTML = `
        <article class="report-item">
            <h3>Питомцы</h3>
            <p>Всего питомцев: ${petsCount}</p>
        </article>
        <article class="report-item">
            <h3>Вакцинации</h3>
            <p>Ближайших вакцинаций: ${vaccinationsCount}</p>
        </article>
    `;
}

async function loadReport() {
    const ownerId = getOwnerId();
    if (!ownerId) {
        if (reportContainer) {
            reportContainer.innerHTML = '<p>Сначала войдите в аккаунт.</p>';
        }
        return;
    }

    try {
        const [petsResponse, vaccResponse] = await Promise.all([
            fetch(`${API_BASE}/pets?owner_id=${ownerId}`),
            fetch(`${API_BASE}/vaccinations/upcoming?owner_id=${ownerId}&days=180`)
        ]);

        const petsData = await petsResponse.json();
        const vaccData = await vaccResponse.json();

        if (!petsResponse.ok) throw new Error(petsData.message || "Ошибка загрузки питомцев");
        if (!vaccResponse.ok) throw new Error(vaccData.message || "Ошибка загрузки вакцинаций");

        renderReport({
            petsCount: (petsData.pets || []).length,
            vaccinationsCount: (vaccData.vaccinations || []).length
        });
    } catch (error) {
        if (reportContainer) {
            reportContainer.innerHTML = `<p>${error.message}</p>`;
        }
    }
}

window.addEventListener("DOMContentLoaded", loadReport);
