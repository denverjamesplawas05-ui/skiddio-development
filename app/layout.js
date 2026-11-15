import Script from "next/script";
import "./globals.css";

export const metadata = {
  title: "Skiddio - AI-Assisted Task & Schedule Manager",
  description: "Skiddio keeps your tasks and calendar in one place and automatically moves overdue tasks into your next free slot.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

// Applies the saved / system theme before first paint (no flash)
const themeInit = `
(function () {
  try {
    var saved = localStorage.getItem("skiddio-theme");
    var dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (saved === "dark" || (!saved && dark)) document.documentElement.setAttribute("data-theme", "dark");
  } catch (e) {}
})();
`;

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Script id="theme-init" strategy="beforeInteractive">{themeInit}</Script>
        {children}
      </body>
    </html>
  );
}
