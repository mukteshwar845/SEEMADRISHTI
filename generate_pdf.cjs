const PDFDocument = require('pdfkit');
const fs = require('fs');

const doc = new PDFDocument({ margin: 30 });
doc.pipe(fs.createWriteStream('audit_report.pdf'));

const reportPath = fs.existsSync('docs/archive/audit_report.md') ? 'docs/archive/audit_report.md' : 'audit_report.md';
const text = fs.readFileSync(reportPath, 'utf8');

doc.font('Helvetica-Bold').fontSize(14).text('TECHNICAL AUDIT REPORT: SEEMADRISHTI AI', { align: 'center' });
doc.moveDown();

doc.font('Helvetica').fontSize(10);
const lines = text.split('\n');
for (const line of lines) {
  if (line.startsWith('# ')) {
    doc.moveDown().font('Helvetica-Bold').fontSize(14).text(line);
  } else if (line.startsWith('## ')) {
    doc.moveDown().font('Helvetica-Bold').fontSize(12).text(line);
  } else if (line.startsWith('### ')) {
    doc.moveDown().font('Helvetica-Bold').fontSize(11).text(line);
  } else if (line.startsWith('**')) {
    doc.font('Helvetica-Bold').fontSize(10).text(line);
  } else {
    doc.font('Helvetica').fontSize(10).text(line);
  }
}

doc.end();
console.log('PDF generated successfully');
