// src/banner.js — gameplay banner renderer (STAGE, WARNING, CLEAR, etc.)

export function drawBanner(ctx, W, H, banner) {
    const a = banner.alpha ?? 1;
    if (a <= 0) return;

    ctx.save();
    ctx.globalAlpha = a;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Main line with drop shadow
    ctx.font = 'bold 36px monospace';
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillText(banner.line1, W / 2 + 2, H / 2 - 30 + 2);
    ctx.fillStyle = banner.color;
    ctx.fillText(banner.line1, W / 2, H / 2 - 30);

    // Sub line
    if (banner.line2) {
        ctx.font = '20px monospace';
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillText(banner.line2, W / 2 + 1, H / 2 + 10 + 1);
        ctx.fillStyle = '#fff';
        ctx.fillText(banner.line2, W / 2, H / 2 + 10);
    }

    ctx.restore();
}