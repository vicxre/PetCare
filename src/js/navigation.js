const PAGE_MAP = {
    main: "main.html",
    pets: "pets.html",
    vacs: "vacs.html",
    report: "report.html",
    profile: "profile.html",
    enter: "enter.html",
    registr: "registr.html"
};

document.querySelectorAll("button[data-page], a[data-page]").forEach((element) => {
    element.addEventListener("click", (event) => {
        // Для <a> с обычным href не перехватываем переход.
        if (element.tagName === "A" && element.getAttribute("href")) {
            return;
        }

        event.preventDefault();
        const key = element.dataset.page;
        const target = PAGE_MAP[key] || key;
        if (target) {
            window.location.href = target;
        }
    });
});

const current = document.body.dataset.page;
if (current) {
    document.querySelectorAll(`button[data-page="${current}"], a[data-page="${current}"]`).forEach((el) => {
        el.classList.add("active");
    });
}
