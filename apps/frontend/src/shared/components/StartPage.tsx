const quickCards = [
  { title: "Personen", text: "Stammdaten, Basisdaten-Verlauf und personenspezifische Zielbereiche." },
  { title: "Befunde", text: "Befundkopf, Dokumente, Bemerkungen und Messwertsammlungen." },
  { title: "Import", text: "Prüfansicht mit Mapping, Warnungen und bewusster Übernahme." },
  { title: "Auswertung", text: "Zeitverläufe, Referenzbereiche und qualitative Ereignisse." }
];

export function StartPage() {
  return (
    <section className="page">
      <header className="hero">
        <div>
          <span className="page__kicker">Projektgerüst V1</span>
          <h2>Lokale Arbeitsoberfläche für Laborwerte</h2>
          <p>
            Dieses Grundgerüst verbindet die fachliche Konzeptarbeit mit einer realen technischen
            Startbasis: lokale API, lokale Weboberfläche und klare Trennung von Stammdaten,
            Messdaten, Planung, Importprüfung und Berichten.
          </p>
        </div>

        <div className="hero__meta">
          <div className="stat-card">
            <span className="stat-card__label">Backend</span>
            <strong>FastAPI + SQLite</strong>
          </div>
          <div className="stat-card">
            <span className="stat-card__label">Frontend</span>
            <strong>React + Vite</strong>
          </div>
          <div className="stat-card">
            <span className="stat-card__label">V1-Ziel</span>
            <strong>Scaffolding abgeschlossen</strong>
          </div>
        </div>
      </header>

      <div className="card-grid">
        {quickCards.map((card) => (
          <article className="card" key={card.title}>
            <h3>{card.title}</h3>
            <p>{card.text}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

