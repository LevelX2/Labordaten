import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { apiFetch } from "../../shared/api/client";
import type {
  WissensseiteCreatePayload,
  WissensseiteDeleteResult,
  WissensseiteDetail,
  WissensseiteListItem
} from "../../shared/types/api";

type PageLookup = {
  byPath: Map<string, string>;
  byTitle: Map<string, string>;
};

type WissensseiteFormState = {
  zielbereich: string;
  pfad_relativ: string;
  titel: string;
  inhalt_markdown: string;
};

const initialForm: WissensseiteFormState = {
  zielbereich: "02 Parameter/Allgemein",
  pfad_relativ: "",
  titel: "",
  inhalt_markdown: ""
};

const KNOWLEDGE_TARGET_AREAS = [
  {
    value: "02 Parameter/Allgemein",
    label: "Parameter allgemein"
  },
  {
    value: "01 Grundlagen",
    label: "Grundlagen"
  },
  {
    value: "03 Testprofile und Kombinationen",
    label: "Testprofile und Kombinationen"
  },
  {
    value: "04 Teststrategien",
    label: "Teststrategien"
  },
  {
    value: "05 Zielbereiche und Gesundheitswerte",
    label: "Zielbereiche und Gesundheitswerte"
  },
  {
    value: "10 Anwendungshilfe",
    label: "Anwendungshilfe"
  }
];

function formatDate(value?: string | null): string {
  if (!value) {
    return "—";
  }
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function normalizeKnowledgePath(value: string): string {
  const decodedValue = (() => {
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  })();
  const parts: string[] = [];
  decodedValue
    .replace(/\\/g, "/")
    .replace(/^\.\//, "")
    .replace(/\.md$/i, "")
    .split("/")
    .forEach((part) => {
      if (!part || part === ".") {
        return;
      }
      if (part === "..") {
        parts.pop();
        return;
      }
      parts.push(part);
    });
  return parts.join("/").toLocaleLowerCase("de-DE");
}

function slugifyKnowledgeTitle(title: string): string {
  const slug = title
    .trim()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/Ä/g, "Ae")
    .replace(/Ö/g, "Oe")
    .replace(/Ü/g, "Ue")
    .replace(/ß/g, "ss")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "Neue-Wissensseite";
}

function buildSuggestedPagePath(targetArea: string, title: string): string {
  return `${targetArea}/${slugifyKnowledgeTitle(title)}.md`;
}

function buildDirectoryIndexPath(path: string): string {
  return `${path.replace(/\/$/, "")}/README.md`;
}

function findDirectoryIndexPath(path: string, lookup: PageLookup): string | null {
  const direct = lookup.byPath.get(normalizeKnowledgePath(buildDirectoryIndexPath(path)));
  if (direct) {
    return direct;
  }
  return lookup.byPath.get(normalizeKnowledgePath(`${path}/Index.md`)) ?? null;
}

function buildPageLookup(pages: WissensseiteListItem[]): PageLookup {
  const byPath = new Map<string, string>();
  const byTitle = new Map<string, string>();

  pages.forEach((page) => {
    byPath.set(normalizeKnowledgePath(page.pfad_relativ), page.pfad_relativ);
    byPath.set(normalizeKnowledgePath(page.pfad_relativ.replace(/\.md$/i, "")), page.pfad_relativ);
    byTitle.set(page.titel.toLocaleLowerCase("de-DE"), page.pfad_relativ);
    page.aliases.forEach((alias) => byTitle.set(alias.toLocaleLowerCase("de-DE"), page.pfad_relativ));
  });

  return { byPath, byTitle };
}

function resolveKnowledgeLink(target: string, currentPath: string, lookup: PageLookup): string | null {
  const cleanTarget = target.split("#")[0].split("|")[0].trim();
  if (!cleanTarget) {
    return null;
  }

  const currentDirectory = currentPath.includes("/") ? currentPath.slice(0, currentPath.lastIndexOf("/")) : "";
  const candidates = [
    cleanTarget,
    cleanTarget.endsWith(".md") ? cleanTarget : `${cleanTarget}.md`,
    currentDirectory ? `${currentDirectory}/${cleanTarget}` : cleanTarget,
    currentDirectory && !cleanTarget.endsWith(".md") ? `${currentDirectory}/${cleanTarget}.md` : cleanTarget
  ];

  for (const candidate of candidates) {
    const resolved = lookup.byPath.get(normalizeKnowledgePath(candidate));
    if (resolved) {
      return resolved;
    }
  }

  return lookup.byTitle.get(cleanTarget.toLocaleLowerCase("de-DE")) ?? null;
}

function renderInlineText(
  text: string,
  keyPrefix: string,
  currentPath: string,
  lookup: PageLookup,
  onOpenPage: (path: string) => void
): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /(\[\[([^\]]+)\]\]|\[([^\]]+)\]\(([^)]+)\))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    const wikiTarget = match[2];
    const markdownLabel = match[3];
    const markdownTarget = match[4];
    const target = wikiTarget ?? markdownTarget;
    const label = wikiTarget?.split("|")[1]?.trim() || wikiTarget?.split("|")[0]?.trim() || markdownLabel || target;
    const resolved = resolveKnowledgeLink(target, currentPath, lookup);

    if (resolved) {
      nodes.push(
        <button
          key={`${keyPrefix}-link-${match.index}`}
          type="button"
          className="text-link markdown-link-button"
          onClick={() => onOpenPage(resolved)}
        >
          {label}
        </button>
      );
    } else if (markdownTarget?.startsWith("http")) {
      nodes.push(
        <a key={`${keyPrefix}-link-${match.index}`} className="text-link" href={markdownTarget} target="_blank" rel="noreferrer">
          {label}
        </a>
      );
    } else {
      nodes.push(label);
    }

    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes;
}

function splitTableRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

function isTableDivider(line: string): boolean {
  return /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(line);
}

function renderMarkdown(
  markdown: string,
  currentPath: string,
  lookup: PageLookup,
  onOpenPage: (path: string) => void
): ReactNode[] {
  const lines = markdown.split(/\r?\n/);
  const blocks: ReactNode[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    const trimmed = line.trim();

    if (!trimmed) {
      index += 1;
      continue;
    }

    if (trimmed.startsWith("```")) {
      const codeLines: string[] = [];
      index += 1;
      while (index < lines.length && !lines[index].trim().startsWith("```")) {
        codeLines.push(lines[index]);
        index += 1;
      }
      index += 1;
      blocks.push(
        <pre key={`code-${index}`} className="markdown-code">
          {codeLines.join("\n")}
        </pre>
      );
      continue;
    }

    const headingMatch = trimmed.match(/^(#{1,4})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const content = renderInlineText(headingMatch[2], `h-${index}`, currentPath, lookup, onOpenPage);
      if (level === 1) {
        blocks.push(<h1 key={`h-${index}`}>{content}</h1>);
      } else if (level === 2) {
        blocks.push(<h2 key={`h-${index}`}>{content}</h2>);
      } else if (level === 3) {
        blocks.push(<h3 key={`h-${index}`}>{content}</h3>);
      } else {
        blocks.push(<h4 key={`h-${index}`}>{content}</h4>);
      }
      index += 1;
      continue;
    }

    if (/^\s*[-*]\s+/.test(line)) {
      const items: ReactNode[] = [];
      while (index < lines.length && /^\s*[-*]\s+/.test(lines[index])) {
        const itemText = lines[index].replace(/^\s*[-*]\s+/, "");
        items.push(<li key={`li-${index}`}>{renderInlineText(itemText, `li-${index}`, currentPath, lookup, onOpenPage)}</li>);
        index += 1;
      }
      blocks.push(<ul key={`ul-${index}`}>{items}</ul>);
      continue;
    }

    if (trimmed.includes("|") && index + 1 < lines.length && isTableDivider(lines[index + 1])) {
      const headerCells = splitTableRow(trimmed);
      const rows: string[][] = [];
      index += 2;
      while (index < lines.length && lines[index].trim().includes("|")) {
        rows.push(splitTableRow(lines[index]));
        index += 1;
      }
      blocks.push(
        <div className="table-wrap" key={`table-${index}`}>
          <table className="data-table markdown-table">
            <thead>
              <tr>
                {headerCells.map((cell, cellIndex) => (
                  <th key={`th-${cellIndex}`}>{renderInlineText(cell, `th-${index}-${cellIndex}`, currentPath, lookup, onOpenPage)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr key={`tr-${rowIndex}`}>
                  {row.map((cell, cellIndex) => (
                    <td key={`td-${rowIndex}-${cellIndex}`}>
                      {renderInlineText(cell, `td-${index}-${rowIndex}-${cellIndex}`, currentPath, lookup, onOpenPage)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    const paragraphLines = [trimmed];
    index += 1;
    while (
      index < lines.length &&
      lines[index].trim() &&
      !lines[index].trim().startsWith("#") &&
      !/^\s*[-*]\s+/.test(lines[index]) &&
      !lines[index].trim().startsWith("```")
    ) {
      paragraphLines.push(lines[index].trim());
      index += 1;
    }
    blocks.push(
      <p key={`p-${index}`}>{renderInlineText(paragraphLines.join(" "), `p-${index}`, currentPath, lookup, onOpenPage)}</p>
    );
  }

  return blocks;
}

export function WissensbasisPage() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("suche") ?? "");
  const [selectedPath, setSelectedPath] = useState<string | null>(searchParams.get("seite"));
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [form, setForm] = useState<WissensseiteFormState>(initialForm);
  const [pathEditedManually, setPathEditedManually] = useState(false);
  const [deleteCandidatePath, setDeleteCandidatePath] = useState<string | null>(null);

  const seitenQuery = useQuery({
    queryKey: ["wissensbasis", "seiten", query],
    queryFn: () =>
      apiFetch<WissensseiteListItem[]>(`/api/wissensbasis/seiten${query ? `?q=${encodeURIComponent(query)}` : ""}`)
  });
  const allSeitenQuery = useQuery({
    queryKey: ["wissensbasis", "seiten", ""],
    queryFn: () => apiFetch<WissensseiteListItem[]>("/api/wissensbasis/seiten")
  });

  const pageLookup = useMemo(() => buildPageLookup(allSeitenQuery.data ?? []), [allSeitenQuery.data]);

  useEffect(() => {
    const pageFromUrl = searchParams.get("seite");
    const queryFromUrl = searchParams.get("suche") ?? "";
    setQuery(queryFromUrl);
    if (pageFromUrl) {
      setSelectedPath(pageFromUrl);
    }
  }, [searchParams]);

  useEffect(() => {
    if (selectedPath) {
      return;
    }
    if (seitenQuery.data?.length) {
      setSelectedPath(seitenQuery.data[0].pfad_relativ);
    }
  }, [seitenQuery.data, selectedPath]);

  const detailQuery = useQuery({
    queryKey: ["wissensbasis", "detail", selectedPath],
    queryFn: () => apiFetch<WissensseiteDetail>(`/api/wissensbasis/detail?pfad_relativ=${encodeURIComponent(selectedPath ?? "")}`),
    enabled: Boolean(selectedPath)
  });

  useEffect(() => {
    if (pathEditedManually) {
      return;
    }
    setForm((current) => ({
      ...current,
      pfad_relativ: buildSuggestedPagePath(current.zielbereich, current.titel)
    }));
  }, [form.titel, form.zielbereich, pathEditedManually]);

  const createMutation = useMutation({
    mutationFn: () =>
      apiFetch<WissensseiteDetail>("/api/wissensbasis/seiten", {
        method: "POST",
        body: JSON.stringify({
          pfad_relativ: form.pfad_relativ,
          titel: form.titel,
          inhalt_markdown: form.inhalt_markdown || null
        } satisfies WissensseiteCreatePayload)
      }),
    onSuccess: async (createdPage) => {
      setForm(initialForm);
      setPathEditedManually(false);
      setShowCreateForm(false);
      setQuery("");
      setSelectedPath(createdPage.pfad_relativ);
      setSearchParams({ seite: createdPage.pfad_relativ });
      await queryClient.invalidateQueries({ queryKey: ["wissensbasis", "seiten"] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (path: string) =>
      apiFetch<WissensseiteDeleteResult>(`/api/wissensbasis/seiten?pfad_relativ=${encodeURIComponent(path)}`, {
        method: "DELETE"
      }),
    onSuccess: async (result) => {
      setDeleteCandidatePath(null);
      setSelectedPath((current) => (current === result.pfad_relativ ? null : current));
      setSearchParams(query.trim() ? { suche: query } : {});
      await queryClient.invalidateQueries({ queryKey: ["wissensbasis", "seiten"] });
      await queryClient.removeQueries({ queryKey: ["wissensbasis", "detail", result.pfad_relativ] });
    }
  });

  const updateSearch = (nextQuery: string) => {
    setQuery(nextQuery);
    const nextParams: Record<string, string> = {};
    if (nextQuery.trim()) {
      nextParams.suche = nextQuery;
    }
    if (selectedPath) {
      nextParams.seite = selectedPath;
    }
    setSearchParams(nextParams);
  };

  const openPage = (path: string) => {
    setSelectedPath(path);
    const nextParams: Record<string, string> = { seite: path };
    if (query.trim()) {
      nextParams.suche = query;
    }
    setSearchParams(nextParams);
  };

  const markdownContent = detailQuery.data
    ? renderMarkdown(detailQuery.data.inhalt_markdown, detailQuery.data.pfad_relativ, pageLookup, openPage)
    : null;
  const pathSegments = detailQuery.data?.pfad_relativ.split("/") ?? [];
  const breadcrumbSegments = pathSegments.slice(0, -1).map((segment, index) => {
    const path = pathSegments.slice(0, index + 1).join("/");
    return {
      label: segment,
      path,
      targetPath: findDirectoryIndexPath(path, pageLookup)
    };
  });

  return (
    <section className="page">
      <header className="page__header">
        <span className="page__kicker">Fachwissen</span>
        <h2>Laborwissen</h2>
        <p>Markdown-Seiten aus dem fachlichen Labordaten-Informationspool werden als verlinkte Leseseiten angezeigt.</p>
      </header>

      <div className="knowledge-workspace">
        <aside className="card knowledge-sidebar">
          <div className="parameter-sidebar__header">
            <div>
              <h3>Seiten</h3>
              <p>{seitenQuery.data?.length ?? 0} Treffer</p>
            </div>
            <button type="button" className="inline-button" onClick={() => setShowCreateForm((current) => !current)}>
              Neue Seite
            </button>
          </div>

          <label className="field field--full">
            <span>Suche</span>
            <input value={query} onChange={(event) => updateSearch(event.target.value)} placeholder="Titel, Alias oder Pfad" />
          </label>

          {showCreateForm ? (
            <form
              className="knowledge-create-form"
              onSubmit={(event) => {
                event.preventDefault();
                createMutation.mutate();
              }}
            >
              <label className="field">
                <span>Zielbereich</span>
                <select
                  value={form.zielbereich}
                  onChange={(event) => {
                    const nextTargetArea = event.target.value;
                    setForm((current) => ({
                      ...current,
                      zielbereich: nextTargetArea,
                      pfad_relativ: pathEditedManually
                        ? current.pfad_relativ
                        : buildSuggestedPagePath(nextTargetArea, current.titel)
                    }));
                  }}
                >
                  {KNOWLEDGE_TARGET_AREAS.map((area) => (
                    <option key={area.value} value={area.value}>
                      {area.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Titel</span>
                <input
                  required
                  value={form.titel}
                  onChange={(event) => {
                    const nextTitle = event.target.value;
                    setForm((current) => ({
                      ...current,
                      titel: nextTitle,
                      pfad_relativ: pathEditedManually
                        ? current.pfad_relativ
                        : buildSuggestedPagePath(current.zielbereich, nextTitle)
                    }));
                  }}
                />
              </label>
              <label className="field">
                <span>Relativer Pfad</span>
                <input
                  required
                  value={form.pfad_relativ}
                  onChange={(event) => {
                    setPathEditedManually(true);
                    setForm((current) => ({ ...current, pfad_relativ: event.target.value }));
                  }}
                  placeholder="02 Wissen/Parameter/Ferritin.md"
                />
                <small>
                  Der Pfad liegt innerhalb des Wissensordners. Aus Zielbereich und Titel wird automatisch ein Vorschlag
                  erzeugt.
                </small>
              </label>
              <div className="inline-actions">
                <button
                  type="button"
                  className="inline-button"
                  onClick={() => {
                    setPathEditedManually(false);
                    setForm((current) => ({
                      ...current,
                      pfad_relativ: buildSuggestedPagePath(current.zielbereich, current.titel)
                    }));
                  }}
                >
                  Pfad neu vorschlagen
                </button>
              </div>
              <label className="field">
                <span>Markdown</span>
                <textarea
                  rows={6}
                  value={form.inhalt_markdown}
                  onChange={(event) => setForm((current) => ({ ...current, inhalt_markdown: event.target.value }))}
                />
              </label>
              <div className="form-actions">
                <button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Speichert..." : "Seite anlegen"}
                </button>
                {createMutation.isError ? <p className="form-error">{createMutation.error.message}</p> : null}
              </div>
            </form>
          ) : null}

          <div className="knowledge-page-list">
            {seitenQuery.data?.map((seite) => (
              <button
                key={seite.pfad_relativ}
                type="button"
                className={`knowledge-page-list__item ${selectedPath === seite.pfad_relativ ? "knowledge-page-list__item--selected" : ""}`}
                onClick={() => openPage(seite.pfad_relativ)}
              >
                <strong>{seite.titel}</strong>
                <span>{seite.pfad_relativ}</span>
                {seite.excerpt ? <p>{seite.excerpt}</p> : null}
              </button>
            ))}
            {!seitenQuery.data?.length ? <p className="form-hint">Keine Wissensseiten gefunden.</p> : null}
          </div>
        </aside>

        <article className="card knowledge-reader">
          {!detailQuery.data ? <p>Bitte eine Wissensseite auswählen.</p> : null}
          {detailQuery.data ? (
            <>
              <div className="knowledge-reader__topline">
                <div className="knowledge-reader__meta knowledge-reader__meta--stacked">
                  <nav className="knowledge-breadcrumb" aria-label="Laborwissen-Pfad">
                    {breadcrumbSegments.map((segment) => {
                      const targetPath = segment.targetPath;
                      return (
                        <span key={segment.path} className="knowledge-breadcrumb__item">
                          {typeof targetPath === "string" ? (
                            <button
                              type="button"
                              className="text-link markdown-link-button"
                              onClick={() => openPage(targetPath)}
                            >
                              {segment.label}
                            </button>
                          ) : (
                            <span>{segment.label}</span>
                          )}
                        </span>
                      );
                    })}
                    <span className="knowledge-breadcrumb__item knowledge-breadcrumb__item--current">
                      {pathSegments[pathSegments.length - 1]}
                    </span>
                  </nav>
                  <span>Geändert: {formatDate(detailQuery.data.geaendert_am)}</span>
                </div>
                {detailQuery.data.loeschbar ? (
                  <button
                    type="button"
                    className="inline-button inline-button--danger"
                    onClick={() => setDeleteCandidatePath(detailQuery.data?.pfad_relativ ?? null)}
                  >
                    Seite löschen
                  </button>
                ) : null}
              </div>
              {deleteCandidatePath === detailQuery.data.pfad_relativ ? (
                <div className="knowledge-delete-panel">
                  <div>
                    <strong>Diese Markdown-Datei wirklich löschen?</strong>
                    <p>{detailQuery.data.pfad_relativ}</p>
                  </div>
                  <div className="inline-actions">
                    <button
                      type="button"
                      className="inline-button inline-button--danger"
                      disabled={deleteMutation.isPending}
                      onClick={() => deleteMutation.mutate(detailQuery.data.pfad_relativ)}
                    >
                      {deleteMutation.isPending ? "Löscht..." : "Endgültig löschen"}
                    </button>
                    <button type="button" className="inline-button" onClick={() => setDeleteCandidatePath(null)}>
                      Abbrechen
                    </button>
                  </div>
                  {deleteMutation.isError ? <p className="form-error">{deleteMutation.error.message}</p> : null}
                </div>
              ) : null}
              <div className="markdown-content">{markdownContent}</div>
              {detailQuery.data.aliases.length ? (
                <div className="knowledge-reader__aliases">
                  <span>Aliase</span>
                  <strong>{detailQuery.data.aliases.join(", ")}</strong>
                </div>
              ) : null}
            </>
          ) : null}
        </article>
      </div>
    </section>
  );
}
