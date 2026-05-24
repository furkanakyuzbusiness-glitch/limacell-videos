const { useState, useRef, useEffect, useMemo } = React;

const NEON = "#C8F12F";

// ============================================================
// Helpers
// ============================================================
const inRange = (t, a, b) => t >= a && t <= b;

// Normalized progress (0→1) for a given window, with optional easing
const progress = (t, start, end) => {
  if (t <= start) return 0;
  if (t >= end) return 1;
  return (t - start) / (end - start);
};

const easeOutBack = (p) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2);
};

const easeOutCubic = (p) => 1 - Math.pow(1 - p, 3);
const easeInCubic = (p) => p * p * p;
const easeInOutCubic = (p) =>
  p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;

// ============================================================
// Iconography (minimal line art, no SVG-art hallucinations)
// ============================================================
const CargoIcon = ({ size = 220 }) => (
  <svg viewBox="0 0 220 140" width={size} height={(size * 140) / 220} fill="none">
    {/* Cabin */}
    <path
      d="M30 90 L30 55 Q30 45 40 45 L80 45 L100 70 L100 90 Z"
      stroke="#fff"
      strokeWidth="3"
      strokeLinejoin="round"
    />
    {/* Cargo box */}
    <rect x="100" y="30" width="90" height="60" stroke={NEON} strokeWidth="3" />
    {/* Box detail line */}
    <line x1="100" y1="60" x2="190" y2="60" stroke={NEON} strokeWidth="2" />
    {/* Window */}
    <rect x="40" y="55" width="30" height="15" stroke={NEON} strokeWidth="2" />
    {/* Ground */}
    <line x1="10" y1="105" x2="210" y2="105" stroke="#fff" strokeWidth="2" opacity="0.5" />
    {/* 3 wheels */}
    <circle cx="55" cy="105" r="10" stroke="#fff" strokeWidth="3" fill="#0a0a0a" />
    <circle cx="55" cy="105" r="3" fill={NEON} />
    <circle cx="135" cy="105" r="10" stroke="#fff" strokeWidth="3" fill="#0a0a0a" />
    <circle cx="135" cy="105" r="3" fill={NEON} />
    <circle cx="170" cy="105" r="10" stroke="#fff" strokeWidth="3" fill="#0a0a0a" />
    <circle cx="170" cy="105" r="3" fill={NEON} />
  </svg>
);

const OldBatteryIcon = ({ size = 200 }) => (
  <svg viewBox="0 0 200 140" width={size} height={(size * 140) / 200} fill="none">
    {/* Terminals */}
    <rect x="40" y="18" width="28" height="14" fill="#7a7a78" />
    <rect x="132" y="18" width="28" height="14" fill="#7a7a78" />
    {/* Body */}
    <rect x="20" y="32" width="160" height="92" fill="#9a9a96" stroke="#bbb" strokeWidth="2" />
    {/* Caps */}
    {[0, 1, 2, 3].map((i) => (
      <circle key={i} cx={45 + i * 37} cy={50} r="7" fill="#5a5a57" stroke="#3a3a37" strokeWidth="1.5" />
    ))}
    {/* Streaks for "old / worn" look */}
    <line x1="30" y1="78" x2="170" y2="78" stroke="#6a6a67" strokeWidth="1" opacity="0.5" />
    <line x1="30" y1="98" x2="170" y2="98" stroke="#6a6a67" strokeWidth="1" opacity="0.5" />
    {/* Label slot */}
    <rect x="55" y="85" width="90" height="28" fill="#dcdcd7" stroke="#8c8c89" strokeWidth="1" />
  </svg>
);

const LithiumBatteryIcon = ({ size = 220 }) => (
  <svg viewBox="0 0 220 150" width={size} height={(size * 150) / 220} fill="none">
    <defs>
      <linearGradient id="lifepoBody" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#1a1a1a" />
        <stop offset="1" stopColor="#0a0a0a" />
      </linearGradient>
    </defs>
    {/* Terminals */}
    <rect x="45" y="14" width="28" height="14" fill={NEON} />
    <rect x="147" y="14" width="28" height="14" fill={NEON} />
    {/* Body */}
    <rect
      x="22"
      y="28"
      width="176"
      height="108"
      rx="6"
      fill="url(#lifepoBody)"
      stroke={NEON}
      strokeWidth="2.5"
    />
    {/* Display window */}
    <rect x="38" y="48" width="144" height="42" rx="3" stroke={NEON} strokeWidth="1.5" opacity="0.8" />
    {/* Indicator dots */}
    <circle cx="44" cy="108" r="3" fill={NEON} />
    <circle cx="56" cy="108" r="3" fill={NEON} />
    <circle cx="68" cy="108" r="3" fill={NEON} />
    <circle cx="80" cy="108" r="3" fill={NEON} opacity="0.4" />
    {/* Brand mark */}
    <text x="110" y="124" textAnchor="middle" fill={NEON} fontSize="10" fontFamily="monospace" letterSpacing="2">
      LiFePO₄
    </text>
  </svg>
);

// ============================================================
// Scene 1 — 0.0–4.0s: Kinetic typography + cargo vehicle
// ============================================================
const Scene1 = ({ t }) => {
  const visible = inRange(t, -0.2, 4.5);
  if (!visible) return null;

  // Word reveals (staggered, soft)
  const w1 = easeInOutCubic(progress(t, 0.2, 1.2));
  const w2 = easeInOutCubic(progress(t, 0.8, 1.9));

  // Vehicle: gentle scale + fade
  const vp = easeInOutCubic(progress(t, 1.1, 2.2));
  const vehicleScale = 0.85 + 0.15 * vp;
  const vehicleOpacity = vp;

  // Subtle bobbing
  const bob = Math.sin((t - 1.6) * 2.2) * 3;

  // Outro: smooth fade (long, overlap-friendly window)
  const out = easeInOutCubic(progress(t, 3.4, 4.5));
  const outY = -16 * out;
  const outA = 1 - out;

  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center"
      style={{ opacity: outA, transform: `translateY(${outY}px)` }}
    >
      {/* Kinetic title */}
      <div className="flex flex-col items-center gap-1 px-6" style={{ marginTop: -40 }}>
        <KineticLine text="3 TEKERLİ" reveal={w1} delayPerChar={0.05} />
        <div
          className="h-[2px] my-3"
          style={{
            width: `${w2 * 100}%`,
            maxWidth: 200,
            background: NEON,
            boxShadow: `0 0 12px ${NEON}88`,
            opacity: w2,
          }}
        />
        <KineticLine text="KARGO ARACI" reveal={w2} delayPerChar={0.045} accent />
      </div>

      {/* Vehicle */}
      <div
        className="mt-10"
        style={{
          transform: `scale(${vehicleScale}) translateY(${bob}px)`,
          opacity: vehicleOpacity,
          filter: `drop-shadow(0 0 18px ${NEON}55)`,
        }}
      >
        <CargoIcon size={260} />
      </div>
    </div>
  );
};

const KineticLine = ({ text, reveal, delayPerChar = 0.04, accent = false }) => {
  const chars = text.split("");
  return (
    <div
      className="flex"
      style={{
        fontFamily: "'Anton', 'Bebas Neue', 'Helvetica Neue', sans-serif",
        fontWeight: 800,
        letterSpacing: "0.01em",
        lineHeight: 0.95,
      }}
    >
      {chars.map((c, i) => {
        const local = Math.min(1, Math.max(0, reveal - i * delayPerChar));
        const e = easeInOutCubic(local);
        const y = (1 - e) * 28;
        const op = local;
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              transform: `translateY(${y}px)`,
              opacity: op,
              fontSize: 64,
              color: accent ? NEON : "#fff",
              textShadow: accent ? `0 0 22px ${NEON}55` : "0 2px 12px rgba(0,0,0,0.6)",
              padding: c === " " ? "0 10px" : 0,
            }}
          >
            {c === " " ? "\u00A0" : c}
          </span>
        );
      })}
    </div>
  );
};

// ============================================================
// Scene 2 — 4.1–7.0s: Old gel battery
// ============================================================
const Scene2 = ({ t }) => {
  const visible = inRange(t, 3.8, 7.4);
  if (!visible) return null;

  // Long, overlapping fades
  const inP = easeInOutCubic(progress(t, 4.0, 5.0));
  const outP = easeInOutCubic(progress(t, 6.4, 7.4));

  const scale = 0.85 + 0.15 * inP * (1 - outP);
  const opacity = inP * (1 - outP);

  // Slow desaturated drift
  const drift = Math.sin((t - 4.1) * 1.2) * 5;

  // Banner reveal: soft fade + tiny rise (no skew snap)
  const labelIn = easeInOutCubic(progress(t, 5.0, 6.0));

  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center"
      style={{ opacity }}
    >
      {/* Battery */}
      <div
        className="relative"
        style={{
          transform: `scale(${scale}) translateY(${drift}px)`,
          filter: "grayscale(0.4) brightness(0.85)",
        }}
      >
        <OldBatteryIcon size={260} />
        {/* 45 Ah overlay on label slot */}
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ paddingTop: 28 }}
        >
          <div
            className="text-[#2a2a27] font-bold"
            style={{
              fontFamily: "'Anton', 'Bebas Neue', sans-serif",
              fontSize: 36,
              letterSpacing: "0.02em",
              opacity: inP,
              whiteSpace: "nowrap",
            }}
          >
            45 Ah
          </div>
        </div>
      </div>

      {/* JEL AKÜ banner */}
      <div
        className="mt-14 relative"
        style={{
          opacity: labelIn,
          transform: `translateY(${(1 - labelIn) * 18}px)`,
        }}
      >
        <div
          className="px-8 py-3"
          style={{
            background: "#fff",
          }}
        >
          <div
            className="text-black font-black"
            style={{
              fontFamily: "'Anton', 'Bebas Neue', sans-serif",
              fontSize: 44,
              letterSpacing: "0.06em",
              whiteSpace: "nowrap",
            }}
          >
            JEL AKÜ
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// Scene 3 — 7.1–12.0s: BİZ NE YAPTIK? + lithium reveal
// ============================================================
const Scene3 = ({ t }) => {
  const visible = inRange(t, 6.9, 12.8);
  if (!visible) return null;

  // "BİZ NE YAPTIK?" — soft fade + gentle scale (no shake, no overshoot)
  const titleIn = easeInOutCubic(progress(t, 7.1, 8.0));
  const titleOut = easeInOutCubic(progress(t, 8.6, 9.4));
  const titleScale = 0.9 + 0.1 * titleIn;
  const titleOpacity = titleIn * (1 - titleOut);

  // Lithium battery entry: soft
  const battIn = easeInOutCubic(progress(t, 9.0, 10.0));
  const battScale = 0.85 + 0.15 * battIn;
  // Gentle, slow glow breathing
  const battGlow = 0.55 + 0.25 * (0.5 + 0.5 * Math.sin((t - 9) * 1.6));

  // Counter 45 → 105 from ~9.8 to ~11.0 (slower, smoother)
  const counterP = easeInOutCubic(progress(t, 9.8, 11.0));
  const counterVal = Math.round(45 + (105 - 45) * counterP);

  // Final label reveal
  const labelIn = easeInOutCubic(progress(t, 10.8, 11.6));
  // No pulsing — steady glow
  const labelGlow = 0.6;

  return (
    <div className="absolute inset-0">
      {/* BİZ NE YAPTIK? — soft neon title */}
      {titleOpacity > 0.01 && (
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ opacity: titleOpacity }}
        >
          <div
            className="text-center px-4"
            style={{
              transform: `scale(${titleScale})`,
            }}
          >
            <div
              style={{
                fontFamily: "'Anton', 'Bebas Neue', sans-serif",
                fontSize: 96,
                lineHeight: 0.9,
                color: NEON,
                fontWeight: 900,
                letterSpacing: "0.005em",
                textShadow: `0 0 28px ${NEON}, 0 0 60px ${NEON}88`,
              }}
            >
              BİZ NE
              <br />
              YAPTIK?
            </div>
            {/* Underbar */}
            <div
              className="mx-auto mt-3"
              style={{
                height: 3,
                width: `${titleIn * 60}%`,
                background: NEON,
                boxShadow: `0 0 18px ${NEON}`,
              }}
            />
          </div>
        </div>
      )}

      {/* Lithium battery + counter + label */}
      {battIn > 0 && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center"
          style={{ marginTop: -20, opacity: battIn }}
        >
          {/* Glow halo */}
          <div
            style={{
              position: "absolute",
              top: "38%",
              width: 320,
              height: 320,
              borderRadius: "50%",
              background: `radial-gradient(circle, ${NEON}55 0%, ${NEON}00 65%)`,
              opacity: battGlow * battIn,
              filter: "blur(8px)",
              transform: "translateY(-50%)",
            }}
          />
          {/* Battery icon */}
          <div
            style={{
              transform: `scale(${battScale})`,
              filter: `drop-shadow(0 0 24px ${NEON}99) drop-shadow(0 0 60px ${NEON}55)`,
              position: "relative",
            }}
          >
            <LithiumBatteryIcon size={260} />
            {/* Counter overlaid on display window */}
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{ paddingTop: 8 }}
            >
              <div
                style={{
                  fontFamily: "'Anton', 'Bebas Neue', sans-serif",
                  fontSize: 44,
                  color: NEON,
                  letterSpacing: "0.02em",
                  textShadow: `0 0 14px ${NEON}`,
                  fontVariantNumeric: "tabular-nums",
                  whiteSpace: "nowrap",
                }}
              >
                {counterVal} <span style={{ fontSize: 22, opacity: 0.8 }}>Ah</span>
              </div>
            </div>
          </div>

          {/* Final label */}
          <div
            className="mt-10 px-6 text-center"
            style={{
              opacity: labelIn,
              transform: `translateY(${(1 - labelIn) * 18}px)`,
            }}
          >
            <div
              style={{
                fontFamily: "'Anton', 'Bebas Neue', sans-serif",
                fontSize: 38,
                lineHeight: 1,
                color: "#fff",
                letterSpacing: "0.04em",
                whiteSpace: "nowrap",
              }}
            >
              105 <span style={{ color: NEON }}>Ah</span>
            </div>
            <div
              className="mt-2 inline-block px-4 py-2"
              style={{
                background: "rgba(0,0,0,0.55)",
                border: `2px solid ${NEON}`,
                boxShadow: `0 0 ${14 + 10 * labelGlow}px ${NEON}, inset 0 0 8px ${NEON}55`,
              }}
            >
              <div
                style={{
                  fontFamily: "'Anton', 'Bebas Neue', sans-serif",
                  fontSize: 22,
                  color: NEON,
                  letterSpacing: "0.18em",
                  textShadow: `0 0 12px ${NEON}`,
                  whiteSpace: "nowrap",
                }}
              >
                LİTYUM DEMİR FOSFAT
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================
// Main app
// ============================================================
function App() {
  const videoRef = useRef(null);
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);

  // Restore playhead
  useEffect(() => {
    const saved = parseFloat(localStorage.getItem("limacell-time") || "0");
    if (videoRef.current && !isNaN(saved)) {
      videoRef.current.currentTime = saved;
      setTime(saved);
    }
  }, []);

  // Persist playhead
  useEffect(() => {
    localStorage.setItem("limacell-time", String(time));
  }, [time]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play();
      setPlaying(true);
    } else {
      v.pause();
      setPlaying(false);
    }
  };

  const onTimeUpdate = (e) => {
    setTime(e.target.currentTime);
    const root = document.getElementById("video-root");
    if (root) root.setAttribute("data-screen-label", `t=${e.target.currentTime.toFixed(1)}s`);
  };

  return (
    <div className="w-full h-full flex items-center justify-center bg-black">
      {/* 9:16 stage */}
      <div
        id="video-root"
        data-screen-label="t=0.0s"
        className="relative overflow-hidden bg-black"
        style={{
          width: "min(92vw, 450px)",
          aspectRatio: "9 / 16",
          borderRadius: 22,
          boxShadow: `0 30px 80px rgba(0,0,0,0.6), 0 0 0 1px ${NEON}33`,
        }}
      >
        {/* z-0: video */}
        <video
          ref={videoRef}
          src="assets/limacell.mp4"
          className="absolute inset-0 w-full h-full object-cover z-0"
          playsInline
          muted
          loop
          onTimeUpdate={onTimeUpdate}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
        />

        {/* Subtle vignette so overlays read */}
        <div
          className="absolute inset-0 z-[5] pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(0,0,0,0) 30%, rgba(0,0,0,0.55) 100%)",
          }}
        />

        {/* z-10: animation overlays */}
        <div className="absolute inset-0 z-10 pointer-events-none">
          <Scene1 t={time} />
          <Scene2 t={time} />
          <Scene3 t={time} />
        </div>

        {/* Tap anywhere to play/pause (invisible when playing) */}
        <button
          onClick={togglePlay}
          className="absolute inset-0 z-30 flex items-center justify-center"
          aria-label={playing ? "Durdur" : "Oynat"}
        >
          <div
            style={{
              width: 88,
              height: 88,
              borderRadius: "50%",
              background: "rgba(0,0,0,0.45)",
              border: `2px solid ${NEON}`,
              boxShadow: `0 0 24px ${NEON}66`,
              opacity: playing ? 0 : 1,
              transition: "opacity 400ms ease",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="36" height="36" viewBox="0 0 24 24" fill={NEON}>
              <path d="M7 5v14l12-7z" />
            </svg>
          </div>
        </button>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
