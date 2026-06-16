"use client";
import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2, Plus, Trash2, Eye, Heart, LogOut,
  LayoutGrid, List, RefreshCw, Search, Rss
} from "lucide-react";
import { getSession, getAdmin, clearSession, API } from "../_lib/auth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  cover_image_url: string;
  tags: string[];
  author_name: string;
  published_at: string;
  likes_count: number;
  views_count: number;
}
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric"
  });
}
export default function BlogAdminPage() {
  const router = useRouter();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingSlug, setDeletingSlug] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const admin = getAdmin();
  useEffect(() => {
    if (!getSession()) router.replace("/blogs/login");
  }, [router]);
  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/blog/posts?limit=50`);
      const data = await res.json();
      if (data.success) setPosts(data.posts);
    } catch { toast.error("Failed to load posts"); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => {
    fetchPosts(); // eslint-disable-line react-hooks/set-state-in-effect
  }, [fetchPosts]);
  const handleDelete = async (slug: string, title: string) => {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    const token = getSession();
    if (!token) { router.replace("/blogs/login"); return; }
    setDeletingSlug(slug);
    try {
      const res = await fetch(`${API}/api/blog/posts/${slug}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionToken: token }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.detail || "Delete failed");
      setPosts(prev => prev.filter(p => p.slug !== slug));
      toast.success("Post deleted");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeletingSlug(null);
    }
  };
  const handleLogout = async () => {
    const token = getSession();
    if (token) await fetch(`${API}/api/blogs/logout?sessionToken=${token}`, { method: "POST" }).catch(() => {});
    clearSession();
    router.push("/blogs");
  };
  const filtered = posts.filter(p =>
    p.title.toLowerCase().includes(search.toLowerCase()) ||
    p.tags.some(t => t.toLowerCase().includes(search.toLowerCase()))
  );
  const stats = {
    total: posts.length,
    totalLikes: posts.reduce((s, p) => s + p.likes_count, 0),
    totalViews: posts.reduce((s, p) => s + p.views_count, 0),
  };
  return (
    <div className="min-h-screen">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6 pb-20">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/80 border border-indigo-500/40 flex items-center justify-center shrink-0">
              <Rss className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black text-white">Blog Admin</h1>
              <p className="text-white/40 text-xs">{admin?.displayName || "Admin"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push("/blogs/create-blog")}
              className="flex items-center gap-1.5 h-9 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all"
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">New Post</span>
            </button>
            <button
              onClick={() => router.push("/blogs")}
              className="flex items-center gap-1.5 h-9 px-4 rounded-xl bg-white/5 border border-white/10 text-white/70 text-xs font-bold hover:bg-white/10 transition-all"
            >
              <Eye className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">View Blog</span>
            </button>
            <button
              onClick={handleLogout}
              className="h-9 px-3 rounded-xl bg-white/5 border border-white/10 text-red-400 hover:bg-red-500/10 hover:border-red-500/30 transition-all"
              title="Logout"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 sm:gap-4">
          {[
            { label: "Total Posts", value: stats.total, color: "text-indigo-400" },
            { label: "Total Likes", value: stats.totalLikes, color: "text-red-400" },
            { label: "Total Views", value: stats.totalViews, color: "text-green-400" },
          ].map(s => (
            <div key={s.label} className="bg-white/5 border border-white/10 backdrop-blur-sm rounded-2xl p-4 sm:p-5 text-center">
              <p className={`text-2xl sm:text-3xl font-black ${s.color}`}>{s.value}</p>
              <p className="text-white/40 text-xs sm:text-sm mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
        {/* Toolbar */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex-1 min-w-50 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search posts..."
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-white/10 bg-white/5 text-white placeholder-white/30 text-sm outline-none focus:border-indigo-500/40 focus:ring-2 focus:ring-indigo-500/10 transition-all"
            />
          </div>
          <div className="bg-white/5 border border-white/10 p-1 rounded-xl flex gap-1 shrink-0">
            <button
              onClick={() => setViewMode("list")}
              className={cn("p-1.5 rounded-lg transition-all", viewMode === "list" ? "bg-indigo-600 text-white" : "text-white/30 hover:text-white/60")}
            >
              <List className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={cn("p-1.5 rounded-lg transition-all", viewMode === "grid" ? "bg-indigo-600 text-white" : "text-white/30 hover:text-white/60")}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>
          <button
            onClick={fetchPosts}
            disabled={loading}
            className="h-9 px-3 rounded-xl bg-white/5 border border-white/10 text-white/50 hover:text-white hover:bg-white/10 transition-all shrink-0"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
          </button>
        </div>
        {/* Posts */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-center">
            <div className="text-5xl mb-4">✍️</div>
            <h2 className="text-xl font-black text-white mb-2">
              {search ? "No posts match your search" : "No posts yet"}
            </h2>
            {!search && (
              <button
                onClick={() => router.push("/blogs/create-blog")}
                className="mt-4 flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold transition-all"
              >
                <Plus className="h-4 w-4" /> Create First Post
              </button>
            )}
          </div>
        ) : viewMode === "list" ? (
          <div className="bg-white/5 border border-white/10 backdrop-blur-sm rounded-2xl overflow-hidden">
            <div className="px-4 sm:px-5 py-3 border-b border-white/10 text-[10px] font-bold text-white/30 uppercase tracking-wider grid grid-cols-[1fr_auto_auto_auto] gap-4">
              <span>Post</span>
              <span className="hidden sm:block">Views</span>
              <span className="hidden sm:block">Likes</span>
              <span>Actions</span>
            </div>
            <div className="divide-y divide-white/5">
              {filtered.map(post => (
                <div
                  key={post.slug}
                  className="grid grid-cols-[1fr_auto_auto_auto] gap-4 items-center px-4 sm:px-5 py-3 hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {post.cover_image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={post.cover_image_url} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0 border border-white/10" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-indigo-500/20 border border-indigo-500/20 flex items-center justify-center shrink-0">
                        <Rss className="h-4 w-4 text-indigo-400/50" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-white font-bold text-sm truncate">{post.title}</p>
                      <p className="text-white/30 text-xs">{formatDate(post.published_at)}</p>
                    </div>
                  </div>
                  <span className="text-white/40 text-sm hidden sm:flex items-center gap-1">
                    <Eye className="h-3.5 w-3.5" />{post.views_count}
                  </span>
                  <span className="text-white/40 text-sm hidden sm:flex items-center gap-1">
                    <Heart className="h-3.5 w-3.5" />{post.likes_count}
                  </span>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => router.push(`/blogs/${post.slug}`)}
                      className="p-1.5 rounded-lg text-white/30 hover:text-indigo-400 hover:bg-indigo-500/10 transition-all"
                      title="View"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(post.slug, post.title)}
                      disabled={deletingSlug === post.slug}
                      className="p-1.5 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-50"
                      title="Delete"
                    >
                      {deletingSlug === post.slug
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <Trash2 className="h-3.5 w-3.5" />
                      }
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(post => (
              <div
                key={post.slug}
                className="bg-white/5 border border-white/10 backdrop-blur-sm rounded-2xl overflow-hidden hover:bg-white/8 hover:border-white/20 transition-all"
              >
                <div className="aspect-video bg-white/5 overflow-hidden">
                  {post.cover_image_url
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={post.cover_image_url} alt="" className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center"><Rss className="h-10 w-10 text-white/10" /></div>
                  }
                </div>
                <div className="p-4 space-y-3">
                  <div>
                    <p className="text-white font-bold text-sm line-clamp-2">{post.title}</p>
                    <p className="text-white/30 text-xs mt-1">{formatDate(post.published_at)}</p>
                  </div>
                  {post.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {post.tags.slice(0, 3).map(tag => (
                        <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-semibold">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-2 border-t border-white/5">
                    <div className="flex items-center gap-3 text-white/30 text-xs">
                      <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{post.views_count}</span>
                      <span className="flex items-center gap-1"><Heart className="h-3 w-3" />{post.likes_count}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => router.push(`/blogs/${post.slug}`)} className="p-1.5 rounded-lg text-white/30 hover:text-indigo-400 hover:bg-indigo-500/10 transition-all">
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => handleDelete(post.slug, post.title)} disabled={deletingSlug === post.slug} className="p-1.5 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-50">
                        {deletingSlug === post.slug ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}