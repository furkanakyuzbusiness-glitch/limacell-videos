'use strict';
const { createCanvas, registerFont } = require('canvas');
const fs   = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ─── Config ───────────────────────────────────────────────────
const NEON  = '#C8F12F';
const S     = 2.4;              // scale: 450×800 → 1080×1920
const CW    = Math.round(450*S);  // 1080
const CH    = Math.round(800*S);  // 1920
const FPS   = 30;
const DUR   = 12.0;
const TOTAL = Math.ceil(DUR * FPS);  // 360 frames
const DIR   = '/tmp/lc_frames';
const VIDEO = path.join(__dirname, 'project/assets/limacell.mp4');
const OUT   = path.join(__dirname, 'project/limacell-aku-donusumu.mp4');

registerFont('/tmp/Anton.ttf', { family: 'Anton' });
fs.mkdirSync(DIR, { recursive: true });

// ─── Math ─────────────────────────────────────────────────────
const prog = (t,s,e) => t<=s?0:t>=e?1:(t-s)/(e-s);
const eic  = x => x<0.5 ? 4*x*x*x : 1-Math.pow(-2*x+2,3)/2;
const ir   = (t,a,b) => t>=a && t<=b;

// ─── Primitives ───────────────────────────────────────────────
function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.arcTo(x+w,y,x+w,y+r,r);
  ctx.lineTo(x+w,y+h-r); ctx.arcTo(x+w,y+h,x+w-r,y+h,r);
  ctx.lineTo(x+r,y+h); ctx.arcTo(x,y+h,x,y+h-r,r);
  ctx.lineTo(x,y+r); ctx.arcTo(x,y,x+r,y,r); ctx.closePath();
}

// ─── Icons (coords in 450×800 space) ─────────────────────────
function dCargo(ctx, cx, cy, sz) {
  const sc=sz/220, ox=cx-sz/2, oy=cy-(sz*140/220)/2;
  ctx.save(); ctx.translate(ox,oy); ctx.scale(sc,sc);
  ctx.strokeStyle='#fff'; ctx.lineWidth=3; ctx.lineJoin='round';
  ctx.beginPath();
  ctx.moveTo(30,90); ctx.lineTo(30,55); ctx.arcTo(30,45,40,45,10);
  ctx.lineTo(80,45); ctx.lineTo(100,70); ctx.lineTo(100,90); ctx.closePath();
  ctx.stroke();
  ctx.strokeStyle=NEON; ctx.lineWidth=3; ctx.strokeRect(100,30,90,60);
  ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(100,60); ctx.lineTo(190,60); ctx.stroke();
  ctx.strokeRect(40,55,30,15);
  ctx.strokeStyle='rgba(255,255,255,0.5)'; ctx.lineWidth=2;
  ctx.beginPath(); ctx.moveTo(10,105); ctx.lineTo(210,105); ctx.stroke();
  for (const wx of [55,135,170]) {
    ctx.fillStyle='#0a0a0a'; ctx.strokeStyle='#fff'; ctx.lineWidth=3;
    ctx.beginPath(); ctx.arc(wx,105,10,0,Math.PI*2); ctx.fill(); ctx.stroke();
    ctx.fillStyle=NEON; ctx.shadowColor=NEON; ctx.shadowBlur=6;
    ctx.beginPath(); ctx.arc(wx,105,3,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0;
  }
  ctx.restore();
}

function dOldBat(ctx, cx, cy, sz) {
  const sc=sz/200, ox=cx-sz/2, oy=cy-(sz*140/200)/2;
  ctx.save(); ctx.translate(ox,oy); ctx.scale(sc,sc);
  const prevA = ctx.globalAlpha;
  ctx.globalAlpha = prevA * 0.8;
  ctx.fillStyle='#6a6a68'; ctx.fillRect(40,18,28,14); ctx.fillRect(132,18,28,14);
  ctx.fillStyle='#8a8a86'; ctx.fillRect(20,32,160,92);
  ctx.strokeStyle='#aaa'; ctx.lineWidth=2; ctx.strokeRect(20,32,160,92);
  for(let i=0;i<4;i++){
    ctx.fillStyle='#4a4a47'; ctx.strokeStyle='#2a2a27'; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.arc(45+i*37,50,7,0,Math.PI*2); ctx.fill(); ctx.stroke();
  }
  ctx.strokeStyle='rgba(86,86,83,0.5)'; ctx.lineWidth=1;
  ctx.beginPath(); ctx.moveTo(30,78); ctx.lineTo(170,78); ctx.moveTo(30,98); ctx.lineTo(170,98); ctx.stroke();
  ctx.fillStyle='#ccc8c3'; ctx.strokeStyle='#7c7c79'; ctx.lineWidth=1;
  ctx.fillRect(55,85,90,28); ctx.strokeRect(55,85,90,28);
  ctx.restore();
}

function dLiBat(ctx, cx, cy, sz) {
  const sc=sz/220, ox=cx-sz/2, oy=cy-(sz*150/220)/2;
  ctx.save(); ctx.translate(ox,oy); ctx.scale(sc,sc);
  ctx.shadowColor=NEON; ctx.shadowBlur=24;
  ctx.fillStyle=NEON; ctx.fillRect(45,14,28,14); ctx.fillRect(147,14,28,14);
  const g=ctx.createLinearGradient(0,28,0,136);
  g.addColorStop(0,'#1a1a1a'); g.addColorStop(1,'#0a0a0a');
  ctx.fillStyle=g; ctx.strokeStyle=NEON; ctx.lineWidth=2.5;
  rr(ctx,22,28,176,108,6); ctx.fill(); ctx.stroke();
  ctx.strokeStyle='rgba(200,241,47,0.8)'; ctx.lineWidth=1.5; rr(ctx,38,48,144,42,3); ctx.stroke();
  [[44,1],[56,1],[68,1],[80,0.4]].forEach(([x,op])=>{
    ctx.globalAlpha=op; ctx.fillStyle=NEON; ctx.shadowBlur=0;
    ctx.beginPath(); ctx.arc(x,108,3,0,Math.PI*2); ctx.fill();
  });
  ctx.globalAlpha=1; ctx.shadowBlur=0;
  ctx.fillStyle=NEON; ctx.font='10px monospace';
  ctx.textAlign='center'; ctx.textBaseline='alphabetic';
  ctx.fillText('LiFePO4',110,124);
  ctx.restore();
}

function dKinetic(ctx, text, cx, topY, reveal, delay, accent, sz) {
  ctx.save();
  ctx.font=`${sz}px "Anton",Arial,sans-serif`;
  ctx.textBaseline='top'; ctx.textAlign='left';
  const chars=text.split('');
  const ws=chars.map(c=>ctx.measureText(c===' '?' ':c).width);
  const tw=ws.reduce((a,b)=>a+b,0);
  let x=cx-tw/2;
  chars.forEach((c,i)=>{
    const loc=Math.min(1,Math.max(0,reveal-i*delay));
    const e=eic(loc);
    ctx.globalAlpha=loc;
    ctx.fillStyle=accent?NEON:'#fff';
    ctx.shadowColor=accent?NEON:'rgba(0,0,0,0.5)';
    ctx.shadowBlur=accent?20:5;
    ctx.fillText(c===' '?' ':c, x, topY+(1-e)*28);
    x+=ws[i];
  });
  ctx.globalAlpha=1; ctx.shadowBlur=0; ctx.restore();
}

// ─── Scenes ───────────────────────────────────────────────────
function scene1(ctx, t) {
  if (!ir(t,-0.2,4.5)) return;
  const w1=eic(prog(t,0.2,1.2)), w2=eic(prog(t,0.8,1.9));
  const vp=eic(prog(t,1.1,2.2)), bob=Math.sin((t-1.6)*2.2)*3;
  const out=eic(prog(t,3.4,4.5));
  ctx.save(); ctx.globalAlpha=1-out; ctx.translate(0,-16*out);

  // "3 TEKERLİ"
  dKinetic(ctx,'3 TEKERLİ',225,196,w1,0.05,false,64);

  // neon divider
  const lw=w2*200;
  ctx.globalAlpha=(1-out)*w2; ctx.fillStyle=NEON;
  ctx.shadowColor=NEON+'88'; ctx.shadowBlur=12;
  ctx.fillRect(225-lw/2,270,lw,2); ctx.shadowBlur=0; ctx.globalAlpha=1-out;

  // "KARGO ARACI"
  dKinetic(ctx,'KARGO ARACI',225,284,w2,0.045,true,64);

  // cargo vehicle
  ctx.save();
  ctx.globalAlpha=(1-out)*vp; ctx.shadowColor=NEON+'55'; ctx.shadowBlur=18;
  const vs=0.85+0.15*vp;
  ctx.translate(225,490+bob); ctx.scale(vs,vs); ctx.translate(-225,-(490+bob));
  dCargo(ctx,225,490,260); ctx.restore();
  ctx.restore();
}

function scene2(ctx, t) {
  if (!ir(t,3.8,7.4)) return;
  const inP=eic(prog(t,4.0,5.0)), outP=eic(prog(t,6.4,7.4));
  const sc=0.85+0.15*inP*(1-outP), op=inP*(1-outP);
  const drift=Math.sin((t-4.1)*1.2)*5;
  const labelIn=eic(prog(t,5.0,6.0));

  ctx.save(); ctx.globalAlpha=op;
  // battery (scaled + drifting)
  ctx.save();
  ctx.translate(225,315+drift); ctx.scale(sc,sc); ctx.translate(-225,-(315+drift));
  dOldBat(ctx,225,315+drift,260); ctx.restore();

  // "45 Ah" on label slot (outside grayscale)
  ctx.globalAlpha=op*inP;
  ctx.font='bold 32px "Anton",Arial,sans-serif';
  ctx.fillStyle='#2a2a27'; ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText('45 Ah',225,368+drift*sc*0.3);

  // "JEL AKÜ" banner
  ctx.globalAlpha=op*labelIn;
  ctx.save(); ctx.translate(0,(1-labelIn)*18);
  ctx.font='44px "Anton",Arial,sans-serif'; ctx.textAlign='center';
  const bw=ctx.measureText('JEL AKÜ').width+64, bh=66;
  ctx.fillStyle='#fff'; ctx.fillRect(225-bw/2,535-bh/2,bw,bh);
  ctx.fillStyle='#000'; ctx.textBaseline='middle';
  ctx.fillText('JEL AKÜ',225,535);
  ctx.restore(); ctx.restore();
}

function scene3(ctx, t) {
  if (!ir(t,6.9,12.8)) return;
  const tIn=eic(prog(t,7.1,8.0)), tOut=eic(prog(t,8.6,9.4)), tOp=tIn*(1-tOut);
  const bIn=eic(prog(t,9.0,10.0)), bSc=0.85+0.15*bIn;
  const bGlow=0.55+0.25*(0.5+0.5*Math.sin((t-9)*1.6));
  const cVal=Math.round(45+60*eic(prog(t,9.8,11.0)));
  const lIn=eic(prog(t,10.8,11.6));

  ctx.save();

  // "BİZ NE YAPTIK?"
  if (tOp>0.01) {
    ctx.save(); ctx.globalAlpha=tOp;
    const ts=0.9+0.1*tIn;
    ctx.translate(225,400); ctx.scale(ts,ts); ctx.translate(-225,-400);
    ctx.font='900 96px "Anton",Arial,sans-serif';
    ctx.fillStyle=NEON; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.shadowColor=NEON; ctx.shadowBlur=40;
    ctx.fillText('BİZ NE',225,348);
    ctx.fillText('YAPTIK?',225,455);
    const bw=tIn*(225*0.72);
    ctx.fillStyle=NEON; ctx.shadowBlur=18;
    ctx.fillRect(225-bw/2,522,bw,3);
    ctx.restore();
  }

  // lithium battery + counter + label
  if (bIn>0) {
    ctx.save(); ctx.globalAlpha=bIn;
    // glow halo
    const hg=ctx.createRadialGradient(225,310,0,225,310,160);
    hg.addColorStop(0,`rgba(200,241,47,${0.33*bGlow})`);
    hg.addColorStop(1,'rgba(200,241,47,0)');
    ctx.fillStyle=hg; ctx.fillRect(25,110,400,400);

    // battery
    ctx.save();
    ctx.translate(225,310); ctx.scale(bSc,bSc); ctx.translate(-225,-310);
    dLiBat(ctx,225,310,260);
    // counter in display window
    ctx.font='44px "Anton",Arial,sans-serif';
    ctx.fillStyle=NEON; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.shadowColor=NEON; ctx.shadowBlur=14;
    ctx.fillText(`${cVal} Ah`,225,304);
    ctx.restore();

    // final label
    ctx.globalAlpha=bIn*lIn;
    ctx.save(); ctx.translate(0,(1-lIn)*18);
    ctx.font='38px "Anton",Arial,sans-serif'; ctx.textBaseline='top';
    const w105=ctx.measureText('105 ').width, wAh=ctx.measureText('Ah').width;
    const sx=225-(w105+wAh)/2;
    ctx.shadowBlur=0;
    ctx.fillStyle='#fff'; ctx.textAlign='left'; ctx.fillText('105 ',sx,490);
    ctx.fillStyle=NEON;                         ctx.fillText('Ah',sx+w105,490);

    // chip
    ctx.font='22px "Anton",Arial,sans-serif';
    const chipTxt='LİTYUM DEMİR FOSFAT';
    const cw=ctx.measureText(chipTxt).width+32, ch=44;
    ctx.fillStyle='rgba(0,0,0,0.55)'; ctx.fillRect(225-cw/2,542,cw,ch);
    ctx.strokeStyle=NEON; ctx.lineWidth=2;
    ctx.shadowColor=NEON; ctx.shadowBlur=20;
    ctx.strokeRect(225-cw/2,542,cw,ch);
    ctx.fillStyle=NEON; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.shadowBlur=12; ctx.fillText(chipTxt,225,564);
    ctx.restore(); ctx.restore();
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
  ctx.clearRect(0, 0, CW, CH);      // transparent background
  ctx.save();
  ctx.scale(S, S);                   // all drawing in 450×800 space
  scene1(ctx, t);
  scene2(ctx, t);
  scene3(ctx, t);
  ctx.restore();
  fs.writeFileSync(
    path.join(DIR, `f${String(f).padStart(4,'0')}.png`),
    canvas.toBuffer('image/png')
  );
  if (f % 30 === 0) process.stdout.write(`\r  ${f}/${TOTAL} frames (${t.toFixed(1)}s)`);
}
console.log(`\nRender done in ${((Date.now()-t0)/1000).toFixed(1)}s`);

// ─── FFmpeg composite ─────────────────────────────────────────
console.log('Compositing with ffmpeg...');
execSync(
  `ffmpeg -y ` +
  `-stream_loop -1 -t ${DUR} -i "${VIDEO}" ` +
  `-r ${FPS} -i "${DIR}/f%04d.png" ` +
  `-filter_complex "[0:v]scale=${CW}:${CH}[bg];[bg][1:v]overlay=0:0:format=auto[out]" ` +
  `-map "[out]" -c:v libx264 -preset fast -crf 18 -pix_fmt yuv420p "${OUT}"`,
  { stdio: 'inherit' }
);

// cleanup temp frames
fs.readdirSync(DIR).forEach(f => fs.unlinkSync(path.join(DIR, f)));
fs.rmdirSync(DIR);

console.log(`\nDone! → ${OUT}`);
