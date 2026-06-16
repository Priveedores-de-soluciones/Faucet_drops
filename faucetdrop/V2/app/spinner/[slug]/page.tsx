"use client";
import React, { useState, useRef, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { SpinWheel, getWinnerIndex } from "@/components/SpinWheel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Upload, Share2, Plus, X, Trophy, RotateCcw,
  Play, Pencil, Check, Settings, ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/theme";
import { useWallet } from "@/hooks/use-wallet"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "https://xeric-gwendolen-faucetdrops-4f72016d.koyeb.app";

// Wheel segment colours — kept intentionally vivid (they're the wheel itself)
const WHEEL_COLORS = [
  "#7C5CFC","#FF3B5C","#00C896","#FFD166","#06C2FF",
  "#FF8C42","#A78BFA","#FF6B9D","#4ECDC4","#45B7D1",
];
const getColor = (i: number) => WHEEL_COLORS[i % WHEEL_COLORS.length];

interface RoomData {
  slug: string;
  name: string;
  description: string;
  participants: string[];
  owner_address?: string;
  winners: string[];
}

/* ── Confetti — keeps its party colours ── */
function Confetti() {
  const colors = ["#7C5CFC","#FF3B5C","#00C896","#FFD166","#06C2FF","#FF8C42"];
  return (
    <div className="pointer-events-none fixed inset-0 z-[999] overflow-hidden">
      {Array.from({ length: 70 }).map((_, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            width: Math.random() > 0.5 ? 8 : 6,
            height: Math.random() > 0.5 ? 8 : 6,
            borderRadius: Math.random() > 0.5 ? "50%" : 0,
            background: colors[Math.floor(Math.random() * colors.length)],
            left: `${Math.random() * 100}%`,
            top: `${40 + Math.random() * 20}%`,
            animation: `confettiFall ${1.2 + Math.random() * 2}s ease ${Math.random() * 0.5}s forwards`,
            opacity: 0,
          }}
        />
      ))}
      <style>{`
        @keyframes confettiFall {
          0%   { opacity: 1; transform: translate(0,0) rotate(0deg); }
          100% { opacity: 0; transform: translate(${Math.random() > .5 ? "" : "-"}${60 + Math.random() * 60}px, 220px) rotate(720deg); }
        }
      `}</style>
    </div>
  );
}

export default function SpinnerRoom() {
  const { slug } = useParams() as { slug: string };
  const router = useRouter();
  const { address } = useWallet()

  const [room, setRoom] = useState<RoomData | null>(null);
  const [loading, setLoading] = useState(true);

  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);
  const [showWinner, setShowWinner] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  const [addingName, setAddingName] = useState("");
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editingVal, setEditingVal] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [autoRemove, setAutoRemove] = useState(false);
  const [confettiEnabled, setConfettiEnabled] = useState(true);
  const [showSettings, setShowSettings] = useState(false);

  const [winHistory, setWinHistory] = useState<{ name: string; ts: string }[]>([]);

  const fileRef = useRef<HTMLInputElement>(null);
  const animFrameRef = useRef<number>(0);
  const rotRef = useRef(0);
  const addInputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  /* ── Fetch room ── */

const fetchRoom = useCallback(async () => {
  try {
    const res = await fetch(`${BACKEND_URL}/api/spinners/${slug}`);
    const data = await res.json();
    if (data.success) {
      setRoom(data.data);
      setWinHistory((data.data.winners ?? []).map((name: string) => ({ name, ts: "" })));
      const owner = (data.data.owner_address || "").toLowerCase();
      const wallet = (address || "").toLowerCase();
      setIsAdmin(!!owner && !!wallet && owner === wallet);
    }
  } catch (err) {
    console.error("Failed to fetch room:", err);
  } finally {
    setLoading(false); // ← this was missing entirely
  }
}, [slug, address]);

// Re-check isAdmin whenever wallet changes (user connects/disconnects mid-session)
useEffect(() => {
  if (!room) return;
  const owner = (room.owner_address || "").toLowerCase();
  const wallet = (address || "").toLowerCase();
  setIsAdmin(!!owner && !!wallet && owner === wallet);
}, [address, room]);

  useEffect(() => { fetchRoom(); }, [fetchRoom]);

  /* ── Backend sync ── */
  const syncBackend = useCallback(async (participants: string[], winners?: string[]) => {
  await fetch(`${BACKEND_URL}/api/spinners/${slug}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      participants,
      winners: winners ?? winHistory.map((w) => w.name),
      caller_address: address ?? "",   // ← ADD
    }),
  });
}, [slug, winHistory, address]);

  /* ── File upload ── */
  const handleFile = (file: File) => {
    if (!room) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const names = (ev.target?.result as string).split(/[\n,\r]+/).map((n) => n.trim()).filter(Boolean);
      const merged = Array.from(new Set([...room.participants, ...names]));
      const added = merged.length - room.participants.length;
      setRoom({ ...room, participants: merged });
      await syncBackend(merged);
      toast.success(`Added ${added} new name${added !== 1 ? "s" : ""} from file`);
    };
    reader.readAsText(file);
  };

  /* ── Participants CRUD ── */
  const addParticipant = async () => {
    const name = addingName.trim();
    if (!name || !room) return;
    const updated = [...room.participants, name];
    setRoom({ ...room, participants: updated });
    setAddingName("");
    await syncBackend(updated);
    addInputRef.current?.focus();
  };

  const removeParticipant = async (i: number) => {
    if (!room) return;
    const updated = room.participants.filter((_, idx) => idx !== i);
    setRoom({ ...room, participants: updated });
    await syncBackend(updated);
  };

  const startEdit = (i: number) => {
    setEditingIdx(i);
    setEditingVal(room!.participants[i]);
    setTimeout(() => editInputRef.current?.focus(), 50);
  };

  const commitEdit = async () => {
    if (editingIdx === null || !room) return;
    const name = editingVal.trim();
    if (!name) { setEditingIdx(null); return; }
    const updated = [...room.participants];
    updated[editingIdx] = name;
    setRoom({ ...room, participants: updated });
    setEditingIdx(null);
    await syncBackend(updated);
    toast.success(`Renamed to "${name}"`);
  };

  /* ── Spin ── */
  const doSpin = () => {
    if (!room || spinning || room.participants.length < 2) return;
    setShowWinner(false);
    setWinner(null);
    setShowConfetti(false);
    setSpinning(true);

    const n = room.participants.length;
    const arc = 360 / n;
    const targetWinIdx = Math.floor(Math.random() * n);
    const slotAngle = targetWinIdx * arc + arc / 2;
    const targetMod = ((90 - slotAngle) % 360 + 360) % 360;
    const currentMod = ((rotRef.current % 360) + 360) % 360;
    const shortDelta = ((targetMod - currentMod) % 360 + 360) % 360;
    const totalDelta = (6 + Math.random() * 6) * 360 + shortDelta;

    const startRot = rotRef.current;
    const targetRot = startRot + totalDelta;
    const duration = 4500 + Math.random() * 1500;
    const startTime = performance.now();
    const ease = (t: number) => 1 - Math.pow(1 - t, 4);

    const animate = (now: number) => {
      const t = Math.min((now - startTime) / duration, 1);
      const r = startRot + (targetRot - startRot) * ease(t);
      rotRef.current = r;
      setRotation(r);
      if (t < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        rotRef.current = targetRot;
        setRotation(targetRot);
        setSpinning(false);

        const verifiedIdx = getWinnerIndex(targetRot, n);
        const winnerName = room.participants[verifiedIdx];
        setWinner(winnerName);
        setTimeout(() => {
          setShowWinner(true);
          if (confettiEnabled) { setShowConfetti(true); setTimeout(() => setShowConfetti(false), 3000); }
        }, 150);

        const newEntry = { name: winnerName, ts: new Date().toLocaleTimeString() };
        setWinHistory((prev) => [newEntry, ...prev]);

        if (autoRemove) {
          const updated = room.participants.filter((_, idx) => idx !== verifiedIdx);
          setRoom({ ...room, participants: updated });
          syncBackend(updated, [winnerName, ...winHistory.map((w) => w.name)]);
        } else {
          syncBackend(room.participants, [winnerName, ...winHistory.map((w) => w.name)]);
        }
      }
    };
    animFrameRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => () => cancelAnimationFrame(animFrameRef.current), []);

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Link copied to clipboard!");
  };

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center text-muted-foreground">
          <div className="mb-3 text-5xl">🎡</div>
          <p className="text-sm font-semibold">Loading room...</p>
        </div>
      </div>
    );
  }
  if (!room) return null;

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {showConfetti && <Confetti />}

      {/* Ambient — single primary orb, very low opacity */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="room-orb-1" />
        <div className="room-orb-2" />
      </div>

      {/* ══ Header ══ */}
      <header className="sticky top-0 z-50 px-3 py-2 sm:px-6 sm:py-3 bg-surface-header border-b border-surface">
        <div className="flex items-center gap-2">
          {/* Back */}
          <Button
            variant="ghost"
            size="sm"
            className="gap-1 shrink-0 px-2 text-muted-foreground hover:text-foreground"
            onClick={() => router.push("/")}
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back</span>
          </Button>

          <div className="hidden sm:block w-px h-6 bg-border" />

          {/* Room info */}
          <div className="flex flex-1 items-center gap-2 min-w-0">
            <h1 className="truncate text-sm sm:text-base font-bold text-foreground">{room.name}</h1>
            
            {room.description && (
              <span className="hidden truncate text-xs lg:block text-muted-foreground">{room.description}</span>
            )}
          </div>

         <ThemeToggle/>

          {/* Actions */}
          <div className="flex items-center gap-1.5">
            <input
              ref={fileRef}
              type="file"
              accept=".txt,.csv"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
            />
            <Button
              variant="outline"
              size="sm"
              className="px-2 sm:px-3"
              onClick={() => fileRef.current?.click()}
              title="Upload file"
            >
              <Upload className="h-3.5 w-3.5" />
              <span className="hidden sm:inline ml-1.5">Upload</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="px-2 sm:px-3"
              onClick={copyLink}
              title="Share link"
            >
              <Share2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline ml-1.5">Share</span>
            </Button>
          </div>
          
        </div>
            
        {/* Mobile slug strip */}
        
      </header>

      {/* ══ Main content ══ */}
      <div className="room-grid relative z-10 mx-auto w-full max-w-[1200px] gap-5 px-3 py-4 pb-20 sm:px-6 sm:py-6" style={{ display: "grid" }}>

        {/* Wheel stage */}
        <Card className="bg-surface-card border-surface overflow-hidden" style={{ borderRadius: 16 }}>
          <CardContent
            className="flex flex-col items-center justify-center gap-4 sm:gap-6 p-4 sm:p-8 wheel-stage-bg"
            style={{ minHeight: "clamp(360px, 60vw, 500px)" }}
          >
            {/* Winner banner */}
            {showWinner && winner && (
              <div className="winner-banner w-full max-w-sm rounded-xl p-4 sm:p-5 text-center">
                <div className="mb-1.5 text-xl sm:text-2xl">👑</div>
                <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-primary">Winner!</p>
                <p className="text-2xl sm:text-3xl font-black tracking-tight text-foreground" style={{ letterSpacing: "-0.5px" }}>
                  {winner}
                </p>
              </div>
            )}

            {/* Wheel */}
            <div className="w-full flex items-center justify-center" style={{ maxWidth: "min(420px, calc(100vw - 64px))" }}>
              <SpinWheel names={room.participants} spinning={spinning} rotation={rotation} />
            </div>

            {/* Spin controls */}
            <div className="flex items-center gap-2 sm:gap-2.5">
              <Button
                onClick={doSpin}
                disabled={spinning || room.participants.length < 2}
                size="lg"
                className={`gap-2 px-6 sm:px-8 text-base sm:text-lg font-black border-0 spin-btn ${spinning || room.participants.length < 2 ? "spin-btn-disabled" : "spin-btn-active"}`}
                style={{ minWidth: 120 }}
              >
                {spinning
                  ? <><RotateCcw className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" /> Spinning...</>
                  : <><Play className="h-4 w-4 sm:h-5 sm:w-5" /> Spin!</>}
              </Button>

              {showWinner && !spinning && (
                <Button
                  variant="outline"
                  size="icon"
                  className="h-11 w-11 sm:h-12 sm:w-12"
                  onClick={() => { setWinner(null); setShowWinner(false); }}
                  title="Clear winner"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* ── Sidebar ── */}
        <div className="flex flex-col gap-4">

          {/* Participants */}
          <Card className="bg-surface-card border-surface overflow-hidden" style={{ borderRadius: 14 }}>
            <CardHeader className="pb-3 border-b border-surface">
              <CardTitle className="flex items-center gap-2 text-sm text-foreground">
                👥 Participants
                <Badge variant="secondary" className="ml-auto text-xs font-bold">
                  {room.participants.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3">
              {/* Upload strip */}
              <div
                onClick={() => fileRef.current?.click()}
                className="upload-strip mb-2.5 cursor-pointer rounded-lg px-3 py-2.5 text-center text-xs transition-colors text-muted-foreground border-2 border-dashed border-border"
              >
                📂 Upload .txt or .csv file
              </div>

              {/* Add input */}
              <div className="mb-2.5 flex gap-2">
                <Input
                  ref={addInputRef}
                  placeholder="Add a name..."
                  value={addingName}
                  onChange={(e) => setAddingName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") addParticipant(); }}
                  className="h-9 text-sm"
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 shrink-0"
                  onClick={addParticipant}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {/* Participant list */}
              <div className="flex max-h-56 flex-col gap-0.5 overflow-y-auto pr-0.5">
                {room.participants.map((name, i) => (
                  <div
                    key={i}
                    className="group flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-accent active:bg-accent"
                  >
                    <div className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: getColor(i) }} />
                    {editingIdx === i ? (
                      <>
                        <input
                          ref={editInputRef}
                          value={editingVal}
                          onChange={(e) => setEditingVal(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") commitEdit(); if (e.key === "Escape") setEditingIdx(null); }}
                          onBlur={commitEdit}
                          className="h-6 flex-1 rounded border border-primary bg-background px-2 text-xs text-foreground outline-none"
                        />
                        <button onClick={commitEdit} className="text-primary hover:opacity-70" style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                          <Check className="h-3 w-3" />
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="flex-1 truncate text-sm font-medium text-foreground">{name}</span>
                        <button
                          onClick={() => startEdit(i)}
                          className="text-muted-foreground hover:text-primary transition-colors sm:hidden"
                          style={{ background: "none", border: "none", cursor: "pointer", padding: "2px 4px" }}
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => removeParticipant(i)}
                          className="text-muted-foreground hover:text-destructive transition-colors sm:hidden"
                          style={{ background: "none", border: "none", cursor: "pointer", padding: "2px 4px" }}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => startEdit(i)}
                          className="hidden text-muted-foreground hover:text-primary sm:group-hover:block transition-colors"
                          style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => removeParticipant(i)}
                          className="hidden text-muted-foreground hover:text-destructive sm:group-hover:block transition-colors"
                          style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Spin History */}
          {winHistory.length > 0 && (
            <Card className="bg-surface-card border-surface overflow-hidden" style={{ borderRadius: 14 }}>
              <CardHeader className="pb-3 border-b border-surface">
                <CardTitle className="flex items-center gap-2 text-sm text-foreground">
                  <Trophy className="h-3.5 w-3.5 text-primary" /> Spin History
                  <button
                    onClick={() => setWinHistory([])}
                    className="ml-auto text-[11px] font-normal text-muted-foreground hover:text-destructive transition-colors"
                    style={{ background: "none", border: "none", cursor: "pointer" }}
                  >
                    Clear all
                  </button>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-1.5 p-3">
                <div className="flex max-h-44 flex-col gap-1.5 overflow-y-auto">
                  {winHistory.map((w, i) => (
                    <div
                      key={i}
                      className="history-row flex items-center gap-2 rounded-lg px-3 py-2"
                    >
                      <span className="text-sm">{i === 0 ? "👑" : "🏅"}</span>
                      <span className="flex-1 truncate text-sm font-semibold text-primary">{w.name}</span>
                      {w.ts && <span className="shrink-0 text-[10px] text-muted-foreground">{w.ts}</span>}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Settings */}
          <Card className="bg-surface-card border-surface overflow-hidden" style={{ borderRadius: 14 }}>
            <button
              onClick={() => setShowSettings((s) => !s)}
              className="flex w-full items-center gap-2 px-4 py-3 text-sm font-bold transition-colors hover:bg-accent text-foreground"
              style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}
            >
              <Settings className="h-3.5 w-3.5 text-muted-foreground" />
              Settings
              <span className="ml-auto text-xs text-muted-foreground">{showSettings ? "▲" : "▼"}</span>
            </button>
            {showSettings && (
              <CardContent className="flex flex-col gap-3 pb-4 pt-0 border-t border-surface">
                {[
                  { label: "Auto-remove winner after spin", val: autoRemove, set: setAutoRemove },
                  { label: "Celebration confetti on win",   val: confettiEnabled, set: setConfettiEnabled },
                ].map((s) => (
                  <label key={s.label} className="mt-3 flex cursor-pointer items-center gap-2.5">
                    <input
                      type="checkbox"
                      checked={s.val}
                      onChange={(e) => s.set(e.target.checked)}
                      className="h-4 w-4 accent-primary"
                    />
                    <span className="text-sm font-medium text-foreground">{s.label}</span>
                  </label>
                ))}
              </CardContent>
            )}
          </Card>
        </div>
      </div>

      <style>{`
        /* ── Ambient orbs ── */
        .room-orb-1 {
          position: absolute; width: 500px; height: 500px; border-radius: 50%;
          background: hsl(var(--primary)); filter: blur(130px); opacity: 0.05;
          top: -100px; left: -80px;
        }
        .room-orb-2 {
          position: absolute; width: 400px; height: 400px; border-radius: 50%;
          background: hsl(var(--primary)); filter: blur(130px); opacity: 0.03;
          bottom: 0; right: -60px;
        }

        /* ── Live badge ── */
        .live-badge {
          background: hsl(var(--primary) / 0.12) !important;
          border: 1px solid hsl(var(--primary) / 0.3) !important;
          color: hsl(var(--primary)) !important;
        }

        /* ── Wheel stage radial glow ── */
        .wheel-stage-bg {
          background: radial-gradient(circle at 50% 55%, hsl(var(--primary) / 0.06), transparent 65%);
        }

        /* ── Winner banner ── */
        .winner-banner {
          background: hsl(var(--primary) / 0.07);
          border: 1px solid hsl(var(--primary) / 0.25);
          animation: fadeUp 0.4s ease;
        }

        /* ── Spin button ── */
        .spin-btn-active {
          background: hsl(var(--primary)) !important;
          color: hsl(var(--primary-foreground)) !important;
          box-shadow: 0 4px 20px hsl(var(--primary) / 0.35);
        }
        .spin-btn-disabled {
          background: hsl(var(--muted)) !important;
          color: hsl(var(--muted-foreground)) !important;
          box-shadow: none;
        }

        /* ── Upload strip hover ── */
        .upload-strip:hover {
          border-color: hsl(var(--primary)) !important;
          color: hsl(var(--primary)) !important;
        }

        /* ── History row ── */
        .history-row {
          background: hsl(var(--primary) / 0.06);
          border: 1px solid hsl(var(--primary) / 0.15);
        }

        /* ── Grid layout ── */
        .room-grid { grid-template-columns: 1fr; }
        @media (min-width: 768px) {
          .room-grid { grid-template-columns: 1fr 320px; }
        }

        /* ── Animations ── */
        @keyframes fadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        @keyframes spin   { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
        .animate-spin { animation: spin 1s linear infinite; }

        /* ── Scrollbars ── */
        ::-webkit-scrollbar       { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: hsl(var(--border)); border-radius: 4px; }

        /* ── Mobile: always show participant action icons ── */
        @media (max-width: 639px) {
          .group .sm\\:hidden { display: block !important; }
          .group .sm\\:group-hover\\:block { display: none !important; }
        }
      `}</style>
    </div>
  );
}