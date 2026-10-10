export const THEME_KEY = "hireflow-theme";

/** Runs before first paint (see app/layout.tsx): the saved choice, else the system setting. */
export const themeScript = `try{var t=localStorage.getItem("${THEME_KEY}");if(t==="dark"||(!t&&matchMedia("(prefers-color-scheme: dark)").matches))document.documentElement.classList.add("dark")}catch(e){}`;
