import { createBrowserRouter } from "react-router-dom";

import { AppLayout } from "./layout/AppLayout";
import { AuswertungPage } from "../features/auswertung/AuswertungPage";
import { BefundePage } from "../features/befunde/BefundePage";
import { BerichtePage } from "../features/berichte/BerichtePage";
import { GruppenPage } from "../features/gruppen/GruppenPage";
import { ImportPage } from "../features/importe/ImportPage";
import { MesswertePage } from "../features/messwerte/MesswertePage";
import { ParameterPage } from "../features/parameter/ParameterPage";
import { PlanungPage } from "../features/planung/PlanungPage";
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
      { path: "gruppen", element: <GruppenPage /> },
      { path: "planung", element: <PlanungPage /> },
      { path: "auswertung", element: <AuswertungPage /> },
      { path: "berichte", element: <BerichtePage /> },
      { path: "import", element: <ImportPage /> },
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
