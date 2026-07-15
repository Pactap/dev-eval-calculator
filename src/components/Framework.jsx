import { APP_VERSION, CHANGELOG } from "../version.js";

/* Small presentational helpers ------------------------------------------- */
function DocSection({ eyebrow, title, children }) {
  return (
    <section className="card doc-section">
      <div className="doc-section__head">
        <div className="eyebrow">{eyebrow}</div>
        <h2>{title}</h2>
      </div>
      {children}
    </section>
  );
}

function DefRow({ term, children }) {
  return (
    <div className="doc-def">
      <div className="doc-def__term">{term}</div>
      <div className="doc-def__desc">{children}</div>
    </div>
  );
}

/* ------------------------------------------------------------------------ */
export function Framework() {
  const WORKFLOW = [
    ["Set the evaluation period", "Enter a start date — the end date is auto-suggested one quarter later. Both stay editable until the period is locked."],
    ["Configure capacity & holidays", "Set the base score, daily capacity (hrs/day) and mark any company holidays. Weekends and holidays are excluded from productive days."],
    ["Lock the period", "Locking scaffolds the quarter into 14-day draft sprints. Drafts are fully editable and removable before you commit each one."],
    ["Record each sprint", "Enter completed & collaboration hours, the code-quality grade, tickets closed/assigned, and reopened/done tickets."],
    ["Lock each sprint", "Locking a sprint freezes its score as an immutable snapshot, immune to later configuration or holiday changes."],
    ["Review & export", "Track the quarterly rollup and score composition, then export a formatted PDF report with optional developer details."],
  ];

  const PARAMS = [
    ["Planned Hours", "40%", "(Completed + Collaboration hours) / Allotted hours. Rework is excluded. Capped at 100%."],
    ["Code Quality", "20%", "Team-lead grade (Outstanding → Poor), each mapped to a multiplier and cross-checked against the CQI."],
    ["Efficiency", "40%", "Tickets marked Closed / Tickets assigned in the sprint. Zero tickets assigned earns no efficiency credit."],
    ["Issue Persistence", "0%", "Reopened / Done tickets — a legacy reach-back signal, retained but currently zero-weighted."],
  ];

  return (
    <div className="framework">
      <DocSection eyebrow="Framework" title="What this is">
        <p className="doc-p">
          The Performance Evaluation Centre is a client-side tool that turns a developer's
          sprint activity into a transparent, pro-rata quarterly score. Every calculation runs
          in the browser — no data leaves the device — and every rule below is configurable and
          auditable so the outcome is explainable, not a black box.
        </p>
      </DocSection>

      <DocSection eyebrow="How it works" title="Workflow">
        <ol className="doc-steps">
          {WORKFLOW.map(([t, d], i) => (
            <li key={i} className="doc-step">
              <span className="doc-step__num">{i + 1}</span>
              <div>
                <div className="doc-step__title">{t}</div>
                <div className="doc-step__desc">{d}</div>
              </div>
            </li>
          ))}
        </ol>
      </DocSection>

      <DocSection eyebrow="The model" title="Definitions">
        <DefRow term="Pro-rata base">
          A quarter is worth a base score (default 90 points). The daily rate = base ÷ productive
          days in the quarter. Each sprint earns base points = daily rate × its productive days,
          so weight follows the days actually worked.
        </DefRow>
        <DefRow term="Productive days">
          Weekdays (Mon–Fri) in a range, excluding any marked holidays. Drives both allotted hours
          (capacity × days) and the pro-rata base.
        </DefRow>
        <DefRow term="Four parameters">
          <div className="doc-params">
            {PARAMS.map(([n, w, d]) => (
              <div key={n} className="doc-param">
                <div className="doc-param__head"><span>{n}</span><span className="doc-param__w">{w}</span></div>
                <div className="doc-param__desc">{d}</div>
              </div>
            ))}
          </div>
          Each parameter's achieved points = base points × parameter weight × the reward-band
          multiplier for the recorded performance.
        </DefRow>
        <DefRow term="Reward bands">
          Performance percentages map to multipliers via configurable bands (e.g. Planned Hours
          90–100% → 1.75×). Bands are inclusive of their lower bound and exclusive of their upper.
        </DefRow>
        <DefRow term="Cross-quarter sprints">
          A sprint that spans the quarter boundary uses its full length for hours and percentages,
          but only its in-quarter productive days claim base points for this quarter.
        </DefRow>
        <DefRow term="Shared-boundary sprints (count-once)">
          Auto-generated sprints begin on the day the previous one ends. That shared day is counted
          only in the earlier sprint, so per-sprint days tile the quarter exactly and the base never
          over-allocates.
        </DefRow>
      </DocSection>

      <DocSection eyebrow="Guardrails" title="Constraints">
        <ul className="doc-list">
          <li>Parameter weights should sum to 100%; the Settings panel flags any deviation.</li>
          <li>A sprint with no hours and no tickets scores zero — the default grade never awards free points.</li>
          <li>Zero assigned tickets earns no efficiency credit (0×), distinct from closing 0 of N assigned.</li>
          <li>Locked sprints are immutable snapshots and are unaffected by later config, holiday or rate changes.</li>
          <li>Remaining quarter allocation is clamped at zero — it never reads negative.</li>
          <li>A band or grade group can never be fully emptied; the last entry cannot be removed.</li>
          <li>Dates are parsed in local time to avoid timezone day-shifts; report text is sanitised for the PDF font.</li>
        </ul>
      </DocSection>

      <DocSection eyebrow="What makes it flexible" title="Enablers">
        <ul className="doc-list">
          <li><strong>Configurable scoring</strong> — weights, bands and grades are editable in-app and persist locally; export/import as JSON.</li>
          <li><strong>Holidays</strong> — a global holiday list refines available productive capacity.</li>
          <li><strong>Draft sprints</strong> — the quarter auto-scaffolds into 14-day drafts you can edit or omit before locking.</li>
          <li><strong>Report metadata</strong> — optional developer name, employee ID, quarter and date-of-joining feed a systematic PDF.</li>
          <li><strong>Theming</strong> — light / system / dark, persisted per user.</li>
        </ul>
      </DocSection>

      <DocSection eyebrow="Why it's built this way" title="Thought process">
        <p className="doc-p">
          The framework favours <strong>transparency over convenience</strong>: pro-rata weighting
          keeps short and long sprints comparable; separating whole-sprint metrics from in-quarter
          base points keeps percentages honest when work spans a boundary; and forcing empty sprints
          to zero prevents inflated scores from unrecorded work. Configuration lives in the open so a
          team can tune the model to its context, while locked snapshots preserve historical integrity
          once an evaluation is committed.
        </p>
      </DocSection>

      <DocSection eyebrow="Transparency" title="Version history">
        <div className="doc-versions">
          {CHANGELOG.map((v) => (
            <div key={v.version} className="doc-version">
              <div className="doc-version__head">
                <span className={`doc-version__tag doc-version__tag--${v.type}`}>v{v.version}</span>
                <span className="doc-version__title">{v.title}</span>
                <span className="doc-version__date">{v.date}</span>
                {v.version === APP_VERSION && <span className="doc-version__current">current</span>}
              </div>
              <ul className="doc-list doc-list--tight">
                {v.changes.map((c, i) => <li key={i}>{c}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </DocSection>
    </div>
  );
}
