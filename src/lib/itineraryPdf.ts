import { jsPDF } from 'jspdf';

export interface ItineraryPdfActivity {
  time?: string;
  name?: string;
  location?: string;
  notes?: string;
}

export interface ItineraryPdfDay {
  dayNumber: number;
  date?: string;
  activities: ItineraryPdfActivity[];
}

export interface ItineraryPdfData {
  title: string;
  destinations?: string[];
  startDate?: string;
  endDate?: string;
  days: ItineraryPdfDay[];
}

/**
 * Generates and triggers a download for a simple, well-formatted PDF
 * of the itinerary. Designed to work with the data shapes used by
 * Planner/NewItinerary screens.
 */
export function downloadItineraryPdf(data: ItineraryPdfData) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 40;
  const marginBottom = 50;
  let y = 60;

  const ensureSpace = (needed: number) => {
    if (y + needed > pageHeight - marginBottom) {
      doc.addPage();
      y = 60;
    }
  };

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(26, 28, 64); // brand secondary
  const titleLines = doc.splitTextToSize(data.title || 'Roteiro', pageWidth - marginX * 2);
  doc.text(titleLines, marginX, y);
  y += titleLines.length * 24;

  // Subtitle (destinations + dates)
  const subtitleParts: string[] = [];
  if (data.destinations?.length) subtitleParts.push(data.destinations.join(' • '));
  if (data.startDate || data.endDate) {
    subtitleParts.push([data.startDate, data.endDate].filter(Boolean).join(' - '));
  }
  if (subtitleParts.length) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(120, 120, 120);
    const sub = subtitleParts.join('  |  ');
    const subLines = doc.splitTextToSize(sub, pageWidth - marginX * 2);
    doc.text(subLines, marginX, y);
    y += subLines.length * 14 + 8;
  }

  // Divider
  doc.setDrawColor(230, 230, 230);
  doc.line(marginX, y, pageWidth - marginX, y);
  y += 20;

  // Days
  data.days.forEach((day) => {
    ensureSpace(40);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(26, 28, 64);
    const dayHeader = `Dia ${day.dayNumber}${day.date ? ` — ${day.date}` : ''}`;
    doc.text(dayHeader, marginX, y);
    y += 18;

    if (!day.activities.length) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(10);
      doc.setTextColor(150, 150, 150);
      doc.text('Sem atividades planejadas.', marginX, y);
      y += 22;
      return;
    }

    day.activities.forEach((act) => {
      ensureSpace(36);

      // Time
      if (act.time) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(157, 204, 54); // primary
        doc.text(act.time, marginX, y);
      }

      // Name
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(40, 40, 40);
      const nameX = marginX + (act.time ? 50 : 0);
      const nameLines = doc.splitTextToSize(
        act.name || 'Atividade',
        pageWidth - marginX - nameX
      );
      doc.text(nameLines, nameX, y);
      y += nameLines.length * 13;

      // Location
      if (act.location) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(130, 130, 130);
        const locLines = doc.splitTextToSize(act.location, pageWidth - marginX - nameX);
        doc.text(locLines, nameX, y);
        y += locLines.length * 11;
      }

      // Notes
      if (act.notes) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(9);
        doc.setTextColor(110, 110, 110);
        const noteLines = doc.splitTextToSize(act.notes, pageWidth - marginX - nameX);
        doc.text(noteLines, nameX, y);
        y += noteLines.length * 11;
      }

      y += 8;
    });

    y += 10;
  });

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(180, 180, 180);
    doc.text(
      `WaiTravel  •  Página ${i} de ${pageCount}`,
      pageWidth / 2,
      pageHeight - 24,
      { align: 'center' }
    );
  }

  const safeName = (data.title || 'roteiro')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  doc.save(`${safeName || 'roteiro'}.pdf`);
}
