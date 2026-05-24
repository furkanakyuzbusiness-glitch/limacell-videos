'use strict';
const { createCanvas, registerFont } = require('canvas');
const fs   = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const NEON    = '#C8F12F';
const OVERLAY = process.argv.includes('--overlay'); // transparent background mode
const S    = 2.4;
const CW   = Math.round(450*S);  // 1080
const CH   = Math.round(800*S);  // 1920
const FPS  = 30;
const DUR  = 16.5;
const TOTAL = Math.ceil(DUR * FPS); // 495 frames
const DIR   = '/tmp/feat_frames';
const VIDEO = path.join(__dirname, 'project/assets/limacell.mp4');
const OUT   = path.join(__dirname, 'project/limacell-ozellikler.mp4');
const OUT_ALPHA = path.join(__dirname, 'project/limacell-ozellikler-alpha.mov');
const OUT_WEBM  = path.join(__dirname, 'project/limacell-ozellikler-alpha.webm');

registerFont('/tmp/Anton.ttf', { family: 'Anton' });
fs.mkdirSync(DIR, { recursive: true });

// ─── Math ─────────────────────────────────────────────────────
const prog = (t,s,e) => t<=s?0:t>=e?1:(t-s)/(e-s);
const eic  = x => x<0.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2;
const eoc  = x => 1-Math.pow(1-x,3);
const eob  = x => { const c1=1.70158,c3=c1+1; return 1+c3*Math.pow(x-1,3)+c1*Math.pow(x-1,2); };
const ir   = (t,a,b) => t>=a&&t<=b;

// ─── Canvas helpers ───────────────────────────────────────────
function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.arcTo(x+w,y,x+w,y+r,r);
  ctx.lineTo(x+w,y+h-r); ctx.arcTo(x+w,y+h,x+w-r,y+h,r);
  ctx.lineTo(x+r,y+h); ctx.arcTo(x,y+h,x,y+h-r,r);
  ctx.lineTo(x,y+r); ctx.arcTo(x,y,x+r,y,r); ctx.closePath();
}

function softLabel(ctx, text, cx, cy, opacity) {
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.fillStyle = NEON; ctx.font = 'bold 11px "Courier New",monospace';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.shadowColor = NEON+'66'; ctx.shadowBlur = 10;
  ctx.fillText(text, cx, cy);
  ctx.shadowBlur = 0; ctx.restore();
}

function neonChip(ctx, text, cx, cy, glow, fontSize=22) {
  ctx.save();
  ctx.font = `${fontSize}px "Anton",Arial,sans-serif`;
  const cw = ctx.measureText(text).width+32, ch = fontSize*2;
  if (!OVERLAY) { ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(cx-cw/2, cy-ch/2, cw, ch); }
  ctx.strokeStyle = NEON; ctx.lineWidth = 2;
  ctx.shadowColor = NEON; ctx.shadowBlur = 14+12*glow;
  ctx.strokeRect(cx-cw/2, cy-ch/2, cw, ch);
  ctx.fillStyle = NEON; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.shadowBlur = 12; ctx.fillText(text, cx, cy);
  ctx.shadowBlur = 0; ctx.restore();
}

// ─── Scene 1 icons ────────────────────────────────────────────
function dBattSlot(ctx, ox, oy, p) {
  ctx.save(); ctx.translate(ox, oy);
  // Outer frame (220×150 rx=8)
  ctx.strokeStyle = NEON; ctx.lineWidth = 2; ctx.globalAlpha *= 0.9;
  ctx.setLineDash([800*p, 800]); rr(ctx,20,30,220,150,8); ctx.stroke();
  // Inner socket (180×100 rx=4)
  ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 1.5;
  ctx.setLineDash([600*p, 600]); rr(ctx,40,55,180,100,4); ctx.stroke();
  ctx.setLineDash([]);
  // Connector pins
  ctx.globalAlpha = 1;
  [60,100,140,180].forEach((x,i) => {
    if (p > (i+1)*0.18) { ctx.fillStyle=NEON; ctx.fillRect(x,45,20,10); }
  });
  // Corner dots
  [[20,30],[240,30],[20,180],[240,180]].forEach(([cx,cy]) => {
    ctx.globalAlpha = p; ctx.fillStyle = NEON;
    ctx.beginPath(); ctx.arc(cx,cy,3,0,Math.PI*2); ctx.fill();
  });
  // Grid hatches
  ctx.strokeStyle = NEON; ctx.lineWidth = 1;
  for (let i=0;i<6;i++) {
    ctx.globalAlpha = p*0.4;
    ctx.beginPath(); ctx.moveTo(45+i*30,120); ctx.lineTo(45+i*30,150); ctx.stroke();
  }
  ctx.globalAlpha = 1; ctx.restore();
}

function dMiniLith(ctx, cx, cy, glow) {
  const ox=cx-90, oy=cy-50;
  ctx.save(); ctx.translate(ox,oy);
  ctx.fillStyle=NEON; ctx.fillRect(14,6,20,10); ctx.fillRect(146,6,20,10);
  ctx.strokeStyle=NEON; ctx.lineWidth=2;
  if (!OVERLAY) { ctx.fillStyle='#0a0a0a'; rr(ctx,6,16,168,78,4); ctx.fill(); }
  rr(ctx,6,16,168,78,4); ctx.stroke();
  ctx.strokeStyle=NEON; ctx.lineWidth=1.5; ctx.globalAlpha=0.7;
  rr(ctx,18,30,144,32,3); ctx.stroke(); ctx.globalAlpha=1;
  ctx.strokeStyle=NEON; ctx.lineWidth=2;
  ctx.shadowColor=NEON; ctx.shadowBlur=12; ctx.globalAlpha=glow*0.5;
  rr(ctx,6,16,168,78,4); ctx.stroke();
  ctx.shadowBlur=0; ctx.globalAlpha=1;
  ctx.fillStyle=NEON; ctx.font='9px monospace';
  ctx.textAlign='center'; ctx.textBaseline='alphabetic';
  ctx.fillText('LiFePO4',90,80);
  ctx.restore();
}

// ─── Scene 3 icon ─────────────────────────────────────────────
function dChip(ctx, cx, cy, glow) {
  const ox=cx-100, oy=cy-100;
  ctx.save(); ctx.translate(ox,oy);
  ctx.strokeStyle=NEON; ctx.lineWidth=3;
  for (let i=0;i<5;i++) {
    [[50+i*25,10,50+i*25,40],[50+i*25,160,50+i*25,190],
     [10,50+i*25,40,50+i*25],[160,50+i*25,190,50+i*25]].forEach(([x1,y1,x2,y2])=>{
      ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
    });
  }
  ctx.strokeStyle=NEON; ctx.lineWidth=2.5;
  if (!OVERLAY) { ctx.fillStyle='#0a0a0a'; rr(ctx,40,40,120,120,8); ctx.fill(); }
  rr(ctx,40,40,120,120,8); ctx.stroke();
  ctx.lineWidth=2; ctx.shadowColor=NEON; ctx.shadowBlur=14;
  ctx.globalAlpha=glow*0.6; rr(ctx,40,40,120,120,8); ctx.stroke();
  ctx.shadowBlur=0; ctx.globalAlpha=1;
  ctx.strokeStyle=NEON; ctx.lineWidth=1.5; ctx.globalAlpha=0.7;
  ctx.beginPath(); ctx.moveTo(60,100); ctx.lineTo(140,100); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(100,60); ctx.lineTo(100,140); ctx.stroke();
  ctx.globalAlpha=1;
  ctx.strokeStyle=NEON; ctx.lineWidth=2;
  ctx.fillStyle='rgba(200,241,47,0.1)';
  ctx.beginPath(); ctx.arc(100,100,14,0,Math.PI*2); ctx.fill(); ctx.stroke();
  ctx.fillStyle=NEON; ctx.beginPath(); ctx.arc(100,100,5,0,Math.PI*2); ctx.fill();
  [[70,70],[130,70],[70,130],[130,130]].forEach(([x,y])=>{
    ctx.fillStyle=NEON; ctx.beginPath(); ctx.arc(x,y,3,0,Math.PI*2); ctx.fill();
  });
  ctx.fillStyle=NEON; ctx.font='9px monospace';
  ctx.textAlign='center'; ctx.textBaseline='alphabetic';
  ctx.fillText('SMART BMS',100,156);
  ctx.restore();
}

function dBadge(ctx, cx, cy, title, sub) {
  ctx.font='38px "Anton",Arial,sans-serif';
  const tw=ctx.measureText(title).width;
  ctx.font='bold 11px "Courier New",monospace';
  const sw=ctx.measureText(sub).width;
  const bw=Math.max(120,Math.max(tw,sw)+32), bh=82;
  if (!OVERLAY) { ctx.fillStyle='rgba(0,0,0,0.55)'; ctx.fillRect(cx-bw/2,cy-bh/2,bw,bh); }
  ctx.strokeStyle=NEON; ctx.lineWidth=2; ctx.shadowColor=NEON; ctx.shadowBlur=18;
  ctx.strokeRect(cx-bw/2,cy-bh/2,bw,bh); ctx.shadowBlur=0;
  ctx.font='38px "Anton",Arial,sans-serif';
  ctx.fillStyle=NEON; ctx.textAlign='center'; ctx.textBaseline='top';
  ctx.shadowColor=NEON; ctx.shadowBlur=14;
  ctx.fillText(title,cx,cy-bh/2+8); ctx.shadowBlur=0;
  ctx.font='bold 11px "Courier New",monospace';
  ctx.fillStyle='#fff'; ctx.textBaseline='bottom';
  ctx.fillText(sub,cx,cy+bh/2-8);
}

// ─── Scene 1 (0.0–3.3s): BatterySlot + MiniLithium + BİREBİR UYUM ──
function scene1(ctx, t) {
  if (!ir(t,-0.2,3.3)) return;
  const slotIn = eic(prog(t,0.1,1.2));
  const battP   = prog(t,1.0,2.0);
  const battY   = -160*(1-eob(Math.min(1,battP)));
  const battOp  = prog(t,0.9,1.3);
  const seatPulse = battP>0.9 ? Math.max(0,1-(t-2.0)*1.8) : 0;
  const battGlow  = 0.5+0.5*seatPulse;
  const labelIn = eic(prog(t,2.0,2.6));
  const out     = eic(prog(t,2.9,3.3));

  ctx.save(); ctx.globalAlpha = 1-out;
  softLabel(ctx,'AKÜ YUVASI',225,245,(1-out)*slotIn);
  // slot top-left: (95, 268)
  ctx.globalAlpha = (1-out);
  dBattSlot(ctx,95,268,slotIn);
  // seat pulse flash
  if (seatPulse>0) {
    const hg=ctx.createRadialGradient(225,368,0,225,368,130);
    hg.addColorStop(0,NEON+'77'); hg.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=hg; ctx.globalAlpha=(1-out)*seatPulse*0.6;
    ctx.fillRect(95,268,260,200); ctx.globalAlpha=1-out;
  }
  // lithium battery
  ctx.save();
  ctx.globalAlpha=(1-out)*battOp;
  ctx.shadowColor=NEON+'99'; ctx.shadowBlur=10+18*battGlow;
  dMiniLith(ctx,225,368+battY,battGlow);
  ctx.restore();
  // "BİREBİR UYUM"
  ctx.globalAlpha=(1-out)*labelIn;
  ctx.font='56px "Anton",Arial,sans-serif';
  ctx.fillStyle=NEON; ctx.textAlign='center'; ctx.textBaseline='top';
  ctx.shadowColor=NEON; ctx.shadowBlur=22;
  ctx.fillText('BİREBİR UYUM',225,510);
  ctx.shadowBlur=0; ctx.restore();
}

// ─── Scene 2 (2.9–8.3s): Phone + BT + charge + label ───────────
function scene2(ctx, t) {
  if (!ir(t,2.9,8.3)) return;
  const phoneIn  = eob(Math.min(1,prog(t,3.1,4.0)));
  const phoneOp  = prog(t,3.0,3.6);
  const phoneScale = 0.85+0.15*phoneIn;
  const btActive = t>3.6;
  const btT      = Math.max(0,t-3.6);
  const chargeP  = eoc(prog(t,4.0,6.0));
  const chargeVal = Math.round(chargeP*100);
  const boltPulse = 0.5+0.5*Math.sin((t-4.0)*5);
  const labelIn  = eic(prog(t,5.5,6.4));
  const out      = eic(prog(t,7.7,8.3));
  const opacity  = 1-out;

  ctx.save(); ctx.globalAlpha=opacity;
  softLabel(ctx,'AKILLI UYGULAMA',225,162,opacity*phoneOp);

  const pCX=225, pCY=373, pW=220, pH=380;
  const pOx=pCX-pW/2, pOy=pCY-pH/2;

  ctx.save();
  ctx.globalAlpha=opacity*phoneOp;
  ctx.translate(pCX,pCY); ctx.scale(phoneScale,phoneScale); ctx.translate(-pCX,-pCY);
  // phone body
  ctx.strokeStyle=NEON; ctx.lineWidth=2;
  ctx.shadowColor=NEON+'55'; ctx.shadowBlur=22;
  if (!OVERLAY) { ctx.fillStyle='#0a0a0a'; rr(ctx,pOx,pOy,pW,pH,26); ctx.fill(); }
  ctx.shadowBlur=0;
  rr(ctx,pOx,pOy,pW,pH,26); ctx.stroke();
  // notch
  ctx.fillStyle='rgba(255,255,255,0.15)'; rr(ctx,pCX-30,pOy+8,60,6,4); ctx.fill();
  // status bar
  ctx.font='bold 10px "Courier New",monospace';
  ctx.fillStyle=NEON; ctx.textAlign='left'; ctx.textBaseline='middle';
  ctx.fillText('9:41',pOx+16,pOy+28);
  ctx.textAlign='right'; ctx.fillText('100%',pOx+pW-18,pOy+28);
  // clip to phone
  rr(ctx,pOx,pOy,pW,pH,26); ctx.clip();

  const contY=pOy+60;
  const btCX=pCX, btCY=contY+45;

  // BT ripples
  if (btActive) {
    for (let i=0;i<3;i++) {
      const cyc=((btT+i*0.55)%1.6)/1.6;
      ctx.strokeStyle=NEON; ctx.lineWidth=2;
      ctx.globalAlpha=opacity*phoneOp*(1-cyc)*0.7;
      ctx.beginPath(); ctx.arc(btCX,btCY,15+cyc*35,0,Math.PI*2); ctx.stroke();
    }
  }
  ctx.globalAlpha=opacity*phoneOp;
  // BT glyph (viewBox 0 0 32 32 → 56×56)
  ctx.save();
  ctx.translate(btCX,btCY);
  ctx.scale(56/32,56/32); ctx.translate(-16,-16);
  ctx.strokeStyle=NEON; ctx.lineWidth=2.5; ctx.lineJoin='round'; ctx.lineCap='round';
  ctx.shadowColor=NEON; ctx.shadowBlur=12;
  ctx.beginPath();
  ctx.moveTo(9,8); ctx.lineTo(23,24); ctx.lineTo(16,30);
  ctx.lineTo(16,2); ctx.lineTo(23,8); ctx.lineTo(9,24);
  ctx.stroke(); ctx.shadowBlur=0;
  ctx.restore();

  // Percent + bolt row
  const rowY = btCY+45+14+4;
  // bolt (16×22)
  ctx.save();
  ctx.translate(pCX-34,rowY-11); ctx.scale(1,1);
  ctx.fillStyle=NEON; ctx.shadowColor=NEON; ctx.shadowBlur=4+10*boltPulse;
  ctx.beginPath();
  ctx.moveTo(9,0); ctx.lineTo(0,13); ctx.lineTo(7,13);
  ctx.lineTo(5,22); ctx.lineTo(16,8); ctx.lineTo(9,8); ctx.closePath();
  ctx.fill(); ctx.shadowBlur=0; ctx.restore();
  // number
  ctx.font='44px "Anton",Arial,sans-serif';
  ctx.fillStyle='#fff'; ctx.textAlign='left'; ctx.textBaseline='middle';
  ctx.shadowColor=NEON+'66'; ctx.shadowBlur=12;
  ctx.fillText(String(chargeVal),pCX-14,rowY+11);
  ctx.font='22px "Anton",Arial,sans-serif'; ctx.fillStyle=NEON;
  ctx.fillText('%',pCX+38,rowY+9); ctx.shadowBlur=0;

  // Charge bar
  const barY=rowY+30, barW=170, barH=12;
  ctx.fillStyle='rgba(255,255,255,0.08)'; ctx.fillRect(pCX-barW/2,barY,barW,barH);
  ctx.strokeStyle=NEON+'55'; ctx.lineWidth=1;
  ctx.shadowColor=NEON+'33'; ctx.shadowBlur=8;
  ctx.strokeRect(pCX-barW/2+0.5,barY+0.5,barW-1,barH-1); ctx.shadowBlur=0;
  if (chargeP>0) {
    const fg=ctx.createLinearGradient(pCX-barW/2,0,pCX-barW/2+barW,0);
    fg.addColorStop(0,NEON); fg.addColorStop(1,'#E8FF6B');
    ctx.fillStyle=fg; ctx.shadowColor=NEON; ctx.shadowBlur=12;
    ctx.fillRect(pCX-barW/2,barY,barW*chargeP,barH); ctx.shadowBlur=0;
  }

  // Mini metrics
  const mY=barY+barH+18;
  ctx.font='9px "Courier New",monospace'; ctx.fillStyle='rgba(255,255,255,0.6)';
  ctx.textBaseline='top';
  ctx.textAlign='left';  ctx.fillText('13.6V',pCX-70,mY);
  ctx.textAlign='center';ctx.fillText('24°C',pCX,mY);
  ctx.textAlign='right'; ctx.fillText('OK',pCX+70,mY);

  ctx.restore(); // end phone scale+clip

  // "BLUETOOTH KONTROLÜ" chip
  ctx.globalAlpha=opacity*labelIn;
  ctx.translate(0,(1-labelIn)*18);
  neonChip(ctx,'BLUETOOTH KONTROLÜ',225,618,0.7+0.3*Math.sin((t-6)*2));
  ctx.restore();
}

// ─── Scene 3 (7.9–12.3s): ChipIcon + badges ─────────────────────
function scene3(ctx, t) {
  if (!ir(t,7.9,12.3)) return;
  const chipIn  = eob(Math.min(1,prog(t,8.1,9.0)));
  const chipOp  = prog(t,8.0,8.6);
  const glow    = 0.55+0.3*Math.sin((t-8.5)*2);
  const badge1  = eic(prog(t,9.3,10.0));
  const badge2  = eic(prog(t,10.0,10.7));
  const out     = eic(prog(t,11.7,12.3));
  const opacity = 1-out;

  ctx.save(); ctx.globalAlpha=opacity;
  softLabel(ctx,'AKILLI YÖNETİM',225,217,opacity*chipOp);

  // halo
  const hg=ctx.createRadialGradient(225,358,0,225,358,120);
  hg.addColorStop(0,NEON+'33'); hg.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle=hg; ctx.globalAlpha=opacity*chipOp*(0.7+0.3*glow);
  ctx.fillRect(105,238,240,240);

  // chip
  ctx.save();
  ctx.globalAlpha=opacity*chipOp;
  ctx.translate(225,358); ctx.scale(0.85+0.15*chipIn,0.85+0.15*chipIn); ctx.translate(-225,-358);
  ctx.shadowColor=NEON+'99'; ctx.shadowBlur=18;
  dChip(ctx,225,358,glow); ctx.shadowBlur=0;
  ctx.restore();

  // badges (gap=16, each ~130 wide, centers at 157 and 293)
  const bCY=540;
  [[157,badge1,'2 YIL','GARANTİ'],[293,badge2,'15 YIL','ÖMÜR']].forEach(([bcx,anim,title,sub])=>{
    ctx.save();
    ctx.globalAlpha=opacity*anim;
    ctx.translate(0,(1-anim)*18);
    ctx.translate(bcx,bCY); ctx.scale(0.9+0.1*anim,0.9+0.1*anim); ctx.translate(-bcx,-bCY);
    dBadge(ctx,bcx,bCY,title,sub);
    ctx.restore();
  });
  ctx.restore();
}

// ─── Scene 4 (11.9–16.5s): URL + arrow + CTA ────────────────────
function scene4(ctx, t) {
  if (!ir(t,11.9,16.5)) return;
  const urlT     = prog(t,12.1,13.5);
  const url      = 'www.gecersunenerji.com';
  const arrowDraw= eoc(prog(t,13.0,14.0));
  const arrowGlow= 0.5+0.5*Math.sin((t-13.0)*3);
  const ctaIn    = eic(prog(t,13.8,14.6));
  const breath   = 1+Math.sin((t-13.8)*2.5)*0.04;
  const out      = eic(prog(t,15.8,16.5));
  const opacity  = 1-out;

  ctx.save(); ctx.globalAlpha=opacity;
  softLabel(ctx,'SİPARİŞ',225,248,opacity*prog(t,12.1,12.5));

  // URL — per-char reveal
  ctx.save();
  ctx.font='34px "Anton",Arial,sans-serif'; ctx.textBaseline='top'; ctx.textAlign='left';
  const chars=url.split('');
  const ws=chars.map(c=>ctx.measureText(c).width);
  const tw=ws.reduce((a,b)=>a+b,0);
  let x=225-tw/2;
  chars.forEach((c,i)=>{
    const loc=Math.max(0,Math.min(1,urlT*url.length-i));
    ctx.globalAlpha=opacity*loc;
    ctx.fillStyle=(c==='.')?NEON:'#fff';
    ctx.shadowColor=NEON+'88'; ctx.shadowBlur=loc>0.5?12:0;
    ctx.fillText(c,x,278+(1-loc)*8);
    x+=ws[i];
  });
  ctx.restore();

  // Underbar
  const barW=arrowDraw*0.8*280;
  ctx.globalAlpha=opacity;
  ctx.fillStyle=NEON; ctx.shadowColor=NEON; ctx.shadowBlur=14;
  ctx.fillRect(225-barW/2,320,barW,3); ctx.shadowBlur=0;

  // Horizontal arrow
  ctx.save();
  ctx.strokeStyle=NEON; ctx.lineWidth=4; ctx.lineCap='round'; ctx.lineJoin='round';
  ctx.shadowColor=NEON; ctx.shadowBlur=10+14*arrowGlow;
  ctx.setLineDash([120*arrowDraw,120]); ctx.lineDashOffset=0;
  ctx.beginPath(); ctx.moveTo(165,365); ctx.lineTo(285,365); ctx.stroke();
  ctx.setLineDash([]);
  if (arrowDraw>0.7) {
    ctx.beginPath(); ctx.moveTo(263,351); ctx.lineTo(285,365); ctx.lineTo(263,379); ctx.stroke();
  }
  // Down arrow
  const dap=Math.max(0,arrowDraw-0.3)*1.4;
  ctx.setLineDash([50*dap,50]);
  ctx.beginPath(); ctx.moveTo(225,378); ctx.lineTo(225,414); ctx.stroke();
  ctx.setLineDash([]);
  if (arrowDraw>0.9) {
    ctx.beginPath(); ctx.moveTo(211,402); ctx.lineTo(225,418); ctx.lineTo(239,402); ctx.stroke();
  }
  ctx.shadowBlur=0; ctx.restore();

  // CTA button
  if (ctaIn>0) {
    ctx.save();
    ctx.globalAlpha=opacity*ctaIn;
    ctx.translate(225,548); ctx.scale(ctaIn*breath,ctaIn*breath); ctx.translate(-225,-548);
    const ctaGlow=Math.abs(Math.sin((t-14)*2.5));
    ctx.font='28px "Anton",Arial,sans-serif';
    const ctaTxt='SİPARİŞ İÇİN TIKLAYIN';
    const ctaW=ctx.measureText(ctaTxt).width+48, ctaH=56;
    if (!OVERLAY) {
      ctx.fillStyle=NEON;
      ctx.shadowColor=NEON; ctx.shadowBlur=22+18*ctaGlow;
      ctx.fillRect(225-ctaW/2,520,ctaW,ctaH);
      ctx.shadowBlur=0;
      ctx.fillStyle='#0a0a0a';
    } else {
      ctx.strokeStyle=NEON; ctx.lineWidth=2;
      ctx.shadowColor=NEON; ctx.shadowBlur=22+18*ctaGlow;
      ctx.strokeRect(225-ctaW/2,520,ctaW,ctaH);
      ctx.shadowBlur=0;
      ctx.fillStyle=NEON;
    }
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(ctaTxt,225,548);
    ctx.restore();
  }
  ctx.restore();
}

// ─── Render loop ──────────────────────────────────────────────
const canvas = createCanvas(CW, CH);
const ctx    = canvas.getContext('2d');

console.log(`Rendering ${TOTAL} frames at ${CW}×${CH}...`);
const t0 = Date.now();

for (let f=0; f<TOTAL; f++) {
  const t = f/FPS;
  ctx.clearRect(0,0,CW,CH);
  ctx.save(); ctx.scale(S,S);
  scene1(ctx,t); scene2(ctx,t); scene3(ctx,t); scene4(ctx,t);
  ctx.restore();
  fs.writeFileSync(path.join(DIR,`f${String(f).padStart(4,'0')}.png`), canvas.toBuffer('image/png'));
  if (f%60===0) process.stdout.write(`\r  ${f}/${TOTAL} (${t.toFixed(1)}s)`);
}
console.log(`\nRender done in ${((Date.now()-t0)/1000).toFixed(1)}s`);

const ALPHA_MODE = process.argv.includes('--alpha');
const WEBM_MODE  = process.argv.includes('--webm');
const PNG_MODE   = process.argv.includes('--png');
const ZIP_OUT    = path.join(__dirname, 'project/limacell-ozellikler-alpha.zip');

if (PNG_MODE) {
  // ─── PNG sequence ZIP for After Effects ───────────────────────
  console.log('Zipping PNG sequence...');
  execSync(`zip -j "${ZIP_OUT}" "${DIR}"/f*.png`, { stdio: 'inherit' });
  fs.readdirSync(DIR).forEach(f=>fs.unlinkSync(path.join(DIR,f)));
  fs.rmdirSync(DIR);
  console.log(`\nDone! → ${ZIP_OUT}`);
} else if (WEBM_MODE) {
  // ─── WebM VP9 with alpha channel (small file) ─────────────────
  console.log('Encoding WebM VP9 (alpha)...');
  execSync(
    `ffmpeg -y ` +
    `-r ${FPS} -i "${DIR}/f%04d.png" ` +
    `-c:v libvpx-vp9 -pix_fmt yuva420p -b:v 0 -crf 28 ` +
    `-auto-alt-ref 0 -deadline good -speed 4 "${OUT_WEBM}"`,
    { stdio: 'inherit' }
  );
  fs.readdirSync(DIR).forEach(f=>fs.unlinkSync(path.join(DIR,f)));
  fs.rmdirSync(DIR);
  console.log(`\nDone! → ${OUT_WEBM}`);
} else if (ALPHA_MODE) {
  // ─── ProRes 4444 with alpha channel ───────────────────────────
  console.log('Encoding ProRes 4444 (alpha)...');
  execSync(
    `ffmpeg -y ` +
    `-r ${FPS} -i "${DIR}/f%04d.png" ` +
    `-c:v prores_ks -profile:v 4444 -pix_fmt yuva444p10le ` +
    `-vendor apl0 -bits_per_mb 8000 "${OUT_ALPHA}"`,
    { stdio: 'inherit' }
  );
  fs.readdirSync(DIR).forEach(f=>fs.unlinkSync(path.join(DIR,f)));
  fs.rmdirSync(DIR);
  console.log(`\nDone! → ${OUT_ALPHA}`);
} else {
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
  fs.readdirSync(DIR).forEach(f=>fs.unlinkSync(path.join(DIR,f)));
  fs.rmdirSync(DIR);
  console.log(`\nDone! → ${OUT}`);
}
