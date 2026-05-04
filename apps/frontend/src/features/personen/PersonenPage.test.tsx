import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { PersonenPage } from "./PersonenPage";

describe("PersonenPage", () => {
  it("zeigt den Anlagebutton auch ohne vorhandene Person", () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false
        }
      }
    });

    const html = renderToString(
      <QueryClientProvider client={queryClient}>
        <PersonenPage />
      </QueryClientProvider>
    );

    expect(html).toContain("Neue Person");
    expect(html).toContain("Noch keine Personen vorhanden");
  });
});
