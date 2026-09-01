const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const inputFile = path.join(__dirname, 'presentation.md');
const outputFile = path.join(__dirname, 'presentation.pdf');

console.log('Reading:', inputFile);
const content = fs.readFileSync(inputFile, 'utf-8');

// Initialize PDF Document
const doc = new PDFDocument({
  size: 'A4',
  margins: { top: 38, bottom: 38, left: 38, right: 38 },
  bufferPages: true,
  autoFirstPage: true
});

const writeStream = fs.createWriteStream(outputFile);
doc.pipe(writeStream);

const pageWidth = doc.page.width;
const pageHeight = doc.page.height;
const leftMargin = 38;
const rightMargin = 38;
const contentWidth = pageWidth - leftMargin - rightMargin;
const maxContentY = pageHeight - 42;

// Color Palette - Tactical Defense Matrix
const COLORS = {
  headerBg: '#091124',      // Deep Tactical Navy
  primary: '#0f172a',       // Slate 900
  secondary: '#0284c7',     // Sky 600
  accentCyan: '#0ea5e9',    // Vibrant Sky Cyan
  accentBlue: '#2563eb',    // Blue 600
  stepHeaderBg: '#f1f5f9',  // Slate 100
  stepBorder: '#cbd5e1',    // Slate 300
  tableHeader: '#091124',   // Dark Table Header
  tableRowAlt: '#f8fafc',   // Slate 50
  tableBorder: '#cbd5e1',   // Slate 300
  text: '#1e293b',          // Slate 800
  textMuted: '#475569',     // Slate 600
  quoteBg: '#f0f9ff',       // Light Cyan Box
  quoteBorder: '#0284c7',   // Cyan Border
  amber: '#d97706',         // Amber
  emerald: '#059669',       // Emerald
  lineColor: '#e2e8f0'
};

// Safe text cleaning with em-dash and symbol preservation
function cleanText(str) {
  if (!str) return '';
  return str
    .replace(/&rarr;/g, '->')
    .replace(/&larr;/g, '<-')
    .replace(/&bull;/g, '•')
    .replace(/—/g, ' -- ')
    .replace(/–/g, '-')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    // Remove all unicode emojis, symbols, and non-ASCII chars
    .replace(/[^\x20-\x7E\u00A0-\u00FF]/g, '')
    .trim();
}

function stripMarkdown(str) {
  if (!str) return '';
  return str
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1');
}

// Check space remaining
function ensureSpace(neededHeight) {
  if (doc.y + neededHeight > maxContentY) {
    doc.addPage();
  }
}

// Draw Title Header Banner
function drawTitleBanner() {
  const bannerY = doc.y;
  const bannerHeight = 64;
  
  doc.rect(leftMargin, bannerY, contentWidth, bannerHeight)
    .fillAndStroke(COLORS.headerBg, COLORS.secondary);

  doc.rect(leftMargin, bannerY, contentWidth, 3).fill(COLORS.accentCyan);

  doc.fillColor('#38bdf8').font('Helvetica-Bold').fontSize(13)
    .text('SEEMADRISHTI  |  OFFICIAL JUDGE PRESENTATION MASTER GUIDE', leftMargin + 14, bannerY + 11, {
      width: contentWidth - 28,
      lineBreak: false
    });

  doc.fillColor('#94a3b8').font('Helvetica').fontSize(9)
    .text('Autonomous Multi-Camera Border Surveillance & Multi-AI Agent Tactical Defense Matrix', leftMargin + 14, bannerY + 31, {
      width: contentWidth - 28,
      lineBreak: false
    });

  doc.fillColor('#38bdf8').font('Helvetica-Bold').fontSize(7.5)
    .text('SIH PROBLEM STATEMENT: SIH26187  •  TEAM IQ100  •  DEFENSE & BORDER COMMAND', leftMargin + 14, bannerY + 47, {
      width: contentWidth - 28,
      lineBreak: false
    });

  doc.y = bannerY + bannerHeight + 12;
}

// Draw Section Heading (H2)
function drawH2(rawLine) {
  const noHash = rawLine.replace(/^#+\s*/, '');
  const text = cleanText(noHash);
  
  // If this is the reference table section, keep table intact by checking space
  if (text.toLowerCase().includes('quick feature reference')) {
    ensureSpace(230); // Move entire table to new page if not enough space
  } else {
    ensureSpace(40);
  }

  doc.moveDown(0.35);
  const y = doc.y;
  doc.rect(leftMargin, y, 4, 15).fill(COLORS.secondary);
  
  doc.fillColor(COLORS.primary).font('Helvetica-Bold').fontSize(11)
    .text(text, leftMargin + 10, y + 1.5, { width: contentWidth - 15 });
  
  doc.moveDown(0.25);
  doc.strokeColor(COLORS.lineColor).lineWidth(1)
    .moveTo(leftMargin, doc.y).lineTo(leftMargin + contentWidth, doc.y).stroke();
  doc.moveDown(0.35);
}

// Draw Step Header (H3)
function drawH3(rawLine) {
  ensureSpace(32);
  const noHash = rawLine.replace(/^#+\s*/, '');
  const text = cleanText(noHash);
  doc.moveDown(0.25);
  
  const y = doc.y;
  const boxHeight = 19;
  doc.rect(leftMargin, y, contentWidth, boxHeight).fillAndStroke(COLORS.stepHeaderBg, COLORS.stepBorder);
  doc.rect(leftMargin, y, 3, boxHeight).fill(COLORS.accentBlue);
  
  doc.fillColor(COLORS.primary).font('Helvetica-Bold').fontSize(9.5)
    .text(text, leftMargin + 10, y + 4.5, { width: contentWidth - 20, lineBreak: false });
  
  doc.y = y + boxHeight + 5;
}

// Draw Elevator Pitch Quote Box
function drawQuoteBox(lines) {
  const cleanLines = lines.map(l => cleanText(stripMarkdown(l.replace(/^>\s*/, '')))).filter(l => l.length > 0);
  const fullText = cleanLines.join('\n\n');
  
  doc.font('Helvetica-Oblique').fontSize(8.5);
  const textHeight = doc.heightOfString(fullText, { width: contentWidth - 26 });
  const boxHeight = textHeight + 22;
  
  ensureSpace(boxHeight + 8);
  const y = doc.y;
  
  doc.rect(leftMargin, y, contentWidth, boxHeight).fill(COLORS.quoteBg);
  doc.rect(leftMargin, y, 4, boxHeight).fill(COLORS.quoteBorder);
  
  doc.fillColor(COLORS.secondary).font('Helvetica-Bold').fontSize(8)
    .text('EXECUTIVE ELEVATOR PITCH (FIRST 30 SECONDS)', leftMargin + 12, y + 6, { lineBreak: false });
  
  doc.fillColor(COLORS.primary).font('Helvetica-Oblique').fontSize(8.5)
    .text(fullText, leftMargin + 12, y + 17, {
      width: contentWidth - 24,
      lineGap: 2.2
    });
  
  doc.y = y + boxHeight + 7;
}

// Draw Bullet or Numbered item
function drawPoint(line, indentLevel = 0) {
  const isNumbered = /^\s*\d+\.\s+/.test(line);
  let rawText = line.replace(/^\s*(\d+\.|[-*])\s+/, '');
  rawText = cleanText(rawText);
  
  const indent = leftMargin + (indentLevel * 12);
  const markerWidth = 12;
  const textWidth = contentWidth - (indentLevel * 12) - markerWidth;
  
  const plainText = stripMarkdown(rawText);
  doc.font('Helvetica').fontSize(8.5);
  const textHeight = doc.heightOfString(plainText, { width: textWidth });
  
  ensureSpace(textHeight + 2);
  const startY = doc.y;
  
  if (isNumbered) {
    const numMatch = line.match(/^\s*(\d+)\./);
    const num = numMatch ? numMatch[1] + '.' : '•';
    doc.fillColor(COLORS.secondary).font('Helvetica-Bold').fontSize(8)
      .text(num, indent, startY, { width: markerWidth, lineBreak: false });
  } else {
    doc.fillColor(COLORS.secondary).font('Helvetica-Bold').fontSize(8.5)
      .text('•', indent, startY - 0.5, { width: markerWidth, lineBreak: false });
  }
  
  const boldMatch = rawText.match(/^(\*\*[^*]+\*\*:?)(.*)/);
  if (boldMatch) {
    const boldHeader = stripMarkdown(boldMatch[1]);
    const restText = stripMarkdown(boldMatch[2]);
    
    doc.fillColor(COLORS.primary).font('Helvetica-Bold').fontSize(8.5)
      .text(boldHeader, indent + markerWidth, startY, {
        continued: restText.length > 0,
        width: textWidth
      });
    
    if (restText.length > 0) {
      doc.fillColor(COLORS.text).font('Helvetica').fontSize(8.5)
        .text(restText, {
          continued: false,
          width: textWidth,
          lineGap: 1.2
        });
    }
  } else {
    doc.fillColor(COLORS.text).font('Helvetica').fontSize(8.5)
      .text(plainText, indent + markerWidth, startY, {
        width: textWidth,
        lineGap: 1.2
      });
  }
  
  doc.moveDown(0.14);
}

// Draw Reference Table
function drawReferenceTable(tableRows) {
  if (!tableRows || tableRows.length < 2) return;
  
  const headers = tableRows[0].map(h => cleanText(stripMarkdown(h)));
  const data = tableRows.slice(1);
  
  const colWidths = [
    contentWidth * 0.22, // Module Name
    contentWidth * 0.20, // Sidebar Action
    contentWidth * 0.26, // Core Technology
    contentWidth * 0.32  // Key Judge Point
  ];
  
  ensureSpace(40);
  
  // Header row
  const headerHeight = 20;
  let curY = doc.y;
  
  doc.rect(leftMargin, curY, contentWidth, headerHeight).fill(COLORS.tableHeader);
  
  let curX = leftMargin;
  doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(7.5);
  headers.forEach((header, idx) => {
    doc.text(header.toUpperCase(), curX + 5, curY + 6, {
      width: colWidths[idx] - 10,
      align: 'left',
      lineBreak: false
    });
    curX += colWidths[idx];
  });
  
  curY += headerHeight;
  
  // Data rows
  data.forEach((row, rowIdx) => {
    const cleanCells = row.map(c => cleanText(stripMarkdown(c)));
    
    doc.font('Helvetica').fontSize(7.5);
    let maxCellHeight = 15;
    cleanCells.forEach((cellText, cIdx) => {
      const h = doc.heightOfString(cellText, { width: colWidths[cIdx] - 10 });
      if (h + 7 > maxCellHeight) maxCellHeight = h + 7;
    });
    
    ensureSpace(maxCellHeight + 2);
    curY = doc.y;
    
    if (rowIdx % 2 === 1) {
      doc.rect(leftMargin, curY, contentWidth, maxCellHeight).fill(COLORS.tableRowAlt);
    }
    
    doc.rect(leftMargin, curY, contentWidth, maxCellHeight)
      .strokeColor(COLORS.tableBorder).lineWidth(0.5).stroke();
    
    let cellX = leftMargin;
    cleanCells.forEach((cellText, cIdx) => {
      if (cIdx === 0) {
        doc.fillColor(COLORS.primary).font('Helvetica-Bold').fontSize(7.5)
          .text(cellText, cellX + 5, curY + 3.5, { width: colWidths[cIdx] - 10 });
      } else if (cIdx === 1) {
        doc.fillColor(COLORS.secondary).font('Helvetica-Bold').fontSize(7)
          .text(cellText, cellX + 5, curY + 3.5, { width: colWidths[cIdx] - 10 });
      } else {
        doc.fillColor(COLORS.text).font('Helvetica').fontSize(7.5)
          .text(cellText, cellX + 5, curY + 3.5, { width: colWidths[cIdx] - 10, lineGap: 1 });
      }
      cellX += colWidths[cIdx];
    });
    
    curY += maxCellHeight;
    doc.y = curY;
  });
  
  doc.moveDown(0.35);
}

// Parse lines
const lines = content.split('\n');
let inQuote = false;
let quoteLines = [];
let inTable = false;
let tableRows = [];

drawTitleBanner();

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const trimmed = line.trim();
  
  if (i < 4 && (trimmed.startsWith('# ') || trimmed.startsWith('**Autonomous Multi-Camera'))) {
    continue;
  }
  
  // Table
  if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
    if (!inTable) {
      inTable = true;
      tableRows = [];
    }
    if (/^\|(\s*:?-+:?\s*\|)+$/.test(trimmed)) {
      continue;
    }
    const cols = trimmed.slice(1, -1).split('|').map(s => s.trim());
    tableRows.push(cols);
    continue;
  } else if (inTable) {
    inTable = false;
    drawReferenceTable(tableRows);
    tableRows = [];
  }
  
  // Quote
  if (trimmed.startsWith('>')) {
    inQuote = true;
    quoteLines.push(trimmed);
    continue;
  } else if (inQuote) {
    inQuote = false;
    drawQuoteBox(quoteLines);
    quoteLines = [];
  }
  
  if (trimmed === '---') {
    continue;
  }
  if (!trimmed) {
    continue;
  }
  
  // Headings
  if (trimmed.startsWith('## ')) {
    drawH2(trimmed);
  } else if (trimmed.startsWith('### ')) {
    drawH3(trimmed);
  } else if (/^\s*[-*]\s+/.test(line)) {
    const indentMatch = line.match(/^(\s*)/);
    const indentLevel = indentMatch ? Math.floor(indentMatch[1].length / 2) : 0;
    drawPoint(line, indentLevel);
  } else if (/^\s*\d+\.\s+/.test(line)) {
    const indentMatch = line.match(/^(\s*)/);
    const indentLevel = indentMatch ? Math.floor(indentMatch[1].length / 2) : 0;
    drawPoint(line, indentLevel);
  } else {
    ensureSpace(18);
    doc.fillColor(COLORS.text).font('Helvetica').fontSize(8.5)
      .text(cleanText(stripMarkdown(trimmed)), leftMargin, doc.y, {
        width: contentWidth,
        lineGap: 1.2
      });
    doc.moveDown(0.16);
  }
}

// Flush pending
if (inTable && tableRows.length > 0) {
  drawReferenceTable(tableRows);
}
if (inQuote && quoteLines.length > 0) {
  drawQuoteBox(quoteLines);
}

// Draw running headers & footers
const totalPages = doc.bufferedPageRange().count;

for (let p = 0; p < totalPages; p++) {
  doc.switchToPage(p);
  
  const oldBottom = doc.page.margins.bottom;
  const oldTop = doc.page.margins.top;
  doc.page.margins.bottom = 0;
  doc.page.margins.top = 0;
  
  // Running Header on pages > 0
  if (p > 0) {
    doc.strokeColor(COLORS.lineColor).lineWidth(0.5)
      .moveTo(leftMargin, 26).lineTo(leftMargin + contentWidth, 26).stroke();
    
    doc.fillColor(COLORS.textMuted).font('Helvetica').fontSize(7)
      .text('SEEMADRISHTI AI  —  Official Judge Presentation Master Guide', leftMargin, 16, {
        width: contentWidth * 0.65,
        align: 'left',
        lineBreak: false
      });
    
    doc.fillColor(COLORS.secondary).font('Helvetica-Bold').fontSize(7)
      .text('SIH26187 / TEAM IQ100', leftMargin + (contentWidth * 0.65), 16, {
        width: contentWidth * 0.35,
        align: 'right',
        lineBreak: false
      });
  }
  
  // Running Footer
  doc.strokeColor(COLORS.lineColor).lineWidth(0.5)
    .moveTo(leftMargin, pageHeight - 26).lineTo(leftMargin + contentWidth, pageHeight - 26).stroke();
  
  doc.fillColor(COLORS.textMuted).font('Helvetica').fontSize(7.5)
    .text('SEEMADRISHTI AI — Tactical Multi-Camera CCTV Surveillance & Threat Intelligence Matrix', leftMargin, pageHeight - 20, {
      width: contentWidth * 0.7,
      align: 'left',
      lineBreak: false
    });
  
  doc.fillColor(COLORS.textMuted).font('Helvetica-Bold').fontSize(7.5)
    .text(`Page ${p + 1} of ${totalPages}`, leftMargin + (contentWidth * 0.7), pageHeight - 20, {
      width: contentWidth * 0.3,
      align: 'right',
      lineBreak: false
    });
  
  doc.page.margins.bottom = oldBottom;
  doc.page.margins.top = oldTop;
}

doc.end();

writeStream.on('finish', () => {
  console.log('Successfully generated clean PDF:', outputFile);
  const stats = fs.statSync(outputFile);
  console.log(`File Size: ${(stats.size / 1024).toFixed(2)} KB, Total Pages: ${totalPages}`);
});
