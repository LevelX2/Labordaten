import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { apiFetch } from "../api/client";
import type { InitialdatenStatus, InstallationOptionsProcessResult } from "../types/api";
import { InitialdatenPanel } from "./InitialdatenPanel";

type StartupStep = "grunddaten" | "naechste-schritte";

export function InitialdatenStartupDialog() {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);
  const [step, setStep] = useState<StartupStep>("grunddaten");
  const installationsoptionenQuery = useQuery({
    queryKey: ["system", "installationsoptionen", "verarbeiten"],
    queryFn: () =>
      apiFetch<InstallationOptionsProcessResult>("/api/system/installationsoptionen/verarbeiten", {
        method: "POST"
      }),
    staleTime: Infinity,
    retry: false
  });
  const statusQuery = useQuery({
    queryKey: ["system", "initialdaten", "status"],
    queryFn: () => apiFetch<InitialdatenStatus>("/api/system/initialdaten/status"),
    enabled: installationsoptionenQuery.isSuccess || installationsoptionenQuery.isError
  });
  const shouldShowNextStepsFromInstaller = Boolean(installationsoptionenQuery.data?.naechste_schritte_anzeigen);

  useEffect(() => {
    if (shouldShowNextStepsFromInstaller) {
      setDismissed(false);
      setStep("naechste-schritte");
      return;
    }
    if (!statusQuery.data?.initialimport_empfohlen) {
      setDismissed(false);
      setStep("grunddaten");
    }
  }, [shouldShowNextStepsFromInstaller, statusQuery.data?.initialimport_empfohlen]);

  if (installationsoptionenQuery.isLoading || statusQuery.isLoading) {
    return null;
  }

  if ((!statusQuery.data?.initialimport_empfohlen && step !== "naechste-schritte") || dismissed) {
    return null;
  }

  const closeDialog = () => setDismissed(true);
  const openImport = () => {
    setDismissed(true);
    navigate("/import");
  };

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
            <span className="eyebrow">{step === "grunddaten" ? "Erster Start" : "Nächster Schritt"}</span>
            <h3 id="initialdaten-dialog-title">
              {step === "grunddaten" ? "Grunddaten für diese Installation laden" : "Laborbericht importieren"}
            </h3>
          </div>
          <button type="button" className="dialog-panel__close" onClick={closeDialog}>
            Schließen
          </button>
        </header>
        {step === "grunddaten" ? (
          <InitialdatenPanel mode="startup" onApplied={() => setStep("naechste-schritte")} onSkip={closeDialog} />
        ) : (
          <div className="initialdaten-next-step">
            <div className="initialdaten-next-step__intro">
              <h3>{shouldShowNextStepsFromInstaller ? "Labordaten ist vorbereitet." : "Die Grunddaten sind geladen."}</h3>
              <p>
                Als Nächstes kannst Du einen Laborbericht importieren. Dafür erzeugst Du in der Anwendung einen
                Import-Prompt, gibst diesen Prompt zusammen mit dem Laborbericht in einen KI-Chat und übernimmst das
                strukturierte Ergebnis anschließend wieder in Labordaten.
              </p>
            </div>

            {installationsoptionenQuery.data?.fehler.length ? (
              <div className="form-error">
                Einige ausgewählte Startdaten konnten nicht automatisch geladen werden. Du kannst sie später in den
                Einstellungen erneut prüfen.
              </div>
            ) : null}

            <ol className="initialdaten-next-step__steps">
              <li>Im Bereich Import den Weg KI-Chat öffnen und den Prompt erzeugen.</li>
              <li>Den Prompt zusammen mit dem Laborbericht im KI-Chat auswerten lassen.</li>
              <li>Das JSON-Ergebnis in Labordaten einfügen, prüfen und bewusst übernehmen.</li>
            </ol>

            <p className="form-hint">
              Die mitgelieferten Grunddaten enthalten gängige Laborparameter, Parametergruppen, Aliase und vor allem
              bekannte Umrechnungsregeln. Dadurch kann Labordaten Laborwerte aus unterschiedlichen Berichten häufiger
              demselben Parameter zuordnen und vorhandene Umrechnungen direkt anwenden. Ohne diesen Grundbestand
              müsstest Du vor allem Umrechnungen und einzelne Zuordnungen später manuell ergänzen.
            </p>

            <div className="form-actions initialdaten-panel__actions">
              <button type="button" onClick={openImport}>
                Zum Import
              </button>
              <button type="button" className="button--secondary" onClick={closeDialog}>
                Später
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
