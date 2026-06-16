"use client";
import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { SpinWheel } from "@/components/SpinWheel";
import { Button } from "@/components/ui/button";
import { Sparkles, Zap, Link2, Pencil, Trophy } from "lucide-react";
import { Header } from "@/components/header";
import { useWallet } from "@/components/wallet-provider"

const DEMO_NAMES = ["Alice", "Bob", "Carol", "David", "Eve", "Frank", "Grace", "Henry"];
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "https://xeric-gwendolen-faucetdrops-4f72016d.koyeb.app";
const FEATURES = [
  {
    icon: <Zap size={17} />,
    title: "Bulk File Upload",
    desc: "Drop a .txt or .csv and we'll parse every name instantly. No copy-paste marathons.",
  },
  {
    icon: <Link2 size={17} />,
    title: "Shareable Slug",
    desc: "Every room gets a unique URL. Share it and anyone can join and watch live.",
  },
  {
    icon: <Pencil size={17} />,
    title: "Editable Anytime",
    desc: "Add, remove, or rename participants mid-session. The wheel updates instantly.",
  },
  {
    icon: <Trophy size={17} />,
    title: "Spin History",
    desc: "Full winner log persisted per room. Auto-remove winners to prevent duplicates.",
  },
];

export default function LandingPage() {
  const rotRef = useRef(0);
  const animRef = useRef<number>(0);
  const [rotation, setRotation] = React.useState(0);
  const { address } = useWallet();
  const [myRooms, setMyRooms] = useState<any[]>([]);


  useEffect(() => {
  if (!address) return;
  fetch(`${BACKEND_URL}/api/spinners/my-rooms?address=${address}`)
    .then(r => r.json())
    .then(d => { if (d.success) setMyRooms(d.rooms); })
    .catch(() => {});
}, [address]);

  useEffect(() => {
    const tick = () => {
      rotRef.current += 0.25;
      setRotation(rotRef.current);
      animRef.current = requestAnimationFrame(tick);
    };
    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">

      {/* Subtle ambient — primary colour only, very low opacity */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="ambient-orb-1" />
        <div className="ambient-orb-2" />
      </div>

      {/* ── Nav ── */}
      <Header pageTitle="Spin Hub" isDashboard={true} />

      {/* ── Hero ── */}
      <section className="relative z-10 flex flex-1 items-center justify-center px-4 py-10 sm:px-8 sm:py-16">
        <div className="flex w-full max-w-5xl flex-col items-center gap-10 md:flex-row md:items-center md:justify-between md:gap-16">

          {/* Text */}
          <div className="w-full text-center md:flex-1 md:text-left" style={{ maxWidth: 520 }}>

            

            <h1
              className="mb-4 font-black leading-none text-foreground"
              style={{ fontSize: "clamp(32px, 8vw, 62px)", letterSpacing: "-1.5px" }}
            >
              The Fairest<br />
              <span className="text-primary">Spin Platform</span>
            </h1>

            <p
              className="mb-8 text-sm leading-relaxed text-muted-foreground sm:text-base sm:mb-9"
              style={{ maxWidth: 420, margin: "0 auto 2rem" }}
            >
              Create a unique spin room, upload participants via CSV or text file, share the link,
              and let the wheel decide — random, fair, unforgettable.
            </p>

            <div className="flex justify-center md:justify-start">
              <Link href="/spinner/create">
                <Button size="lg" className="gap-2 font-bold text-base px-7">
                  <Sparkles className="h-4 w-4" /> Create Spin Room
                </Button>
              </Link>
            </div>

            {/* Stats */}
            <div className="mt-10 flex flex-wrap justify-center gap-6 sm:gap-9 md:justify-start">
              {[
                { num: "2.4K",  label: "Rooms Created" },
                { num: "18K",   label: "Spins Run"     },
                { num: "99.9%", label: "Uptime"        },
              ].map((s) => (
                <div key={s.label} className="text-center md:text-left">
                  <div className="text-xl font-extrabold text-foreground sm:text-2xl">{s.num}</div>
                  <div className="mt-0.5 text-xs font-medium text-muted-foreground">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Wheel */}
          <div className="relative flex shrink-0 items-center justify-center">
            <div className="wheel-glow" />
            <div className="wheel-scale-wrapper">
              <SpinWheel names={DEMO_NAMES} spinning={false} rotation={rotation} />
            </div>
          </div>

        </div>
      </section>

      {/* ── Feature cards ── */}
      <section className="relative z-10 px-4 pb-16 sm:px-8 sm:pb-20">
        <div
          className="mx-auto grid max-w-5xl gap-3 sm:gap-4"
          style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}
        >
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="feature-card rounded-2xl p-4 sm:p-5 transition-colors duration-200 bg-surface-card border border-surface"
            >
              <div className="feature-icon mb-3 flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg">
                {f.icon}
              </div>
              <div className="mb-1.5 text-xs sm:text-sm font-bold text-foreground">{f.title}</div>
              <div className="text-xs leading-relaxed text-muted-foreground">{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      <style>{`
        /* ── Ambient orbs: primary-only, theme-aware opacity ── */
        .ambient-orb-1 {
          position: absolute;
          width: 500px; height: 500px;
          border-radius: 50%;
          background: hsl(var(--primary));
          filter: blur(140px);
          opacity: 0.05;
          top: -120px; left: -80px;
        }
        .ambient-orb-2 {
          position: absolute;
          width: 400px; height: 400px;
          border-radius: 50%;
          background: hsl(var(--primary));
          filter: blur(140px);
          opacity: 0.03;
          bottom: 0; right: -60px;
        }

        /* ── Nav live dot ── */
        .live-dot {
          width: 8px; height: 8px;
          border-radius: 50%;
          background: hsl(var(--primary));
          box-shadow: 0 0 8px hsl(var(--primary) / 0.6);
          flex-shrink: 0;
        }

        /* ── Live badge ── */
        .live-badge {
          border: 1px solid hsl(var(--primary) / 0.3);
          background: hsl(var(--primary) / 0.08);
          color: hsl(var(--primary));
        }
        .live-pulse-dot {
          display: inline-block;
          width: 6px; height: 6px;
          border-radius: 50%;
          background: hsl(var(--primary));
          animation: livePulse 2s infinite;
        }
        @keyframes livePulse {
          0%, 100% { opacity: 1; transform: scale(1);   }
          50%       { opacity: .4; transform: scale(.7); }
        }

        /* ── Wheel glow ── */
        .wheel-glow {
          position: absolute;
          inset: -30px;
          border-radius: 50%;
          background: radial-gradient(circle, hsl(var(--primary) / 0.12), transparent 70%);
          pointer-events: none;
        }

        /* ── Wheel responsive scaling ── */
        .wheel-scale-wrapper {
          width: min(420px, calc(100vw - 48px));
          max-width: 420px;
        }
        .wheel-scale-wrapper canvas {
          width: 100% !important;
          height: auto !important;
        }

        /* ── Feature card hover ── */
        .feature-card:hover {
          border-color: hsl(var(--primary) / 0.4) !important;
        }

        /* ── Feature icon tint ── */
        .feature-icon {
          background: hsl(var(--primary) / 0.1);
          color: hsl(var(--primary));
        }
      `}</style>
    </div>
  );
}