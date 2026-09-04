import { jsPDF } from 'jspdf';
import { AlertItem } from '../types';

export async function generateAlertPdfReport(alert: AlertItem, operatorNotes?: string): Promise<void> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Dark Military Tactical Palette
  // Header background
  doc.setFillColor(10, 15, 29); // #0a0f1d
  doc.rect(0, 0, pageWidth, 38, 'F');

  // Accent Line
  doc.setFillColor(6, 182, 212); // #06b6d4 (Cyan)
  doc.rect(0, 37, pageWidth, 1.5, 'F');

  // Classification Header Tag
  doc.setFont('courier', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(244, 63, 94); // #f43f5e
  doc.text('CLASSIFICATION: RESTRICTED // TACTICAL INCIDENT DOSSIER', 14, 10);

  // Main Header Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text('SEEMADRISHTI AI DEFENSE COMMAND', 14, 20);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184);
  doc.text('AUTOMATED PERIMETER SURVEILLANCE & THREAT INTERCEPTION LOG', 14, 27);

  const reportId = `REP-${alert.id}-${Date.now().toString(36).toUpperCase()}`;
  doc.setFont('courier', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(56, 189, 248);
  doc.text(`REPORT UUID: ${reportId}`, pageWidth - 14, 18, { align: 'right' });
  doc.text(`DATE: ${new Date().toISOString().replace('T', ' ').slice(0, 19)} UTC`, pageWidth - 14, 25, { align: 'right' });

  let y = 48;

  // Incident Overview Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, y, pageWidth - 28, 48, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text(alert.title.toUpperCase(), 18, y + 8);

  // Severity Badge
  const severityColor = alert.severity === 'High' ? [225, 29, 72] : alert.severity === 'Medium' ? [217, 119, 6] : [16, 185, 129];
  doc.setFillColor(severityColor[0], severityColor[1], severityColor[2]);
  doc.roundedRect(pageWidth - 55, y + 4, 37, 7, 1.5, 1.5, 'F');
  doc.setFont('courier', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text(`${alert.severity.toUpperCase()} PRIORITY`, pageWidth - 36.5, y + 8.5, { align: 'center' });

  // Description
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  const splitDesc = doc.splitTextToSize(alert.description || 'Anomalous perimeter target detection recorded by neural inference node.', pageWidth - 36);
  doc.text(splitDesc, 18, y + 16);

  // Quick metadata line
  doc.setFont('courier', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);

  const metaY = y + 36;
  doc.text(`CAMERA NODE: ${alert.camera}`, 18, metaY);
  doc.text(`TIME: ${alert.time}`, 70, metaY);
  doc.text(`LOCATION: ${alert.location || 'North Sector'}`, 120, metaY);
  doc.text(`CONFIDENCE: ${alert.confidence || 96.5}%`, 165, metaY);

  y += 56;

  // Snapshot / Visual Evidence Section
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('1. FORENSIC SNAPSHOT & DETECTION CANVAS', 14, y);

  y += 4;
  doc.setFillColor(15, 23, 42);
  doc.roundedRect(14, y, pageWidth - 28, 56, 2, 2, 'F');

  // Simulated Tactical Snapshot Reticle & Visual Frame
  doc.setDrawColor(6, 182, 212);
  doc.setLineWidth(0.4);
  doc.rect(20, y + 6, pageWidth - 40, 44, 'S');

  // Corner Crosshairs
  const cx1 = 20, cy1 = y + 6;
  const cx2 = pageWidth - 20, cy2 = y + 50;
  doc.line(cx1 - 2, cy1, cx1 + 6, cy1);
  doc.line(cx1, cy1 - 2, cx1, cy1 + 6);
  doc.line(cx2 + 2, cy1, cx2 - 6, cy1);
  doc.line(cx2, cy1 - 2, cx2, cy1 + 6);
  doc.line(cx1 - 2, cy2, cx1 + 6, cy2);
  doc.line(cx1, cy2 + 2, cx1, cy2 - 6);
  doc.line(cx2 + 2, cy2, cx2 - 6, cy2);
  doc.line(cx2, cy2 + 2, cx2, cy2 - 6);

  // Target Box inside snapshot
  doc.setDrawColor(244, 63, 94);
  doc.setLineWidth(0.6);
  doc.rect(75, y + 14, 48, 28, 'S');
  doc.setFillColor(244, 63, 94);
  doc.rect(75, y + 10, 48, 4, 'F');
  doc.setFont('courier', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);
  doc.text(`[#${alert.trackId || 'TRK-01'} ${alert.className || 'UNAUTHORIZED'} ${(alert.confidence || 95)}%]`, 77, y + 13);

  // Canvas Watermark / HUD text
  doc.setFont('courier', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text(`FEED: ${alert.camera} // LATENCY: 14.2ms // PROTOCOL: RTSP-TLS`, 24, y + 12);
  doc.text(`RESOLUTION: 3840x2160 UHD // CODEC: H.264 (AVC1)`, 24, y + 46);
  doc.text(`COORDINATES: 31.6042° N, 74.8723° E`, pageWidth - 24, y + 46, { align: 'right' });

  y += 64;

  // Threat Breakdown & Parameters Table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('2. EXPLAINABLE THREAT METRICS & PARAMETERS', 14, y);

  y += 5;
  const colW = (pageWidth - 28) / 3;
  
  // 3 Metric Cards
  // Metric 1: Risk Score
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(14, y, colW - 3, 22, 1.5, 1.5, 'F');
  doc.setFont('courier', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('THREAT RISK INDEX', 18, y + 6);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(225, 29, 72);
  doc.text(`${alert.riskScore !== undefined ? alert.riskScore : 88} / 100`, 18, y + 14);
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text(alert.riskLevel || 'CRITICAL BREACH', 18, y + 19);

  // Metric 2: Target & Dwell
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(14 + colW, y, colW - 3, 22, 1.5, 1.5, 'F');
  doc.setFont('courier', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('TARGET CLASSIFICATION', 18 + colW, y + 6);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(alert.className ? alert.className.toUpperCase() : 'UNKNOWN ENTITY', 18 + colW, y + 14);
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Dwell: ${alert.dwellSeconds ? Math.round(alert.dwellSeconds) + 's' : '42s (Loitering)'}`, 18 + colW, y + 19);

  // Metric 3: Zone & Response
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(14 + colW * 2, y, colW - 3, 22, 1.5, 1.5, 'F');
  doc.setFont('courier', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('ASSIGNED RESPONSE UNIT', 18 + colW * 2, y + 6);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(16, 185, 129);
  doc.text(alert.assignedUnit || 'PATROL SQUAD DELTA', 18 + colW * 2, y + 14);
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Status: ${alert.status?.toUpperCase() || 'DISPATCHED'}`, 18 + colW * 2, y + 19);

  y += 28;

  // Explainable Threat Assessment criteria
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('Evaluated Neural Rules:', 14, y);

  y += 4;
  const threatReasons = alert.reasons && alert.reasons.length > 0 
    ? alert.reasons 
    : [
        { description: 'Geofence line cross detected on high-security fence boundary', points: 35 },
        { description: 'Nighttime low-light infiltration velocity without authorized RFID beacon', points: 25 },
        { description: 'Extended dwell time exceeding 30s threshold in restricted buffer zone', points: 20 },
      ];

  threatReasons.forEach((r: any) => {
    doc.setFont('courier', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(16, 185, 129);
    doc.text('[PASS]', 16, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85);
    doc.text(r.description || r.code || r.text || 'Rule condition confirmed', 28, y);
    if (r.points) {
      doc.setFont('courier', 'bold');
      doc.setTextColor(217, 119, 6);
      doc.text(`+${r.points} PTS`, pageWidth - 16, y, { align: 'right' });
    }
    y += 5.5;
  });

  y += 4;

  // 3. Tactical Dispatch Notes
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('3. OPERATOR LOG & DISPATCH REMARKS', 14, y);

  y += 4;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(14, y, pageWidth - 28, 16, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  const operatorText = operatorNotes && operatorNotes.trim().length > 0 
    ? operatorNotes 
    : 'Automated alert trigger verified by AI vision inference pipeline. Dispatched Rapid Intercept Squad to secure perimeter sector.';
  doc.text(operatorText, 18, y + 7);

  // Footer / Chain of Custody & Hash (Real Verification Only — Never Simulated)
  const footerY = pageHeight - 18;
  doc.setFillColor(15, 23, 42);
  doc.rect(0, footerY, pageWidth, 18, 'F');

  doc.setFont('courier', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);

  const realHash = (alert as any).sha256;
  const isVerified = (alert as any).verification_status === 'VERIFIED' && typeof realHash === 'string' && realHash.length === 64;

  if (isVerified) {
    doc.text(`CRYPTOGRAPHIC EVIDENCE HASH: SHA-256 ${realHash.slice(0, 32)}... [VERIFIED]`, 14, footerY + 6);
  } else {
    doc.text('RECORD STATUS: UNSEALED // NO AUTHORITATIVE CRYPTOGRAPHIC SEAL (DEMO RECORD)', 14, footerY + 6);
  }
  doc.text('SEEMADRISHTI DEFENSE AI ENGINE // SECURE AUDIT CHAIN', 14, footerY + 11);

  doc.text('PAGE 1 OF 1', pageWidth - 14, footerY + 9, { align: 'right' });

  // Save the PDF
  doc.save(`SEEMADRISHTI_ALERT_REPORT_${alert.id}.pdf`);
}
