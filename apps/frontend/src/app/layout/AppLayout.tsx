import { NavLink, Outlet } from "react-router-dom";

const navItems = [
  { to: "/", label: "Start", end: true },
  { to: "/personen", label: "Personen" },
  { to: "/befunde", label: "Befunde" },
  { to: "/messwerte", label: "Messwerte" },
  { to: "/parameter", label: "Parameter" },
  { to: "/gruppen", label: "Gruppen" },
  { to: "/planung", label: "Planung" },
  { to: "/auswertung", label: "Auswertung" },
  { to: "/berichte", label: "Berichte" },
  { to: "/import", label: "Import" },
  { to: "/wissensbasis", label: "Wissensbasis" },
  { to: "/einstellungen", label: "Einstellungen" }
];

export function AppLayout() {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar__brand">
          <span className="sidebar__eyebrow">Lokale Laboranwendung</span>
          <h1>Labordaten</h1>
        </div>

        <nav className="sidebar__nav" aria-label="Hauptnavigation">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => (isActive ? "nav-link nav-link--active" : "nav-link")}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}

