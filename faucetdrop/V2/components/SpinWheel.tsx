"use client";
import React, { useRef, useEffect } from "react";

const PALETTE = [
  "#7C5CFC", "#FF3B5C", "#00C896", "#FFD166", "#06C2FF",
  "#FF8C42", "#A78BFA", "#FF6B9D", "#4ECDC4", "#45B7D1",
  "#F59E0B", "#10B981", "#EF4444", "#8B5CF6", "#3B82F6",
];

export const getColor = (i: number) => PALETTE[i % PALETTE.length];

export function SpinWheel({
  names,
  spinning,
  rotation,
}: {
  names: string[];
  spinning: boolean;
  rotation: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const n = names.length;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || n === 0) return;
    const ctx = canvas.getContext("2d")!;
    const size = canvas.width;
    const cx = size / 2;
    const cy = size / 2;
    const r = size / 2 - 6;
    const arc = (2 * Math.PI) / n;

    ctx.clearRect(0, 0, size, size);

    // Draw segments
    for (let i = 0; i < n; i++) {
      // Apply rotation offset: -90deg so slot 0 starts at top
      const startAngle = arc * i + ((rotation - 90) * Math.PI) / 180;
      const endAngle = startAngle + arc;
      const color = getColor(i);

      // Segment fill
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();

      // Segment border
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, startAngle, endAngle);
      ctx.closePath();
      ctx.strokeStyle = "rgba(6,11,20,0.6)";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Shimmer overlay
      const shimmerGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      shimmerGrad.addColorStop(0, "rgba(255,255,255,0.15)");
      shimmerGrad.addColorStop(0.5, "rgba(255,255,255,0.03)");
      shimmerGrad.addColorStop(1, "rgba(0,0,0,0.1)");
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = shimmerGrad;
      ctx.fill();

      // Label
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(startAngle + arc / 2);
      ctx.textAlign = "right";
      const fontSize = Math.max(9, Math.min(14, 180 / n));
      ctx.font = `700 ${fontSize}px 'Space Grotesk', sans-serif`;
      ctx.fillStyle = "rgba(0,0,0,0.85)";
      ctx.shadowColor = "rgba(0,0,0,0.3)";
      ctx.shadowBlur = 3;
      const label = names[i].length > 14 ? names[i].slice(0, 13) + "…" : names[i];
      ctx.fillText(label, r - 10, fontSize / 3);
      ctx.restore();
    }

    // Outer ring
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, 2 * Math.PI);
    ctx.strokeStyle = "rgba(124,92,252,0.5)";
    ctx.lineWidth = 3;
    ctx.stroke();

    // Hub
    const hubGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 24);
    hubGrad.addColorStop(0, "#1a1a3e");
    hubGrad.addColorStop(0.5, "#0d0d1f");
    hubGrad.addColorStop(1, "#060B14");
    ctx.beginPath();
    ctx.arc(cx, cy, 24, 0, 2 * Math.PI);
    ctx.fillStyle = hubGrad;
    ctx.shadowColor = "rgba(124,92,252,0.6)";
    ctx.shadowBlur = 12;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(cx, cy, 24, 0, 2 * Math.PI);
    ctx.strokeStyle = "#FFD166";
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Hub center dot
    ctx.beginPath();
    ctx.arc(cx, cy, 7, 0, 2 * Math.PI);
    ctx.fillStyle = "#FFD166";
    ctx.fill();
  }, [names, rotation, n]);

  return (
    <div className="relative flex items-center justify-center">
      {/* Pointer arrow - on the RIGHT side */}
      <div
        style={{
          position: "absolute",
          right: 0,
          top: "50%",
          transform: "translateY(-50%) translateX(10px)",
          zIndex: 10,
        }}
      >
        <div
          style={{
            width: 0,
            height: 0,
            borderTop: "14px solid transparent",
            borderBottom: "14px solid transparent",
            borderRight: "32px solid #FFD166",
            filter: "drop-shadow(-2px 0 8px rgba(255,209,102,0.8))",
          }}
        />
      </div>

      {/* Spinning glow ring */}
      <div
        className="rounded-full"
        style={{
          boxShadow: spinning
            ? "0 0 40px rgba(124,92,252,0.5), 0 0 80px rgba(255,59,92,0.2)"
            : "0 0 20px rgba(124,92,252,0.15)",
          transition: "box-shadow 0.3s",
          borderRadius: "50%",
        }}
      >
        <canvas
          ref={canvasRef}
          width={420}
          height={420}
          style={{ maxWidth: "100%", height: "auto", borderRadius: "50%", display: "block" }}
        />
      </div>
    </div>
  );
}

export function getWinnerIndex(rotation: number, n: number): number {
  if (n === 0) return 0;
  const arc = 360 / n;
  const normalizedRot = ((rotation % 360) + 360) % 360;
  // Pointer is at right (0° screen) = 90° in canvas arc space (since we offset by -90)
  const pointerAngle = ((90 - normalizedRot) % 360 + 360) % 360;
  return Math.floor(pointerAngle / arc) % n;
}