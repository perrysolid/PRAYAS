/**
 * Illustrated, geo-tagged site photos for the guided demo: a hill road blocked by a landslide,
 * and the same road after the debris was cleared. Drawn on a canvas so no stock imagery is needed.
 */
function seeded(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function demoScene(kind: "before" | "after", stamp: string): string {
  const W = 960;
  const H = 640;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d")!;
  const rnd = seeded(1905);
  const before = kind === "before";

  // Sky
  const sky = g.createLinearGradient(0, 0, 0, H * 0.55);
  sky.addColorStop(0, before ? "#a9b6c0" : "#7fb2e0");
  sky.addColorStop(1, before ? "#dcdcd6" : "#e6f0f7");
  g.fillStyle = sky;
  g.fillRect(0, 0, W, H);

  // Snow peaks
  g.fillStyle = before ? "#8d99a3" : "#8ea9c4";
  g.beginPath();
  g.moveTo(0, 250);
  [[120, 150], [210, 200], [330, 95], [450, 190], [560, 120], [700, 210], [820, 140], [960, 220]].forEach(([x, y]) => g.lineTo(x, y));
  g.lineTo(W, 330);
  g.lineTo(0, 330);
  g.fill();
  g.fillStyle = "#f4f7fa";
  [[330, 95], [560, 120], [820, 140], [120, 150]].forEach(([x, y]) => {
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x - 34, y + 34);
    g.lineTo(x - 12, y + 28);
    g.lineTo(x + 4, y + 40);
    g.lineTo(x + 22, y + 26);
    g.lineTo(x + 38, y + 34);
    g.fill();
  });

  // Forested hills, two layers
  const hill = (base: number, amp: number, color: string) => {
    g.fillStyle = color;
    g.beginPath();
    g.moveTo(0, H);
    for (let x = 0; x <= W; x += 24) g.lineTo(x, base - Math.sin(x / 140 + base) * amp - rnd() * 10);
    g.lineTo(W, H);
    g.fill();
    // pines along the ridge
    for (let x = 0; x < W; x += 9 + rnd() * 12) {
      const y = base - Math.sin(x / 140 + base) * amp + 4;
      const h = 14 + rnd() * 18;
      g.fillStyle = before ? "#3f5440" : "#2f5a36";
      g.beginPath();
      g.moveTo(x, y - h);
      g.lineTo(x - h * 0.28, y);
      g.lineTo(x + h * 0.28, y);
      g.fill();
    }
  };
  hill(300, 18, before ? "#61715c" : "#5a8a55");
  hill(360, 26, before ? "#4f5f49" : "#467a44");

  // Hillside the slip came down from (right)
  g.fillStyle = before ? "#7a6a52" : "#5c7a46";
  g.beginPath();
  g.moveTo(560, 330);
  g.quadraticCurveTo(760, 300, W, 260);
  g.lineTo(W, H);
  g.lineTo(700, H);
  g.fill();
  if (before) {
    // raw scar of the landslide
    g.fillStyle = "#9b8466";
    g.beginPath();
    g.moveTo(690, 300);
    g.quadraticCurveTo(760, 380, 720, 470);
    g.lineTo(600, 470);
    g.quadraticCurveTo(640, 380, 650, 312);
    g.fill();
  } else {
    // stone retaining wall
    g.fillStyle = "#8a8378";
    g.beginPath();
    g.moveTo(560, 360);
    g.lineTo(W, 330);
    g.lineTo(W, 520);
    g.lineTo(640, 520);
    g.fill();
    g.strokeStyle = "rgba(60,55,48,.45)";
    g.lineWidth = 2;
    for (let y = 370; y < 520; y += 22) {
      g.beginPath();
      g.moveTo(600 + (y - 370) * 0.2, y);
      g.lineTo(W, y - 18);
      g.stroke();
      for (let x = 620 + ((y / 22) % 2) * 26; x < W; x += 52) {
        g.beginPath();
        g.moveTo(x, y - 2 - (x - 600) * 0.04);
        g.lineTo(x, y + 20 - (x - 600) * 0.04);
        g.stroke();
      }
    }
  }

  // Road, in perspective
  const road = () => {
    g.beginPath();
    g.moveTo(40, H);
    g.bezierCurveTo(220, 520, 380, 420, 470, 352);
    g.lineTo(530, 352);
    g.bezierCurveTo(560, 430, 720, 520, 930, H);
    g.closePath();
  };
  g.fillStyle = before ? "#6d655c" : "#30353b";
  road();
  g.fill();
  // edge lines and centre dashes
  g.strokeStyle = before ? "rgba(230,225,215,.35)" : "#f2f2f2";
  g.lineWidth = 5;
  g.beginPath();
  g.moveTo(70, H);
  g.bezierCurveTo(240, 520, 390, 425, 474, 356);
  g.stroke();
  g.beginPath();
  g.moveTo(900, H);
  g.bezierCurveTo(710, 525, 560, 430, 526, 356);
  g.stroke();
  g.setLineDash([26, 22]);
  g.strokeStyle = before ? "rgba(240,200,60,.35)" : "#f2c230";
  g.lineWidth = 6;
  g.beginPath();
  g.moveTo(485, H);
  g.bezierCurveTo(490, 520, 495, 420, 500, 354);
  g.stroke();
  g.setLineDash([]);

  if (before) {
    // Mud fan and boulders across the road
    g.fillStyle = "#8a7356";
    g.beginPath();
    g.moveTo(330, 470);
    g.quadraticCurveTo(520, 360, 760, 430);
    g.quadraticCurveTo(780, 560, 600, 590);
    g.quadraticCurveTo(420, 600, 300, 560);
    g.fill();
    for (let i = 0; i < 70; i++) {
      const x = 330 + rnd() * 430;
      const y = 430 + rnd() * 150;
      const r = 10 + rnd() * 34 * (y / 560);
      const shade = 90 + Math.floor(rnd() * 60);
      g.fillStyle = `rgb(${shade + 20},${shade + 8},${shade - 6})`;
      g.beginPath();
      for (let k = 0; k < 7; k++) {
        const a = (k / 7) * Math.PI * 2;
        const rr = r * (0.7 + rnd() * 0.4);
        g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.75);
      }
      g.closePath();
      g.fill();
      g.fillStyle = "rgba(255,255,255,.12)";
      g.beginPath();
      g.ellipse(x - r * 0.25, y - r * 0.25, r * 0.35, r * 0.2, -0.5, 0, Math.PI * 2);
      g.fill();
    }
    // Fallen trunk
    g.save();
    g.translate(420, 470);
    g.rotate(-0.18);
    g.fillStyle = "#5a3d24";
    g.fillRect(0, 0, 260, 22);
    g.fillStyle = "#3e2a18";
    g.fillRect(0, 18, 260, 4);
    g.restore();
    // Barricade
    g.fillStyle = "#fff";
    g.fillRect(150, 520, 150, 26);
    g.fillStyle = "#d4351c";
    for (let x = 150; x < 300; x += 30) {
      g.beginPath();
      g.moveTo(x, 520);
      g.lineTo(x + 15, 520);
      g.lineTo(x + 5, 546);
      g.lineTo(x - 10, 546);
      g.fill();
    }
    g.fillStyle = "#444";
    g.fillRect(160, 546, 6, 40);
    g.fillRect(284, 546, 6, 40);
    // Dust haze
    const haze = g.createLinearGradient(0, 300, 0, H);
    haze.addColorStop(0, "rgba(200,190,170,.35)");
    haze.addColorStop(1, "rgba(200,190,170,0)");
    g.fillStyle = haze;
    g.fillRect(0, 0, W, H);
  } else {
    // Crash barrier on the valley side
    g.strokeStyle = "#c9ced4";
    g.lineWidth = 7;
    g.beginPath();
    g.moveTo(0, 560);
    g.bezierCurveTo(180, 470, 330, 405, 452, 350);
    g.stroke();
    g.fillStyle = "#e9eef2";
    for (let i = 0; i < 9; i++) {
      const tt = i / 9;
      const x = tt * 452;
      const y = 560 - tt * 210 - Math.sin(tt * Math.PI) * 20;
      g.fillRect(x, y, 5, 26 - tt * 14);
    }
    // Sun warmth
    const sun = g.createRadialGradient(780, 90, 10, 780, 90, 420);
    sun.addColorStop(0, "rgba(255,240,200,.45)");
    sun.addColorStop(1, "rgba(255,240,200,0)");
    g.fillStyle = sun;
    g.fillRect(0, 0, W, H);
  }

  // Vignette and a light grain so it reads as a photograph
  const v = g.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.85);
  v.addColorStop(0, "rgba(0,0,0,0)");
  v.addColorStop(1, "rgba(0,0,0,.35)");
  g.fillStyle = v;
  g.fillRect(0, 0, W, H);
  const img = g.getImageData(0, 0, W, H);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (rnd() - 0.5) * 14;
    img.data[i] += n;
    img.data[i + 1] += n;
    img.data[i + 2] += n;
  }
  g.putImageData(img, 0, 0);

  // Geo-tag stamp, as a camera app would add it
  g.font = "600 20px 'Noto Sans', system-ui, sans-serif";
  g.textAlign = "right";
  g.shadowColor = "rgba(0,0,0,.7)";
  g.shadowBlur = 6;
  g.fillStyle = "#fff";
  g.fillText("📍 30.1573° N, 78.7850° E · Khirsu, Pauri", W - 24, H - 52);
  g.fillText(stamp, W - 24, H - 24);
  return c.toDataURL("image/jpeg", 0.82);
}
