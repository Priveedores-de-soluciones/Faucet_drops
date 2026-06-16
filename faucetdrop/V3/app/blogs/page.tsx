"use client";
import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2, Heart, Eye, RefreshCw,
  Calendar, ChevronDown, Rss, ArrowRight, Tag
} from "lucide-react";
import { cn } from "@/lib/utils";
import { API } from "./_lib/auth";
interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  cover_image_url: string;
  tags: string[];
  author_name: string;
  author_avatar: string;
  author_handle: string;
  published_at: string;
  likes_count: number;
  views_count: number;
}
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric"
  });
}

/** Reusable avatar that falls back to initials if the image URL fails */
function AuthorAvatar({ avatar, name, size = "sm" }: { avatar: string; name: string; size?: "sm" | "md" }) {
  const [imgError, setImgError] = useState(false);
  const initials = name?.slice(0, 2).toUpperCase() || "FD";
  const sizeClass = size === "sm" ? "h-6 w-6" : "h-9 w-9";
  const textClass = size === "sm" ? "text-[10px]" : "text-xs";

  return (
    <div className={cn("rounded-full bg-indigo-500/30 border border-indigo-500/40 overflow-hidden shrink-0 flex items-center justify-center", sizeClass)}>
      {avatar && !imgError ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatar} alt={name} className="w-full h-full object-cover" onError={() => setImgError(true)} />
      ) : (
        <span className={cn("font-bold text-indigo-300", textClass)}>{initials}</span>
      )}
    </div>
  );
}

function BlogCard({ post, onClick }: { post: BlogPost; onClick: () => void }) {
  return (
    <article
      onClick={onClick}
      className="group bg-white/5 border border-white/10 backdrop-blur-sm rounded-2xl overflow-hidden hover:bg-white/10 hover:border-indigo-500/40 hover:shadow-lg hover:shadow-indigo-500/10 transition-all duration-300 cursor-pointer flex flex-col"
    >
      <div className="aspect-video bg-white/5 overflow-hidden shrink-0">
        {post.cover_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={post.cover_image_url} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Rss className="h-10 w-10 text-indigo-400/40" />
          </div>
        )}
      </div>
      <div className="flex-1 flex flex-col p-4 sm:p-5 space-y-3">
        {post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {post.tags.slice(0, 3).map(tag => (
              <span key={tag} className="text-[10px] h-4 px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-semibold">{tag}</span>
            ))}
          </div>
        )}
        <h2 className="text-base sm:text-lg font-black text-white leading-tight line-clamp-2 group-hover:text-indigo-300 transition-colors">
          {post.title}
        </h2>
        {post.excerpt && <p className="text-white/50 text-sm line-clamp-2 flex-1">{post.excerpt}</p>}
        <div className="mt-auto pt-3 border-t border-white/10 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <AuthorAvatar avatar={post.author_avatar} name={post.author_name} size="sm" />
            <div className="min-w-0">
              <p className="text-white/70 text-xs font-bold truncate">{post.author_name || "FaucetDrops"}</p>
              <p className="text-white/30 text-[10px] flex items-center gap-1">
                <Calendar className="h-2.5 w-2.5" />{formatDate(post.published_at)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-white/30 text-xs shrink-0">
            <span className="flex items-center gap-1"><Heart className="h-3 w-3" />{post.likes_count}</span>
            <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{post.views_count}</span>
          </div>
        </div>
      </div>
    </article>
  );
}

function HeroCard({ post, onClick }: { post: BlogPost; onClick: () => void }) {
  return (
    <article
      onClick={onClick}
      className="group bg-white/5 border border-white/10 backdrop-blur-sm rounded-2xl overflow-hidden hover:bg-white/10 hover:border-indigo-500/40 hover:shadow-xl hover:shadow-indigo-500/10 transition-all duration-300 cursor-pointer"
    >
      <div className="grid grid-cols-1 md:grid-cols-2">
        <div className="aspect-video md:aspect-auto min-h-55 bg-white/5 overflow-hidden">
          {post.cover_image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={post.cover_image_url} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Rss className="h-16 w-16 text-indigo-400/20" />
            </div>
          )}
        </div>
        <div className="p-5 sm:p-8 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="bg-indigo-500 text-white border-0 text-xs px-2.5 py-0.5 rounded-full font-bold">Latest</span>
              {post.tags.slice(0, 2).map(tag => (
                <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-semibold">{tag}</span>
              ))}
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white leading-tight group-hover:text-indigo-300 transition-colors">{post.title}</h2>
            {post.excerpt && <p className="text-white/50 text-sm line-clamp-3">{post.excerpt}</p>}
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <AuthorAvatar avatar={post.author_avatar} name={post.author_name} size="md" />
              <div>
                <p className="text-white font-bold text-sm">{post.author_name || "FaucetDrops"}</p>
                <p className="text-white/40 text-xs">{formatDate(post.published_at)}</p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-white/30 text-xs">
                <span className="flex items-center gap-1"><Heart className="h-3.5 w-3.5" />{post.likes_count}</span>
                <span className="flex items-center gap-1"><Eye className="h-3.5 w-3.5" />{post.views_count}</span>
              </div>
              <span className="flex items-center gap-1 text-indigo-400 text-sm font-bold group-hover:gap-2 transition-all">
                Read more <ArrowRight className="h-4 w-4" />
              </span>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

export default function BlogPage() {
  const router = useRouter();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [allTags, setAllTags] = useState<string[]>([]);
  const fetchPosts = useCallback(async (p = 1, tag: string | null = null, append = false) => {
    if (append) setLoadingMore(true);
    else { setLoading(true); setError(""); }
    try {
      const url = new URL(`${API}/api/blog/posts`);
      url.searchParams.set("page", String(p));
      url.searchParams.set("limit", "13");
      if (tag) url.searchParams.set("tag", tag);
      const res = await fetch(url.toString());
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.detail || "Failed to load");
      if (append) {
        setPosts(prev => [...prev, ...data.posts]);
      } else {
        setPosts(data.posts);
        const tags = Array.from(new Set<string>(data.posts.flatMap((p: BlogPost) => p.tags))).slice(0, 15);
        setAllTags(tags as string[]);
      }
      setTotalPages(data.totalPages);
      setPage(p);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load posts");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);
  useEffect(() => {
    fetchPosts(1, activeTag); // eslint-disable-line react-hooks/set-state-in-effect
  }, [activeTag, fetchPosts]);
  const hero = posts[0];
  const grid = posts.slice(1);
  return (
    <div className="min-h-screen">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8 pb-20">
        <div className="text-center max-w-2xl mx-auto space-y-4 pt-4">
          <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full px-4 py-1.5 text-indigo-300 text-xs font-bold uppercase tracking-widest">
            <Rss className="h-3.5 w-3.5" /> Blog
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-white leading-tight">News &amp; Updates</h1>
          <p className="text-white/50 text-base sm:text-lg">
            The latest from the FaucetDrops team &mdash; product updates, announcements and insights.
          </p>
          <button onClick={() => fetchPosts(1, activeTag)} disabled={loading} className="inline-flex items-center gap-2 text-xs font-bold text-white/40 hover:text-white/70 transition-colors">
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} /> Refresh
          </button>
        </div>
        {allTags.length > 0 && !loading && (
          <div className="flex items-center gap-2 flex-wrap justify-center">
            <button onClick={() => setActiveTag(null)} className={cn("inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all", !activeTag ? "bg-indigo-500 text-white border-indigo-500" : "bg-white/5 text-white/50 border-white/10 hover:border-indigo-500/40 hover:text-white/80")}>
              <Tag className="h-3 w-3" /> All
            </button>
            {allTags.map(tag => (
              <button key={tag} onClick={() => setActiveTag(activeTag === tag ? null : tag)} className={cn("px-3 py-1.5 rounded-full text-xs font-bold border transition-all", activeTag === tag ? "bg-indigo-500 text-white border-indigo-500" : "bg-white/5 text-white/50 border-white/10 hover:border-indigo-500/40 hover:text-white/80")}>
                {tag}
              </button>
            ))}
          </div>
        )}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24">
            <Loader2 className="h-10 w-10 animate-spin text-indigo-400 mb-4" />
            <p className="text-white/40 text-sm">Loading posts...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center py-24 text-center">
            <div className="text-5xl mb-4">📡</div>
            <h2 className="text-xl font-black text-white mb-2">Couldn&apos;t load posts</h2>
            <p className="text-white/50 text-sm mb-6">{error}</p>
            <button onClick={() => fetchPosts()} className="px-5 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white text-sm font-bold hover:bg-white/15 transition-all">Retry</button>
          </div>
        ) : posts.length === 0 ? (
          <div className="flex flex-col items-center py-24 text-center">
            <div className="text-5xl mb-4">📝</div>
            <h2 className="text-xl font-black text-white mb-2">No posts yet</h2>
            <p className="text-white/40 text-sm">Check back soon for updates!</p>
          </div>
        ) : (
          <div className="space-y-6">
            {hero && <HeroCard post={hero} onClick={() => router.push(`/blogs/${hero.slug}`)} />}
            {grid.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                {grid.map(post => (
                  <BlogCard key={post.id} post={post} onClick={() => router.push(`/blogs/${post.slug}`)} />
                ))}
              </div>
            )}
            {page < totalPages && (
              <div className="flex justify-center pt-4">
                <button onClick={() => fetchPosts(page + 1, activeTag, true)} disabled={loadingMore} className="flex items-center gap-2 h-11 px-8 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-bold hover:bg-white/10 hover:border-white/20 transition-all disabled:opacity-50">
                  {loadingMore ? <><Loader2 className="h-4 w-4 animate-spin" />Loading...</> : <>Load more <ChevronDown className="h-4 w-4" /></>}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}