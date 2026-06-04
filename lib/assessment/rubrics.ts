// ---------------------------------------------------------------------------
// rubrics.ts — TrustQ scoring engine: rubric config, org profile, target logic,
// and remedy map.
//
// ARCHITECTURE NOTES
// ------------------
// 1. This file is PURE DATA + PURE FUNCTIONS. No I/O, no imports from Next.js
//    or Supabase. Safe to import anywhere — server, client, scripts, tests.
//
// 2. All thresholds are REASONED v1 values, defensible for an internal pilot.
//    A sourced pass will calibrate against ACFE RTTN, EEOC, BLS, and AWI cost
//    data. Because every threshold lives in this file, the sourced pass is a
//    data update, not a refactor.
//
// 3. Rubric anchor text is editable here. Rick iterates wording; the engine
//    stays stable.
//
// 4. SCORING MECHANIC (v1, confirmed final):
//    contribution(d) = min(current(d) / target(d), 1) × weight(d)
//    TrustQ Score    = Σ contributions × 100   → 0–100, integer
//    Cap at 100% per dimension: over-investment is not maturity.
//    Target = 1 is a legitimate minimum for Technology at small/low-volume.
//    Governance floor = 3 (independence non-negotiable at any size).
//
// 5. Confidence Index runs PARALLEL — never blended into the score.
//    Levels: Indicative → Corroborated → Strong → Validated
//    See ConfidenceLevel type below.
// ---------------------------------------------------------------------------

// ============================================================================
// TYPES
// ============================================================================

export type MaturityScore = 1 | 2 | 3 | 4 | 5;

export interface MaturityLevel {
  level:   MaturityScore;
  label:   string;   // one-word label
  anchor:  string;   // primary scoring anchor — what the assessor looks for
  notes?:  string;   // clarifying notes, edge cases, or dollar thresholds
}

export interface Remedy {
  label:       string; // short product/service name
  description: string; // one-sentence value statement
}

export interface DimensionRubric {
  id:          string;       // machine-readable key, stable
  name:        string;       // display name
  weight:      number;       // decimal weight, all nine sum to 1.0
  riskAxis:    string;       // what drives target elevation (for display + sourcing)
  targetNote:  string;       // prose explaining target computation (shown to assessor)
  levels:      MaturityLevel[];
  remedies:    Remedy[];
}

// ============================================================================
// ORG PROFILE — "input once, drive all targets"
// ============================================================================

export type Headcount         = "small" | "mid" | "large"; // <1,000 / 1,000–10,000 / 10,000+
export type GeographicScope   = "single" | "multi";        // single jurisdiction / multi/cross-border
export type ConsequenceSeverity = "low" | "moderate" | "high";
export type CaseVolume        = "low" | "moderate" | "high";

export interface OrgProfile {
  headcount:          Headcount;
  geographicScope:    GeographicScope;
  consequenceSeverity: ConsequenceSeverity;
  regulated:          boolean;          // subject to external regulatory oversight
  caseVolume:         CaseVolume;
  industry?:          string;           // NAICS code or label — for future sourced weighting
}

// ============================================================================
// CONFIDENCE INDEX — parallel to score, never blended
// ============================================================================

export type ConfidenceLevel =
  | "Indicative"    // diagnostic only, single assessor, one source
  | "Corroborated"  // two sources (e.g., diagnostic + one survey cohort)
  | "Strong"        // three sources
  | "Validated";    // four sources: diagnostic + all three survey cohorts

export interface ConfidenceSignal {
  level:              ConfidenceLevel;
  sourceCount:        number;
  surveyResponseCount: number;
  divergentDimensions: string[]; // dimensions where survey signal diverges from consultant rating
  note:               string;    // human-readable summary for display
}

// ============================================================================
// DIMENSION RUBRICS — nine dimensions, five levels each
// ============================================================================

export const DIMENSION_RUBRICS: DimensionRubric[] = [

  // --------------------------------------------------------------------------
  // 1. GOVERNANCE & STRUCTURE — 20%
  // Risk axis: consequence severity × independence requirement
  // Floor: 3 (structural independence is non-negotiable at any size/volume)
  // --------------------------------------------------------------------------
  {
    id:      "governance",
    name:    "Governance & Structure",
    weight:  0.20,
    riskAxis: "Consequence severity and independence requirement",
    targetNote:
      "Base target is 3. Rises to 4 if consequence is high OR the organization is regulated. " +
      "Rises to 5 if the organization is large AND consequence is high. " +
      "Floor is 3 — structural independence and a documented mandate are non-negotiable at any scale. " +
      "A small, low-volume, unregulated organization that maintains genuine independence scores high; " +
      "a large complex organization without formal authority scores low.",
    levels: [
      {
        level:  1,
        label:  "Absent",
        anchor: "No formal investigations function exists. Investigations are handled ad hoc, typically by HR or Legal without designated authority or independence. No charter, mandate, or defined scope. The person conducting investigations also reports to, or is influenced by, the business unit under review.",
      },
      {
        level:  2,
        label:  "Initial",
        anchor: "An individual or small team handles investigations informally. Some practical authority exists but is undocumented. Independence from the functions investigated is inconsistently maintained — typically preserved for lower-risk matters but absent when subjects hold seniority. Leadership is aware investigations occur but has not formally endorsed or resourced the function.",
      },
      {
        level:  3,
        label:  "Developing",
        anchor: "A formal investigations function exists with a documented charter or mandate defining authority, scope, and reporting structure. The function maintains structural independence from HR and the business unit under review for standard matters. A documented escalation protocol exists for cases involving senior subjects (ISO/TS 37008 §8.1.1 standard). Senior leadership formally endorses the program in writing.",
        notes:  "This is the minimum defensible level for any organization. §8.1.1 escalation-when-subject-is-senior sits here.",
      },
      {
        level:  4,
        label:  "Defined",
        anchor: "The charter is reviewed and updated on a defined cycle (at least annually). Reporting lines are formalized and protect independence across all case types and subject levels. Escalation to an independent body (e.g., Audit Committee, General Counsel, Board) is documented, tested, and exercised. Resource allocation is deliberate and subject to periodic governance review.",
      },
      {
        level:  5,
        label:  "Embedded",
        anchor: "The investigations function operates as a recognized program of record with formal executive sponsor or governance body oversight. Independence is structurally enforced — not reliant on individual relationships. All escalation pathways are documented, exercised, and logged. The function formally participates in enterprise risk governance and contributes to policy design and program evaluation cycles.",
      },
    ],
    remedies: [
      { label: "Charter & Authority Design",          description: "Draft or refresh the investigations function mandate, authority matrix, and escalation protocols to ISO/TS 37008 standards." },
      { label: "Independence Diagnostic",              description: "Map current reporting lines against independence requirements and identify structural conflicts." },
      { label: "Executive Sponsorship Framework",     description: "Define the governance body, sponsor role, and oversight cadence for the investigations program." },
      { label: "Resourcing Investment Brief",          description: "Build the business case for dedicated investigations headcount and budget using TrustQ scenario data." },
    ],
  },

  // --------------------------------------------------------------------------
  // 2. INVESTIGATION PROCESS — 18%
  // Risk axis: consequence severity × quality/defensibility requirement
  // Floor: 3
  // --------------------------------------------------------------------------
  {
    id:      "process",
    name:    "Investigation Process",
    weight:  0.18,
    riskAxis: "Consequence severity and defensibility/quality requirement",
    targetNote:
      "Base target is 3. Rises to 4 if consequence is high. Rises to 5 if consequence is high AND " +
      "jurisdiction is multi/cross-border. Floor is 3 — a documented methodology is the minimum " +
      "standard for any defensible investigation. Complexity (multi-jurisdiction, senior subjects) " +
      "drives the ceiling; volume does not.",
    levels: [
      {
        level:  1,
        label:  "Absent",
        anchor: "No defined investigation methodology. Cases are opened, conducted, and closed without consistent process. No standards for evidence collection, chain of custody, procedural fairness, or documentation. Investigation conduct depends entirely on individual judgment, resulting in highly variable outcomes.",
      },
      {
        level:  2,
        label:  "Initial",
        anchor: "Investigators follow informal or personal workflows. Some documentation exists but is inconsistent across cases. Procedural fairness (advance notice, opportunity to respond) is applied variably — typically on higher-profile matters but not as a standard. Case timelines are untracked. File quality varies widely by investigator.",
      },
      {
        level:  3,
        label:  "Developing",
        anchor: "A documented methodology covers the key phases: intake, planning, investigation, conclusion, and closure. Evidence handling and chain-of-custody standards exist and are followed. Procedural fairness is applied consistently across all matters — notice, opportunity to respond, and impartiality are standard, not discretionary. Timelines are tracked against informal targets.",
        notes:  "Procedural fairness applied CONSISTENTLY (not selectively by seniority) is the key differentiator from Level 2.",
      },
      {
        level:  4,
        label:  "Defined",
        anchor: "The methodology is formally approved, version-controlled, and applied consistently across all case types. Quality review of investigative work product is built into the process (supervisor review, pre-close checklist, or peer QC). Formal timeline standards exist with escalation triggers. Cross-border and multi-party protocols are documented and followed. Privilege and confidentiality considerations are addressed at the planning stage.",
      },
      {
        level:  5,
        label:  "Embedded",
        anchor: "The methodology is benchmarked against external standards (e.g., ISO/TS 37008, AWI Professional Standards). Continuous improvement is institutionalized through post-investigation debriefs, case audits, and systematic quality review. QA is independent of the lead investigator. The process demonstrably produces defensible outcomes across all complexity levels including senior subjects, cross-border matters, and legally sensitive cases.",
      },
    ],
    remedies: [
      { label: "Tailored Investigation Manual",       description: "Build a bespoke investigation methodology and procedure guide aligned to the organization's case mix and risk profile." },
      { label: "PEACE Interview Training",             description: "Investigator-level training in the PEACE model for planning, conducting, and documenting investigative interviews." },
      { label: "Evidence & Privilege Protocol",       description: "Develop an evidence-handling, chain-of-custody, and legal privilege protocol for sensitive investigations." },
      { label: "Report Quality Standard",             description: "Define investigation report structure, content standards, and a QC checklist to ensure defensible written work product." },
    ],
  },

  // --------------------------------------------------------------------------
  // 3. PEOPLE & COMPETENCY — 12%
  // Risk axis: case volume × complexity (single axis; competence reduces capacity needed)
  // No floor — small/low-volume orgs may legitimately target Level 2
  // --------------------------------------------------------------------------
  {
    id:      "people",
    name:    "People & Competency",
    weight:  0.12,
    riskAxis: "Case volume and complexity (competence folds into capacity)",
    targetNote:
      "Base target is 2. Volume moderate → 3; volume high → 4. +1 if multi-jurisdiction OR high consequence. " +
      "No floor — a small, low-volume organization with one credentialed investigator handling cases " +
      "competently is legitimately at Level 2 and that is appropriate. " +
      "Competence reduces capacity required: a highly credentialed investigator handles complex matters " +
      "with less headcount than an uncredentialed one. Cap 5.",
    levels: [
      {
        level:  1,
        label:  "Absent",
        anchor: "No designated investigators. Investigations are assigned to whoever is available — typically HR generalists, managers, or Legal with no investigation-specific training or competency. No competency standards, capacity model, or staffing plan related to investigations.",
      },
      {
        level:  2,
        label:  "Initial",
        anchor: "One or more individuals handle investigations, typically alongside other duties. Some relevant experience or credentials exist but are informal and have not been formally assessed. No competency framework, job standard, or capacity model. Staffing is sufficient for current volume but has no buffer for surge or complex matters.",
        notes:  "Appropriate target for small/low-volume organizations running lean. Does not penalize small programs for being appropriately sized.",
      },
      {
        level:  3,
        label:  "Developing",
        anchor: "Investigators are formally designated and have documented credentials or demonstrated investigative experience relevant to the organization's case mix. A competency framework or job standard exists (even if informal). Capacity is informally tracked and generally sufficient for current volume. Some provision exists for surge coverage (e.g., outside counsel, cross-trained staff).",
      },
      {
        level:  4,
        label:  "Defined",
        anchor: "Investigator competency is formally assessed and documented on a defined schedule (at least annually). A certification pathway exists and investigators are actively pursuing or hold relevant credentials (e.g., CFE, PEACE, AWI Certificate). Capacity planning is data-driven: case volume, complexity, and cycle time inform staffing decisions. A succession or coverage model explicitly addresses single-investigator risk.",
      },
      {
        level:  5,
        label:  "Embedded",
        anchor: "Investigator performance is formally evaluated against a competency framework with defined advancement criteria. Certification is required, not merely encouraged. Professional development is resourced, tracked, and aligned to program needs and ISO/TS 37008 competency requirements. Capacity modeling accounts for volume, complexity, geographic distribution, and anticipated growth. The function maintains bench depth and documented surge capacity.",
      },
    ],
    remedies: [
      { label: "Competency Framework",                description: "Define investigator competency standards, job levels, and advancement criteria aligned to the organization's case mix and ISO/TS 37008." },
      { label: "Certification Pathway",               description: "Map a structured path to CFE, PEACE, or AWI certification for current and future investigators." },
      { label: "Sized-Capacity Model",               description: "Build a right-sized staffing model based on case volume, complexity, and cycle-time targets." },
      { label: "PEACE Interviewing Training",         description: "Structured interview training for investigators, raising competence and reducing capacity pressure." },
    ],
  },

  // --------------------------------------------------------------------------
  // 4. INTAKE & TRIAGE — 12%
  // Risk axis: MIXED — target = max(capacity_floor[volume], quality_floor[consequence])
  // --------------------------------------------------------------------------
  {
    id:      "intake",
    name:    "Intake & Triage",
    weight:  0.12,
    riskAxis: "Case volume (capacity floor) and consequence severity (quality floor) — target = max of both",
    targetNote:
      "Two independent floors; target is the HIGHER of them. " +
      "Capacity floor (volume-driven): low → 2, moderate → 3, high → 4. " +
      "Quality floor (consequence-driven): low → 3, moderate → 3, high → 4. " +
      "A low-volume, high-consequence organization targets 4 (quality floor wins). " +
      "A high-volume, low-consequence organization also targets 4 (capacity floor wins). " +
      "No organization should target below 3 — confidentiality and anti-retaliation at intake are non-negotiable.",
    levels: [
      {
        level:  1,
        label:  "Absent",
        anchor: "No defined reporting channels. Concerns are received informally — verbally, through personal relationships, or by accident. No systematic logging, acknowledgment, or triage. Reporters have no reliable way to know their concern was received or will be acted upon.",
      },
      {
        level:  2,
        label:  "Initial",
        anchor: "One or more reporting channels exist (e.g., manager, HR email) but are not actively promoted or consistently accessible. Concerns are logged inconsistently or not at all. Triage is informal and reactive. Reporters receive no formal acknowledgment or follow-up commitment. Anonymous reporting is absent or not functionally protected.",
      },
      {
        level:  3,
        label:  "Developing",
        anchor: "Multiple reporting channels are defined, communicated, and accessible to all employees — including at least one option that does not require disclosure to a direct manager. All concerns are logged from point of receipt with a consistent record. A triage protocol exists that classifies severity, determines routing, and triggers appropriate next steps. Reporters receive acknowledgment within a defined timeframe. Confidentiality at intake is explicitly protected.",
        notes:  "Anonymous or third-party reporting option is required at this level — not just a manager channel.",
      },
      {
        level:  4,
        label:  "Defined",
        anchor: "Reporting channels are actively and regularly promoted across the organization. The triage protocol includes formal severity classification criteria, routing logic, preliminary-assessment standards, and conflict-of-interest screening. Response time standards are defined and tracked. Anonymous reporting is legally compliant across all operating jurisdictions and functionally tested. Reporters who identify themselves receive structured follow-up.",
      },
      {
        level:  5,
        label:  "Embedded",
        anchor: "The intake system is integrated with case management technology. Triage decisions are documented, auditable, and subject to quality review. Reporting channel effectiveness is measured: volume by channel, time-to-acknowledge, and reporter experience data are reviewed on a defined schedule. The system is tested periodically for accessibility, confidentiality, and responsiveness. Intake data informs program and risk assessment.",
      },
    ],
    remedies: [
      { label: "Reporting Channel Design",            description: "Design or refresh the full reporting channel architecture, including anonymous/third-party options and jurisdictional compliance." },
      { label: "Triage & Severity Framework",         description: "Build a formal triage protocol with severity classification, routing logic, and preliminary-assessment criteria." },
      { label: "Preliminary Assessment Template",     description: "Structured intake document for capturing reporter information, concern details, and initial severity classification." },
      { label: "Routing Protocol",                    description: "Define who receives what type of concern, under what conditions, and with what notification obligations." },
    ],
  },

  // --------------------------------------------------------------------------
  // 5. POLICY & COMPLIANCE — 10%
  // Risk axis: consequence severity × regulatory exposure
  // Floor: 3 (undeployed policy is indefensible at any size)
  // --------------------------------------------------------------------------
  {
    id:      "policy",
    name:    "Policy & Compliance",
    weight:  0.10,
    riskAxis: "Consequence severity and regulatory exposure",
    targetNote:
      "Base target is 3. +1 if regulated. +1 if multi-jurisdiction. Floor is 3 — a policy that exists " +
      "but is not operationalized (draft, undeployed, or not followed in practice) is indefensible in " +
      "any regulatory or legal proceeding regardless of organization size. Cap 5.",
    levels: [
      {
        level:  1,
        label:  "Absent",
        anchor: "No written investigations policy exists. Investigation practice is entirely undocumented. The organization cannot demonstrate to any external reviewer — regulator, auditor, or litigant — what standards govern its investigations.",
      },
      {
        level:  2,
        label:  "Initial",
        anchor: "A policy document exists in draft or has been written but is NOT formally approved, distributed, or operationalized. The content may be substantively sound, but practice does not consistently follow the document. This is the 'content exists, deployment does not' state — distinct from Level 3 where deployment and practice alignment are confirmed.",
        notes:  "The Level 2 / Level 3 boundary is operationalization: approved + distributed + followed IN PRACTICE. A policy sitting in a SharePoint folder that no one uses is Level 2.",
      },
      {
        level:  3,
        label:  "Developing",
        anchor: "An investigations policy is formally approved, distributed to relevant staff, and followed in practice. The policy covers the key substantive elements: scope of authority, confidentiality obligations, procedural fairness, anti-retaliation protections, and closure/communication standards. Legal and regulatory requirements for the primary operating jurisdiction(s) are incorporated and current.",
      },
      {
        level:  4,
        label:  "Defined",
        anchor: "The policy is reviewed and updated on a defined, documented schedule (at least annually or upon significant legal/regulatory change). Policy exceptions are documented and approved through a formal process. Compliance with applicable law — employment, privacy, whistleblower, data protection — is actively monitored across all operating jurisdictions. Policy training is tied to onboarding and refreshed periodically.",
      },
      {
        level:  5,
        label:  "Embedded",
        anchor: "The policy suite is comprehensive, jurisdiction-specific where legally required, and integrated with adjacent programs (HR, Legal, Compliance, Ethics, Risk). Policy currency is maintained through a structured legal/regulatory monitoring process. Policy effectiveness is formally evaluated (e.g., case review, compliance audit) and gaps are addressed proactively. The investigations policy is a recognized reference document cited in other program instruments.",
      },
    ],
    remedies: [
      { label: "Tailored Investigations Manual",      description: "Draft a bespoke investigations policy and procedure manual aligned to the organization's risk profile, legal obligations, and ISO/TS 37008." },
      { label: "Policy Deployment Package",           description: "Operationalize an existing policy through communication, training, acknowledgment, and process integration." },
      { label: "Jurisdictional Compliance Mapping",   description: "Map investigation-relevant legal requirements (employment, privacy, whistleblower) across all operating jurisdictions." },
      { label: "Policy Review & Update Cycle",        description: "Establish a structured policy review schedule tied to regulatory monitoring and program performance data." },
    ],
  },

  // --------------------------------------------------------------------------
  // 6. COMMUNICATION — 10%
  // Risk axis: consequence severity × confidentiality/anti-retaliation requirement
  // Floor: 3 (non-negotiable at any scale — confidentiality + anti-retaliation)
  // --------------------------------------------------------------------------
  {
    id:      "communication",
    name:    "Communication",
    weight:  0.10,
    riskAxis: "Consequence severity and multi-jurisdiction reach",
    targetNote:
      "Base target is 3. +1 if consequence is high. +1 if multi-jurisdiction. Floor is 3 — " +
      "confidentiality commitments and anti-retaliation messaging are non-negotiable at any " +
      "organization size. Employees must know they can report without exposure. Cap 5.",
    levels: [
      {
        level:  1,
        label:  "Absent",
        anchor: "Employees have no reliable way to learn how to report a concern, what protections they have, or that an investigations function exists. No communication exists about reporting channels, confidentiality, or anti-retaliation protections. The organization cannot demonstrate that employees were informed.",
      },
      {
        level:  2,
        label:  "Initial",
        anchor: "Some communication exists — typically a policy reference or a hotline number in the Code of Conduct — but it is passive, infrequent, and limited in reach. Confidentiality and anti-retaliation messaging is inconsistent or buried in policy language that most employees do not read. Leadership does not actively model or reinforce a speak-up culture.",
      },
      {
        level:  3,
        label:  "Developing",
        anchor: "Employees are actively and recurrently informed of reporting channels through at least two communication vehicles (e.g., intranet, training, onboarding, manager messaging). Anti-retaliation protections and confidentiality commitments are clearly stated and reinforced. Leadership messaging explicitly supports speaking up. Communication is differentiated for employees and managers.",
        notes:  "Confidentiality and anti-retaliation must be EXPLICIT and CLEAR — not implied or referenced only in policy fine print.",
      },
      {
        level:  4,
        label:  "Defined",
        anchor: "Communication is planned, scheduled, and audience-segmented: employees, managers, senior leaders, and new hires receive appropriately tailored messaging. Content is consistent across channels. Investigation outcomes (where appropriate) are communicated at the right level of generality without breaching confidentiality. Communication about the program is not limited to annual Code of Conduct training.",
      },
      {
        level:  5,
        label:  "Embedded",
        anchor: "Communication effectiveness is measured — awareness surveys, reporting volume trends, and employee perception data are reviewed and acted upon. Messaging is continuously refined based on evidence. The speak-up culture is embedded in leadership behavior, onboarding, and organizational norms — not just policy statements. Communication strategy is reviewed with program changes and significant organizational events (e.g., acquisitions, leadership changes).",
      },
    ],
    remedies: [
      { label: "Confidentiality Protocol",            description: "Define and document what confidentiality the organization can and cannot promise reporters and participants across all operating jurisdictions." },
      { label: "Anti-Retaliation Messaging Suite",    description: "Develop targeted, plain-language anti-retaliation messaging for employees, managers, and senior leaders." },
      { label: "Caution Notice Templates",            description: "Build standardized caution notices for use at the opening of investigative interviews, aligned to jurisdictional requirements." },
      { label: "Speak-Up Culture Assessment",         description: "Measure current employee awareness and perception of reporting channels and protections; identify gaps and design a targeted communication plan." },
    ],
  },

  // --------------------------------------------------------------------------
  // 7. TRAINING — 10%
  // Risk axis: consequence severity + DOLLAR-ANCHORED current state
  // Floor: 3 (structured curriculum required at any scale)
  // --------------------------------------------------------------------------
  {
    id:      "training",
    name:    "Training",
    weight:  0.10,
    riskAxis: "Consequence severity, multi-jurisdiction reach, and training investment (dollar-anchored)",
    targetNote:
      "Base target is 3. +1 if consequence is high. +1 if multi-jurisdiction. Floor is 3 — " +
      "a structured curriculum for investigators and managers is the minimum defensible standard. " +
      "Dollar thresholds are NECESSARY but NOT SUFFICIENT: money without structure does not raise the level. " +
      "Both the investment threshold AND the structural requirements must be met. Cap 5.",
    levels: [
      {
        level:  1,
        label:  "Absent",
        anchor: "No investigations-related training exists for any group — investigators, managers, or employees. Investigators conduct interviews and document findings with no training in methodology, evidence standards, or procedural fairness. The organization has made no investment in investigations-specific training.",
        notes:  "Per-investigator annual training spend: $0 or incidental (e.g., general HR training that touches investigations topics).",
      },
      {
        level:  2,
        label:  "Initial",
        anchor: "Training occurs ad hoc or informally when a specific need arises. No structured curriculum, defined completion requirements, or planned delivery. Training is reactive, not programmatic. Some investigators may have received relevant external training, but this is not systematized or required.",
        notes:  "Per-investigator annual training investment: below $500. Training above this threshold but without structural curriculum, defined completion tracking, or required content remains at Level 2.",
      },
      {
        level:  3,
        label:  "Developing",
        anchor: "A required training curriculum exists for investigators covering methodology, interviewing, documentation, and evidence handling. Managers and supervisors receive defined training on how to respond to and escalate concerns. All-employee awareness training covers reporting channels and anti-retaliation protections. Training completion is tracked and reported. Content is reviewed on a defined schedule.",
        notes:  "Per-investigator annual training investment: $1,500–$3,000. Both the investment level AND the required curriculum structure must be present. Dollar spend alone does not satisfy this level.",
      },
      {
        level:  4,
        label:  "Defined",
        anchor: "A formal certification pathway exists for investigators (e.g., CFE, PEACE, AWI Certificate in Investigative Practice). Continuing professional education is tracked, reported, and required — not merely encouraged. Training content is formally reviewed and updated on a defined schedule. Manager training is role-specific and regularly refreshed.",
        notes:  "Per-investigator annual training investment: $3,000–$5,000. Structural requirements: documented certification pathway AND CPE tracking AND annual content review are all required alongside the investment level. Dollar spend without this structure = Level 3.",
      },
      {
        level:  5,
        label:  "Embedded",
        anchor: "Investigator certification is required and formally assessed — advancement depends on demonstrated competency, not merely course completion. Training outcomes are evaluated (not just tracked). The training program is continuously updated proactively, not only in response to failures. Competency-based advancement criteria are documented and applied.",
        notes:  "Per-investigator annual training investment: above $5,000. Investment must align with a documented competency development strategy. A high spend without competency-based advancement or outcomes evaluation = Level 4.",
      },
    ],
    remedies: [
      { label: "Tailored Training Curriculum",        description: "Design a role-specific training program for investigators, managers, and employees aligned to the organization's risk profile and ISO/TS 37008 competency requirements." },
      { label: "PEACE Investigative Interviewing",    description: "Deliver structured interviewer training in the PEACE model for planning, conducting, and documenting investigative interviews." },
      { label: "Certification Roadmap",               description: "Build a structured path to CFE, PEACE, or AWI certification with timelines, investment plan, and CPE tracking." },
      { label: "CPE Tracking System",                 description: "Implement a continuing professional education tracking and reporting system for the investigations function." },
    ],
  },

  // --------------------------------------------------------------------------
  // 8. REPORTING & METRICS — 5%
  // Risk axis: SPLIT — target = max(report_quality_floor[consequence], metrics_floor[volume])
  // --------------------------------------------------------------------------
  {
    id:      "reporting",
    name:    "Reporting & Metrics",
    weight:  0.05,
    riskAxis: "Consequence severity (report quality floor) and case volume (metrics floor) — target = max of both",
    targetNote:
      "Two independent floors; target is the HIGHER of them. " +
      "Report quality floor (consequence-driven): base 3; +1 if high consequence; +1 if regulated or multi-jurisdiction. " +
      "Metrics floor (volume-driven): base 2; volume moderate → 3; volume high → 4. " +
      "A low-volume, high-consequence regulated organization targets 4–5 (report quality floor). " +
      "A high-volume, low-consequence organization targets 4 (metrics floor). Cap 5.",
    levels: [
      {
        level:  1,
        label:  "Absent",
        anchor: "No metrics are tracked. No reporting to leadership or governance bodies on investigations program performance. The organization has no data-driven view of its investigations program. Leadership cannot assess volume, cycle time, case type distribution, or outcome patterns.",
      },
      {
        level:  2,
        label:  "Initial",
        anchor: "Basic case counts are maintained informally. Some metrics are produced reactively on request but are not consistently defined, calculated, or presented. No reporting cadence or defined audience. Data quality is variable and typically not verified.",
      },
      {
        level:  3,
        label:  "Developing",
        anchor: "Core metrics are defined, consistently tracked, and reported: case volume, case type, cycle time, and resolution outcomes. Reports are produced on a defined schedule and shared with relevant leadership (e.g., Chief Compliance Officer, Chief Legal Officer, or their designates). Data is used to identify summary patterns and flag anomalies.",
        notes:  "Defined and CONSISTENT is the key differentiator. Metrics produced only on request, or defined differently each quarter, are Level 2.",
      },
      {
        level:  4,
        label:  "Defined",
        anchor: "Metrics reporting is formal, consistent, and audience-segmented. Reports include trend analysis, aging data, substantiation rates by allegation type, and root-cause observations. Metrics are used proactively to drive program improvements, resource decisions, and policy updates — not just as a historical record. Benchmarking against available external data is attempted where reliable data exists.",
      },
      {
        level:  5,
        label:  "Embedded",
        anchor: "Reporting is integrated with enterprise risk and compliance dashboards and reviewed by a governance body (e.g., Audit Committee, Board subcommittee) on a defined schedule. Root-cause analysis is systematic and documented. Metrics findings are translated into action plans with ownership and follow-up. Program performance data informs external reporting obligations where applicable (e.g., regulatory filings, ESG disclosures).",
      },
    ],
    remedies: [
      { label: "Investigation Report Template",       description: "Standardized investigation report structure covering findings, analysis, conclusions, and recommendations with a QC checklist." },
      { label: "Report Writing Standard",             description: "A writing and documentation standard for investigation reports, including factual grounding requirements, conclusion logic, and recommendation criteria." },
      { label: "Metrics Dashboard Design",            description: "Define, build, and operationalize a core metrics dashboard covering volume, cycle time, case type, and resolution outcomes." },
      { label: "Root-Cause Analysis Framework",       description: "A structured methodology for identifying systemic contributing factors from investigation patterns and translating findings into program improvements." },
    ],
  },

  // --------------------------------------------------------------------------
  // 9. TECHNOLOGY & TOOLS — 3%
  // Risk axis: VOLUME-DRIVEN ONLY — no quality/independence floor
  // Small/low-volume orgs legitimately target Level 2
  // --------------------------------------------------------------------------
  {
    id:      "technology",
    name:    "Technology & Tools",
    weight:  0.03,
    riskAxis: "Case volume — the only dimension with no quality/independence floor",
    targetNote:
      "Base target is 2. Volume moderate → +1 (target 3). Volume high → +2 (target 4). " +
      "+1 if multi-jurisdiction (documentation and audit trail complexity). " +
      "NO FLOOR — a small, low-volume organization legitimately targets Level 2: a structured tracking " +
      "log with basic security is genuinely appropriate. Over-engineering technology for program scale " +
      "is waste, not maturity. Target 5 only when volume, complexity, and scale demand it. " +
      "Note: the Agile Investigator CMS, when fully operationalized, lifts Intake, Reporting, and Process " +
      "scores through THOSE dimensions' own rubrics — not as an automatic Technology bonus. Cap 5.",
    levels: [
      {
        level:  1,
        label:  "Absent",
        anchor: "No dedicated tools. Cases are tracked in personal email, individual spreadsheets, or informal files with no consistent structure. No chain of custody, access controls, or data security. Case data is at high risk of loss, unauthorized access, or inadvertent disclosure.",
      },
      {
        level:  2,
        label:  "Initial",
        anchor: "A basic tracking tool exists — a structured shared spreadsheet, a simple log, or a shared drive — with some consistent structure (fields, naming conventions). Case data is stored with basic security (access-restricted folder, password). No workflow, notification, or reporting capability. Access is informally managed.",
        notes:  "Legitimate and appropriate target for small/low-volume organizations. Does not penalize programs for being sensibly sized.",
      },
      {
        level:  3,
        label:  "Developing",
        anchor: "A structured case management system or platform is in use — purpose-built or adapted — for tracking cases from intake through closure. Cases are logged with consistent data fields. Data is stored with defined access controls and basic audit trail. Summary reporting (case counts, status, age) is possible from the system. The system is used consistently across the function.",
      },
      {
        level:  4,
        label:  "Defined",
        anchor: "The case management system supports the full investigation lifecycle: intake, assignment, workflow, documentation, and closure. Reporting and metrics generation are system-enabled and regularly used. Workflow features (task assignment, deadline tracking, notifications) are active and relied upon. Data security and access controls are formally reviewed and documented. The system is assessed for fitness periodically.",
      },
      {
        level:  5,
        label:  "Embedded",
        anchor: "Technology is fully integrated with intake, triage, reporting, and workflow processes. System data is the primary source for the program's metrics and reporting function. The platform is evaluated and updated on a defined cycle aligned to program growth and changing needs. Technology selection is demonstrably appropriate for program scale — not over-engineered for low volume or under-resourced for high volume.",
        notes:  "Full CMS integration lifting other dimension scores (Intake, Reporting, Process) is recognized through THOSE dimensions' rubrics, not here.",
      },
    ],
    remedies: [
      { label: "Structured Tracking Setup",           description: "Design and implement a right-sized case tracking system appropriate to the organization's volume and complexity — from structured log to full CMS." },
      { label: "Agile Investigator CMS",              description: "Purpose-built investigations case management system with intake, workflow, documentation, metrics, and reporting — a cross-dimensional force multiplier." },
      { label: "CMS Implementation & Configuration",  description: "Configure and deploy a case management platform tailored to the organization's workflow, role structure, and reporting requirements." },
      { label: "Template Suite",                      description: "Standard investigation document templates (intake form, preliminary assessment, interview plan, report) integrated with or complementing the CMS." },
    ],
  },

];

// ============================================================================
// WEIGHT VALIDATION — runs at import time in development
// ============================================================================

const totalWeight = DIMENSION_RUBRICS.reduce((s, d) => s + d.weight, 0);
if (Math.abs(totalWeight - 1.0) > 0.001) {
  console.error(`[TrustQ] DIMENSION_RUBRICS weights sum to ${totalWeight.toFixed(4)}, expected 1.0000`);
}

// ============================================================================
// TARGET ENGINE — computeTargets(profile) → per-dimension target scores
// ============================================================================

export type DimensionTargets = Record<string, number>; // dimensionId → 1–5

export function computeTargets(profile: OrgProfile): DimensionTargets {
  const { headcount, geographicScope, consequenceSeverity, regulated, caseVolume } = profile;

  const isLarge       = headcount === "large";
  const isMulti       = geographicScope === "multi";
  const isHighConseq  = consequenceSeverity === "high";
  const isMidConseq   = consequenceSeverity === "moderate";
  const isHighVol     = caseVolume === "high";
  const isMidVol      = caseVolume === "moderate";

  // --- Governance & Structure -----------------------------------------------
  // Base 3. +1 if high consequence OR regulated. +1 if large AND high consequence. Floor 3. Cap 5.
  let governance = 3;
  if (isHighConseq || regulated) governance = Math.min(governance + 1, 5);
  if (isLarge && isHighConseq)   governance = Math.min(governance + 1, 5);
  governance = Math.max(governance, 3); // floor

  // --- Investigation Process ------------------------------------------------
  // Base 3. +1 if high consequence. +1 if multi-jurisdiction. Floor 3. Cap 5.
  let process = 3;
  if (isHighConseq) process = Math.min(process + 1, 5);
  if (isMulti)      process = Math.min(process + 1, 5);
  process = Math.max(process, 3);

  // --- People & Competency --------------------------------------------------
  // Base 2. Vol mod → 3, vol high → 4. +1 if multi OR high consequence. Cap 5. No floor.
  let people = 2;
  if (isMidVol)     people = Math.max(people, 3);
  if (isHighVol)    people = Math.max(people, 4);
  if (isMulti || isHighConseq) people = Math.min(people + 1, 5);

  // --- Intake & Triage ------------------------------------------------------
  // capacity_floor: vol low 2, mod 3, high 4
  // quality_floor:  consequence low 3, mod 3, high 4
  // target = MAX of both
  const capacityFloor = isHighVol ? 4 : isMidVol ? 3 : 2;
  const qualityFloor  = isHighConseq ? 4 : 3;
  const intake        = Math.min(Math.max(capacityFloor, qualityFloor), 5);

  // --- Policy & Compliance --------------------------------------------------
  // Base 3. +1 if regulated. +1 if multi-jurisdiction. Floor 3. Cap 5.
  let policy = 3;
  if (regulated) policy = Math.min(policy + 1, 5);
  if (isMulti)   policy = Math.min(policy + 1, 5);
  policy = Math.max(policy, 3);

  // --- Communication --------------------------------------------------------
  // Base 3. +1 if high consequence. +1 if multi-jurisdiction. Floor 3. Cap 5.
  let communication = 3;
  if (isHighConseq) communication = Math.min(communication + 1, 5);
  if (isMulti)      communication = Math.min(communication + 1, 5);
  communication = Math.max(communication, 3);

  // --- Training -------------------------------------------------------------
  // Base 3. +1 if high consequence. +1 if multi-jurisdiction. Floor 3. Cap 5.
  let training = 3;
  if (isHighConseq) training = Math.min(training + 1, 5);
  if (isMulti)      training = Math.min(training + 1, 5);
  training = Math.max(training, 3);

  // --- Reporting & Metrics --------------------------------------------------
  // report_quality_floor: base 3, +1 high consequence, +1 regulated or multi
  // metrics_floor:        base 2, +1 vol mod, +2 vol high
  // target = MAX of both. Cap 5.
  let reportQualityFloor = 3;
  if (isHighConseq)          reportQualityFloor = Math.min(reportQualityFloor + 1, 5);
  if (regulated || isMulti)  reportQualityFloor = Math.min(reportQualityFloor + 1, 5);

  let metricsFloor = 2;
  if (isMidVol)  metricsFloor = Math.min(metricsFloor + 1, 5);
  if (isHighVol) metricsFloor = Math.min(metricsFloor + 2, 5);

  const reporting = Math.min(Math.max(reportQualityFloor, metricsFloor), 5);

  // --- Technology & Tools ---------------------------------------------------
  // Base 2. Vol mod +1, vol high +2. +1 if multi-jurisdiction. NO floor. Cap 5.
  let technology = 2;
  if (isMidVol)  technology = Math.min(technology + 1, 5);
  if (isHighVol) technology = Math.min(technology + 2, 5);
  if (isMulti)   technology = Math.min(technology + 1, 5);
  // No floor — small/low-volume orgs legitimately target 2.

  return {
    governance,
    process,
    people,
    intake,
    policy,
    communication,
    training,
    reporting,
    technology,
  };
}

// ============================================================================
// SCORING ENGINE — computeScore(currentScores, targets) → 0–100
// ============================================================================

export interface DimensionResult {
  id:           string;
  name:         string;
  weight:       number;
  current:      number; // 1–5 raw score set by assessor
  target:       number; // 1–5 computed from OrgProfile
  ratio:        number; // min(current / target, 1) — capped at 1.0
  contribution: number; // ratio × weight — share of the 0–1 score
  gap:          number; // target - current (0 if current >= target)
  atTarget:     boolean;
}

export interface ScoreResult {
  trustqScore:      number; // 0–100, integer
  dimensionResults: DimensionResult[];
  /** Raw weighted sum before rounding, for display precision */
  rawSum:           number;
}

export function computeScore(
  currentScores: Record<string, number>, // dimensionId → 1–5
  targets:       DimensionTargets        // dimensionId → 1–5
): ScoreResult {
  const dimensionResults: DimensionResult[] = DIMENSION_RUBRICS.map((dim) => {
    const current = Math.max(1, Math.min(5, currentScores[dim.id] ?? 1));
    const target  = Math.max(1, Math.min(5, targets[dim.id] ?? 3));
    const ratio   = Math.min(current / target, 1);
    const contribution = ratio * dim.weight;
    return {
      id:           dim.id,
      name:         dim.name,
      weight:       dim.weight,
      current,
      target,
      ratio,
      contribution,
      gap:          Math.max(target - current, 0),
      atTarget:     current >= target,
    };
  });

  const rawSum    = dimensionResults.reduce((s, d) => s + d.contribution, 0);
  const trustqScore = Math.round(rawSum * 100);

  return { trustqScore, dimensionResults, rawSum };
}

// ============================================================================
// CONVENIENCE LOOKUPS
// ============================================================================

/** Get a rubric by dimension id */
export function getDimensionRubric(id: string): DimensionRubric | undefined {
  return DIMENSION_RUBRICS.find(d => d.id === id);
}

/** Get a maturity level anchor by dimension id and score */
export function getMaturityAnchor(dimensionId: string, score: MaturityScore): MaturityLevel | undefined {
  return getDimensionRubric(dimensionId)?.levels.find(l => l.level === score);
}

/** Get remedies for all dimensions where current < target */
export function getPriorityRemedies(results: DimensionResult[]): Array<{ dimension: DimensionResult; remedies: Remedy[] }> {
  return results
    .filter(d => !d.atTarget)
    .sort((a, b) => b.gap - a.gap)
    .map(d => ({
      dimension: d,
      remedies:  getDimensionRubric(d.id)?.remedies ?? [],
    }));
}

/** Confidence index helpers */
export function deriveConfidenceLevel(sourceCount: number): ConfidenceLevel {
  if (sourceCount >= 4) return "Validated";
  if (sourceCount >= 3) return "Strong";
  if (sourceCount >= 2) return "Corroborated";
  return "Indicative";
}
