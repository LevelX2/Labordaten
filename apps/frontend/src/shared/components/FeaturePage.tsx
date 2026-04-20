type FeaturePageProps = {
  title: string;
  description: string;
  highlights: string[];
};

export function FeaturePage({ title, description, highlights }: FeaturePageProps) {
  return (
    <section className="page">
      <header className="page__header">
        <span className="page__kicker">V1-Modul</span>
        <h2>{title}</h2>
        <p>{description}</p>
      </header>

      <div className="card-grid">
        <article className="card">
          <h3>Fokus</h3>
          <ul className="card-list">
            {highlights.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>

        <article className="card card--soft">
          <h3>Status</h3>
          <p>
            Dieses Modul ist als Frontend-Shell angelegt. Die Detailansichten werden im nächsten
            Umsetzungsschritt an echte API-Endpunkte und Formularlogik angebunden.
          </p>
        </article>
      </div>
    </section>
  );
}

