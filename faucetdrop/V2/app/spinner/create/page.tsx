"use client";
import React, { useState, useMemo, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { SpinWheel } from "@/components/SpinWheel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Sparkles, Upload, Users, FileText, X } from "lucide-react";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/theme";
import { useWallet } from "@/hooks/use-wallet"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "https://xeric-gwendolen-faucetdrops-4f72016d.koyeb.app";

// Wheel segment colours — kept vivid intentionally
const WHEEL_COLORS = [
  "#7C5CFC","#FF3B5C","#00C896","#FFD166","#06C2FF",
  "#FF8C42","#A78BFA","#FF6B9D","#4ECDC4","#45B7D1",
];
const getColor = (i: number) => WHEEL_COLORS[i % WHEEL_COLORS.length];

function NameTag({ name, index, onRemove }: { name: string; index: number; onRemove: () => void }) {
  const c = getColor(index);
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={{ background: c + "1A", border: `1px solid ${c}44`, color: c }}
    >
      {name}
      <button
        onClick={onRemove}
        className="ml-0.5 rounded-full opacity-60 hover:opacity-100 transition-opacity"
        style={{ background: "none", border: "none", cursor: "pointer", color: c, fontSize: 14, lineHeight: 1, padding: 0 }}
      >
        <X size={11} />
      </button>
    </span>
  );
}

export default function CreateRoomPage() {
  const router = useRouter();
  const [roomName, setRoomName] = useState("");
  const [roomDesc, setRoomDesc] = useState("");
  const [namesInput, setNamesInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { address } = useWallet()

  const parsedNames = useMemo(
    () => namesInput.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean),
    [namesInput]
  );

  const handleFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const names = text.split(/[\n,\r]+/).map((s) => s.trim()).filter(Boolean);
      setNamesInput((prev) => {
        const curr = prev.trim();
        return curr ? curr + "\n" + names.join("\n") : names.join("\n");
      });
      toast.success(`Loaded ${names.length} names from ${file.name}`);
    };
    reader.readAsText(file);
  }, []);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const removeName = (i: number) => {
    const lines = namesInput.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean);
    lines.splice(i, 1);
    setNamesInput(lines.join("\n"));
  };

  const handleCreate = async () => {
    if (!roomName.trim()) { toast.error("Room name is required"); return; }
    if (parsedNames.length < 2) { toast.error("Add at least 2 participants"); return; }
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/spinners`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: roomName.trim(), description: roomDesc.trim(), participants: parsedNames, owner_address: address ?? "" }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Room created! 🎉");
        router.push(`/spinner/${data.slug}`);
      } else {
        toast.error(data.detail || "Failed to create room");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  };

  const canCreate = !!roomName.trim() && parsedNames.length >= 2 && !loading;

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">

      {/* Ambient orb */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="create-orb-1" />
        <div className="create-orb-2" />
      </div>

      {/* Nav */}
      <nav className="sticky top-0 z-50 flex items-center justify-between px-4 py-3 sm:px-8 sm:py-4 bg-surface-header border-b border-surface">
        <div className="flex items-center gap-2 text-sm font-bold tracking-wide text-foreground">
          
          Create Wheel
        </div>
        <ThemeToggle/>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-muted-foreground hover:text-foreground"
          onClick={() => router.back()}
        >
          
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
      </nav>

      {/* Page body */}
      <div className="relative z-10 mx-auto w-full max-w-5xl px-4 py-7 pb-20 sm:px-6 sm:py-9">

        {/* Heading */}
        <div className="mb-7 sm:mb-8">
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground" style={{ letterSpacing: "-0.5px" }}>
            Create Spin Wheel
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Configure your wheel and add participants</p>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">

          {/* ── Left column ── */}
          <div className="flex flex-col gap-4">

            {/* Room Details */}
            <Card className="bg-surface-card border-surface" style={{ borderRadius: 14 }}>
              <CardHeader className="pb-3 border-b border-surface">
                <CardTitle className="flex items-center gap-2 text-sm text-foreground">
                  <span>⚙️</span> Room Details
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4 pt-5">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    Room Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    placeholder="e.g. FaucetDrops Weekly Draw"
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    Description{" "}
                    <span className="normal-case tracking-normal font-normal text-[10px] text-muted-foreground">(optional)</span>
                  </Label>
                  <Input
                    placeholder="What is this spin for?"
                    value={roomDesc}
                    onChange={(e) => setRoomDesc(e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Participants */}
            <Card className="bg-surface-card border-surface" style={{ borderRadius: 14 }}>
              <CardHeader className="pb-3 border-b border-surface">
                <div className="flex items-center gap-2">
                  <CardTitle className="flex items-center gap-2 text-sm text-foreground">
                    <Users className="h-4 w-4 text-primary" /> Participants
                  </CardTitle>
                  {parsedNames.length > 0 && (
                    <Badge variant="secondary" className="ml-auto text-xs font-bold">
                      {parsedNames.length}
                    </Badge>
                  )}
                </div>
                <CardDescription className="text-muted-foreground">
                  Upload a file or type names below — one per line or comma-separated.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4 pt-5">

                {/* Drop zone */}
                <div
                  onClick={() => fileRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={handleDrop}
                  className={`dropzone flex cursor-pointer flex-col items-center justify-center rounded-xl px-4 py-5 text-center transition-all duration-200 border-2 border-dashed ${dragging ? "dropzone-active" : ""}`}
                >
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".txt,.csv"
                    className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
                  />
                  <Upload className="mb-2 h-5 w-5 text-muted-foreground" />
                  <p className="text-sm font-semibold text-foreground">Drop file or click to browse</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Supports .txt, .csv — one name per line or comma-separated
                  </p>
                </div>

                <Separator />

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    Or type names manually
                  </Label>
                  <Textarea
                    placeholder={"Alice\nBob\nCarol\nDavid"}
                    value={namesInput}
                    onChange={(e) => setNamesInput(e.target.value)}
                    className="min-h-[110px] resize-y font-mono text-sm"
                  />
                </div>

                {/* Name tags */}
                {parsedNames.length > 0 && (
                  <div className="flex max-h-32 flex-wrap gap-1.5 overflow-y-auto">
                    {parsedNames.map((n, i) => (
                      <NameTag key={i} name={n} index={i} onRemove={() => removeName(i)} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Submit */}
            <Button
              onClick={handleCreate}
              disabled={!canCreate}
              size="lg"
              className="w-full gap-2 font-bold text-base border-0 create-btn"
            >
              {loading ? "Creating..." : <><Sparkles className="h-4 w-4" /> Generate Unique Room</>}
            </Button>
          </div>

          {/* ── Right column ── */}
          <div className="flex flex-col gap-4">

            {/* Live preview */}
            <Card className="bg-surface-card border-surface overflow-hidden" style={{ borderRadius: 14 }}>
              <CardHeader className="py-3 border-b border-surface bg-surface-card-2">
                <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Live Preview
                </CardTitle>
              </CardHeader>
              <CardContent
                className="flex min-h-[300px] items-center justify-center p-7 preview-bg"
                style={{ position: "relative" }}
              >
                <div className="preview-glow" />
                {parsedNames.length >= 2 ? (
                  <SpinWheel names={parsedNames} spinning={false} rotation={0} />
                ) : (
                  <div className="text-center text-muted-foreground">
                    <div
                      className="mx-auto mb-4 flex items-center justify-center text-3xl border-2 border-dashed border-border"
                      style={{ width: 120, height: 120, borderRadius: "50%" }}
                    >
                      🎡
                    </div>
                    <p className="text-sm font-semibold text-foreground">Add 2+ names</p>
                    <p className="mt-1 text-xs">to see your wheel</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Pro tips */}
            <Card className="bg-surface-card border-surface" style={{ borderRadius: 14 }}>
              <CardHeader className="pb-3 border-b border-surface">
                <CardTitle className="flex items-center gap-2 text-sm text-foreground">
                  <FileText className="h-4 w-4 text-primary" /> Pro Tips
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2.5 pt-4">
                {[
                  { icon: "📋", label: "CSV format:",    text: "One name per row, or comma-separated on a single line." },
                  { icon: "🔁", label: "Auto-remove:",   text: "Winners can be auto-removed after each spin to prevent repeats." },
                  { icon: "🔗", label: "Share your slug:", text: "Anyone with the link can watch the spin live." },
                  { icon: "✏️", label: "Edit anytime:",  text: "Rename or remove participants directly inside the room." },
                ].map((t) => (
                  <p key={t.label} className="text-xs leading-relaxed text-muted-foreground">
                    {t.icon}{" "}
                    <strong className="font-semibold text-foreground">{t.label}</strong>{" "}
                    {t.text}
                  </p>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <style>{`
        /* ── Ambient orbs ── */
        .create-orb-1 {
          position: absolute; width: 500px; height: 500px; border-radius: 50%;
          background: hsl(var(--primary)); filter: blur(130px); opacity: 0.05;
          top: -100px; left: -80px;
        }
        .create-orb-2 {
          position: absolute; width: 400px; height: 400px; border-radius: 50%;
          background: hsl(var(--primary)); filter: blur(130px); opacity: 0.03;
          bottom: 0; right: -50px;
        }

        /* ── Nav dot ── */
        .nav-dot {
          width: 8px; height: 8px; border-radius: 50%;
          background: hsl(var(--primary));
          box-shadow: 0 0 8px hsl(var(--primary) / 0.6);
          flex-shrink: 0;
        }

        /* ── Drop zone ── */
        .dropzone { border-color: hsl(var(--border)); background: hsl(var(--primary) / 0.02); }
        .dropzone:hover { border-color: hsl(var(--primary) / 0.5); background: hsl(var(--primary) / 0.05); }
        .dropzone-active { border-color: hsl(var(--primary)) !important; background: hsl(var(--primary) / 0.08) !important; }

        /* ── Preview card glow ── */
        .preview-bg { background: rgb(var(--surface-base)); }
        .preview-glow {
          position: absolute; inset: 0; pointer-events: none;
          background: radial-gradient(circle at 50% 50%, hsl(var(--primary) / 0.05), transparent 70%);
        }

        /* ── Create button ── */
        .create-btn {
          background: hsl(var(--primary)) !important;
          color: hsl(var(--primary-foreground)) !important;
          box-shadow: 0 4px 20px hsl(var(--primary) / 0.3);
        }
        .create-btn:disabled {
          background: hsl(var(--muted)) !important;
          color: hsl(var(--muted-foreground)) !important;
          box-shadow: none !important;
          cursor: not-allowed !important;
        }
      `}</style>
    </div>
  );
}