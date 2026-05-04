import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { GruppenPage } from "./gruppen/GruppenPage";
import { ParameterPage } from "./parameter/ParameterPage";
import { PlanungPage } from "./planung/PlanungPage";

function renderPage(page: ReactNode): string {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false
      }
    }
  });

  return renderToString(
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>{page}</QueryClientProvider>
    </MemoryRouter>
  );
}

describe("Werkzeugleisten in leeren Arbeitsbereichen", () => {
  it("zeigt den Anlagebutton fuer Parameter auch ohne vorhandenen Parameter", () => {
    const html = renderPage(<ParameterPage />);

    expect(html).toContain("Neuer Parameter");
    expect(html).toContain("Noch keine Parameter vorhanden");
  });

  it("zeigt den Anlagebutton fuer Gruppen auch ohne vorhandene Gruppe", () => {
    const html = renderPage(<GruppenPage />);

    expect(html).toContain("Neue Parametergruppe");
    expect(html).toContain("Noch keine Parametergruppen vorhanden");
  });

  it("zeigt die Anlagebuttons fuer Planung auch ohne vorhandene Planung", () => {
    const html = renderPage(<PlanungPage />);

    expect(html).toContain("Zyklisch anlegen");
    expect(html).toContain("Einmalig anlegen");
    expect(html).toContain("Noch keine Planungen vorhanden");
  });
});
