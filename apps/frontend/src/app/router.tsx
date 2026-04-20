import { createBrowserRouter } from "react-router-dom";

import { AppLayout } from "./layout/AppLayout";
import { AuswertungPage } from "../features/auswertung/AuswertungPage";
import { BefundePage } from "../features/befunde/BefundePage";
import { BerichtePage } from "../features/berichte/BerichtePage";
import { EinstellungenPage } from "../features/einstellungen/EinstellungenPage";
import { GruppenPage } from "../features/gruppen/GruppenPage";
import { ImportPage } from "../features/importe/ImportPage";
import { MesswertePage } from "../features/messwerte/MesswertePage";
import { ParameterPage } from "../features/parameter/ParameterPage";
import { PlanungPage } from "../features/planung/PlanungPage";
import { PersonenPage } from "../features/personen/PersonenPage";
import { WissensbasisPage } from "../features/wissensbasis/WissensbasisPage";
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
      { path: "wissensbasis", element: <WissensbasisPage /> },
      { path: "einstellungen", element: <EinstellungenPage /> }
    ]
  }
]);
