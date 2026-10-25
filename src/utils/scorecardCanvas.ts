export interface ScorecardConfig {
  learnerName: string;
  handle: string;
  theme: 'sunlit-gold' | 'obsidian-luxe' | 'alabaster-editorial' | 'amber-prism';
  format: 'story' | 'portrait';
  headline: string;
  category: string;
  takeawayQuote: string;
  streakDays: number;
  xpEarned: number;
  quizAccuracy: number;
  lessonsCompleted: number;
  dateLabel: string;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
): number {
  const words = text.split(' ');
  let line = '';
  let currentY = y;

  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && n > 0) {
      ctx.fillText(line.trim(), x, currentY);
      line = words[n] + ' ';
      currentY += lineHeight;
    } else {
      line = testLine;
    }
  }
  if (line.trim()) {
    ctx.fillText(line.trim(), x, currentY);
    currentY += lineHeight;
  }
  return currentY;
}

export function downloadScorecardPng(config: ScorecardConfig): void {
  const canvas = document.createElement('canvas');
  const width = 1080;
  const height = config.format === 'story' ? 1920 : 1350;
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const isDark = config.theme === 'obsidian-luxe';

  // Background gradient based on selected theme
  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  if (config.theme === 'sunlit-gold') {
    bgGrad.addColorStop(0, '#FFFDF7');
    bgGrad.addColorStop(0.45, '#FEF3C7');
    bgGrad.addColorStop(1, '#FDE68A');
  } else if (config.theme === 'obsidian-luxe') {
    bgGrad.addColorStop(0, '#0B0A12');
    bgGrad.addColorStop(0.5, '#1B1630');
    bgGrad.addColorStop(1, '#09070F');
  } else if (config.theme === 'alabaster-editorial') {
    bgGrad.addColorStop(0, '#FFFDF9');
    bgGrad.addColorStop(0.6, '#FBF7EE');
    bgGrad.addColorStop(1, '#F3EADA');
  } else {
    bgGrad.addColorStop(0, '#FFFBEB');
    bgGrad.addColorStop(0.5, '#FDE68A');
    bgGrad.addColorStop(1, '#F59E0B');
  }

  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Decorative glowing orbs
  const orb1 = ctx.createRadialGradient(width * 0.82, height * 0.18, 20, width * 0.82, height * 0.18, 420);
  orb1.addColorStop(0, isDark ? 'rgba(139, 92, 246, 0.34)' : 'rgba(245, 158, 11, 0.32)');
  orb1.addColorStop(1, 'rgba(245, 158, 11, 0)');
  ctx.fillStyle = orb1;
  ctx.fillRect(0, 0, width, height);

  const orb2 = ctx.createRadialGradient(width * 0.18, height * 0.82, 20, width * 0.18, height * 0.82, 460);
  orb2.addColorStop(0, isDark ? 'rgba(251, 191, 36, 0.22)' : 'rgba(217, 119, 6, 0.20)');
  orb2.addColorStop(1, 'rgba(217, 119, 6, 0)');
  ctx.fillStyle = orb2;
  ctx.fillRect(0, 0, width, height);

  // Main Inner Frosted Card
  const padX = 76;
  const padY = config.format === 'story' ? 150 : 84;
  const cardW = width - padX * 2;
  const cardH = height - padY * 2;

  roundRect(ctx, padX, padY, cardW, cardH, 48);
  ctx.fillStyle = isDark ? 'rgba(23, 20, 38, 0.92)' : 'rgba(255, 253, 248, 0.90)';
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = isDark ? 'rgba(251, 191, 36, 0.55)' : 'rgba(217, 119, 6, 0.35)';
  ctx.stroke();

  // Header Brand Row
  const innerX = padX + 68;
  let cursorY = padY + 86;

  // Brand emblem square
  roundRect(ctx, innerX, cursorY - 40, 56, 56, 16);
  ctx.fillStyle = '#7C3AED';
  ctx.fill();

  ctx.fillStyle = '#FCD34D';
  ctx.font = '800 30px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('P', innerX + 18, cursorY - 2);

  ctx.fillStyle = isDark ? '#FFFDF8' : '#181510';
  ctx.font = '800 34px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('PASHco', innerX + 74, cursorY - 2);

  ctx.fillStyle = isDark ? '#FBBF24' : '#B45309';
  ctx.font = '600 18px "JetBrains Mono", monospace';
  ctx.fillText('NEURO-ARENA SCORECARD · @love_me_for_my_wits', innerX + 230, cursorY - 6);

  // Category Pill
  cursorY += 76;
  roundRect(ctx, innerX, cursorY, 440, 48, 24);
  ctx.fillStyle = isDark ? 'rgba(139, 92, 246, 0.25)' : 'rgba(245, 158, 11, 0.16)';
  ctx.fill();

  ctx.fillStyle = isDark ? '#FCD34D' : '#92400E';
  ctx.font = '700 20px "JetBrains Mono", monospace';
  ctx.fillText(config.category.toUpperCase().slice(0, 34), innerX + 24, cursorY + 31);

  // Headline
  cursorY += 105;
  ctx.fillStyle = isDark ? '#FFFDF8' : '#181510';
  ctx.font = '800 48px "Plus Jakarta Sans", sans-serif';
  cursorY = wrapText(ctx, config.headline, innerX, cursorY, cardW - 136, 60);

  // Takeaway Quote Box
  cursorY += 28;
  const quoteBoxH = config.format === 'story' ? 280 : 210;
  roundRect(ctx, innerX, cursorY, cardW - 136, quoteBoxH, 28);
  ctx.fillStyle = isDark ? 'rgba(11, 10, 18, 0.72)' : 'rgba(254, 243, 199, 0.55)';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = isDark ? 'rgba(251, 191, 36, 0.4)' : 'rgba(217, 119, 6, 0.25)';
  ctx.stroke();

  ctx.fillStyle = isDark ? '#FDE68A' : '#92400E';
  ctx.font = '700 18px "JetBrains Mono", monospace';
  ctx.fillText('VERIFIED NEURO-SYNTHESIS TAKEAWAY', innerX + 36, cursorY + 46);

  ctx.fillStyle = isDark ? '#F5EFE0' : '#27231C';
  ctx.font = 'italic 500 28px Georgia, serif';
  wrapText(ctx, `"${config.takeawayQuote}"`, innerX + 36, cursorY + 94, cardW - 208, 40);

  cursorY += quoteBoxH + (config.format === 'story' ? 76 : 46);

  // 4-Stat Grid
  const stats = [
    { label: 'DAILY STREAK', value: `${config.streakDays} Days 🔥` },
    { label: 'TOTAL XP', value: `${config.xpEarned.toLocaleString()} XP` },
    { label: 'QUIZ ACCURACY', value: `${config.quizAccuracy}%` },
    { label: 'SAMPLE MODULES SAVED', value: `${config.lessonsCompleted} / 15` },
  ];

  const colW = (cardW - 136 - 28) / 2;
  const rowH = config.format === 'story' ? 155 : 128;

  stats.forEach((st, idx) => {
    const col = idx % 2;
    const row = Math.floor(idx / 2);
    const sx = innerX + col * (colW + 28);
    const sy = cursorY + row * (rowH + 24);

    roundRect(ctx, sx, sy, colW, rowH, 24);
    ctx.fillStyle = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.85)';
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.14)' : 'rgba(217, 119, 6, 0.22)';
    ctx.stroke();

    ctx.fillStyle = isDark ? '#CBD5E1' : '#8A8070';
    ctx.font = '600 18px "JetBrains Mono", monospace';
    ctx.fillText(st.label, sx + 28, sy + 44);

    ctx.fillStyle = isDark ? '#FBBF24' : '#181510';
    ctx.font = '800 38px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(st.value, sx + 28, sy + 96);
  });

  // Footer Attribution inside Card
  const footerY = padY + cardH - 58;
  ctx.fillStyle = isDark ? '#FFFDF8' : '#181510';
  ctx.font = '700 24px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(`${config.learnerName} (${config.handle})`, innerX, footerY);

  ctx.fillStyle = isDark ? '#FBBF24' : '#B45309';
  ctx.font = '600 20px "JetBrains Mono", monospace';
  ctx.fillText(`IG: @love_me_for_my_wits · cyberjai2k25@gmail.com`, innerX + cardW - 560, footerY);

  // Trigger download
  const dataUrl = canvas.toDataURL('image/png');
  const link = document.createElement('a');
  link.download = `pashco-scorecard-${config.learnerName.toLowerCase().replace(/\s+/g, '-')}.png`;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
