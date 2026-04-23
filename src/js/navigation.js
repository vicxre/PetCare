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

const THEME_MODE_KEY = "themeMode";

function applyStoredTheme() {
    const isDarkTheme = localStorage.getItem(THEME_MODE_KEY) === "dark";
    document.body.classList.toggle("dark-theme", isDarkTheme);
    return isDarkTheme;
}

function applyThemeToggleIcon(button, isDarkTheme) {
    // В темной теме показываем солнце (переключение обратно в светлую)
    button.textContent = isDarkTheme ? "☀" : "☾";
    button.setAttribute("aria-label", isDarkTheme ? "Светлая тема" : "Темная тема");
    button.title = isDarkTheme ? "Светлая тема" : "Темная тема";
}

const isDarkTheme = applyStoredTheme();

document.querySelectorAll(".header-right, .header-actions").forEach((container) => {
    if (!container || container.querySelector(".theme-toggle-btn")) {
        return;
    }

    const toggleButton = document.createElement("button");
    toggleButton.type = "button";
    toggleButton.className = "theme-toggle-btn";
    applyThemeToggleIcon(toggleButton, isDarkTheme);

    toggleButton.addEventListener("click", () => {
        const nowDark = !document.body.classList.contains("dark-theme");
        document.body.classList.toggle("dark-theme", nowDark);
        localStorage.setItem(THEME_MODE_KEY, nowDark ? "dark" : "light");
        applyThemeToggleIcon(toggleButton, nowDark);
    });

    const profileButton = container.querySelector(".avatar-btn, .profile-btn");
    if (profileButton) {
        container.insertBefore(toggleButton, profileButton);
    } else {
        container.appendChild(toggleButton);
    }
});
