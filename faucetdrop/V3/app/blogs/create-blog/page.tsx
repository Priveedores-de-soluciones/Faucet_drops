"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2, Link2, PenLine, X, Plus,
  ImageIcon, User, ArrowLeft, CheckCircle2, Lock, RotateCcw,
  Eye, Code2, Bold, Italic, Strikethrough, Heading1, Heading2,
  Heading3, List, ListOrdered, Quote, Minus, Link, AlignLeft,
  AlignCenter, AlignRight, AlignJustify, Underline, Type, Upload,
  Image as ImageIcon2, XCircle, CloudUpload
} from "lucide-react";
import { getSession, getAdmin, clearSession, API } from "../_lib/auth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Mode = "url" | "manual";
type EditorTab = "write" | "preview";

/* ─────────────────────────────────────────────
   Lightweight Markdown → HTML renderer
───────────────────────────────────────────── */
function renderMarkdown(md: string): string {
  if (!md) return "";
  let html = md
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  html = html.replace(/```(\w*)\n?([\s\S]*?)```/gm, (_, lang, code) =>
    `<pre class="md-pre"><code class="md-code${lang ? ` language-${lang}` : ""}">${code.trim()}</code></pre>`
  );
  html = html.replace(/^&gt; ?(.*)$/gm, (_, c) =>
    `<blockquote class="md-blockquote">${c}</blockquote>`
  );
  html = html.replace(/^#{6} (.+)$/gm, '<h6 class="md-h6">$1</h6>');
  html = html.replace(/^#{5} (.+)$/gm, '<h5 class="md-h5">$1</h5>');
  html = html.replace(/^#{4} (.+)$/gm, '<h4 class="md-h4">$1</h4>');
  html = html.replace(/^### (.+)$/gm, '<h3 class="md-h3">$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2 class="md-h2">$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1 class="md-h1">$1</h1>');
  html = html.replace(/^---$/gm, '<hr class="md-hr" />');
  html = html.replace(/((?:^- .+\n?)+)/gm, (block) => {
    const items = block.trim().split("\n").map(l => `<li>${l.replace(/^- /, "")}</li>`).join("");
    return `<ul class="md-ul">${items}</ul>`;
  });
  html = html.replace(/((?:^\d+\. .+\n?)+)/gm, (block) => {
    const items = block.trim().split("\n").map(l => `<li>${l.replace(/^\d+\. /, "")}</li>`).join("");
    return `<ol class="md-ol">${items}</ol>`;
  });
  html = html.replace(/:::(\w+)\n([\s\S]*?):::/gm, (_, align, content) =>
    `<div style="text-align:${align}">${content.trim()}</div>`
  );
  // Images before links
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g,
    '<img class="md-img" src="$2" alt="$1" />'
  );
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong class="md-bold">$1</strong>');
  html = html.replace(/__(.+?)__/g, '<strong class="md-bold">$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em class="md-italic">$1</em>');
  html = html.replace(/_([^_]+)_/g, '<em class="md-italic">$1</em>');
  html = html.replace(/~~(.+?)~~/g, '<del class="md-del">$1</del>');
  html = html.replace(/\+\+(.+?)\+\+/g, '<u class="md-underline">$1</u>');
  html = html.replace(/`([^`]+)`/g, '<code class="md-inline-code">$1</code>');
  html = html.replace(/\[(.+?)\]\((.+?)\)/g,
    '<a class="md-link" href="$2" target="_blank" rel="noopener">$1</a>'
  );
  const blockTags = /^<(h[1-6]|ul|ol|li|blockquote|pre|hr|div|img)/;
  html = html.split("\n\n").map(block => {
    const trimmed = block.trim();
    if (!trimmed) return "";
    if (blockTags.test(trimmed)) return trimmed;
    return `<p class="md-p">${trimmed.replace(/\n/g, "<br />")}</p>`;
  }).join("\n");
  return html;
}

/* ─────────────────────────────────────────────
   Image Upload Hook
───────────────────────────────────────────── */
function useImageUpload() {
  const upload = useCallback(async (file: File, sessionToken: string): Promise<string> => {
    const MAX_MB = 5;
    if (file.size > MAX_MB * 1024 * 1024)
      throw new Error(`Image must be under ${MAX_MB}MB`);
    if (!file.type.startsWith("image/"))
      throw new Error("File must be an image");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("sessionToken", sessionToken);

    const res = await fetch(`${API}/api/blog/upload-image`, {
      method: "POST",
      body: formData,
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.detail || "Upload failed");
    return data.url as string;
  }, []);

  return { upload };
}

/* ─────────────────────────────────────────────
   Cover Image Upload Component
───────────────────────────────────────────── */
interface CoverImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  sessionToken: string;
  inputClass: string;
  labelClass: string;
}

function CoverImageUpload({
  value, onChange, sessionToken, inputClass, labelClass
}: CoverImageUploadProps) {
  const { upload }                  = useImageUpload();
  const [uploading, setUploading]   = useState(false);
  const [dragOver, setDragOver]     = useState(false);
  const fileRef                     = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    setUploading(true);
    try {
      const url = await upload(file, sessionToken);
      onChange(url);
      toast.success("Cover image uploaded!");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }, [upload, onChange, sessionToken]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  return (
    <div className="space-y-2">
      <label className={labelClass}>
        <ImageIcon className="inline h-3.5 w-3.5 mr-1" />Cover Image
      </label>

      {/* URL + Upload button row */}
      <div className="flex gap-2">
        <input
          type="url"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="https://... or upload a file below"
          className={cn(inputClass, "flex-1")}
        />
        <button
          type="button"
          title="Upload image file"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="shrink-0 h-11 px-4 rounded-xl border border-white/10 bg-white/5 text-white/60 hover:bg-indigo-500/20 hover:text-indigo-300 hover:border-indigo-500/30 transition-all disabled:opacity-50 flex items-center gap-1.5 text-sm font-medium"
        >
          {uploading
            ? <Loader2 className="h-4 w-4 animate-spin" />
            : <Upload className="h-4 w-4" />
          }
          <span className="hidden sm:inline">{uploading ? "Uploading…" : "Upload"}</span>
        </button>
      </div>

      {/* Drop zone — only when no image */}
      {!value && (
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => fileRef.current?.click()}
          className={cn(
            "relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed py-7 cursor-pointer transition-all select-none",
            dragOver
              ? "border-indigo-500 bg-indigo-500/10"
              : "border-white/10 bg-white/2 hover:border-white/20 hover:bg-white/5"
          )}
        >
          <CloudUpload className={cn("h-7 w-7", dragOver ? "text-indigo-400" : "text-white/20")} />
          <p className="text-xs text-white/30 text-center px-4">
            {dragOver
              ? "Drop to upload"
              : "Drag & drop or click to upload  ·  PNG, JPG, WEBP, GIF  ·  Max 5 MB"
            }
          </p>
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/40 backdrop-blur-sm">
              <Loader2 className="h-6 w-6 animate-spin text-indigo-400" />
            </div>
          )}
        </div>
      )}

      {/* Preview with overlay controls */}
      {value && (
        <div className="relative group aspect-video w-full max-w-sm rounded-xl overflow-hidden border border-white/10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt="Cover preview"
            className="w-full h-full object-cover"
            onError={() => onChange("")}
          />
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-500 transition-all disabled:opacity-50"
            >
              {uploading
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <Upload className="h-3.5 w-3.5" />
              }
              Replace
            </button>
            <button
              type="button"
              onClick={() => onChange("")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 text-white/70 text-xs font-bold hover:bg-red-500/20 hover:text-red-300 transition-all"
            >
              <XCircle className="h-3.5 w-3.5" /> Remove
            </button>
          </div>
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}

/* ─────────────────────────────────────────────
   Toolbar button
───────────────────────────────────────────── */
interface ToolbarBtnProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
  loading?: boolean;
}
function ToolbarBtn({ icon, label, onClick, active, loading }: ToolbarBtnProps) {
  return (
    <button
      type="button"
      title={label}
      onClick={onClick}
      disabled={loading}
      className={cn(
        "h-7 w-7 flex items-center justify-center rounded-md text-xs transition-all disabled:opacity-50",
        active
          ? "bg-indigo-500/30 text-indigo-300"
          : "text-white/50 hover:text-white hover:bg-white/10"
      )}
    >
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : icon}
    </button>
  );
}
function ToolbarDivider() {
  return <div className="w-px h-4 bg-white/10 mx-0.5 shrink-0" />;
}

/* ─────────────────────────────────────────────
   Markdown Editor
───────────────────────────────────────────── */
interface MarkdownEditorProps {
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  placeholder?: string;
  className?: string;
  sessionToken: string;
}

function MarkdownEditor({
  value, onChange, rows = 16, placeholder, className, sessionToken
}: MarkdownEditorProps) {
  const [tab, setTab]                     = useState<EditorTab>("write");
  const [imgUploading, setImgUploading]   = useState(false);
  const [dropHighlight, setDropHighlight] = useState(false);
  const textareaRef  = useRef<HTMLTextAreaElement>(null);
  const inlineFileRef = useRef<HTMLInputElement>(null);
  const { upload }   = useImageUpload();

  const wrap = useCallback((before: string, after = "", ph = "") => {
    const el = textareaRef.current;
    if (!el) return;
    const { selectionStart: s, selectionEnd: e } = el;
    const sel = value.slice(s, e) || ph;
    onChange(value.slice(0, s) + before + sel + after + value.slice(e));
    setTimeout(() => {
      el.focus();
      const cur = s + before.length + sel.length;
      el.setSelectionRange(cur, cur);
    }, 0);
  }, [value, onChange]);

  const wrapLines = useCallback((prefix: string) => {
    const el = textareaRef.current;
    if (!el) return;
    const { selectionStart: s, selectionEnd: e } = el;
    const sel = value.slice(s, e);
    const lined = sel
      ? sel.split("\n").map(l => `${prefix}${l}`).join("\n")
      : `${prefix}New line`;
    onChange(value.slice(0, s) + lined + value.slice(e));
    setTimeout(() => el.focus(), 0);
  }, [value, onChange]);

  const wrapAlign = useCallback((align: string) => {
    const el = textareaRef.current;
    if (!el) return;
    const { selectionStart: s, selectionEnd: e } = el;
    const sel = value.slice(s, e) || "Your text here";
    onChange(value.slice(0, s) + `\n:::${align}\n${sel}\n:::\n` + value.slice(e));
    setTimeout(() => el.focus(), 0);
  }, [value, onChange]);

  const insertHr = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    onChange(value.slice(0, el.selectionStart) + "\n---\n" + value.slice(el.selectionStart));
    setTimeout(() => el.focus(), 0);
  }, [value, onChange]);

  const insertImageMarkdown = useCallback((url: string, alt = "image") => {
    const el = textareaRef.current;
    const pos = el?.selectionStart ?? value.length;
    onChange(value.slice(0, pos) + `\n![${alt}](${url})\n` + value.slice(pos));
    setTimeout(() => el?.focus(), 0);
  }, [value, onChange]);

  const handleInlineImageFile = useCallback(async (file: File) => {
    if (!sessionToken) return;
    setImgUploading(true);
    try {
      const url = await upload(file, sessionToken);
      insertImageMarkdown(url, file.name.replace(/\.[^.]+$/, ""));
      toast.success("Image inserted into content!");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setImgUploading(false);
    }
  }, [upload, insertImageMarkdown, sessionToken]);

  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const imgItem = Array.from(e.clipboardData.items).find(i => i.type.startsWith("image/"));
    if (imgItem) {
      e.preventDefault();
      const file = imgItem.getAsFile();
      if (file) handleInlineImageFile(file);
    }
  }, [handleInlineImageFile]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    setDropHighlight(false);
    const file = e.dataTransfer.files[0];
    if (file?.type.startsWith("image/")) handleInlineImageFile(file);
  }, [handleInlineImageFile]);

  const wordCount = value.trim() ? value.trim().split(/\s+/).length : 0;
  const readMins  = Math.max(1, Math.ceil(wordCount / 200));

  return (
    <div className={cn("rounded-xl border border-white/10 overflow-hidden", className)}>

      {/* Tab row */}
      <div className="flex items-center justify-between bg-white/5 border-b border-white/10 px-2 py-1">
        <div className="flex gap-1">
          {(["write", "preview"] as EditorTab[]).map(t => (
            <button key={t} type="button" onClick={() => setTab(t)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold transition-all",
                tab === t ? "bg-indigo-600 text-white" : "text-white/40 hover:text-white/70"
              )}
            >
              {t === "write"
                ? <><Code2 className="h-3 w-3" />Write</>
                : <><Eye className="h-3 w-3" />Preview</>
              }
            </button>
          ))}
        </div>
        <span className="text-[10px] text-white/30 pr-1">
          {value.length} chars · ~{readMins} min read
        </span>
      </div>

      {/* Toolbar */}
      {tab === "write" && (
        <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 bg-white/3 border-b border-white/10">
          <ToolbarBtn icon={<Heading1 className="h-3.5 w-3.5" />} label="H1" onClick={() => wrapLines("# ")} />
          <ToolbarBtn icon={<Heading2 className="h-3.5 w-3.5" />} label="H2" onClick={() => wrapLines("## ")} />
          <ToolbarBtn icon={<Heading3 className="h-3.5 w-3.5" />} label="H3" onClick={() => wrapLines("### ")} />
          <ToolbarBtn icon={<Type className="h-3.5 w-3.5" />}     label="H4" onClick={() => wrapLines("#### ")} />
          <ToolbarDivider />
          <ToolbarBtn icon={<Bold className="h-3.5 w-3.5" />}          label="Bold (Ctrl+B)"      onClick={() => wrap("**", "**", "bold text")} />
          <ToolbarBtn icon={<Italic className="h-3.5 w-3.5" />}        label="Italic (Ctrl+I)"    onClick={() => wrap("*", "*", "italic text")} />
          <ToolbarBtn icon={<Underline className="h-3.5 w-3.5" />}     label="Underline (Ctrl+U)" onClick={() => wrap("++", "++", "underlined")} />
          <ToolbarBtn icon={<Strikethrough className="h-3.5 w-3.5" />} label="Strikethrough"      onClick={() => wrap("~~", "~~", "strikethrough")} />
          <ToolbarDivider />
          <ToolbarBtn icon={<AlignLeft className="h-3.5 w-3.5" />}    label="Align Left"    onClick={() => wrapAlign("left")} />
          <ToolbarBtn icon={<AlignCenter className="h-3.5 w-3.5" />}  label="Align Center"  onClick={() => wrapAlign("center")} />
          <ToolbarBtn icon={<AlignRight className="h-3.5 w-3.5" />}   label="Align Right"   onClick={() => wrapAlign("right")} />
          <ToolbarBtn icon={<AlignJustify className="h-3.5 w-3.5" />} label="Justify"       onClick={() => wrapAlign("justify")} />
          <ToolbarDivider />
          <ToolbarBtn icon={<List className="h-3.5 w-3.5" />}        label="Bullet list"  onClick={() => wrapLines("- ")} />
          <ToolbarBtn icon={<ListOrdered className="h-3.5 w-3.5" />} label="Ordered list" onClick={() => wrapLines("1. ")} />
          <ToolbarBtn icon={<Quote className="h-3.5 w-3.5" />}       label="Blockquote"   onClick={() => wrapLines("> ")} />
          <ToolbarDivider />
          <ToolbarBtn
            icon={<span className="font-mono text-[10px] font-bold">`</span>}
            label="Inline code" onClick={() => wrap("`", "`", "code")} />
          <ToolbarBtn
            icon={<span className="font-mono text-[9px] font-bold">```</span>}
            label="Code block" onClick={() => wrap("```\n", "\n```", "code block")} />
          <ToolbarBtn icon={<Link className="h-3.5 w-3.5" />}  label="Link"    onClick={() => wrap("[", "](https://)", "link text")} />
          <ToolbarBtn icon={<Minus className="h-3.5 w-3.5" />} label="Divider" onClick={insertHr} />
          <ToolbarDivider />
          {/* Inline image upload */}
          <ToolbarBtn
            icon={<ImageIcon2 className="h-3.5 w-3.5" />}
            label="Insert image (upload file)"
            loading={imgUploading}
            onClick={() => inlineFileRef.current?.click()}
          />
          <input
            ref={inlineFileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={e => {
              const file = e.target.files?.[0];
              if (file) handleInlineImageFile(file);
              e.target.value = "";
            }}
          />
        </div>
      )}

      {/* Write pane */}
      {tab === "write" && (
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            rows={rows}
            onPaste={handlePaste}
            onDrop={handleDrop}
            onDragOver={e => { e.preventDefault(); setDropHighlight(true); }}
            onDragLeave={() => setDropHighlight(false)}
            onKeyDown={e => {
              if ((e.ctrlKey || e.metaKey) && !e.shiftKey) {
                if (e.key === "b") { e.preventDefault(); wrap("**", "**", "bold text"); }
                if (e.key === "i") { e.preventDefault(); wrap("*", "*", "italic text"); }
                if (e.key === "u") { e.preventDefault(); wrap("++", "++", "underline"); }
              }
            }}
            className={cn(
              "w-full px-4 py-3 bg-black/20 text-white placeholder-white/20 text-sm font-mono resize-y outline-none transition-all",
              dropHighlight && "ring-2 ring-inset ring-indigo-500/50 bg-indigo-500/5"
            )}
            style={{ minHeight: `${rows * 1.5}rem` }}
          />
          {/* Drop overlay hint */}
          {dropHighlight && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600/90 backdrop-blur-sm text-white text-sm font-bold shadow-xl">
                <CloudUpload className="h-4 w-4" /> Drop image to insert
              </div>
            </div>
          )}
          {/* Uploading overlay */}
          {imgUploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm pointer-events-none">
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600/90 text-white text-sm font-bold">
                <Loader2 className="h-4 w-4 animate-spin" /> Uploading image…
              </div>
            </div>
          )}
        </div>
      )}

      {/* Preview pane */}
      {tab === "preview" && (
        <div
          className="px-5 py-4 min-h-96 overflow-auto prose-custom"
          dangerouslySetInnerHTML={{
            __html: renderMarkdown(value) ||
              '<p class="text-white/20 text-sm italic">Nothing to preview yet…</p>'
          }}
        />
      )}

      {/* Hint bar */}
      {tab === "write" && (
        <div className="px-3 py-1.5 bg-white/2 border-t border-white/6">
          <p className="text-[10px] text-white/25">
            <span className="text-indigo-400/50">🖼 Tip:</span> paste an image from clipboard, drag a file onto the editor, or click the{" "}
            <span className="text-indigo-400/50">image toolbar button</span> to embed images inline as Markdown.
          </p>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Main Page
───────────────────────────────────────────── */
export default function CreateBlogPage() {
  const router = useRouter();
  const [checking, setChecking]         = useState(true);
  const [authed, setAuthed]             = useState(false);
  const [mode, setMode]                 = useState<Mode>("url");
  const [urlInput, setUrlInput]         = useState("");
  const [extracting, setExtracting]     = useState(false);
  const [extracted, setExtracted]       = useState(false);
  const [submitting, setSubmitting]     = useState(false);
  const [tagInput, setTagInput]         = useState("");
  const [sessionToken, setSessionToken] = useState("");
  const admin = getAdmin();

  const initialFormState = {
    title: "", content: "", excerpt: "",
    coverImageUrl: "", tags: [] as string[],
    authorName: admin?.displayName || "",
    authorAvatar: admin?.avatarUrl || "",
    authorHandle: "", sourceUrl: "",
  };
  const [form, setForm] = useState(initialFormState);

 useEffect(() => {
    const token = getSession();
    if (!token) { router.replace("/blogs/login"); return; }
    // Store token in a ref-safe way — read it from getSession() in handlers instead
    const savedToken = token;
    fetch(`${API}/api/blog/me?sessionToken=${savedToken}`)
      .then(r => r.json())
      .then(d => {
        setSessionToken(savedToken);
        if (d.success) {
          setAuthed(true);
        } else {
          const formIsEmpty = !form.title.trim() && !form.content.trim();
          if (formIsEmpty) {
            clearSession();
            router.replace("/blogs/login");
          } else {
            toast.error("Session expired. Copy your content before refreshing.");
            setAuthed(true);
          }
        }
      })
      .catch(() => setChecking(false))
      .finally(() => setChecking(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const set = (key: string, value: unknown) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const addTag = () => {
    const newTags = tagInput
      .split(",").map(t => t.trim().replace(/^#/, "")).filter(t => t.length > 0);
    if (newTags.length > 0) {
      set("tags", Array.from(new Set([...form.tags, ...newTags])).slice(0, 8));
      setTagInput("");
    }
  };

  const removeTag = (tag: string) =>
    set("tags", form.tags.filter(t => t !== tag));

  const handleClear = () => {
    setForm(initialFormState);
    setUrlInput("");
    setExtracted(false);
  };

  const handleExtract = async () => {
    const token = getSession();
    if (!token) { router.replace("/blogs/login"); return; }
    if (!urlInput.trim()) { toast.error("Enter a URL first"); return; }
    setExtracting(true);
    setExtracted(false);
    try {
      const res = await fetch(`${API}/api/blog/extract-url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: urlInput.trim(), sessionToken: token }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.detail || "Extraction failed");
      setForm(prev => ({ ...prev, ...data.data }));
      setExtracted(true);
      toast.success("Extracted! Review and edit before publishing.");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to extract");
    } finally {
      setExtracting(false);
    }
  };

  const handleSubmit = async () => {
    const token = getSession();
    if (!token) { router.replace("/blogs/login"); return; }
    if (!form.title.trim())   { toast.error("Title is required");   return; }
    if (!form.content.trim()) { toast.error("Content is required"); return; }
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/api/blog/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, sessionToken: token }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.detail || "Failed to publish");
      toast.success("Post published!");
      router.push(`/blogs/${data.slug}`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to publish");
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    "w-full px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-white placeholder-white/30 text-sm outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/10 transition-all";
  const labelClass = "block text-sm font-bold text-white/70 mb-1.5";

  if (checking) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
    </div>
  );
  if (!authed) return null;

  return (
    <>
      <style>{`
        .prose-custom { color: rgba(255,255,255,0.85); font-size: 0.9375rem; line-height: 1.75; }
        .prose-custom .md-h1 { font-size: 1.75rem; font-weight: 900; color: #fff; margin: 1.5rem 0 0.75rem; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 0.4rem; }
        .prose-custom .md-h2 { font-size: 1.375rem; font-weight: 800; color: #fff; margin: 1.25rem 0 0.6rem; }
        .prose-custom .md-h3 { font-size: 1.125rem; font-weight: 700; color: rgba(255,255,255,0.95); margin: 1rem 0 0.5rem; }
        .prose-custom .md-h4 { font-size: 1rem; font-weight: 700; color: rgba(255,255,255,0.9); margin: 0.75rem 0 0.4rem; }
        .prose-custom .md-h5, .prose-custom .md-h6 { font-size: 0.9rem; font-weight: 600; color: rgba(255,255,255,0.8); margin: 0.5rem 0 0.3rem; }
        .prose-custom .md-p  { margin: 0.7rem 0; }
        .prose-custom .md-bold   { font-weight: 700; color: #fff; }
        .prose-custom .md-italic { font-style: italic; color: rgba(255,255,255,0.9); }
        .prose-custom .md-del    { text-decoration: line-through; color: rgba(255,255,255,0.45); }
        .prose-custom .md-underline { text-decoration: underline; text-underline-offset: 3px; }
        .prose-custom .md-inline-code {
          font-family: 'JetBrains Mono','Fira Code',monospace;
          background: rgba(99,102,241,0.15); color: #a5b4fc;
          padding: 0.15em 0.45em; border-radius: 4px; font-size: 0.85em;
        }
        .prose-custom .md-pre {
          background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.08);
          border-radius: 10px; padding: 1rem 1.25rem; overflow-x: auto; margin: 1rem 0;
        }
        .prose-custom .md-code { font-family: 'JetBrains Mono','Fira Code',monospace; font-size: 0.8rem; color: #c4b5fd; white-space: pre; }
        .prose-custom .md-blockquote {
          border-left: 3px solid #6366f1; margin: 0.75rem 0;
          padding: 0.5rem 0 0.5rem 1rem;
          color: rgba(255,255,255,0.6); font-style: italic;
          background: rgba(99,102,241,0.05); border-radius: 0 8px 8px 0;
        }
        .prose-custom .md-ul, .prose-custom .md-ol { margin: 0.75rem 0; padding-left: 1.5rem; }
        .prose-custom .md-ul li, .prose-custom .md-ol li { margin: 0.3rem 0; }
        .prose-custom .md-ul li::marker { color: #6366f1; }
        .prose-custom .md-ol li::marker { color: #6366f1; font-weight: 700; }
        .prose-custom .md-hr { border: none; border-top: 1px solid rgba(255,255,255,0.12); margin: 1.5rem 0; }
        .prose-custom .md-link { color: #818cf8; text-decoration: underline; text-underline-offset: 3px; }
        .prose-custom .md-link:hover { color: #a5b4fc; }
        .prose-custom .md-img {
          max-width: 100%; height: auto; border-radius: 10px;
          border: 1px solid rgba(255,255,255,0.1); margin: 0.75rem 0; display: block;
        }
      `}</style>

      <div className="min-h-screen">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-5 pb-20">

          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => router.push("/blogs/admin")}
                className="p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition-all">
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div>
                <h1 className="text-xl font-black text-white">New Post</h1>
                <p className="text-white/40 text-xs">Import from URL or write manually</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-white/30 text-xs">
              <Lock className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{admin?.displayName || "Admin"}</span>
            </div>
          </div>

          {/* Mode toggle */}
          <div className="bg-white/5 border border-white/10 p-1 rounded-xl flex gap-1">
            {(["url", "manual"] as Mode[]).map(m => (
              <button key={m} onClick={() => setMode(m)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all",
                  mode === m ? "bg-indigo-600 text-white shadow-sm" : "text-white/40 hover:text-white/70"
                )}
              >
                {m === "url"
                  ? <><Link2 className="h-4 w-4" />Import from URL</>
                  : <><PenLine className="h-4 w-4" />Write Manually</>
                }
              </button>
            ))}
          </div>

          {/* URL section */}
          {mode === "url" && (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4 backdrop-blur-sm">
              <h2 className="font-black text-white flex items-center gap-2">
                <Link2 className="h-4 w-4 text-indigo-400" /> Import from URL
              </h2>
              <p className="text-white/40 text-sm">
                Paste any article or X/Twitter link — we&apos;ll extract the title, content, images, and author automatically.
              </p>
              <div className="flex gap-2">
                <input type="url" value={urlInput}
                  onChange={e => setUrlInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") handleExtract(); }}
                  placeholder="https://example.com/article..."
                  className={cn(inputClass, "flex-1")} />
                <button onClick={handleExtract}
                  disabled={extracting || !urlInput.trim()}
                  className="shrink-0 h-11 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold disabled:opacity-50 transition-all flex items-center gap-2">
                  {extracting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Extract"}
                </button>
              </div>
              {extracted && (
                <div className="flex items-center gap-2 text-green-400 text-sm font-medium">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  Extracted — review and edit before publishing
                </div>
              )}
            </div>
          )}

          {/* Form */}
          {(mode === "manual" || extracted) && (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 sm:p-6 space-y-5 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-2">
                <h2 className="font-black text-white flex items-center gap-2">
                  <PenLine className="h-4 w-4 text-indigo-400" />
                  {mode === "url" ? "Review & Edit" : "Post Details"}
                </h2>
                <button onClick={handleClear}
                  className="flex items-center gap-1.5 text-xs text-white/40 hover:text-red-400 transition-colors">
                  <RotateCcw className="h-3 w-3" /> Clear Form
                </button>
              </div>

              <div>
                <label className={labelClass}>Title *</label>
                <input type="text" value={form.title}
                  onChange={e => set("title", e.target.value)}
                  placeholder="Post title..." className={inputClass} />
              </div>

              <div>
                <label className={labelClass}>Excerpt</label>
                <textarea value={form.excerpt}
                  onChange={e => set("excerpt", e.target.value)}
                  placeholder="Short summary shown in listings..." rows={2}
                  className={cn(inputClass, "resize-none")} />
              </div>

              <div>
                <div className="flex items-end justify-between mb-2">
                  <label className="block text-sm font-bold text-white/70">Content *</label>
                  <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/20">
                    Markdown
                  </span>
                </div>
                <MarkdownEditor
                  value={form.content}
                  onChange={v => set("content", v)}
                  rows={16}
                  sessionToken={sessionToken}
                  placeholder={"Write your post in Markdown…\n\nUse the toolbar above, or paste / drag an image directly into the editor to embed it."}
                />
              </div>

              {/* Cover image with file upload */}
              <CoverImageUpload
                value={form.coverImageUrl}
                onChange={v => set("coverImageUrl", v)}
                sessionToken={sessionToken}
                inputClass={inputClass}
                labelClass={labelClass}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}><User className="inline h-3.5 w-3.5 mr-1" />Author Name</label>
                  <input type="text" value={form.authorName}
                    onChange={e => set("authorName", e.target.value)}
                    placeholder={admin?.displayName || "Author..."} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Author Handle</label>
                  <input type="text" value={form.authorHandle}
                    onChange={e => set("authorHandle", e.target.value)}
                    placeholder="@handle" className={inputClass} />
                </div>
              </div>

              <div>
                <label className={labelClass}>Author Avatar URL</label>
                <input type="url" value={form.authorAvatar}
                  onChange={e => set("authorAvatar", e.target.value)}
                  placeholder="https://..." className={inputClass} />
              </div>

              {mode === "url" && (
                <div>
                  <label className={labelClass}>Source URL</label>
                  <input type="url" value={form.sourceUrl}
                    onChange={e => set("sourceUrl", e.target.value)} className={inputClass} />
                </div>
              )}

              <div>
                <label className={labelClass}>Tags</label>
                <div className="flex gap-2">
                  <input type="text" value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                    placeholder="Type a tag or comma-separated list..."
                    className={cn(inputClass, "flex-1")} />
                  <button onClick={addTag}
                    className="h-11 px-4 shrink-0 rounded-xl border border-white/10 bg-white/5 text-white/60 hover:bg-white/10 hover:text-white transition-all">
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                {form.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {form.tags.map(tag => (
                      <span key={tag}
                        className="inline-flex items-center gap-1.5 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full px-3 py-1 text-xs font-bold">
                        {tag}
                        <button onClick={() => removeTag(tag)} className="text-indigo-400/60 hover:text-indigo-300">
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Submit */}
          {(mode === "manual" || extracted) && (
            <div className="flex gap-3">
              <button onClick={() => router.push("/blogs/admin")}
                className="flex-1 h-12 rounded-xl border border-white/10 bg-white/5 text-white/70 text-sm font-bold hover:bg-white/10 transition-all">
                Cancel
              </button>
              <button onClick={handleSubmit}
                disabled={submitting || !form.title.trim() || !form.content.trim()}
                className="flex-1 h-12 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold disabled:opacity-50 transition-all flex items-center justify-center gap-2">
                {submitting
                  ? <><Loader2 className="h-4 w-4 animate-spin" />Publishing…</>
                  : "Publish Post"
                }
              </button>
            </div>
          )}

        </div>
      </div>
    </>
  );
}