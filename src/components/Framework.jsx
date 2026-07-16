import { APP_VERSION, CHANGELOG } from "../version.js";
import { useConfig } from "../configStore.jsx";
import { getBand } from "../utils.js";

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
  // Documentation reflects the live scoring config, so weights/grades/bands
  // stay accurate when they are changed in the Settings panel.
  const { config } = useConfig();
  const w = config.weights;
  const wpct = (x) => `${Math.round((Number(x) || 0) * 100)}%`;
  const weightSum = Math.round(["ph", "cq", "eff", "ip"].reduce((s, k) => s + (Number(w[k]) || 0), 0) * 100);
  const grades = (config.codeQualityOptions || []).map(o => o.label);
  const gradeRange = grades.length > 1 ? `${grades[0]} → ${grades[grades.length - 1]}` : (grades[0] || "the configured grades");
  const topBand = (config.plannedHoursBands || [])[0];

  const WORKFLOW = [
    ["Set the evaluation period", "Enter a start date — the end date is auto-suggested one quarter later. Both stay editable until the period is locked."],
    ["Configure capacity & holidays", "Set the base score and daily capacity (hrs/day). In the Holiday calendar, admins declare company holidays and the restricted-holiday pool per year (2025–2050); weekend-dated holidays are recorded but flagged as no-impact."],
    ["Lock the period", "Locking scaffolds the quarter into 14-day draft sprints. Drafts are fully editable and removable before you commit each one."],
    ["Record each sprint", "Enter completed & collaboration hours, the code-quality grade, tickets closed/assigned, and reopened/done tickets. If the developer availed a restricted holiday, pick it from the admin's pool (one per calendar year)."],
    ["Lock each sprint", "Locking a sprint freezes its score as an immutable snapshot, immune to later configuration or holiday changes."],
    ["Review & export", "Track the quarterly rollup and score composition, then export a formatted PDF report with optional developer details."],
  ];

  // Worked examples are computed against the *live* config so the multipliers and
  // achieved points shown here stay correct when bands/grades/weights are retuned.
  const B = 15; // illustrative sprint base points (e.g. 1.5 daily rate × 10 productive days)
  const bandMult = (pct, bands) => Number((getBand(pct, bands) || {}).multiplier) || 0;
  const midGrade = (config.codeQualityOptions || [])[1] || (config.codeQualityOptions || [])[0] || { label: "Satisfactory", multiplier: 1 };
  const round2 = (n) => (Math.round(n * 100) / 100);
  const ach = (weight, mult) => round2(B * (Number(weight) || 0) * mult);
  const mx = (n) => `${Number(n).toFixed(2)}×`;
  const phMult = bandMult(80, config.plannedHoursBands || []);
  const effMult = bandMult(80, config.efficiencyBands || []);
  const ipMult = bandMult(5, config.issuePersistBands || []);
  const cqMult = Number(midGrade.multiplier) || 0;
  const zeroIp = (Number(w.ip) || 0) === 0;

  const PARAMS = [
    {
      n: "Planned Hours", w: wpct(w.ph),
      formula: "(Completed + Collaboration hours) / Allotted hours × 100, capped at 100%.",
      d: "Planned utilization of available time. Rework is excluded.",
      ex: `48 hrs logged of 60 allotted → 80%. The band covering 80% gives ${mx(phMult)}; for a ${B}-point sprint base, achieved = ${B} × ${wpct(w.ph)} × ${mx(phMult)} = ${ach(w.ph, phMult)} pts.`,
    },
    {
      n: "Code Quality", w: wpct(w.cq),
      formula: "Team-lead grade → multiplier, cross-checked against the CQI.",
      d: `Grades ${gradeRange}, each mapped to a multiplier.`,
      ex: `A "${midGrade.label}" grade → ${mx(cqMult)}; achieved = ${B} × ${wpct(w.cq)} × ${mx(cqMult)} = ${ach(w.cq, cqMult)} pts.`,
    },
    {
      n: "Efficiency", w: wpct(w.eff),
      formula: "Tickets closed / Tickets assigned × 100. Zero assigned earns no credit.",
      d: "Delivery of assigned work in the sprint.",
      ex: `16 closed of 20 assigned → 80%. The band covering 80% gives ${mx(effMult)}; achieved = ${B} × ${wpct(w.eff)} × ${mx(effMult)} = ${ach(w.eff, effMult)} pts.`,
    },
    {
      n: "Issue Persistence", w: wpct(w.ip),
      formula: "Reopened / Closed tickets × 100. Zero closed → worst band.",
      d: `Defect recurrence — reopens against tickets closed in the sprint${zeroIp ? "; retained but currently zero-weighted" : ""}.`,
      ex: `2 reopened of 40 closed → 5%. The band covering 5% gives ${mx(ipMult)}; achieved = ${B} × ${wpct(w.ip)} × ${mx(ipMult)} = ${ach(w.ip, ipMult)} pts${zeroIp ? " (zero at the current 0% weight — give it weight and it contributes)" : ""}.`,
    },
  ];

  return (
    <div className="framework">
      <DocSection eyebrow="Framework" title="What This Is">
        <p className="doc-p">
          The Performance Evaluation Centre is a client-side tool that turns a developer's
          sprint activity into a transparent, pro-rata quarterly score. All scoring runs in the
          browser; the shared evaluation parameters, holiday calendar and restricted-holiday quota
          sync through a Cloudflare Worker so they stay consistent across the team. Every rule below
          is configurable and auditable so the outcome is explainable, not a black box.
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
        <DefRow term="Restricted holidays &amp; availability">
          Admins declare a list of restricted (optional) holidays per year. A developer may avail
          one per calendar year, chosen per sprint from that list and tracked so a second cannot be
          claimed — enforced server-side across machines when the shared backend is configured,
          otherwise per browser. When availed it is excluded from that sprint's productive days, exactly like a
          company holiday: because scoring is pro-rata, the target shrinks with the day away, so the
          restricted holiday dilutes the point pool proportionally and is never counted as
          underperformance. Holidays that land on a weekend are recorded but have no additional
          impact.
        </DefRow>
        <DefRow term="Four parameters">
          <div className="doc-params">
            {PARAMS.map((p) => (
              <div key={p.n} className="doc-param">
                <div className="doc-param__head"><span>{p.n}</span><span className="doc-param__w">{p.w}</span></div>
                <div className="doc-param__desc">{p.d}</div>
                <div className="doc-param__formula mono">{p.formula}</div>
                <div className="doc-param__example"><strong>Example:</strong> {p.ex}</div>
              </div>
            ))}
          </div>
          Each parameter's achieved points = base points × parameter weight × the reward-band
          multiplier for the recorded performance. The examples above are computed against the current
          configuration, so they track any change to the weights, bands, or grades.
        </DefRow>
        <DefRow term="Reward bands">
          Performance percentages map to multipliers via configurable bands
          {topBand ? ` (e.g. Planned Hours ${topBand.label}% → ${Number(topBand.multiplier).toFixed(2)}×)` : ""}.
          Bands are inclusive of their lower bound and exclusive of their upper.
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
          <li>Parameter weights should sum to 100% (currently {weightSum}%); the Settings panel flags any deviation.</li>
          <li>A sprint with no hours and no tickets scores zero — the default grade never awards free points.</li>
          <li>Zero assigned tickets earns no efficiency credit (0×), distinct from closing 0 of N assigned.</li>
          <li>Locked sprints are immutable snapshots and are unaffected by later config, holiday or rate changes.</li>
          <li>Restricted holidays come only from the admin-declared pool; at most one per developer per calendar year — enforced within the evaluation and remembered across quarters by Employee ID.</li>
          <li>Remaining quarter allocation is clamped at zero — it never reads negative.</li>
          <li>A band or grade group can never be fully emptied; the last entry cannot be removed.</li>
          <li>Dates are parsed in local time to avoid timezone day-shifts; report text is sanitised for the PDF font.</li>
        </ul>
      </DocSection>

      <DocSection eyebrow="What makes it flexible" title="Enablers">
        <ul className="doc-list">
          <li><strong>Configurable scoring</strong> — weights, bands and grades are editable in-app and persist locally; export/import as JSON.</li>
          <li><strong>Holiday calendar</strong> — a per-year manager (2025–2050) for named company holidays and the restricted-holiday pool; weekend-dated holidays are recorded without double-counting.</li>
          <li><strong>Restricted holidays</strong> — availed per sprint from the admin pool, quota-tracked per developer per year, with a constructive availability summary in-app and in the PDF.</li>
          <li><strong>Draft sprints</strong> — the quarter auto-scaffolds into 14-day drafts you can edit or omit before locking.</li>
          <li><strong>Report metadata</strong> — optional developer name, employee ID, quarter and date-of-joining feed a systematic PDF.</li>
          <li><strong>Theming</strong> — light / system / dark, persisted per user.</li>
        </ul>
      </DocSection>

      <DocSection eyebrow="Why it's built this way" title="Thought Process">
        <p className="doc-p">
          The framework favours <strong>transparency over convenience</strong>: pro-rata weighting
          keeps short and long sprints comparable; separating whole-sprint metrics from in-quarter
          base points keeps percentages honest when work spans a boundary; and forcing empty sprints
          to zero prevents inflated scores from unrecorded work. Configuration lives in the open so a
          team can tune the model to its context, while locked snapshots preserve historical integrity
          once an evaluation is committed.
        </p>
      </DocSection>

      <DocSection eyebrow="Transparency" title="Version History">
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
