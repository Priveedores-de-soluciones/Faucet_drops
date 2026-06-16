"use client";
import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Loader2, Heart, Eye, ArrowLeft,
  ExternalLink, Calendar, Share2, ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getBrowserFingerprint, API } from "../_lib/auth";
import { toast } from "sonner";
interface BlogPost {
  id: string;
  slug: string;
  title: string;
  content: string;
  excerpt: string;
  cover_image_url: string;
  tags: string[];
  author_name: string;
  author_avatar: string;
  author_handle: string;
  source_url: string;
  published_at: string;
  likes_count: number;
  views_count: number;
}
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric"
  });
}
function formatReadTime(content: string) {
  const words = content.split(/\s+/).length;
  return `${Math.max(1, Math.ceil(words / 200))} min read`;
}
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
export default function BlogDetailPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const slug = params?.slug ?? "";
  const [avatarError, setAvatarError] = useState(false);
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [liking, setLiking] = useState(false);
    useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    fetch(`${API}/api/blog/posts/${slug}`)
      .then(r => r.json())
      .then(d => {
        if (cancelled) return;
        if (d.success) {
          setPost(d.post);
          setLikesCount(d.post.likes_count);
          const likedSlugs: string[] = JSON.parse(localStorage.getItem("blog_liked") || "[]");
          setLiked(likedSlugs.includes(slug));
        } else {
          setError(d.detail || "Post not found");
        }
      })
      .catch(() => { if (!cancelled) setError("Failed to load post"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [slug]);

  const handleLike = async () => {
    if (liking) return;
    setLiking(true);
    const fp = getBrowserFingerprint();
    try {
      const res = await fetch(`${API}/api/blog/posts/${slug}/like?fingerprint=${fp}`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setLiked(data.liked);
        setLikesCount(data.likes_count); // ← use real count, not prev ± 1
        const likedSlugs: string[] = JSON.parse(localStorage.getItem("blog_liked") || "[]");
        const updated = data.liked ? [...likedSlugs, slug] : likedSlugs.filter(s => s !== slug);
        localStorage.setItem("blog_liked", JSON.stringify(updated));
      }
    } catch { toast.error("Failed to like"); }
    finally { setLiking(false); }
  };
  
  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Link copied!");
  };
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="h-10 w-10 animate-spin text-indigo-400" />
    </div>
  );
  if (error || !post) return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-4">
      <div className="text-5xl mb-4">📰</div>
      <h2 className="text-xl font-black text-white mb-2">Post not found</h2>
      <p className="text-white/50 text-sm mb-6">{error}</p>
      <button
        onClick={() => router.push("/blogs")}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white text-sm font-bold hover:bg-white/15 transition-all"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Blog
      </button>
    </div>
  );
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
      {/* Breadcrumb */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-6">
        <div className="flex items-center gap-1.5 text-sm text-white/40 flex-wrap">
          <button onClick={() => router.push("/")} className="hover:text-white transition-colors font-medium">Home</button>
          <ChevronRight className="h-3.5 w-3.5 shrink-0" />
          <button onClick={() => router.push("/blogs")} className="hover:text-white transition-colors font-medium">Blog</button>
          <ChevronRight className="h-3.5 w-3.5 shrink-0" />
          <span className="text-white/70 font-bold truncate max-w-50 sm:max-w-xs">{post.title}</span>
        </div>
      </div>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10 pb-20">
        <article className="space-y-6">
          {/* Tags */}
          {post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {post.tags.map(tag => (
                <button
                  key={tag}
                  onClick={() => router.push(`/blogs?tag=${tag}`)}
                  className="text-xs px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-semibold hover:bg-indigo-500/30 transition-all"
                >
                  {tag}
                </button>
              ))}
            </div>
          )}
          {/* Title */}
          <h1 className="text-2xl sm:text-4xl font-black text-white leading-tight">
            {post.title}
          </h1>
          {/* Author + meta row */}
          <div className="flex items-center justify-between flex-wrap gap-3 pb-6 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-full bg-indigo-500/30 border-2 border-indigo-500/40 overflow-hidden flex items-center justify-center shrink-0">
                {post.author_avatar && !avatarError ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={post.author_avatar}
                    alt={post.author_name}
                    className="w-full h-full object-cover"
                    onError={() => setAvatarError(true)}
                  />
                ) : (
                  <span className="font-bold text-indigo-300">
                    {post.author_name?.slice(0, 2).toUpperCase() || "FD"}
                  </span>
                )}
              </div>
              <div>
                <p className="text-white font-bold text-sm">
                  {post.author_name || "FaucetDrops Team"}
                  {post.author_handle && (
                    <span className="text-white/40 font-normal ml-1.5">@{post.author_handle}</span>
                  )}
                </p>
                <div className="flex items-center gap-2 text-white/40 text-xs flex-wrap">
                  <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{formatDate(post.published_at)}</span>
                  <span>•</span>
                  <span>{formatReadTime(post.content)}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{post.views_count}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {post.source_url && (
                <a
                  href={post.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-indigo-400 font-bold hover:text-indigo-300 transition-colors"
                >
                  <ExternalLink className="h-3.5 w-3.5" /> Source
                </a>
              )}
              <button
                onClick={handleLike}
                disabled={liking}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all",
                  liked
                    ? "bg-red-500/20 border-red-500/40 text-red-400"
                    : "bg-white/5 border-white/10 text-white/50 hover:border-red-500/40 hover:text-red-400"
                )}
              >
                <Heart className={cn("h-3.5 w-3.5", liked && "fill-current")} />
                {likesCount}
              </button>
              <button
                onClick={handleShare}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border border-white/10 bg-white/5 text-white/50 hover:border-white/20 hover:text-white/80 transition-all"
              >
                <Share2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Share</span>
              </button>
            </div>
          </div>
          {/* Cover image */}
          {post.cover_image_url && (
            <div className="aspect-video rounded-2xl overflow-hidden border border-white/10 shadow-xl shadow-black/30">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={post.cover_image_url} alt={post.title} className="w-full h-full object-cover" />
            </div>
          )}
          {/* Excerpt callout */}
          {post.excerpt && (
            <div className="bg-indigo-500/10 border-l-4 border-indigo-500 rounded-r-2xl px-5 py-4">
              <p className="text-indigo-200 text-base font-medium italic leading-relaxed">
                {post.excerpt}
              </p>
            </div>
          )}
          {/* Body */}
          <div
            className="prose-custom"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(post.content) }}
          />
          {/* Bottom actions */}
          <div className="pt-8 border-t border-white/10 flex items-center justify-between flex-wrap gap-3">
            <button
              onClick={handleLike}
              disabled={liking}
              className={cn(
                "flex items-center gap-2 px-5 py-2.5 rounded-full font-bold text-sm border transition-all active:scale-95",
                liked
                  ? "bg-red-500/20 border-red-500/40 text-red-400"
                  : "bg-white/5 border-white/10 text-white/60 hover:border-red-500/40 hover:text-red-400"
              )}
            >
              <Heart className={cn("h-4 w-4", liked && "fill-current")} />
              {liked ? "Liked" : "Like"} ({likesCount})
            </button>
            <div className="flex gap-2">
              <button
                onClick={handleShare}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-full font-bold text-sm border border-white/10 bg-white/5 text-white/60 hover:border-white/20 hover:text-white transition-all"
              >
                <Share2 className="h-4 w-4" /> Share
              </button>
              <button
                onClick={() => router.push("/blogs")}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-full font-bold text-sm bg-indigo-600 hover:bg-indigo-500 text-white transition-all"
              >
                More Posts
              </button>
            </div>
          </div>
        </article>
      </div>
    </div>
    </>
  );
}