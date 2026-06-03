// ---------------------------------------------------------------------------
// generateScenarioReport — Client-side PDF generator for TrustQ scenario exports.
// ---------------------------------------------------------------------------

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const RISK_NARRATIVES: Record<string, string> = {
  "Governance & Structure":
    "Without a formal charter and defined authority, investigations lack independence and legal defensibility. Retaliation claims and organizational interference become more likely. A funded governance structure establishes the program's standing and executive accountability.",
  "Investigation Process":
    "Inconsistent methodology creates exposure to procedural fairness claims and litigation. Documented standards ensure every case is handled defensibly regardless of who conducts it, directly reducing the organization's legal and regulatory risk.",
  "Intake & Triage":
    "Poorly communicated reporting channels suppress speak-up behavior and increase regulatory risk under whistleblower protection laws. A funded intake infrastructure ensures concerns are captured, logged, and triaged consistently, ensuring reporters receive acknowledgment and follow-up.",
  "People & Competency":
    "Understaffed or under-credentialed investigation teams create case backlog, missed deadlines, and investigative errors. Investment in headcount and professional development directly reduces exposure from delayed or deficient investigations and the litigation that follows.",
  "Policy & Compliance":
    "Outdated or absent investigation policies create legal exposure when practice diverges from documented standards. A funded policy program ensures the organization can demonstrate regulatory alignment in any audit, litigation, or external review.",
  "Communication":
    "Employees who do not know how to report concerns, or who fear retaliation, become a regulatory and reputational liability. Communication investment builds the speak-up culture that ethics regulators, monitors, and plaintiffs' counsel look for when assessing program quality.",
  "Training":
    "Untrained investigators and managers mishandle concerns, creating legal exposure and cultural harm. Structured training investment directly reduces the frequency of procedurally deficient investigations and the downstream cost of remediation.",
  "Reporting & Metrics":
    "Without metrics, leadership cannot demonstrate program effectiveness to regulators, boards, or acquiring parties. A metrics infrastructure creates the audit trail that protects the organization in external scrutiny and supports data-driven program improvement.",
  "Technology & Tools":
    "Manual tracking through spreadsheets and email creates chain-of-custody gaps, data security exposure, and reporting blind spots. Case management technology is the infrastructure that makes every other program element auditable and defensible.",
};

const MATURITY_LABELS: Record<number, string> = {
  1: "Absent", 2: "Reactive", 3: "Defined", 4: "Managed", 5: "Embedded",
};

function maturityLabel(score: number): string {
  return MATURITY_LABELS[Math.round(score)] ?? score.toFixed(1);
}

function scoreBand(score: number): string {
  if (score >= 71) return "Good";
  if (score >= 41) return "Fair";
  return "At Risk";
}

export interface DimensionScenario {
  name:           string;
  weight:         number;
  baseline:       number;
  projected:      number;
  resourceDriver: string;
}

export interface ReportInput {
  orgName:        string;
  baselineTotal:  number;
  projectedTotal: number;
  dimensions:     DimensionScenario[];
  generatedBy?:   string;
}

const BRAND:   [number,number,number] = [30,  64, 175];
const GREEN:   [number,number,number] = [22, 101,  52];
const RED:     [number,number,number] = [185,  28,  28];
const AMBER:   [number,number,number] = [146,  64,  14];
const GRAY900: [number,number,number] = [17,  24,  39];
const GRAY500: [number,number,number] = [107, 114, 128];
const GRAY200: [number,number,number] = [229, 231, 235];
const WHITE:   [number,number,number] = [255, 255, 255];

export function generateScenarioReport(input: ReportInput): void {
  const { orgName, baselineTotal, projectedTotal, dimensions, generatedBy } = input;
  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" });
  const PW = 215.9;
  const PH = 279.4;
  const ML = 18;
  const MR = 18;
  const CW = PW - ML - MR;

  let y = 0;

  // =========================================================================
  // Cover band
  // =========================================================================
  doc.setFillColor(...BRAND);
  doc.rect(0, 0, PW, 52, "F");

  doc.setTextColor(...WHITE);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("TRUSTQ  |  PROGRAM INVESTMENT BRIEF", ML, 14);

  doc.setFontSize(22);
  doc.text("Investigations Program", ML, 28);
  doc.text("Maturity Investment Case", ML, 38);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(orgName, ML, 47);
  doc.text(today, PW - MR, 47, { align: "right" });

  y = 62;

  // =========================================================================
  // Sandbox notice — single clean line
  // =========================================================================
  doc.setFillColor(255, 251, 235);
  doc.setDrawColor(251, 191, 36);
  doc.roundedRect(ML, y, CW, 8, 1.5, 1.5, "FD");
  doc.setTextColor(146, 64, 14);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.text("SCENARIO PROJECTION  |  FOR PLANNING PURPOSES ONLY", ML + 3, y + 5.2);
  y += 13;

  // =========================================================================
  // Executive Summary heading
  // =========================================================================
  doc.setTextColor(...GRAY900);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Executive Summary", ML, y);
  y += 2;
  doc.setDrawColor(...BRAND);
  doc.setLineWidth(0.5);
  doc.line(ML, y, ML + CW, y);
  y += 7;

  // =========================================================================
  // Score cards
  // =========================================================================
  const cardW = (CW - 6) / 2;

  // Baseline card
  doc.setFillColor(249, 250, 251);
  doc.setDrawColor(...GRAY200);
  doc.setLineWidth(0.3);
  doc.roundedRect(ML, y, cardW, 28, 2, 2, "FD");
  doc.setTextColor(...GRAY500);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.text("CURRENT BASELINE", ML + 5, y + 7);
  const baseColor = baselineTotal >= 71 ? GREEN : baselineTotal >= 41 ? AMBER : RED;
  doc.setTextColor(...baseColor);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  doc.text(String(baselineTotal), ML + 5, y + 20);
  doc.setFontSize(10);
  doc.text("/ 100  " + scoreBand(baselineTotal), ML + 5 + doc.getTextWidth(String(baselineTotal)) + 1, y + 20);

  // Projected card
  const px = ML + cardW + 6;
  const delta = projectedTotal - baselineTotal;
  const projBorder = delta > 0 ? GREEN : delta < 0 ? RED : GRAY200;
  doc.setFillColor(
    delta > 0 ? 240 : delta < 0 ? 254 : 249,
    delta > 0 ? 253 : delta < 0 ? 242 : 250,
    delta > 0 ? 244 : delta < 0 ? 242 : 251
  );
  doc.setDrawColor(...projBorder);
  doc.setLineWidth(0.6);
  doc.roundedRect(px, y, cardW, 28, 2, 2, "FD");
  doc.setTextColor(...GRAY500);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.text("PROJECTED SCORE", px + 5, y + 7);
  const projColor = projectedTotal >= 71 ? GREEN : projectedTotal >= 41 ? AMBER : RED;
  doc.setTextColor(...projColor);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  doc.text(String(projectedTotal), px + 5, y + 20);
  doc.setFontSize(10);
  doc.text("/ 100  " + scoreBand(projectedTotal), px + 5 + doc.getTextWidth(String(projectedTotal)) + 1, y + 20);

  y += 35;

  // =========================================================================
  // Narrative summary
  // =========================================================================
  const changedDims = dimensions.filter(d => Math.abs(d.projected - d.baseline) >= 0.05);
  const totalScoreGain = projectedTotal - baselineTotal;

  doc.setTextColor(...GRAY900);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);

  let summaryText = "";
  if (changedDims.length === 0) {
    summaryText = `${orgName}'s investigations program currently scores ${baselineTotal}/100 (${scoreBand(baselineTotal)}). This brief reflects the current baseline with no scenario changes applied.`;
  } else {
    summaryText =
      `${orgName}'s investigations program currently scores ${baselineTotal}/100 (${scoreBand(baselineTotal)}). ` +
      `The investment scenario modeled in this brief targets improvements across ` +
      `${changedDims.length} dimension${changedDims.length > 1 ? "s" : ""} ` +
      `and is projected to lift the TrustQ Score to ${projectedTotal}/100 (${scoreBand(projectedTotal)}), ` +
      `a gain of ${totalScoreGain > 0 ? "+" : ""}${totalScoreGain} points. ` +
      `The sections below detail the dimensions targeted, the resources required, and the risks addressed.`;
  }

  const lines = doc.splitTextToSize(summaryText, CW) as string[];
  doc.text(lines, ML, y);
  y += lines.length * 5.5 + 6;

  // =========================================================================
  // Dimension Breakdown table
  // =========================================================================
  if (y > 200) { doc.addPage(); y = 20; }

  doc.setTextColor(...GRAY900);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Investment Scenario: Dimension Breakdown", ML, y);
  y += 2;
  doc.setDrawColor(...BRAND);
  doc.setLineWidth(0.5);
  doc.line(ML, y, ML + CW, y);
  y += 4;

  const tableRows = dimensions.map(d => {
    const baseLabel   = maturityLabel(d.baseline);
    const projLabel   = maturityLabel(d.projected);
    const dimDelta    = d.projected - d.baseline;
    const scoreImpact = Math.round((dimDelta * d.weight / 5) * 100);
    const changed     = Math.abs(dimDelta) >= 0.05;
    return {
      name:        d.name,
      weight:      `${Math.round(d.weight * 100)}%`,
      baseline:    `${d.baseline.toFixed(1)}  ${baseLabel}`,
      target:      `${d.projected.toFixed(1)}  ${projLabel}`,
      impact:      changed ? (scoreImpact > 0 ? `+${scoreImpact} pts` : `${scoreImpact} pts`) : "",
      resource:    d.resourceDriver,
      changed,
      scoreImpact,
    };
  });

  autoTable(doc, {
    startY: y,
    margin: { left: ML, right: MR },
    head: [["Dimension", "Wt.", "Current", "Target", "Score Impact", "Resource Driver"]],
    body: tableRows.map(r => [r.name, r.weight, r.baseline, r.target, r.impact, r.resource]),
    styles: {
      fontSize: 8,
      cellPadding: 3,
      overflow: "linebreak",
      textColor: [...GRAY900],
    },
    headStyles: {
      fillColor: [...BRAND],
      textColor: [...WHITE],
      fontStyle: "bold",
      fontSize: 7.5,
    },
    columnStyles: {
      0: { cellWidth: 38, fontStyle: "bold" },
      1: { cellWidth: 10, halign: "center" },
      2: { cellWidth: 28 },
      3: { cellWidth: 28 },
      4: { cellWidth: 20, halign: "center", fontStyle: "bold" },
      5: { cellWidth: "auto" },
    },
    willDrawCell: (data) => {
      if (data.section === "body") {
        const row = tableRows[data.row.index];
        if (row?.changed && data.column.index === 4) {
          doc.setTextColor(...(row.scoreImpact > 0 ? GREEN : RED));
        }
      }
    },
    didDrawCell: () => { doc.setTextColor(...GRAY900); },
    alternateRowStyles: { fillColor: [249, 250, 251] },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 10;

  // =========================================================================
  // Risk narratives
  // =========================================================================
  const changedForNarrative = dimensions.filter(d => Math.abs(d.projected - d.baseline) >= 0.05);

  if (changedForNarrative.length > 0) {
    if (y > 230) { doc.addPage(); y = 20; }

    doc.setTextColor(...GRAY900);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Risk Addressed by Investment", ML, y);
    y += 2;
    doc.setDrawColor(...BRAND);
    doc.setLineWidth(0.5);
    doc.line(ML, y, ML + CW, y);
    y += 7;

    for (const dim of changedForNarrative) {
      if (y > 245) { doc.addPage(); y = 20; }

      const scoreImpact = Math.round(((dim.projected - dim.baseline) * dim.weight / 5) * 100);

      // Dimension name
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(...BRAND);
      doc.text(dim.name, ML, y);

      // Projected score badge — just the target score, no formula
      const nameW = doc.getTextWidth(dim.name);
      const badgeColor: [number,number,number] = scoreImpact > 0 ? GREEN : RED;
      const badgeBg: [number,number,number]    = scoreImpact > 0 ? [220, 252, 231] : [254, 226, 226];
      doc.setFillColor(...badgeBg);
      doc.setDrawColor(...badgeColor);
      doc.setLineWidth(0.2);
      doc.roundedRect(ML + nameW + 3, y - 4, 22, 5.5, 1, 1, "FD");
      doc.setTextColor(...badgeColor);
      doc.setFontSize(7.5);
      doc.text(`Target: ${dim.projected.toFixed(1)} / 5`, ML + nameW + 4.5, y);

      y += 5;

      // Narrative
      const narrative = RISK_NARRATIVES[dim.name] ?? "";
      const narLines  = doc.splitTextToSize(narrative, CW) as string[];
      doc.setTextColor(...GRAY500);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.text(narLines, ML, y);
      y += narLines.length * 4.8 + 5;
    }
  }

  // =========================================================================
  // Methodology note
  // =========================================================================
  if (y > 230) { doc.addPage(); y = 20; }

  doc.setFillColor(239, 246, 255);
  doc.setDrawColor(147, 197, 253);
  doc.setLineWidth(0.3);
  doc.roundedRect(ML, y, CW, 22, 2, 2, "FD");

  doc.setTextColor(...BRAND);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("How to Read This Brief", ML + 4, y + 6);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  const methodText =
    "The TrustQ Score (0 to 100) measures investigations program maturity against ISO/TS 37008. " +
    "Each of the nine dimensions is scored on a 1 to 5 scale (Absent to Embedded) and weighted by its relative importance. " +
    "The projected scores in this brief reflect maturity targets set in the TrustQ Scenario Modeler. " +
    "They represent what the program score would be if the targeted dimensions reached the specified levels. " +
    "Actual results depend on the depth and sustainability of implementation.";
  const mLines = doc.splitTextToSize(methodText, CW - 8) as string[];
  doc.text(mLines, ML + 4, y + 11);
  y += 28;

  // =========================================================================
  // Footer — every page, single clean line
  // =========================================================================
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFillColor(...BRAND);
    doc.rect(0, PH - 10, PW, 10, "F");
    doc.setTextColor(...WHITE);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);

    const leftText  = generatedBy ? `Prepared by: ${generatedBy}` : "TrustQ  |  Astris Integrity Consulting";
    const rightText = `Page ${i} of ${pageCount}`;
    const centerText = "Scenario projection  |  For planning purposes only";

    doc.text(leftText, ML, PH - 4);
    doc.text(centerText, PW / 2, PH - 4, { align: "center" });
    doc.text(rightText, PW - MR, PH - 4, { align: "right" });
  }

  // =========================================================================
  // Save
  // =========================================================================
  const slug     = orgName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const dateSlug = new Date().toISOString().slice(0, 10);
  doc.save(`TrustQ-Investment-Brief-${slug}-${dateSlug}.pdf`);
}
