import { NavLink, Outlet } from "react-router-dom";

import { LabordatenBrandMark } from "../../shared/components/LabordatenBrandMark";
import { APP_VERSION } from "../../shared/constants/appInfo";

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
        <div className="sidebar__main">
          <div className="sidebar__brand">
            <div className="sidebar__brand-lockup">
              <LabordatenBrandMark className="sidebar__brand-icon" title="Labordaten Icon" />
              <div>
                <h1>Labordaten</h1>
              </div>
            </div>
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
        </div>

        <div className="sidebar__footer">
          <span className="version-badge version-badge--subtle">Version {APP_VERSION}</span>
        </div>
      </aside>

      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
