import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { apiFetch } from "../api/client";
import type { InitialdatenStatus } from "../types/api";
import { InitialdatenPanel } from "./InitialdatenPanel";

export function InitialdatenStartupDialog() {
  const [dismissed, setDismissed] = useState(false);
  const statusQuery = useQuery({
    queryKey: ["system", "initialdaten", "status"],
    queryFn: () => apiFetch<InitialdatenStatus>("/api/system/initialdaten/status")
  });

  useEffect(() => {
    if (!statusQuery.data?.initialimport_empfohlen) {
      setDismissed(false);
    }
  }, [statusQuery.data?.initialimport_empfohlen]);

  if (!statusQuery.data?.initialimport_empfohlen || dismissed) {
    return null;
  }

  return (
    <div className="dialog-backdrop" role="presentation">
      <section
        className="dialog-panel initialdaten-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="initialdaten-dialog-title"
      >
        <header className="dialog-panel__header">
          <div>
            <span className="eyebrow">Erster Start</span>
            <h3 id="initialdaten-dialog-title">Leere Stammdaten erkannt</h3>
          </div>
          <button type="button" className="dialog-panel__close" onClick={() => setDismissed(true)}>
            Schließen
          </button>
        </header>
        <InitialdatenPanel mode="startup" onApplied={() => setDismissed(true)} onSkip={() => setDismissed(true)} />
      </section>
    </div>
  );
}
