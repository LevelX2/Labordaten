import { lazy, Suspense, type ReactElement } from "react";
import { createBrowserRouter } from "react-router-dom";

import { AppLayout } from "./layout/AppLayout";

const StartPage = lazy(() => import("../shared/components/StartPage").then((module) => ({ default: module.StartPage })));
const PersonenPage = lazy(() => import("../features/personen/PersonenPage").then((module) => ({ default: module.PersonenPage })));
const BefundePage = lazy(() => import("../features/befunde/BefundePage").then((module) => ({ default: module.BefundePage })));
const MesswertePage = lazy(() => import("../features/messwerte/MesswertePage").then((module) => ({ default: module.MesswertePage })));
const ParameterPage = lazy(() => import("../features/parameter/ParameterPage").then((module) => ({ default: module.ParameterPage })));
const GruppenPage = lazy(() => import("../features/gruppen/GruppenPage").then((module) => ({ default: module.GruppenPage })));
const PlanungPage = lazy(() => import("../features/planung/PlanungPage").then((module) => ({ default: module.PlanungPage })));
const AuswertungPage = lazy(() => import("../features/auswertung/AuswertungPage").then((module) => ({ default: module.AuswertungPage })));
const BerichtePage = lazy(() => import("../features/berichte/BerichtePage").then((module) => ({ default: module.BerichtePage })));
const ImportPage = lazy(() => import("../features/importe/ImportPage").then((module) => ({ default: module.ImportPage })));
const WissensbasisPage = lazy(() => import("../features/wissensbasis/WissensbasisPage").then((module) => ({ default: module.WissensbasisPage })));
const EinstellungenPage = lazy(() => import("../features/einstellungen/EinstellungenPage").then((module) => ({ default: module.EinstellungenPage })));

function routeElement(element: ReactElement) {
  return (
    <Suspense fallback={<div className="route-loading">Lade Arbeitsbereich...</div>}>
      {element}
    </Suspense>
  );
}

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    children: [
      { index: true, element: routeElement(<StartPage />) },
      { path: "personen", element: routeElement(<PersonenPage />) },
      { path: "befunde", element: routeElement(<BefundePage />) },
      { path: "messwerte", element: routeElement(<MesswertePage />) },
      { path: "parameter", element: routeElement(<ParameterPage />) },
      { path: "gruppen", element: routeElement(<GruppenPage />) },
      { path: "planung", element: routeElement(<PlanungPage />) },
      { path: "auswertung", element: routeElement(<AuswertungPage />) },
      { path: "berichte", element: routeElement(<BerichtePage />) },
      { path: "import", element: routeElement(<ImportPage />) },
      { path: "wissensbasis", element: routeElement(<WissensbasisPage />) },
      { path: "einstellungen", element: routeElement(<EinstellungenPage />) }
    ]
  }
]);
