"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
    LineChart, Line, BarChart, Bar,
    XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, Area, AreaChart,
} from "recharts";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    TrendingUp, Users, CalendarDays, LayoutGrid,
    Loader2, RefreshCw, ArrowUpRight, ArrowDownRight, Minus,
} from "lucide-react";
import { cn } from "@/lib/utils";

const API_BASE_URL = "https://xeric-gwendolen-faucetdrops-4f72016d.koyeb.app";

interface DailyPoint   { date: string;  visits: number }
interface WeeklyPoint  { week: string;  visits: number }
interface MonthlyPoint { month: string; visits: number }
interface TopPage      { path: string;  visits: number }

interface VisitStats {
    daily:           DailyPoint[];
    weekly:          WeeklyPoint[];
    monthly:         MonthlyPoint[];
    top_pages:       TopPage[];
    total:           number;
    unique_visitors: number | null;
    period_days:     number;
}

type Period = "daily" | "weekly" | "monthly";
type Range  = 7 | 30 | 90 | 365;

const RANGE_LABELS: Record<Range, string> = {
    7:   "7 days",
    30:  "30 days",
    90:  "90 days",
    365: "1 year",
};

const formatLabel = (period: Period, key: string): string => {
    if (period === "daily") {
        const d = new Date(key + "T00:00:00");
        return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    }
    if (period === "weekly") return key.split("-")[1] ?? key;
    const [y, m] = key.split("-");
    return new Date(Number(y), Number(m) - 1).toLocaleDateString(undefined, {
        month: "short", year: "2-digit",
    });
};

const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 shadow-lg text-sm space-y-1">
            <p className="text-muted-foreground text-xs mb-1">{label}</p>
            {payload.map((p: any) => (
                <p key={p.dataKey} className="font-semibold" style={{ color: p.stroke }}>
                    {p.value?.toLocaleString() ?? "—"}{" "}
                    <span className="font-normal text-muted-foreground">
                        {p.dataKey === "unique" ? "unique visitors" : "visits"}
                    </span>
                </p>
            ))}
        </div>
    );
};

function StatCard({
    label, value, icon, trend, sub, colorClass,
}: {
    label: string;
    value: string;
    icon: React.ReactNode;
    trend?: "up" | "down" | "flat";
    sub?: string;
    colorClass: string;
}) {
    const TrendIcon = trend === "up" ? ArrowUpRight : trend === "down" ? ArrowDownRight : Minus;
    const trendColor = trend === "up"
        ? "text-emerald-600 dark:text-emerald-400"
        : trend === "down"
        ? "text-red-500 dark:text-red-400"
        : "text-slate-400";

    return (
        <Card className="p-4 border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 hover:shadow-md transition-shadow duration-200">
            <div className="flex items-start justify-between mb-3">
                <div className={cn("p-2 rounded-lg", colorClass)}>
                    {icon}
                </div>
                {trend && (
                    <TrendIcon className={cn("h-4 w-4 mt-0.5", trendColor)} />
                )}
            </div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">{label}</p>
            <p className="text-2xl font-bold text-foreground leading-none">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-1.5 truncate">{sub}</p>}
        </Card>
    );
}

export default function VisitsDashboard() {
    const [stats, setStats]     = useState<VisitStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError]     = useState<string | null>(null);
    const [period, setPeriod]   = useState<Period>("daily");
    const [range, setRange]     = useState<Range>(30);

    const fetchStats = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`${API_BASE_URL}/api/visit-stats?days=${range}`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data: VisitStats = await res.json();
            setStats(data);
        } catch (e: any) {
            setError(e.message ?? "Failed to load visit stats");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchStats(); }, [range]);

    const chartData = useMemo(() => {
        if (!stats) return [];
        const rows =
            period === "daily"   ? stats.daily.map(d => ({ key: d.date,  visits: d.visits, unique: (d as any).unique_visitors ?? null })) :
            period === "weekly"  ? stats.weekly.map(d => ({ key: d.week, visits: d.visits, unique: (d as any).unique_visitors ?? null })) :
            stats.monthly.map(d => ({ key: d.month, visits: d.visits, unique: (d as any).unique_visitors ?? null }));
        return rows.map(r => ({ ...r, label: formatLabel(period, r.key) }));
    }, [stats, period]);

    const avgPerPoint = chartData.length
        ? Math.round(chartData.reduce((s, d) => s + d.visits, 0) / chartData.length)
        : 0;

    const avgLabel = period === "daily" ? "day" : period === "weekly" ? "week" : "month";

    return (
        <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-6">

            {/* ── Header ── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Visit analytics</h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        Website traffic — last {RANGE_LABELS[range]}
                    </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    {/* Range pills */}
                    <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/60 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                        {([7, 30, 90, 365] as Range[]).map(r => (
                            <button
                                key={r}
                                onClick={() => setRange(r)}
                                className={cn(
                                    "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150",
                                    range === r
                                        ? "bg-white dark:bg-slate-900 text-foreground shadow-sm"
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                {RANGE_LABELS[r]}
                            </button>
                        ))}
                    </div>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={fetchStats}
                        disabled={loading}
                        className="h-9 w-9 p-0 border-slate-200 dark:border-slate-700"
                    >
                        <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
                    </Button>
                </div>
            </div>

            {/* ── Stat cards ── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard
                    label="Total visits"
                    value={stats?.total.toLocaleString() ?? "—"}
                    icon={<TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />}
                    colorClass="bg-blue-50 dark:bg-blue-950/40"
                    trend="up"
                />
                <StatCard
                    label="Unique visitors"
                    value={stats?.unique_visitors != null ? stats.unique_visitors.toLocaleString() : "—"}
                    icon={<Users className="h-4 w-4 text-violet-600 dark:text-violet-400" />}
                    colorClass="bg-violet-50 dark:bg-violet-950/40"
                />
                <StatCard
                    label={`Avg per ${avgLabel}`}
                    value={loading ? "—" : avgPerPoint.toLocaleString()}
                    icon={<CalendarDays className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />}
                    colorClass="bg-emerald-50 dark:bg-emerald-950/40"
                />
                <StatCard
                    label="Top page"
                    value={stats?.top_pages[0]?.visits.toLocaleString() ?? "—"}
                    icon={<LayoutGrid className="h-4 w-4 text-amber-600 dark:text-amber-400" />}
                    colorClass="bg-amber-50 dark:bg-amber-950/40"
                    sub={stats?.top_pages[0]?.path === "/" ? "Home" : stats?.top_pages[0]?.path}
                />
            </div>

            {/* ── Chart card ── */}
            <Card className="p-5 md:p-6 border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950">
                {/* Chart header row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                    <div className="flex items-center gap-4">
                        <h2 className="text-sm font-semibold text-foreground">
                            Visits over time
                        </h2>
                        {/* Legend */}
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1.5">
                                <span className="w-4 h-0.5 bg-primary inline-block rounded" />
                                Visits
                            </span>
                            <span className="flex items-center gap-1.5">
                                <span
                                    className="inline-block"
                                    style={{
                                        width: 16,
                                        height: 2,
                                        background: "repeating-linear-gradient(90deg, #10b981 0px, #10b981 4px, transparent 4px, transparent 7px)",
                                        borderRadius: 2,
                                    }}
                                />
                                Unique
                            </span>
                        </div>
                    </div>
                    {/* Period toggle */}
                    <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/60 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                        {(["daily", "weekly", "monthly"] as Period[]).map(p => (
                            <button
                                key={p}
                                onClick={() => setPeriod(p)}
                                className={cn(
                                    "px-3 py-1 rounded-md text-xs font-semibold capitalize transition-all duration-150",
                                    period === p
                                        ? "bg-white dark:bg-slate-900 text-foreground shadow-sm"
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                {p}
                            </button>
                        ))}
                    </div>
                </div>

                {loading ? (
                    <div className="h-64 flex items-center justify-center">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                ) : error ? (
                    <div className="h-64 flex flex-col items-center justify-center text-red-500 gap-2">
                        <p className="text-sm">{error}</p>
                        <Button size="sm" variant="outline" onClick={fetchStats}>Retry</Button>
                    </div>
                ) : chartData.length === 0 ? (
                    <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
                        No visits recorded in this period.
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height={260}>
                        <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
                            <defs>
                                <linearGradient id="visitsFill" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%"  stopColor="hsl(var(--primary))" stopOpacity={0.15} />
                                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="uniqueFill" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%"  stopColor="#10b981" stopOpacity={0.12} />
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid
                                strokeDasharray="3 3"
                                stroke="hsl(var(--border))"
                                vertical={false}
                            />
                            <XAxis
                                dataKey="label"
                                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                                tickLine={false}
                                axisLine={false}
                                interval="preserveStartEnd"
                            />
                            <YAxis
                                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                                tickLine={false}
                                axisLine={false}
                                allowDecimals={false}
                                tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v)}
                            />
                            <Tooltip content={<CustomTooltip />} cursor={{ stroke: "hsl(var(--border))", strokeWidth: 1 }} />
                            <Area
                                type="monotone"
                                dataKey="visits"
                                stroke="hsl(var(--primary))"
                                strokeWidth={2}
                                fill="url(#visitsFill)"
                                dot={false}
                                activeDot={{ r: 4, fill: "hsl(var(--primary))", strokeWidth: 2, stroke: "hsl(var(--background))" }}
                            />
                            <Area
                                type="monotone"
                                dataKey="unique"
                                stroke="#10b981"
                                strokeWidth={2}
                                fill="url(#uniqueFill)"
                                dot={false}
                                activeDot={{ r: 4, fill: "#10b981", strokeWidth: 2, stroke: "hsl(var(--background))" }}
                                strokeDasharray="4 3"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                )}
            </Card>

            {/* ── Top pages ── */}
            {stats && stats.top_pages.length > 0 && (
                <Card className="p-5 md:p-6 border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950">
                    <h2 className="text-sm font-semibold text-foreground mb-4">Top pages</h2>
                    <div className="space-y-3">
                        {stats.top_pages.map((page, i) => {
                            const pct = Math.round(
                                (page.visits / (stats.top_pages[0]?.visits || 1)) * 100
                            );
                            return (
                                <div key={page.path} className="flex items-center gap-3 group">
                                    <span className="text-xs text-muted-foreground w-4 text-right shrink-0 tabular-nums">
                                        {i + 1}
                                    </span>
                                    <div className="flex-1 min-w-0 space-y-1.5">
                                        <div className="flex items-center justify-between gap-4">
                                            <span className="text-sm font-mono text-foreground truncate">
                                                {/* Change this line: */}
                                                {page.path === "/" ? "Home" : page.path}
                                            </span>
                                            <span className="text-sm font-semibold text-foreground shrink-0 tabular-nums">
                                                {page.visits.toLocaleString()}
                                            </span>
                                        </div>
                                        <div className="h-1 rounded-full bg-slate-100 dark:bg-slate-800">
                                            <div
                                                className="h-1 rounded-full bg-primary transition-all duration-500"
                                                style={{ width: `${pct}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </Card>
            )}
        </div>
    );
                                }
