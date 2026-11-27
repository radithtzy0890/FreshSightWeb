import { jsPDF } from 'jspdf';
import { AnalysisResult, Verdict } from '../types';
import {
  FRUIT_NAMES,
  MODEL_LABELS,
  formatPercent,
  getDiagnosisTitle,
  getExplanationText,
  resolveVerdict,
} from './cvEngine';

const verdictLabel = (verdict: Verdict): string =>
  verdict === 'segar'
    ? 'SEGAR'
    : verdict === 'busuk'
    ? 'BUSUK'
    : verdict === 'tidak_terdeteksi'
    ? 'BUKAN TARGET'
    : 'STATUS RAGU';

const verdictColors = (
  verdict: Verdict
): { bg: [number, number, number]; text: [number, number, number] } => {
  if (verdict === 'segar') {
    return { bg: [141, 249, 71], text: [0, 0, 0] };
  }
  if (verdict === 'busuk') {
    return { bg: [235, 51, 34], text: [255, 255, 255] };
  }
  if (verdict === 'tidak_terdeteksi') {
    return { bg: [38, 38, 38], text: [255, 255, 255] };
  }
  return { bg: [255, 199, 55], text: [0, 0, 0] };
};

function formatSafeDate(dateStr: string): string {
  const parsed = new Date(dateStr);
  if (Number.isNaN(parsed.getTime())) {
    return dateStr || '-';
  }
  return parsed.toLocaleString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

async function toJpegDataUrl(src: string): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const size = 480;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, size, size);

        const scale = Math.min(size / img.naturalWidth, size / img.naturalHeight);
        const w = img.naturalWidth * scale;
        const h = img.naturalHeight * scale;
        const x = (size - w) / 2;
        const y = (size - h) / 2;
        ctx.drawImage(img, x, y, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.9));
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

export async function downloadSummaryPdf(result: AnalysisResult): Promise<void> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 16;
  const contentWidth = pageWidth - margin * 2;

  const verdict = resolveVerdict(result);
  const title = getDiagnosisTitle(result);
  const explanation = getExplanationText(result);
  const fruitName =
    verdict === 'tidak_terdeteksi' ? 'Di Luar Target' : FRUIT_NAMES[result.fruit] || result.fruit;
  const badge = verdictColors(verdict);

  // Header Banner
  doc.setFillColor(30, 107, 62);
  doc.rect(0, 0, pageWidth, 28, 'F');
  doc.setFillColor(255, 199, 55);
  doc.rect(0, 28, pageWidth, 3, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('FRESHSIGHT', margin, 13);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.text('Laporan Ringkasan Pemeriksaan Kesegaran Buah', margin, 20);

  doc.setFontSize(8.5);
  doc.text(`Tanggal: ${formatSafeDate(result.date)}`, pageWidth - margin, 13, { align: 'right' });
  doc.text(`ID Pemeriksaan: #${result.id}`, pageWidth - margin, 20, { align: 'right' });

  let y = 40;

  // Diagnosis Summary Box
  doc.setFillColor(247, 242, 229);
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.6);
  doc.roundedRect(margin, y, contentWidth, 26, 3, 3, 'FD');

  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(title.toUpperCase(), margin + 5, y + 10);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(70, 70, 70);
  const metaLine = `Komoditas: ${fruitName}   |   Keyakinan: ${formatPercent(result.conf)}   |   Waktu: ${result.ms ?? 0} ms   |   Model: ${result.model || 'MobileNetV3Small'}`;
  doc.text(metaLine, margin + 5, y + 18, { maxWidth: contentWidth - 46 });

  // Verdict Badge
  const badgeW = 36;
  const badgeH = 9;
  const badgeX = pageWidth - margin - badgeW - 5;
  const badgeY = y + 5;
  doc.setFillColor(...badge.bg);
  doc.setDrawColor(0, 0, 0);
  doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 4.5, 4.5, 'FD');
  doc.setTextColor(...badge.text);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text(verdictLabel(verdict), badgeX + badgeW / 2, badgeY + 6, { align: 'center' });

  y += 33;

  // Visual Images Section (Asli, Grad-CAM, Area Cacat)
  const rawSources: { label: string; src: string }[] = [];
  const baseImg = result.img || result.thumb;
  if (baseImg) rawSources.push({ label: 'Citra Asli', src: baseImg });
  if (result.cam && verdict !== 'tidak_terdeteksi') {
    rawSources.push({ label: 'Peta Grad-CAM', src: result.cam });
  }
  if (result.msk && verdict !== 'tidak_terdeteksi') {
    rawSources.push({ label: 'Area Cacat', src: result.msk });
  }

  const encodedImages = await Promise.all(
    rawSources.map(async (item) => ({
      label: item.label,
      dataUrl: await toJpegDataUrl(item.src),
    }))
  );
  const validImages = encodedImages.filter(
    (item): item is { label: string; dataUrl: string } => Boolean(item.dataUrl)
  );

  if (validImages.length > 0) {
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.text('Dokumentasi Visual Citra', margin, y);
    y += 4;

    const count = validImages.length;
    const gap = 5;
    const cardW = Math.min(54, (contentWidth - gap * (count - 1)) / count);
    const imgSize = cardW - 4;
    const totalW = count * cardW + (count - 1) * gap;
    const startX = margin + (contentWidth - totalW) / 2;

    validImages.forEach((item, idx) => {
      const cardX = startX + idx * (cardW + gap);
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.5);
      doc.roundedRect(cardX, y, cardW, imgSize + 9, 2.5, 2.5, 'FD');
      doc.addImage(item.dataUrl, 'JPEG', cardX + 2, y + 2, imgSize, imgSize);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(30, 30, 30);
      doc.text(item.label, cardX + cardW / 2, y + imgSize + 6.5, { align: 'center' });
    });

    y += imgSize + 15;
  }

  // Explanation Box
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text('Penjelasan Hasil Pemeriksaan', margin, y);
  y += 3.5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  const expLines = doc.splitTextToSize(explanation, contentWidth - 8);
  const expBoxH = expLines.length * 4.8 + 7;

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.45);
  doc.roundedRect(margin, y, contentWidth, expBoxH, 2.5, 2.5, 'FD');
  doc.setTextColor(35, 35, 35);
  doc.text(expLines, margin + 4, y + 6);
  y += expBoxH + 7;

  // Probabilitas 6 Kelas
  if (verdict !== 'tidak_terdeteksi' && Array.isArray(result.p) && result.p.length > 0) {
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.text('Distribusi Probabilitas 6 Kelas', margin, y);
    y += 4.5;

    const maxProb = Math.max(...result.p);
    const barX = margin + 36;
    const barMaxW = contentWidth - 54;

    MODEL_LABELS.forEach((lbl, idx) => {
      const val = result.p[idx] ?? 0;
      const isTop = val === maxProb && val > 0;

      doc.setFont('helvetica', isTop ? 'bold' : 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(40, 40, 40);
      doc.text(lbl.replace('_', ' '), margin, y + 3.2);

      doc.setFillColor(232, 232, 232);
      doc.roundedRect(barX, y, barMaxW, 3.6, 1.5, 1.5, 'F');

      const fillW = Math.max(2, barMaxW * val);
      if (isTop) {
        if (result.rot === 1) {
          doc.setFillColor(235, 51, 34);
        } else {
          doc.setFillColor(30, 107, 62);
        }
      } else {
        doc.setFillColor(120, 120, 120);
      }
      doc.roundedRect(barX, y, fillW, 3.6, 1.5, 1.5, 'F');

      doc.setTextColor(0, 0, 0);
      doc.text(formatPercent(val), pageWidth - margin, y + 3.2, { align: 'right' });
      y += 6.2;
    });
    y += 3;
  }

  // Ciri Terukur
  if (verdict !== 'tidak_terdeteksi') {
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.text('Ciri Terukur Permukaan', margin, y);
    y += 4;

    const metrics: [string, string][] = [
      ['Rasio Area Cacat', `${result.rasio || 0}%`],
      ['Jumlah Bercak', `${result.n || 0}`],
      ['Lokasi Bercak', `${result.loc || '–'}`],
      ['Jarak Warna (LAB)', `${result.jw ?? 0}`],
      ['Tekstur Permukaan', `${result.tk ?? 0}`],
      [
        'Verifikasi Pengguna',
        result.userCorrection
          ? `Koreksi: ${result.userCorrection.replace('_', ' ')}`
          : result.userVerified
          ? 'Terverifikasi Benar'
          : 'Belum Ada Koreksi',
      ],
    ];

    const colGap = 4;
    const cellW = (contentWidth - colGap) / 2;
    const cellH = 8.5;

    metrics.forEach(([label, value], i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const cellX = margin + col * (cellW + colGap);
      const cellY = y + row * (cellH + 2.5);

      doc.setFillColor(247, 242, 229);
      doc.setDrawColor(180, 180, 180);
      doc.setLineWidth(0.3);
      doc.roundedRect(cellX, cellY, cellW, cellH, 1.5, 1.5, 'FD');

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(70, 70, 70);
      doc.text(label, cellX + 3, cellY + 5.6);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text(value, cellX + cellW - 3, cellY + 5.6, { align: 'right' });
    });
  }

  // Footer
  const pageH = doc.internal.pageSize.getHeight();
  doc.setDrawColor(210, 210, 210);
  doc.line(margin, pageH - 14, pageWidth - margin, pageH - 14);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(110, 110, 110);
  doc.text('FreshSight · Klasifikasi Kesegaran Buah (Visual Komputer Cerdas)', margin, pageH - 8.5);
  doc.text('Halaman 1 / 1', pageWidth - margin, pageH - 8.5, { align: 'right' });

  doc.save(`freshsight-ringkasan-${result.fruit}-${result.id}.pdf`);
}
