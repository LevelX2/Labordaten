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

type NavGroupIconName = "overview" | "data" | "work" | "knowledge" | "system";

type NavGroup = {
  key: string;
  label: string;
  icon: NavGroupIconName;
  items: NavItem[];
};

const navGroups: NavGroup[] = [
  {
    key: "uebersicht",
    label: "Übersicht",
    icon: "overview",
    items: [{ to: "/", label: "Start", shortLabel: "St", end: true }]
  },
  {
    key: "daten",
    label: "Daten & Erfassung",
    icon: "data",
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
    icon: "work",
    items: [
      { to: "/planung", label: "Planung", shortLabel: "Pl" },
      { to: "/auswertung", label: "Auswertung", shortLabel: "Au" },
      { to: "/berichte", label: "Berichte", shortLabel: "Br" }
    ]
  },
  {
    key: "stammdaten",
    label: "Stammdaten & Wissen",
    icon: "knowledge",
    items: [
      { to: "/parameter", label: "Parameter", shortLabel: "Pa" },
      { to: "/gruppen", label: "Parametergruppen", shortLabel: "Pg" },
      { to: "/wissensbasis", label: "Laborwissen", shortLabel: "Lw" }
    ]
  },
  {
    key: "system",
    label: "System",
    icon: "system",
    items: [{ to: "/einstellungen", label: "Einstellungen", shortLabel: "Ei" }]
  }
];

const SIDEBAR_STATE_KEY = "labordaten.sidebarCollapsed";

function NavGroupIcon({ icon }: { icon: NavGroupIconName }) {
  switch (icon) {
    case "overview":
      return (
        <svg className="nav-group__icon" viewBox="0 0 24 24" aria-hidden="true">
          <rect x="4" y="4" width="7" height="7" rx="2" />
          <rect x="13" y="4" width="7" height="7" rx="2" />
          <rect x="4" y="13" width="7" height="7" rx="2" />
          <path d="M14 17h5" />
          <path d="M16.5 14.5v5" />
        </svg>
      );
    case "data":
      return (
        <svg className="nav-group__icon" viewBox="0 0 24 24" aria-hidden="true">
          <ellipse cx="12" cy="5" rx="7" ry="3" />
          <path d="M5 5v6c0 1.7 3.1 3 7 3s7-1.3 7-3V5" />
          <path d="M5 11v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6" />
        </svg>
      );
    case "work":
      return (
        <svg className="nav-group__icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M8 5h8" />
          <path d="M9 3h6l1 3H8l1-3Z" />
          <path d="M6 6h12v14H6z" />
          <path d="m9 14 2 2 4-5" />
        </svg>
      );
    case "knowledge":
      return (
        <svg className="nav-group__icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 5.5C7.8 4.2 9.8 4.4 12 6v13c-2.2-1.6-4.2-1.8-7-.5v-13Z" />
          <path d="M19 5.5c-2.8-1.3-4.8-1.1-7 .5v13c2.2-1.6 4.2-1.8 7-.5v-13Z" />
          <path d="M12 6v13" />
        </svg>
      );
    case "system":
      return (
        <svg className="nav-group__icon" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="3" />
          <path d="M12 3v3" />
          <path d="M12 18v3" />
          <path d="M3 12h3" />
          <path d="M18 12h3" />
          <path d="m5.6 5.6 2.1 2.1" />
          <path d="m16.3 16.3 2.1 2.1" />
          <path d="m18.4 5.6-2.1 2.1" />
          <path d="m7.7 16.3-2.1 2.1" />
        </svg>
      );
  }
}

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
                <span className="nav-group__label">
                  <NavGroupIcon icon={group.icon} />
                  <span className="nav-group__label-text">{group.label}</span>
                </span>
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
