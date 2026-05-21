// ---------------------------------------------------------------------------
// Assessment question data — source of truth for the 46-question diagnostic.
// Hard-coded intentionally; update here and re-run any stored responses will
// still reference the original question_text captured at save time.
//
// Weights must sum to 1.0.
// TODO: introduce a version field when the question set is revised.
// ---------------------------------------------------------------------------

export interface Question {
  text: string;
}

export interface Dimension {
  name: string;
  /** Decimal weight; all weights sum to 1.0 */
  weight: number;
  questions: Question[];
}

export const DIMENSIONS: Dimension[] = [
  {
    name: "Governance & Structure",
    weight: 0.20,
    questions: [
      { text: "The organization has a formal, dedicated investigations function." },
      { text: "The investigations function has a formal charter or mandate that defines its authority and scope." },
      { text: "The investigations function has responsibility for all investigation types — employee relations, compliance, quality, financial, and other concerns." },
      { text: "The investigations function operates independently from the functions it investigates." },
      { text: "Senior leadership is aware of and actively supports the investigations program." },
      { text: "A formal process exists to hear, adjudicate, and act on investigative findings." },
    ],
  },
  {
    name: "Investigation Process",
    weight: 0.18,
    questions: [
      { text: "Investigations follow a consistent, documented methodology from intake through resolution." },
      { text: "Investigative findings are based on documented facts and evidence." },
      { text: "All participants in an investigation — including reporters, subjects, and witnesses — are treated with procedural fairness regardless of seniority or role." },
      { text: "Investigation timelines are tracked and managed against defined standards." },
      { text: "Investigative conclusions are documented in a clear, defensible written record." },
      { text: "The organization has formal protections against retaliation for individuals who report concerns or participate in investigations." },
    ],
  },
  {
    name: "Intake & Triage",
    weight: 0.12,
    questions: [
      { text: "The organization has clearly defined and communicated channels for reporting concerns." },
      { text: "All reported concerns are logged and tracked from the moment of receipt." },
      { text: "A consistent triage process determines how concerns are prioritized and assigned." },
      { text: "Reporters receive acknowledgment or follow-up after submitting a concern." },
      { text: "Anonymous reporting is available and protected where legally permissible." },
    ],
  },
  {
    name: "People & Competency",
    weight: 0.12,
    questions: [
      { text: "Investigators have formal credentials, training, or demonstrated experience appropriate to their investigative responsibilities." },
      { text: "Investigator competency is assessed and documented on a regular basis." },
      { text: "The investigations function has sufficient staffing capacity to handle case volume without significant backlog." },
      { text: "Investigators receive ongoing professional development specific to investigations practice." },
      { text: "The organization has a defined competency framework or job standards for investigative roles." },
    ],
  },
  {
    name: "Policy & Compliance",
    weight: 0.10,
    questions: [
      { text: "The organization has a written investigations policy that governs how investigations are conducted." },
      { text: "Investigations policies are reviewed and updated on a defined schedule." },
      { text: "The investigations function maintains awareness of applicable legal and regulatory requirements across all operating jurisdictions." },
      { text: "Investigation practices align with applicable employment law, privacy law, and regulatory standards." },
      { text: "Policy exceptions or deviations during investigations are documented and approved." },
    ],
  },
  {
    name: "Communication",
    weight: 0.10,
    questions: [
      { text: "Employees are aware of how and where to report concerns." },
      { text: "The organization communicates the existence and purpose of the investigations function clearly and regularly." },
      { text: "Leadership messaging supports a speak-up culture and reinforces non-retaliation." },
      { text: "Communication about the investigations program is tailored to different audiences — employees, managers, and executives." },
      { text: "The organization communicates investigation outcomes at an appropriate level without compromising confidentiality." },
    ],
  },
  {
    name: "Training",
    weight: 0.10,
    questions: [
      { text: "Investigators receive formal training on investigative methodology, interviewing, and documentation." },
      { text: "Managers and supervisors receive training on how to respond to and escalate concerns appropriately." },
      { text: "All employees receive awareness training on reporting channels and non-retaliation protections." },
      { text: "Training content is reviewed and updated on a defined schedule." },
      { text: "Training completion is tracked and reported." },
    ],
  },
  {
    name: "Reporting & Metrics",
    weight: 0.05,
    questions: [
      { text: "The investigations function tracks and reports key metrics — case volume, cycle time, case type, and resolution." },
      { text: "Metrics are reported to senior leadership and governance bodies on a defined schedule." },
      { text: "Investigative data is used to identify trends, root causes, and systemic risks." },
      { text: "The organization benchmarks its investigations program metrics against industry standards where available." },
      { text: "Metrics reporting distinguishes between investigation types and outcomes." },
    ],
  },
  {
    name: "Technology & Tools",
    weight: 0.03,
    questions: [
      { text: "The organization uses a formal case management system to track investigations from intake through resolution." },
      { text: "Investigative data and records are stored securely with appropriate access controls." },
      { text: "The case management system supports reporting and metrics generation." },
      { text: "Technology tools support — rather than substitute for — investigative judgment and process." },
    ],
  },
];

// Weights sum: 0.20+0.18+0.12+0.12+0.10+0.10+0.10+0.05+0.03 = 1.00 ✓
// Total questions: 6+6+5+5+5+5+5+5+4 = 46 ✓

export const TOTAL_QUESTIONS = DIMENSIONS.reduce(
  (sum, d) => sum + d.questions.length,
  0
);

export const SCORE_LABELS: Record<number, string> = {
  1: "Absent",
  2: "Reactive",
  3: "Defined",
  4: "Managed",
  5: "Embedded",
};
