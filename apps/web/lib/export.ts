import PDFDocument from "pdfkit";
import type { InferSelectModel, comments } from "@easymarker/db";

type Comment = InferSelectModel<typeof comments>;

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

const CSV_HEADERS = [
  "Comment ID",
  "Reviewer Name",
  "Reviewer Email",
  "Comment Text",
  "Status",
  "Position X (%)",
  "Position Y (%)",
  "Page",
  "Created At",
  "Resolved At",
];

function anchorPage(anchor: unknown): string {
  if (anchor && typeof anchor === "object" && "page" in anchor) {
    const page = (anchor as { page?: number }).page;
    return typeof page === "number" ? String(page) : "";
  }
  return "";
}

export function buildCommentsCsv(rows: Comment[]): string {
  const lines = [CSV_HEADERS.join(",")];

  for (const c of rows) {
    const fields = [
      c.id,
      c.reviewerName,
      c.reviewerEmail ?? "",
      c.body,
      c.status,
      (c.positionX * 100).toFixed(1),
      (c.positionY * 100).toFixed(1),
      anchorPage(c.anchor),
      c.createdAt.toISOString(),
      c.resolvedAt ? c.resolvedAt.toISOString() : "",
    ];
    lines.push(fields.map((f) => csvEscape(String(f))).join(","));
  }

  return lines.join("\r\n");
}

export function buildCommentsPdf(rows: Comment[], projectTitle: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: "A4" });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(18).text(`Feedback report: ${projectTitle}`);
    doc.moveDown();
    doc.fontSize(10).fillColor("#666666").text(`${rows.length} comment${rows.length === 1 ? "" : "s"} · generated ${new Date().toLocaleString()}`);
    doc.moveDown(1.5);

    if (rows.length === 0) {
      doc.fontSize(12).fillColor("#000000").text("No comments on this project yet.");
    }

    for (const c of rows) {
      doc
        .fontSize(11)
        .fillColor("#000000")
        .text(`${c.reviewerName}${c.reviewerEmail ? ` <${c.reviewerEmail}>` : ""} — ${c.status}`, {
          continued: false,
        });
      doc.fontSize(9).fillColor("#666666").text(
        `Position: ${(c.positionX * 100).toFixed(1)}%, ${(c.positionY * 100).toFixed(1)}%${
          anchorPage(c.anchor) ? ` · Page ${anchorPage(c.anchor)}` : ""
        } · ${c.createdAt.toLocaleString()}${c.resolvedAt ? ` · Resolved ${c.resolvedAt.toLocaleString()}` : ""}`
      );
      doc.moveDown(0.3);
      doc.fontSize(11).fillColor("#000000").text(c.body);
      doc.moveDown();
      doc
        .strokeColor("#e2e8f0")
        .moveTo(doc.x, doc.y)
        .lineTo(doc.page.width - doc.page.margins.right, doc.y)
        .stroke();
      doc.moveDown();
    }

    doc.end();
  });
}
