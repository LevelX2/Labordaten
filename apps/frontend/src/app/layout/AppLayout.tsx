import { useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";

import { InitialdatenStartupDialog } from "../../shared/components/InitialdatenStartupDialog";
import { LabordatenBrandMark } from "../../shared/components/LabordatenBrandMark";
import { APP_VERSION } from "../../shared/constants/appInfo";

type NavItem = {
  to: string;
  label: string;
  shortLabel: string;
  end?: boolean;
};

type NavGroup = {
  key: string;
  label: string;
  items: NavItem[];
};

const navGroups: NavGroup[] = [
  {
    key: "uebersicht",
    label: "Übersicht",
    items: [{ to: "/", label: "Start", shortLabel: "St", end: true }]
  },
  {
    key: "daten",
    label: "Daten & Erfassung",
    items: [
      { to: "/personen", label: "Personen", shortLabel: "Pe" },
      { to: "/import", label: "Import", shortLabel: "Im" },
      { to: "/befunde", label: "Befunde", shortLabel: "Be" },
      { to: "/messwerte", label: "Messwerte", shortLabel: "Mw" }
    ]
  },
  {
    key: "arbeiten",
    label: "Arbeiten",
    items: [
      { to: "/planung", label: "Planung", shortLabel: "Pl" },
      { to: "/auswertung", label: "Auswertung", shortLabel: "Au" },
      { to: "/berichte", label: "Berichte", shortLabel: "Br" }
    ]
  },
  {
    key: "stammdaten",
    label: "Stammdaten & Wissen",
    items: [
      { to: "/parameter", label: "Parameter", shortLabel: "Pa" },
      { to: "/gruppen", label: "Parametergruppen", shortLabel: "Pg" },
      { to: "/wissensbasis", label: "Laborwissen", shortLabel: "Lw" }
    ]
  },
  {
    key: "system",
    label: "System",
    items: [{ to: "/einstellungen", label: "Einstellungen", shortLabel: "Ei" }]
  }
];

const SIDEBAR_STATE_KEY = "labordaten.sidebarCollapsed";

export function AppLayout() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return window.localStorage.getItem(SIDEBAR_STATE_KEY) === "true";
  });

  useEffect(() => {
    window.localStorage.setItem(SIDEBAR_STATE_KEY, String(isSidebarCollapsed));
  }, [isSidebarCollapsed]);

  return (
    <div className={isSidebarCollapsed ? "app-shell app-shell--sidebar-collapsed" : "app-shell"}>
      <aside className={isSidebarCollapsed ? "sidebar sidebar--collapsed" : "sidebar"}>
        <div className="sidebar__main">
          <div className="sidebar__header">
            <div className="sidebar__brand">
              <div className="sidebar__brand-lockup">
                <LabordatenBrandMark className="sidebar__brand-icon" title="Labordaten Icon" />
                <div className="sidebar__brand-copy">
                  <h1>Labordaten</h1>
                </div>
              </div>
            </div>

            <button
              type="button"
              className="sidebar__collapse-toggle"
              onClick={() => setIsSidebarCollapsed((currentValue) => !currentValue)}
              aria-label={isSidebarCollapsed ? "Menüleiste ausklappen" : "Menüleiste einklappen"}
              aria-pressed={isSidebarCollapsed}
              title={isSidebarCollapsed ? "Menüleiste ausklappen" : "Menüleiste einklappen"}
            >
              <span aria-hidden="true">{isSidebarCollapsed ? ">" : "<"}</span>
            </button>
          </div>

          <nav className="sidebar__nav" aria-label="Hauptnavigation">
            {navGroups.map((group) => (
              <section key={group.key} className="nav-group" aria-label={group.label}>
                <span className="nav-group__label">{group.label}</span>
                <div className="nav-group__items">
                  {group.items.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.end}
                      title={isSidebarCollapsed ? item.label : undefined}
                      className={({ isActive }) => (isActive ? "nav-link nav-link--active" : "nav-link")}
                    >
                      <span className="nav-link__short" aria-hidden={!isSidebarCollapsed}>
                        {item.shortLabel}
                      </span>
                      <span className="nav-link__label">{item.label}</span>
                    </NavLink>
                  ))}
                </div>
              </section>
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
      <InitialdatenStartupDialog />
    </div>
  );
}
