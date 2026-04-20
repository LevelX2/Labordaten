import { createBrowserRouter } from "react-router-dom";

import { AppLayout } from "./layout/AppLayout";
import { BefundePage } from "../features/befunde/BefundePage";
import { MesswertePage } from "../features/messwerte/MesswertePage";
import { ParameterPage } from "../features/parameter/ParameterPage";
import { PersonenPage } from "../features/personen/PersonenPage";
import { FeaturePage } from "../shared/components/FeaturePage";
import { StartPage } from "../shared/components/StartPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    children: [
      { index: true, element: <StartPage /> },
      { path: "personen", element: <PersonenPage /> },
      { path: "befunde", element: <BefundePage /> },
      { path: "messwerte", element: <MesswertePage /> },
      { path: "parameter", element: <ParameterPage /> },
      {
        path: "gruppen",
        element: (
          <FeaturePage
            title="Gruppen"
            description="Fachliche Gruppierung von Parametern für Auswertung, Planung und Berichte."
            highlights={[
              "Mehrfachzuordnung von Parametern",
              "Feste Sortierung innerhalb der Gruppe",
              "Verwendung in Berichten und Auswertungen"
            ]}
          />
        )
      },
      {
        path: "planung",
        element: (
          <FeaturePage
            title="Planung"
            description="Zyklische Kontrollen, Einmalvormerkungen, Fälligkeiten und Vorschläge für den nächsten Termin."
            highlights={[
              "Tabs für zyklisch, einmalig und Fälligkeiten",
              "Berechnung nächster Fälligkeiten",
              "Vorschlagsliste für den nächsten Termin"
            ]}
          />
        )
      },
      {
        path: "auswertung",
        element: (
          <FeaturePage
            title="Auswertung"
            description="Verläufe, Kennzahlen, Referenzanzeige und qualitative Ereignisse neben numerischen Kurven."
            highlights={[
              "Einzel- und Mehrparameter-Verläufe",
              "Labor- und Zielreferenzen",
              "Qualitative Ereignisliste im Verlauf"
            ]}
          />
        )
      },
      {
        path: "berichte",
        element: (
          <FeaturePage
            title="Berichte"
            description="PDF-Ausgaben für Arzttermine und Zeitverläufe mit standardmäßig aktiven, aber abwählbaren Feldern."
            highlights={[
              "Arztbericht als kompakte Liste",
              "Verlaufsbericht mit Zeitachse",
              "Filter nach Person, Gruppe, Zeitraum und Labor"
            ]}
          />
        )
      },
      {
        path: "import",
        element: (
          <FeaturePage
            title="Import"
            description="Importeingang, Prüfansicht, Mapping und bewusste Übernahme nach Warnungen oder Dublettenerkennung."
            highlights={[
              "CSV, Excel, JSON und spätere KI-Importe",
              "Prüfpunkte und Parameter-Mapping",
              "Optionale Archivierung von Importquellen"
            ]}
          />
        )
      },
      {
        path: "wissensbasis",
        element: (
          <FeaturePage
            title="Wissensbasis"
            description="Verknüpfte Markdown-Seiten anzeigen und im Dateisystem öffnen."
            highlights={[
              "Anzeige verknüpfter Wissensseiten",
              "Filter nach Parameter und Gruppenbezug",
              "Spätere Erweiterung für strukturierte Metadaten"
            ]}
          />
        )
      },
      {
        path: "einstellungen",
        element: (
          <FeaturePage
            title="Einstellungen"
            description="Pfadkonfiguration, Berichtsoptionen, spätere KI-Einstellungen und Systemstatus der Datenbasis."
            highlights={[
              "Datenpfad, Dokumentenpfad und Wissensordner",
              "Berichts- und Anzeigevorgaben",
              "Datenbasis-Sperre und kontrollierte Freigabe"
            ]}
          />
        )
      }
    ]
  }
]);
