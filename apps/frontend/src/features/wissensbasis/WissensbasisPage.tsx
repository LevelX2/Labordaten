import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { apiFetch } from "../../shared/api/client";
import type { WissensseiteDetail, WissensseiteListItem } from "../../shared/types/api";

function formatDate(value?: string | null): string {
  if (!value) {
    return "—";
  }
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

export function WissensbasisPage() {
  const [query, setQuery] = useState("");
  const [selectedPath, setSelectedPath] = useState<string | null>(null);

  const seitenQuery = useQuery({
    queryKey: ["wissensbasis", "seiten", query],
    queryFn: () =>
      apiFetch<WissensseiteListItem[]>(`/api/wissensbasis/seiten${query ? `?q=${encodeURIComponent(query)}` : ""}`)
  });

  useEffect(() => {
    if (!selectedPath && seitenQuery.data?.length) {
      setSelectedPath(seitenQuery.data[0].pfad_relativ);
    }
  }, [seitenQuery.data, selectedPath]);

  const detailQuery = useQuery({
    queryKey: ["wissensbasis", "detail", selectedPath],
    queryFn: () => apiFetch<WissensseiteDetail>(`/api/wissensbasis/detail?pfad_relativ=${encodeURIComponent(selectedPath ?? "")}`),
    enabled: Boolean(selectedPath)
  });

  return (
    <section className="page">
      <header className="page__header">
        <span className="page__kicker">Wissensbereich</span>
        <h2>Wissensbasis</h2>
        <p>
          Markdown-Seiten aus dem konfigurierten Wissensordner werden hier lesbar gemacht, inklusive Titel, Aliasen und
          Frontmatter-Metadaten.
        </p>
      </header>

      <div className="workspace-grid">
        <article className="card">
          <h3>Seiten</h3>
          <label className="field field--full">
            <span>Suche</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Titel, Alias oder Pfad" />
          </label>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Titel</th>
                  <th>Alias</th>
                  <th>Geändert</th>
                </tr>
              </thead>
              <tbody>
                {seitenQuery.data?.map((seite) => (
                  <tr
                    key={seite.pfad_relativ}
                    onClick={() => setSelectedPath(seite.pfad_relativ)}
                    className={selectedPath === seite.pfad_relativ ? "row-selected" : undefined}
                    style={{ cursor: "pointer" }}
                  >
                    <td>{seite.titel}</td>
                    <td>{seite.aliases.join(", ") || "—"}</td>
                    <td>{formatDate(seite.geaendert_am)}</td>
                  </tr>
                ))}
                {!seitenQuery.data?.length ? (
                  <tr>
                    <td colSpan={3}>Keine Wissensseiten gefunden.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </article>

        <article className="card card--wide">
          <h3>Inhalt</h3>
          {!detailQuery.data ? <p>Bitte eine Wissensseite auswählen.</p> : null}
          {detailQuery.data ? (
            <>
              <p>
                Pfad: <strong>{detailQuery.data.pfad_relativ}</strong>
              </p>
              <p>
                Titel: <strong>{detailQuery.data.titel}</strong>
              </p>
              <p>
                Aliase: <strong>{detailQuery.data.aliases.join(", ") || "—"}</strong>
              </p>
              <p>
                Dateisystem: <strong>{detailQuery.data.pfad_absolut}</strong>
              </p>

              <h4>Frontmatter</h4>
              <pre>{JSON.stringify(detailQuery.data.frontmatter, null, 2)}</pre>

              <h4>Markdown</h4>
              <pre>{detailQuery.data.inhalt_markdown}</pre>
            </>
          ) : null}
        </article>
      </div>
    </section>
  );
}
