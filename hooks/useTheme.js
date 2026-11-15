"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "skiddio-theme";

// The first data-theme value is set before paint by the script in app/layout.js.
export default function useTheme() {
  const [theme, setTheme] = useState("light");

  useEffect(() => {
    setTheme(document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light");
  }, []);

  const toggleTheme = useCallback(() => {
    const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
    if (next === "dark") document.documentElement.setAttribute("data-theme", "dark");
    else document.documentElement.removeAttribute("data-theme");
    try { localStorage.setItem(STORAGE_KEY, next); } catch (e) { /* storage unavailable */ }
    setTheme(next);
  }, []);

  return { theme, toggleTheme };
}
