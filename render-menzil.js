'use strict';
const { createCanvas, registerFont } = require('canvas');
const fs   = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ─── Config ───────────────────────────────────────────────────
const NEON  = '#C8F12F';
const RED   = '#FF3B3B';
const S     = 2.4;              // 450×800 → 1080×1920
const CW    = Math.round(450*S);
const CH    = Math.round(800*S);
const FPS   = 30;
const DUR   = 4.5;
const TOTAL = Math.ceil(DUR * FPS);   // 135 frames
const DIR   = '/tmp/menzil_frames';
const VIDEO = path.join(__dirname, 'project/assets/limacell.mp4');
const OUT   = path.join(__dirname, 'project/limacell-menzil.mp4');

registerFont('/tmp/Anton.ttf', { family: 'Anton' });
fs.mkdirSync(DIR, { recursive: true });

// ─── Math ─────────────────────────────────────────────────────
const prog   = (t,s,e) => t<=s?0:t>=e?1:(t-s)/(e-s);
const eic    = x => x<0.5 ? 4*x*x*x : 1-Math.pow(-2*x+2,3)/2;
const eoc    = x => 1-Math.pow(1-x,3);
const eoe    = x => x>=1?1:1-Math.pow(2,-10*x);

// ─── Helpers ──────────────────────────────────────────────────
// Draw range bar track + fill
// cx=center x, topY=top of bar, w=width, h=height, fillPct=0-100
function drawBar(ctx, cx, topY, w, h, fillPct, opts={}) {
  const { neon=false, glow=0 } = opts;
  const x = cx - w/2;

  // Track background
  ctx.save();
  ctx.fillStyle='rgba(255,255,255,0.08)';
  ctx.strokeStyle= neon ? `rgba(200,241,47,0.33)` : 'rgba(255,255,255,0.18)';
  ctx.lineWidth=1;
  if (neon) ctx.shadowColor=NEON, ctx.shadowBlur=(14+10*glow);
  ctx.fillRect(x,topY,w,h);
  ctx.strokeRect(x+0.5,topY+0.5,w-1,h-1);
  ctx.shadowBlur=0;

  // Fill
  const fw = (fillPct/100)*w;
  if (fw>0) {
    ctx.save();
    if (neon) {
      const grad=ctx.createLinearGradient(x,0,x+fw,0);
      grad.addColorStop(0,NEON); grad.addColorStop(1,'#E8FF6B');
      ctx.fillStyle=grad;
      ctx.shadowColor=NEON; ctx.shadowBlur=12;
    } else {
      const grad=ctx.createLinearGradient(x,0,x+fw,0);
      grad.addColorStop(0,'rgba(255,255,255,0.45)');
      grad.addColorStop(1,'rgba(255,255,255,0.25)');
      ctx.fillStyle=grad;
    }
    ctx.fillRect(x,topY,fw,h);

    // Hatch overlay for dim bar
    if (!neon) {
      ctx.globalAlpha=0.6;
      // draw diagonal lines over fill
      ctx.strokeStyle='rgba(0,0,0,0.18)';
      ctx.lineWidth=1;
      for (let ix=x; ix<x+fw+h; ix+=7) {
        ctx.beginPath();
        ctx.moveTo(ix,topY); ctx.lineTo(ix-h,topY+h);
        ctx.stroke();
      }
      ctx.globalAlpha=1;
    }
    ctx.restore();
  }
  ctx.restore();
}

// Draw scale ticks (0, 40, 80, 120) above bar
function drawTicks(ctx, cx, y, w, counterVal, neon) {
  const ticks=[0,40,80,120];
  ctx.font='bold 10px "Courier New",monospace';
  ctx.textBaseline='bottom';
  ticks.forEach((v,i)=>{
    const tx = (cx - w/2) + (i/(ticks.length-1))*w;
    const active = neon && v<=counterVal;
    ctx.fillStyle = active ? NEON : 'rgba(255,255,255,0.35)';
    if (active) { ctx.shadowColor=NEON; ctx.shadowBlur=8; }
    else ctx.shadowBlur=0;
    ctx.textAlign = i===0?'left': i===ticks.length-1?'right':'center';
    ctx.fillText(String(v), tx, y);
  });
  ctx.shadowBlur=0;
}

// ─── Scene 1 (0.0–1.8s) ─────────────────────────────────────
function scene1(ctx, t) {
  if (!( t>=-0.2 && t<=1.8)) return;

  const labelIn  = eic(prog(t,0.1,0.7));
  const barIn    = eic(prog(t,0.3,1.0));
  const numIn    = eic(prog(t,0.5,1.0));
  const strikeIn = eoc(prog(t,0.9,1.4));
  const fadeOut  = 1 - eic(prog(t,1.4,1.8));

  ctx.save(); ctx.globalAlpha = fadeOut;

  const cx=225, midY=400;

  // "MEVCUT MENZİL"
  ctx.globalAlpha = fadeOut * labelIn * 0.6;
  ctx.font='bold 11px "Courier New",monospace';
  ctx.fillStyle='#fff'; ctx.textAlign='center'; ctx.textBaseline='bottom';
  ctx.letterSpacing='0.4em';
  ctx.fillText('MEVCUT MENZİL', cx, midY-70);

  // "40 KM"
  ctx.globalAlpha = fadeOut * numIn;
  ctx.font='96px "Anton",Arial,sans-serif';
  ctx.fillStyle='rgba(255,255,255,0.85)';
  ctx.textAlign='center'; ctx.textBaseline='alphabetic';
  ctx.shadowColor='rgba(0,0,0,0.6)'; ctx.shadowBlur=14;
  const numY = midY - 10;
  ctx.fillText('40', cx-28, numY);

  ctx.font='44px "Anton",Arial,sans-serif';
  ctx.globalAlpha = fadeOut * numIn * 0.8;
  ctx.fillText('KM', cx+42, numY);
  ctx.shadowBlur=0;

  // Red strikethrough
  if (strikeIn > 0) {
    ctx.save();
    // measure approx width of "40 KM" block
    const strikeW = 145 * strikeIn + 16;
    const strikeX = cx - 72;
    const strikeY = numY - 46; // ~48% up through the 96px text
    ctx.globalAlpha = fadeOut;
    ctx.fillStyle = RED;
    ctx.shadowColor = RED; ctx.shadowBlur = 14;
    ctx.translate(strikeX, strikeY);
    ctx.rotate(-4 * Math.PI / 180);
    ctx.fillRect(0, -3, strikeW, 6);
    ctx.restore();
  }

  // Bar
  ctx.globalAlpha = fadeOut * barIn;
  const barW=320, barTopY=midY+52, barH=14;
  drawTicks(ctx, cx, barTopY-4, barW, 40, false);
  drawBar(ctx, cx, barTopY, barW, barH, 33*barIn, { neon:false });

  // Caption
  ctx.globalAlpha = fadeOut * barIn * 0.5;
  ctx.font='bold 10px "Courier New",monospace';
  ctx.fillStyle='#fff'; ctx.textAlign='center'; ctx.textBaseline='top';
  ctx.fillText('YETERSİZ · KISITLI · ESKİ', cx, barTopY+barH+10);

  ctx.restore();
}

// ─── Scene 2 (1.5–4.5s) ─────────────────────────────────────
function scene2(ctx, t) {
  if (!(t>=1.5 && t<=4.5)) return;

  const barP     = eoe(prog(t,1.6,2.6));
  const counterP = eoc(prog(t,1.7,2.8));
  const counterVal = Math.round(40 + (120-40)*counterP);
  const labelIn  = eic(prog(t,2.7,3.3));
  const glow     = 0.55 + 0.2*Math.sin((t-2.8)*2.2);
  const opacity  = 1 - eic(prog(t,4.0,4.5));

  // Flash
  const flashP = Math.max(0, 1-Math.abs(t-1.75)/0.25);

  ctx.save(); ctx.globalAlpha = opacity;

  const cx=225, midY=380;

  // Neon background flash
  if (flashP>0) {
    ctx.save(); ctx.globalAlpha = opacity * flashP * 0.9;
    const hg = ctx.createRadialGradient(cx, midY+40, 0, cx, midY+40, 200);
    hg.addColorStop(0, NEON+'33'); hg.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=hg; ctx.fillRect(0,0,450,800);
    ctx.restore();
  }

  // "YENİ MENZİL"
  const tagOp = prog(t,1.7,2.2);
  ctx.globalAlpha = opacity * tagOp;
  ctx.font='bold 11px "Courier New",monospace';
  ctx.fillStyle=NEON; ctx.textAlign='center'; ctx.textBaseline='bottom';
  ctx.shadowColor=NEON+'88'; ctx.shadowBlur=10;
  ctx.fillText('YENİ MENZİL', cx, midY-78);
  ctx.shadowBlur=0;

  // Big counter
  const numOp = prog(t,1.7,2.2);
  const numScale = 0.92 + 0.08*eoc(prog(t,1.7,2.4));
  ctx.save();
  ctx.globalAlpha = opacity * numOp;
  ctx.translate(cx, midY-20); ctx.scale(numScale,numScale); ctx.translate(-cx,-(midY-20));

  ctx.font='144px "Anton",Arial,sans-serif';
  ctx.fillStyle=NEON; ctx.textAlign='center'; ctx.textBaseline='alphabetic';
  ctx.shadowColor=NEON; ctx.shadowBlur=60;
  ctx.fillText(String(counterVal), cx-38, midY-20);

  ctx.font='56px "Anton",Arial,sans-serif';
  ctx.fillStyle='#fff'; ctx.shadowBlur=14; ctx.shadowColor='rgba(255,255,255,0.4)';
  ctx.textBaseline='alphabetic';
  ctx.fillText('KM', cx+58, midY-20);
  ctx.restore();

  // Expanding neon bar
  const barW = Math.min(320 + barP*320, 414); // max 92% of 450
  const barTopY = midY+52, barH=18;

  ctx.globalAlpha = opacity * Math.min(1, barP*2);
  drawTicks(ctx, cx, barTopY-4, barW, counterVal, true);
  drawBar(ctx, cx, barTopY, barW, barH,
    Math.min(100, (counterVal/120)*100),
    { neon:true, glow });

  // Sweeping highlight on bar
  if (barP>0) {
    ctx.save();
    ctx.globalAlpha = opacity * 0.6 * Math.min(1,barP*2);
    ctx.beginPath();
    const bx=cx-barW/2;
    ctx.rect(bx, barTopY, barW*(counterVal/120), barH);
    ctx.clip();
    const sweep = -barW + ((t*60)%200/200)*barW*2;
    const sg = ctx.createLinearGradient(bx+sweep, 0, bx+sweep+barW*0.3, 0);
    sg.addColorStop(0,'rgba(255,255,255,0)');
    sg.addColorStop(0.5,'rgba(255,255,255,0.5)');
    sg.addColorStop(1,'rgba(255,255,255,0)');
    ctx.fillStyle=sg; ctx.fillRect(bx,barTopY,barW,barH);
    ctx.restore();
  }

  // "120 KM ÜZERİ MENZİL" chip
  if (labelIn>0) {
    ctx.save();
    ctx.globalAlpha = opacity * labelIn;
    ctx.translate(0, (1-labelIn)*18);

    ctx.font='30px "Anton",Arial,sans-serif';
    const chipTxt='120 KM ÜZERİ MENZİL';
    const chipW=ctx.measureText(chipTxt).width+40, chipH=52;
    const chipY=barTopY+barH+28;

    ctx.fillStyle='rgba(0,0,0,0.55)';
    ctx.fillRect(cx-chipW/2, chipY, chipW, chipH);
    ctx.strokeStyle=NEON; ctx.lineWidth=2;
    ctx.shadowColor=NEON; ctx.shadowBlur=20+18*glow;
    ctx.strokeRect(cx-chipW/2, chipY, chipW, chipH);

    ctx.fillStyle=NEON; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.shadowBlur=14; ctx.fillText(chipTxt, cx, chipY+chipH/2);
    ctx.restore();
  }

  ctx.restore();
}

// ─── Render loop ──────────────────────────────────────────────
const canvas = createCanvas(CW, CH);
const ctx    = canvas.getContext('2d');

console.log(`Rendering ${TOTAL} frames at ${CW}×${CH}...`);
const t0 = Date.now();

for (let f = 0; f < TOTAL; f++) {
  const t = f / FPS;
  ctx.clearRect(0, 0, CW, CH);
  ctx.save();
  ctx.scale(S, S);
  scene1(ctx, t);
  scene2(ctx, t);
  ctx.restore();
  fs.writeFileSync(
    path.join(DIR, `f${String(f).padStart(4,'0')}.png`),
    canvas.toBuffer('image/png')
  );
  if (f % 30 === 0) process.stdout.write(`\r  ${f}/${TOTAL} (${t.toFixed(1)}s)`);
}
console.log(`\nRender done in ${((Date.now()-t0)/1000).toFixed(1)}s`);

// ─── FFmpeg composite ─────────────────────────────────────────
console.log('Compositing with ffmpeg...');
execSync(
  `ffmpeg -y ` +
  `-t ${DUR} -i "${VIDEO}" ` +
  `-r ${FPS} -i "${DIR}/f%04d.png" ` +
  `-filter_complex "[0:v]scale=${CW}:${CH}[bg];[bg][1:v]overlay=0:0:format=auto[out]" ` +
  `-map "[out]" -c:v libx264 -preset fast -crf 18 -pix_fmt yuv420p "${OUT}"`,
  { stdio: 'inherit' }
);

fs.readdirSync(DIR).forEach(f => fs.unlinkSync(path.join(DIR, f)));
fs.rmdirSync(DIR);
console.log(`\nDone! → ${OUT}`);
