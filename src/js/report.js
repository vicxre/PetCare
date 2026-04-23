const reportContainer = document.getElementById("reportContainer");
const reportHeaderAvatar = document.getElementById("reportHeaderAvatar");
const downloadReportBtn = document.getElementById("downloadReportBtn");
let currentReportData = null;

function renderReport({ petsCount, vaccinationsCount, nearestVaccinationDate }) {
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
        <article class="report-item">
            <h3>Следующая вакцина</h3>
            <p>${nearestVaccinationDate || "Не запланирована"}</p>
        </article>
    `;
}

function makePdfBlobFromJpegDataUrl(dataUrl, width, height) {
    const base64 = dataUrl.split(",")[1];
    const binary = atob(base64);
    const imageBytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
        imageBytes[i] = binary.charCodeAt(i);
    }

    const parts = [];
    const offsets = [];
    let position = 0;

    function pushString(value) {
        const bytes = new TextEncoder().encode(value);
        parts.push(bytes);
        position += bytes.length;
    }

    function pushBytes(bytes) {
        parts.push(bytes);
        position += bytes.length;
    }

    function addObject(id, content) {
        offsets[id] = position;
        pushString(`${id} 0 obj\n${content}\nendobj\n`);
    }

    pushString("%PDF-1.4\n");

    addObject(1, "<< /Type /Catalog /Pages 2 0 R >>");
    addObject(2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
    addObject(
        3,
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] /Resources << /XObject << /Im0 5 0 R >> >> /Contents 4 0 R >>`
    );
    addObject(4, `<< /Length 35 >>\nstream\nq\n${width} 0 0 ${height} 0 0 cm\n/Im0 Do\nQ\nendstream`);

    offsets[5] = position;
    pushString(
        `5 0 obj\n<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${imageBytes.length} >>\nstream\n`
    );
    pushBytes(imageBytes);
    pushString("\nendstream\nendobj\n");

    const xrefStart = position;
    pushString(`xref\n0 6\n0000000000 65535 f \n`);
    for (let i = 1; i <= 5; i += 1) {
        pushString(`${String(offsets[i]).padStart(10, "0")} 00000 n \n`);
    }
    pushString(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`);

    return new Blob(parts, { type: "application/pdf" });
}

function downloadReportPdf() {
    if (!currentReportData) {
        alert("Сначала загрузите отчет");
        return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = 1240;
    canvas.height = 1754;
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#2d4254";
    ctx.font = "bold 42px Arial";
    ctx.fillText("PetCare - Краткий отчет", 80, 100);

    ctx.fillStyle = "#5a6d7d";
    ctx.font = "24px Arial";
    ctx.fillText(`Дата формирования: ${new Date().toLocaleDateString("ru-RU")}`, 80, 150);

    const lines = [
        `Всего питомцев: ${currentReportData.petsCount}`,
        `Ближайших вакцинаций: ${currentReportData.vaccinationsCount}`,
        `Следующая вакцина: ${currentReportData.nearestVaccinationDate || "Не запланирована"}`
    ];

    let y = 280;
    for (const line of lines) {
        ctx.fillStyle = "#bfd0cb";
        ctx.fillRect(80, y - 42, 1080, 86);
        ctx.fillStyle = "#2d4254";
        ctx.font = "30px Arial";
        ctx.fillText(line, 110, y + 10);
        y += 130;
    }

    ctx.fillStyle = "#2e98a8";
    ctx.font = "22px Arial";
    ctx.fillText("PetCare", 80, 1660);

    const jpegDataUrl = canvas.toDataURL("image/jpeg", 0.92);
    const pdfBlob = makePdfBlobFromJpegDataUrl(jpegDataUrl, canvas.width, canvas.height);
    const link = document.createElement("a");
    link.href = URL.createObjectURL(pdfBlob);
    link.download = "petcare-report.pdf";
    link.click();
    URL.revokeObjectURL(link.href);
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

        const pets = petsData.pets || [];
        const vaccs = vaccData.vaccinations || [];
        const nearestVaccinationDate = vaccs.length
            ? formatRuDate(vaccs[0].v_date)
            : null;

        currentReportData = {
            petsCount: pets.length,
            vaccinationsCount: vaccs.length,
            nearestVaccinationDate
        };

        renderReport(currentReportData);
    } catch (error) {
        if (reportContainer) {
            reportContainer.innerHTML = `<p>${error.message}</p>`;
        }
    }
}

if (downloadReportBtn) {
    downloadReportBtn.addEventListener("click", downloadReportPdf);
}

window.addEventListener("DOMContentLoaded", () => {
    updateHeaderAvatar(reportHeaderAvatar);
    loadReport();
});
