import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { apiFetch } from "../api/client";
import type { AuswertungGesamtzahlen, ImportVorgangListItem, SystemHealth } from "../types/api";

type ActionCard = {
  title: string;
  text: string;
  to: string;
  cta: string;
};

const actionCards: ActionCard[] = [
  {
    title: "Stammdaten pflegen",
    text: "Personen, Parameter und Gruppen bilden die fachliche Grundlage für Importe, Planung und Auswertung.",
    to: "/personen",
    cta: "Personen öffnen"
  },
  {
    title: "Importe prüfen",
    text: "Neue Laborwerte sollten erst nach Prüfpunkten, Mapping und bewusster Freigabe in den Bestand übernommen werden.",
    to: "/import",
    cta: "Import öffnen"
  },
  {
    title: "Verlauf auswerten",
    text: "Zeitreihen, Referenzbereiche und qualitative Ereignisse helfen beim schnellen Überblick über bestehende Daten.",
    to: "/auswertung",
    cta: "Auswertung öffnen"
  },
  {
    title: "Betrieb prüfen",
    text: "Pfade, Sperrstatus und Laufzeitoptionen sind im Alltag relevant, wenn die Datenbasis lokal und sicher genutzt werden soll.",
    to: "/einstellungen",
    cta: "Einstellungen öffnen"
  }
];

function formatDateTime(value?: string | null): string {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function formatLockHeadline(lockStatus?: string): string {
  if (lockStatus === "active") {
    return "Datenbasis aktiv nutzbar";
  }
  if (lockStatus === "conflict") {
    return "Konflikt bei Datenbasis";
  }
  if (lockStatus === "released") {
    return "Sperre freigegeben";
  }
  return "Status wird geprüft";
}

function formatImportHeadline(imports: ImportVorgangListItem[], isLoading: boolean): string {
  if (isLoading) {
    return "Importlage wird geladen";
  }
  const inPruefung = imports.filter((item) => item.status === "in_pruefung").length;
  if (!imports.length) {
    return "Noch keine Importe";
  }
  if (!inPruefung) {
    return "Keine offenen Importentwürfe";
  }
  return `${inPruefung} Importentwürfe offen`;
}

function formatImportDetails(imports: ImportVorgangListItem[], isLoading: boolean): string {
  if (isLoading) {
    return "Offene Entwürfe, Warnungen und Fehler werden gerade aus der Importhistorie geladen.";
  }
  if (!imports.length) {
    return "Sobald Entwürfe angelegt werden, erscheint hier der aktuelle Prüfstand.";
  }

  const inPruefung = imports.filter((item) => item.status === "in_pruefung");
  const warnungen = inPruefung.filter((item) => item.warnung_anzahl > 0).length;
  const fehler = inPruefung.filter((item) => item.fehler_anzahl > 0).length;
  const latest = imports[0];
  const latestLabel = latest.dokument_dateiname ?? latest.bemerkung ?? latest.quelle_typ;

  return [
    warnungen ? `${warnungen} mit Warnungen` : "Keine Warnungen im offenen Bestand",
    fehler ? `${fehler} mit Fehlern` : "Keine Fehler im offenen Bestand",
    `Letzter Import: ${latestLabel}`
  ].join(" · ");
}

export function StartPage() {
  const gesamtzahlenQuery = useQuery({
    queryKey: ["auswertung", "gesamtzahlen"],
    queryFn: () => apiFetch<AuswertungGesamtzahlen>("/api/auswertung/gesamtzahlen")
  });
  const importsQuery = useQuery({
    queryKey: ["importe"],
    queryFn: () => apiFetch<ImportVorgangListItem[]>("/api/importe")
  });
  const healthQuery = useQuery({
    queryKey: ["system", "health"],
    queryFn: () => apiFetch<SystemHealth>("/api/system/health")
  });

  const stats = gesamtzahlenQuery.data;
  const imports = importsQuery.data ?? [];

  return (
    <section className="page">
      <header className="hero">
        <div>
          <span className="page__kicker">Arbeitsstart</span>
          <h2>Lokale Arbeitsoberfläche für Laborwerte</h2>
          <p>
            Die Startseite soll nicht die Technik erklären, sondern den nächsten sinnvollen Arbeitsschritt sichtbar
            machen: Datenbestand prüfen, offene Importe klären und den Betriebszustand der lokalen Datenbasis im Blick
            behalten.
          </p>
        </div>

        <div className="hero__meta">
          <article className="stat-card">
            <span className="stat-card__label">Datenbestand</span>
            <strong>{stats ? `${stats.messwerte_anzahl} Messwerte` : "Wird geladen…"}</strong>
            <p className="stat-card__detail">
              {stats
                ? `${stats.personen_anzahl} Personen · ${stats.befunde_anzahl} Befunde · ${stats.parameter_anzahl} Parameter`
                : "Zählt vorhandene Personen, Befunde und Parameter aus dem aktuellen Bestand."}
            </p>
            <Link className="stat-card__link" to="/auswertung">
              Zur Auswertung
            </Link>
          </article>

          <article className="stat-card">
            <span className="stat-card__label">Importlage</span>
            <strong>{formatImportHeadline(imports, importsQuery.isLoading)}</strong>
            <p className="stat-card__detail">{formatImportDetails(imports, importsQuery.isLoading)}</p>
            <Link className="stat-card__link" to="/import">
              Zur Importprüfung
            </Link>
          </article>

          <article className="stat-card">
            <span className="stat-card__label">Systemstatus</span>
            <strong>{formatLockHeadline(healthQuery.data?.lock_status)}</strong>
            <p className="stat-card__detail">
              {healthQuery.data
                ? `${healthQuery.data.lock_message} Zuletzt geprüft: ${formatDateTime(new Date().toISOString())}`
                : "Prüft, ob die lokale Datenbasis aktuell konfliktfrei genutzt werden kann."}
            </p>
            <Link className="stat-card__link" to="/einstellungen">
              Zu den Einstellungen
            </Link>
          </article>
        </div>
      </header>

      <div className="card-grid">
        {actionCards.map((card) => (
          <article className="card" key={card.title}>
            <h3>{card.title}</h3>
            <p>{card.text}</p>
            <Link className="card__link" to={card.to}>
              {card.cta}
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}
