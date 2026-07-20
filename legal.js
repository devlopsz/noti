(() => {
  const preferenceKey = "noti-preferences-v1";
  let preferences = {};
  try {
    preferences = JSON.parse(localStorage.getItem(preferenceKey) || "{}") || {};
  } catch (error) {
    console.warn("As preferências visuais do Noti não puderam ser carregadas.", error);
  }

  const theme = ["light", "dark", "coffee"].includes(preferences.theme) ? preferences.theme : "light";
  const accent = /^#[0-9a-f]{6}$/i.test(preferences.accent || "") ? preferences.accent : "#b98500";
  const logoByTheme = {
    light: "assets/dark-logo-noti.png",
    dark: "assets/white-logo-noti.png",
    coffee: "assets/coffee-logo-noti.png",
  };
  const faviconByTheme = {
    light: "assets/white-icon-noti.ico",
    dark: "assets/dark-icon-noti.ico",
    coffee: "assets/coffee-icon-noti.ico",
  };

  document.documentElement.dataset.theme = theme;
  document.documentElement.style.setProperty("--accent", accent);
  const logo = document.querySelector("[data-legal-logo]");
  const favicon = document.querySelector("link[rel='icon']");
  if (logo) logo.src = logoByTheme[theme];
  if (favicon) favicon.href = faviconByTheme[theme];

  if (preferences.fontDataUrl && preferences.fontFamily) {
    const family = String(preferences.fontFamily).replace(/["'\\]/g, "").trim();
    if (family) {
      const style = document.createElement("style");
      style.textContent = `@font-face{font-family:"${family}";src:url("${preferences.fontDataUrl}");font-display:swap}:root{--font:"${family}","SF Pro Text","SF Pro Display",-apple-system,BlinkMacSystemFont,"Helvetica Neue","Segoe UI",sans-serif}`;
      document.head.append(style);
    }
  }
})();
