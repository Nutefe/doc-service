import { parentPort } from "node:worker_threads";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

async function makePdf(userId: string, template: string) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]); // A4
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  page.drawText("Generated document", {
    x: 50,
    y: 800,
    size: 18,
    font,
    color: rgb(0, 0, 0),
  });
  page.drawText(`User: ${userId}`, { x: 50, y: 770, size: 12, font });
  page.drawText(`Template: ${template}`, { x: 50, y: 750, size: 12, font });
  page.drawText(`TS: ${new Date().toISOString()}`, {
    x: 50,
    y: 730,
    size: 12,
    font,
  });

  const bytes = await pdfDoc.save();
  return Buffer.from(bytes);
}

parentPort!.on("message", async (msg: any) => {
  try {
    const buf = await makePdf(msg.userId, msg.template);
    parentPort!.postMessage({ ok: true, bytes: buf });
  } catch (e) {
    parentPort!.postMessage({ ok: false, error: String(e) });
  }
});
