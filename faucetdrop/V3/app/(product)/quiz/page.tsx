"use client";
import React, { useState } from "react";
import TableOfContents from "./toc";
import { QuizFaq } from "./components/faq";
import Image from "next/image";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

// ─── Design tokens (from app screenshot) ─────────────────────────────────────
// bg:       #0d0f1a   card: #13172a   border: #1e2340
// primary:  #2563eb   prize-gold: #f59e0b
// text:     #ffffff   muted: #64748b  subtle: #94a3b8

// ─── Section configs ──────────────────────────────────────────────────────────

const quizSections = [
  { id: "quiz-hero",          title: "Quizzes" },
  { id: "quiz-how-it-works",  title: "How Quizzes Work" },
  { id: "quiz-scoring",       title: "Scoring Mechanics" },
  { id: "quiz-reward-models", title: "Reward Distribution" },
  { id: "quiz-creation",      title: "Creation & Tools" },
  { id: "quiz-faq",           title: "FAQ" },
];

const challengeSections = [
  { id: "ch-hero",    title: "1v1 Challenge" },
  { id: "ch-flow",    title: "How It Works" },
  { id: "ch-drops",   title: "DROPS & Balances" },
  { id: "ch-badge",   title: "Rematch Badge" },
  { id: "ch-tiers",   title: "Tiers & APY" },
  { id: "ch-redeem",  title: "Redeem & Stake" },
  { id: "ch-rank",    title: "Weekly Rank Rewards" },
  { id: "ch-scoring", title: "Scoring" },
  { id: "ch-faq",     title: "FAQ" },
];

// ─── Shared primitives ────────────────────────────────────────────────────────

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xl font-black text-white border-l-4 border-[#2563eb] pl-4">
      {children}
    </h2>
  );
}

function StepList({ items }: { items: { title: string; desc: string }[] }) {
  return (
    <ol className="space-y-4">
      {items.map((item, i) => (
        <li key={i} className="flex gap-4">
          <div
            className="shrink-0 w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black text-white"
            style={{ background: "#2563eb" }}
          >
            {i + 1}
          </div>
          <div>
            <h3 className="font-bold text-white text-sm">{item.title}</h3>
            <p className="text-sm mt-0.5" style={{ color: "#94a3b8" }}>{item.desc}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl border p-5 ${className}`}
      style={{ background: "#13172a", borderColor: "#1e2340" }}
    >
      {children}
    </div>
  );
}

function Chip({
  label,
  variant = "blue",
}: {
  label: string;
  variant?: "blue" | "gold" | "green" | "purple" | "gray";
}) {
  const styles: Record<string, string> = {
    blue:   "bg-blue-500/15 text-blue-300 border-blue-500/30",
    gold:   "bg-amber-500/15 text-amber-300 border-amber-500/30",
    green:  "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    purple: "bg-violet-500/15 text-violet-300 border-violet-500/30",
    gray:   "bg-slate-500/15 text-slate-300 border-slate-500/30",
  };
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${styles[variant]}`}>
      {label}
    </span>
  );
}

// ─── Challenge FAQ ────────────────────────────────────────────────────────────

function ChallengeFaq() {
  const items = [
    {
      q: "How do I create a 1v1 Challenge?",
      a: "Go to the Challenge section and tap Create Challenge. Pick a topic, set your stake amount (minimum 10 DROPS), choose Public or Private, and confirm on-chain. Your opponent joins via code or the public lobby.",
    },
    {
      q: "What are DROPS and where do I get them?",
      a: "DROPS is FaucetDrops utility token — it can't be transferred, only claim from Drop point tab on the Homepage and use to stake in game. Every new player gets 100 free DROPS on registration. You can also buy DROPS with GoodDollar ($G) at 100 DROPS per $1 USD.",
    },
    {
      q: "What's the difference between Game DROPS and Reward DROPS?",
      a: "Game DROPS (welcome bonus + purchased) can only be used to stake in games. Reward DROPS (earned by winning ) can be redeemed for $G and auto-staked for APY. You need 10 games played to unlock redemption.",
    },
    {
      q: "What is the Rematch Badge?",
      a: "After 10 games completed, you earn the Rematch Badge. It removes the 10 DROPS stake cap, lets you negotiate any amount freely in the pre-lobby, and allows you to play the same opponent again.",
    },
    {
      q: "What happens if my opponent disconnects?",
      a: "Your opponent gets a 60-second reconnect window with a visible countdown. If they don't return, you automatically win by forfeit and receive the full stake payout into your Reward Pouch.",
    },
    {
      q: "How does the redeem split work?",
      a: "Redeeming 100 Reward DROPS: 75% of the value goes to you in $G in full — no deduction from your share. 25% is auto-staked for 30 days at your tier APY. A 10% service fee on the 75% leg is covered by the system.",
    },
    {
      q: "What do I get when I claim a matured stake?",
      a: "Two things: APY earnings in $G (paid to your wallet), and your staked capital returned as DROPS transfer back to your Game Pouch. So capital comes back as DROPS, profit comes in $G.",
    },
    {
      q: "Can I have multiple stakes running at once?",
      a: "Yes. Each redeem creates a separate stake entry with its own 30-day clock and APY rate locked at the time of that redeem. All run independently.",
    },
    {
      q: "How do weekly rank rewards work?",
      a: "Top 3 players on the Rank page (by games played and wins) can claim a reward each week. The claim window runs 11:00 PM Saturday to 10:59 PM Saturday the following week — tap Claim on the Rank page to go to the Duel Faucet. Ranks reset at 12:00 AM UTC+1 every Sunday, so claim before then or forfeit it.",
    },
  ];

  return (
    <Accordion type="single" collapsible className="w-full space-y-2" defaultValue="cfaq-0">
      {items.map((item, i) => (
        <AccordionItem
          key={i}
          value={`cfaq-${i}`}
          className="rounded-2xl border overflow-hidden"
          style={{ borderColor: "#1e2340", background: "#13172a" }}
        >
          <AccordionTrigger className="px-4 py-3.5 text-sm font-bold text-left text-white hover:no-underline">
            {item.q}
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4 text-sm leading-relaxed" style={{ color: "#94a3b8" }}>
            {item.a}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}

// ─── Challenge content ────────────────────────────────────────────────────────

function ChallengeContent() {
  return (
    <div className="space-y-14">

      {/* Hero */}
      <section id="ch-hero" className="space-y-6">
        {/* Banner matching app header style */}
        <div
          className="rounded-2xl p-6 space-y-3"
          style={{ background: "linear-gradient(135deg, #1d4ed8 0%, #2563eb 60%, #3b82f6 100%)" }}
        >
          <h1 className="text-3xl font-black text-white tracking-tight">
            STAKE <span style={{ color: "#f59e0b" }}>&amp;</span> EARN
          </h1>
          <p className="text-blue-100 text-sm">1v1 knowledge duels. Winner takes the pool — settled on-chain.</p>
          <div className="grid grid-cols-3 gap-3 pt-2">
            {[
              { label: "Rounds",      value: "3" },
              { label: "Min Stake",   value: "10 DROPS" },
              { label: "Winner Gets", value: "2× Stake" },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-xl p-3 text-center"
                style={{ background: "rgba(255,255,255,0.12)" }}
              >
                <div className="text-lg font-black text-white">{s.value}</div>
                <div className="text-[10px] text-blue-200 mt-0.5 uppercase tracking-wide">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={() => window.open("https://app.faucetdrops.io/challenge", "_blank")}
          className="w-full py-3 rounded-2xl font-black text-white text-sm transition-all active:scale-[0.98]"
          style={{ background: "#2563eb" }}
        >
          ⚔️ Start a Challenge
        </button>
      </section>

      {/* How it works */}
      <section id="ch-flow" className="space-y-5">
        <SectionHeading>How Challenges Work</SectionHeading>

        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "#64748b" }}>
            Setting up
          </p>
          <Card>
            <StepList items={[
              {
                title: "Create Duel",
                desc: "Set a topic, stake amount (min 10 DROPS), and public/private visibility. Anyone can join public game, while private sends notification to challenged player.",
              },
              {
                title: "Pre-lobby stake negotiation",
                desc: "Challengers submit stake offers. You see all offers and can counter privately. Once you accept one, the agreed stake locks — no more changes from either side.",
              },
              {
                title: "Stake Drops",
                desc: "Both players Stake agreed amount. The system verifies each stake on-chain.",
              },
              {
                title: "Ready up & play",
                desc: "Once both stakes are verified, Ready button become visible for player to be ready. The game starts automatically — 3 rounds of AI-generated questions, timed per question.",
              },
            ]} />
          </Card>
        </div>

        <div className="space-y-2 mt-2">
          <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "#64748b" }}>
            Game outcome
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            <Card>
              <p className="font-black text-sm mb-2" style={{ color: "#4ade80" }}>🏆 Winner</p>
              <p className="text-xs leading-relaxed" style={{ color: "#94a3b8" }}>
               Claim button become visible for winner to claim the DROPS pool.
              </p>
            </Card>
            <Card>
              <p className="font-black text-sm mb-2" style={{ color: "#60a5fa" }}>🤝 Tie</p>
              <p className="text-xs leading-relaxed" style={{ color: "#94a3b8" }}>
                Staked amount returned back to players as no winners
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* DROPS & Balances */}
      <section id="ch-drops" className="space-y-5">
        <SectionHeading>DROPS &amp; Balances</SectionHeading>

        <Card className="space-y-4">
          <p className="text-sm" style={{ color: "#94a3b8" }}>
            DROPS cannot be transferred — only claimed from Drop Point tab at Homepage or win from Game, and can only be used to Stake in Game. All movement is traceable on-chain.
          </p>

          <div className="grid gap-3 md:grid-cols-2">
            {[
              {
                emoji: "🎮",
                title: "Game DROPS",
                chip: <Chip label="Play only" variant="blue" />,
                desc: "From welcome bonus (100 free on signup) or purchased with $G. Used only to stake in games — cannot be redeemed or staked for APY.",
              },
              {
                emoji: "🏆",
                title: "Reward DROPS",
                chip: <Chip label="Redeemable" variant="green" />,
                desc: "Earned by winning or tying games. Can be redeemed for $G or auto-staked for APY. Requires completing 10 games to unlock.",
              },
            ].map((b) => (
              <div
                key={b.title}
                className="rounded-xl p-4 space-y-2"
                style={{ background: "#0d0f1a", border: "1px solid #1e2340" }}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xl">{b.emoji}</span>
                  <span className="font-bold text-sm text-white">{b.title}</span>
                  {b.chip}
                </div>
                <p className="text-xs leading-relaxed" style={{ color: "#64748b" }}>{b.desc}</p>
              </div>
            ))}
          </div>

          <div
            className="rounded-xl p-4 text-xs leading-relaxed"
            style={{ background: "#1d4ed820", border: "1px solid #2563eb40", color: "#93c5fd" }}
          >
            <strong>Buy DROPS with $G:</strong> You can buy Drops from the Challenge Tab in your Dashboard,{" "}
            <strong>100 DROPS = $1 USD</strong> (live $G price). Equivalent amount got transfered to your Game Pouch. Purchased DROPS are play-only.
          </div>
        </Card>
      </section>

      {/* Rematch Badge */}
      <section id="ch-badge" className="space-y-5">
        <SectionHeading>Rematch Badge</SectionHeading>

        <div
          className="rounded-2xl p-5 space-y-4 relative overflow-hidden"
          style={{ background: "#13172a", border: "1px solid #f59e0b40" }}
        >
          <div className="absolute top-3 right-4 text-5xl opacity-10">🏅</div>
          <div>
            <p className="font-black text-sm" style={{ color: "#f59e0b" }}>Unlocked after 10 games</p>
            <p className="text-xs mt-1" style={{ color: "#64748b" }}>
              Complete 10 games (wins, losses, or ties all count) to permanently unlock the badge.
            </p>
          </div>

          <div className="grid gap-2 md:grid-cols-2">
            {[
              { before: "Max 10 DROPS per game",    after: "Can stake any amount",             icon: "🔓" },
              { before: "No rematches",             after: "Rematch with opponent",         icon: "🔄" },
              { before: "Fixed opening stake",      after: "Negotiate freely in pre-lobby", icon: "💬" },
              { before: "Reward DROPS locked",      after: "Redeem reward for $G anytime",         icon: "💸" },
            ].map((row, i) => (
              <div
                key={i}
                className="flex gap-3 rounded-xl p-3"
                style={{ background: "#0d0f1a", border: "1px solid #1e2340" }}
              >
                <span className="text-lg shrink-0">{row.icon}</span>
                <div className="text-xs">
                  <p style={{ color: "#475569", textDecoration: "line-through" }}>{row.before}</p>
                  <p className="font-bold text-white mt-0.5">{row.after}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tiers */}
      <section id="ch-tiers" className="space-y-5">
        <SectionHeading>Player Tiers &amp; Stake APY</SectionHeading>
        <p className="text-sm" style={{ color: "#94a3b8" }}>
          Tier is set by total games played and determines your flat APY on staked Reward DROPS. APY is snapshotted at each redeem.
        </p>

        <Card className="overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid #1e2340" }}>
                <th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-wider" style={{ color: "#64748b" }}>Tier</th>
                <th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-wider" style={{ color: "#64748b" }}>Games</th>
                <th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-wider" style={{ color: "#64748b" }}>30-day APY</th>
              </tr>
            </thead>
            <tbody>
              {[
                { name: "Droplet",  emoji: "💧", range: "0 – 50",    apy: "15%", color: "#60a5fa" },
                { name: "Drizzle",  emoji: "🌧️",  range: "51 – 150",  apy: "20%", color: "#38bdf8" },
                { name: "Downpour", emoji: "⛈️",  range: "151 – 300", apy: "25%", color: "#a78bfa" },
                { name: "Torrent",  emoji: "🌊", range: "301 – 500", apy: "30%", color: "#818cf8" },
                { name: "Flood",    emoji: "🌀", range: "501+",      apy: "35%", color: "#f59e0b" },
              ].map((tier, i, arr) => (
                <tr
                  key={tier.name}
                  style={{ borderBottom: i < arr.length - 1 ? "1px solid #1e2340" : "none" }}
                >
                  <td className="py-3 px-4">
                    <span className="font-bold text-sm" style={{ color: tier.color }}>
                      {tier.emoji} {tier.name}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm" style={{ color: "#94a3b8" }}>{tier.range}</td>
                  <td className="py-3 px-4">
                    <span className="font-black text-sm" style={{ color: tier.color }}>{tier.apy}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </section>

      {/* Redeem & Stake */}
      <section id="ch-redeem" className="space-y-5">
        <SectionHeading>Redeem &amp; Stake</SectionHeading>

        <Card className="space-y-4">
          <p className="font-black text-sm text-white">Reward DROPS → $G</p>
          <p className="text-xs" style={{ color: "#64748b" }}>
            Requires Rematch Badge (10 games). DROPS are burned; $G is paid from the contract pool.
          </p>
          <div className="space-y-2">
            {[
              {
                pct: "75%",
                label: "You receive (in $G)",
                desc: "Full 75% of DROPS value at live $G/USD price. No deduction from your share.",
                chip: <Chip label="You receive" variant="green" />,
                accent: "#22c55e",
              },
              {
                pct: "10%",
                label: "Service fee",
                desc: "10% of the 75% leg — deducted from the pool, not your share. The system covers it.",
                chip: <Chip label="From pool" variant="gray" />,
                accent: "#64748b",
              },
              {
                pct: "25%",
                label: "Auto-staked (30 days)",
                desc: "Your remaining 25% DROPS will be transfered to the Pool, locked at your tier APY for 30 days.",
                chip: <Chip label="Staked" variant="purple" />,
                accent: "#a78bfa",
              },
            ].map((row) => (
              <div
                key={row.label}
                className="flex gap-3 rounded-xl p-3"
                style={{ background: "#0d0f1a", borderTop: "1px solid #1e2340", borderRight: "1px solid #1e2340", borderBottom: "1px solid #1e2340", borderLeft: `3px solid ${row.accent}` }}
              >
                <div
                  className="shrink-0 text-xs font-black w-9 h-9 rounded-lg flex items-center justify-center"
                  style={{ background: `${row.accent}20`, color: row.accent }}
                >
                  {row.pct}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <span className="font-bold text-xs text-white">{row.label}</span>
                    {row.chip}
                  </div>
                  <p className="text-xs" style={{ color: "#64748b" }}>{row.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div
            className="rounded-xl p-3 font-mono text-xs"
            style={{ background: "#0d0f1a", color: "#64748b" }}
          >
            Example — redeem 100 DROPS ($1 value):
            <br /><span style={{ color: "#22c55e" }}>→ You get: $0.75 in $G</span>
            {"  "}<span style={{ color: "#64748b" }}>Pool fee: $0.075</span>
            {"  "}<span style={{ color: "#a78bfa" }}>Staked: $0.25</span>
          </div>
        </Card>

         <Card className="space-y-4">
          <p className="font-black text-sm text-white">Claiming a stake</p>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-xl p-4 space-y-1" style={{ background: "#0d0f1a", border: "1px solid #a78bfa40" }}>
              <p className="font-bold text-xs" style={{ color: "#a78bfa" }}>APY earnings → $G</p>
              <p className="text-xs leading-relaxed" style={{ color: "#64748b" }}>
                Earnings accrue every second from the moment you stake, based on your tier APY. After the 30-day lock you can claim anytime — the longer you wait, the more accrues. Tap Claim and the pool sends your earned $G directly to your wallet.
              </p>
            </div>
            <div className="rounded-xl p-4 space-y-1" style={{ background: "#0d0f1a", border: "1px solid #2563eb40" }}>
              <p className="font-bold text-xs" style={{ color: "#60a5fa" }}>Capital → DROPS (Transfer back)</p>
              <p className="text-xs leading-relaxed" style={{ color: "#64748b" }}>
                At the same time the pool transfer its locked DROPS back to your Game Pouch. Your capital comes back as DROPS whenever you choose to claim — it sits safely in the pool until then.
              </p>
            </div>
          </div>
        </Card>
      </section>
      {/* Weekly Rank Rewards */}
      <section id="ch-rank" className="space-y-5">
        <SectionHeading>Weekly Rank Rewards</SectionHeading>

        <Card className="space-y-4">
          <p className="text-sm" style={{ color: "#94a3b8" }}>
            Every week, the top 3 players on the Rank page — ranked by games played and wins — can claim a reward from the Duel Faucet.
          </p>

          <div className="grid gap-3 md:grid-cols-3">
            {["🥇 1st", "🥈 2nd", "🥉 3rd"].map((label) => (
              <div
                key={label}
                className="rounded-xl p-4 text-center"
                style={{ background: "#0d0f1a", border: "1px solid #f59e0b40" }}
              >
                <div className="text-lg font-black" style={{ color: "#f59e0b" }}>{label}</div>
                <div className="text-[10px] uppercase tracking-wide mt-1" style={{ color: "#64748b" }}>
                  Duel Faucet Reward
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-xl p-4 space-y-2" style={{ background: "#1d4ed820", border: "1px solid #2563eb40" }}>
            <p className="text-xs font-bold" style={{ color: "#93c5fd" }}>Claim window</p>
            <p className="text-xs leading-relaxed" style={{ color: "#94a3b8" }}>
              Opens 11:00 PM Saturday (week 1) → closes 10:59 PM Saturday (week 2). Tap <strong>Claim</strong> on the Rank page to route to the Duel Faucet and claim or check your allocation.
            </p>
          </div>

          <div className="rounded-xl p-4 space-y-2" style={{ background: "#0d0f1a", border: "1px solid #1e2340" }}>
            <p className="text-xs font-bold" style={{ color: "#f59e0b" }}>Rank reset</p>
            <p className="text-xs leading-relaxed" style={{ color: "#64748b" }}>
              You have a full week to claim the previous week's reward before ranks reset at 12:00 AM UTC+1 every Sunday. Unclaimed rewards are forfeited after reset.
            </p>
          </div>
        </Card>
      </section>
      {/* Scoring */}
      <section id="ch-scoring" className="space-y-5">
        <SectionHeading>Scoring</SectionHeading>

        <Card className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {[
              { round: "Easy",   time: "7s",  label: "Round 1" },
              { round: "Medium", time: "10s", label: "Round 2" },
              { round: "Hard",   time: "13s", label: "Round 3" },
            ].map((r) => (
              <div
                key={r.round}
                className="rounded-xl p-3 text-center"
                style={{ background: "#0d0f1a", border: "1px solid #1e2340" }}
              >
                <div className="text-[10px] uppercase tracking-wide mb-1" style={{ color: "#64748b" }}>{r.label}</div>
                <div className="font-black text-sm text-white">{r.round}</div>
                <div className="text-xs mt-1 font-bold" style={{ color: "#f59e0b" }}>{r.time}</div>
              </div>
            ))}
          </div>

          <div className="rounded-xl p-4" style={{ background: "#1d4ed820", border: "1px solid #2563eb40" }}>
            <p className="text-xs font-bold mb-1" style={{ color: "#93c5fd" }}>Scoring formula</p>
            <p className="font-mono text-xs" style={{ color: "#93c5fd" }}>
              = 500 base + (500 × time_remaining / time_limit)
            </p>
            <p className="text-xs mt-2" style={{ color: "#64748b" }}>
              Correct + instant answer = 1,000 pts. Wrong answer = 0 pts. Highest total across all 3 rounds wins.
            </p>
          </div>
        </Card>
      </section>

      {/* FAQ */}
      <section id="ch-faq" className="space-y-4">
        <SectionHeading>FAQ</SectionHeading>
        <ChallengeFaq />
      </section>

      {/* CTA */}
      <section
        className="rounded-2xl p-8 text-center space-y-4"
        style={{ background: "linear-gradient(135deg, #1d3a8a 0%, #1d4ed8 100%)", border: "1px solid #2563eb60" }}
      >
        <h2 className="text-2xl font-black text-white">Ready to challenge someone?</h2>
        <p className="text-sm" style={{ color: "#bfdbfe" }}>
          Stake DROPS, prove your knowledge, and earn on every game — settled entirely on-chain.
        </p>
        <button
          onClick={() => window.open("https://app.faucetdrops.io/challenge/create", "_blank")}
          className="px-8 py-3 rounded-2xl font-black text-sm transition-all active:scale-[0.98]"
          style={{ background: "#f59e0b", color: "#0d0f1a" }}
        >
          Duel Now
        </button>
      </section>
    </div>
  );
}

// ─── Quiz content (original, id-prefixed) ────────────────────────────────────

function QuizContent() {
  return (
    <div className="space-y-12">
      <section className="space-y-6" id="quiz-hero">
        <div className="flex flex-col gap-6">
          <h1 className="text-4xl font-black tracking-tight bg-linear-to-r from-blue-400 to-[#2563eb] bg-clip-text text-transparent">
            Quiz
          </h1>
          <p className="text-xl font-bold text-white">Compete, Learn, and Earn onchain.</p>
          <p className="text-sm" style={{ color: "#94a3b8" }}>
            Join live competitive quizzes where your Web3 knowledge translates directly into rewards. Powered by high-speed WebSockets for an instant gaming experience.
          </p>
          <div className="relative rounded-2xl overflow-hidden" style={{ border: "1px solid #1e2340" }}>
            <Image src="/quizshot.png" alt="Quiz Platform Interface" width={1000} height={1000} className="w-full h-auto" />
          </div>
          <button
            onClick={() => window.open("https://app.faucetdrops.io/quiz", "_blank")}
            className="px-6 py-3 rounded-2xl font-black text-sm text-white transition-all active:scale-[0.98] w-fit"
            style={{ background: "#2563eb" }}
          >
            Explore Live Quizzes
          </button>
        </div>
      </section>

      <section className="space-y-5" id="quiz-how-it-works">
        <SectionHeading>How Quizzes Work</SectionHeading>
        <Card>
          <StepList items={[
            { title: "Enter the Lobby",   desc: "Find a 'Waiting' quiz. Connect your wallet and set your username to join the participants list." },
            { title: "The 'Ready' Check", desc: "Confirm you are ready. Once all participants are ready, the host can trigger the start sequence." },
            { title: "Answer Real-Time",  desc: "Questions appear for all players simultaneously. You have a limited window to choose the correct answer." },
            { title: "Live Leaderboard",  desc: "After every question, see your rank change in real-time. Points are awarded based on accuracy and speed." },
          ]} />
        </Card>
      </section>

      <section className="space-y-5" id="quiz-scoring">
        <SectionHeading>Scoring Mechanics</SectionHeading>
        <Card className="space-y-4">
          <p className="text-sm" style={{ color: "#94a3b8" }}>To top the leaderboard, you need more than just the right answer — you need speed.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="rounded-xl p-4" style={{ background: "#0d0f1a", border: "1px solid #1e2340" }}>
              <h4 className="font-bold text-sm mb-1" style={{ color: "#60a5fa" }}>Base Points</h4>
              <p className="text-xs" style={{ color: "#64748b" }}>Correct answers grant a fixed 1,000 points.</p>
            </div>
            <div className="rounded-xl p-4" style={{ background: "#0d0f1a", border: "1px solid #1e2340" }}>
              <h4 className="font-bold text-sm mb-1" style={{ color: "#60a5fa" }}>Speed Bonus</h4>
              <p className="text-xs" style={{ color: "#64748b" }}>Up to 1,000 additional points based on remaining time.</p>
            </div>
          </div>
          <div className="rounded-xl p-4" style={{ background: "#1d4ed820", border: "1px solid #2563eb40" }}>
            <p className="text-xs font-mono" style={{ color: "#93c5fd" }}>
              <strong>Formula:</strong> 1000 + (1000 × time_remaining / total_time)
            </p>
          </div>
        </Card>
      </section>

      <section className="space-y-5" id="quiz-reward-models">
        <SectionHeading>Reward Distribution</SectionHeading>
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { title: "Equal",        desc: "The pool is divided exactly between the top X winners." },
            { title: "Quadratic",    desc: "Rewards scale based on the square root of points earned." },
            { title: "Custom Tiers", desc: "Fixed amounts for specific ranks (e.g. 1st: 50%, 2nd: 30%)." },
          ].map((m) => (
            <Card key={m.title}>
              <h3 className="font-black text-sm text-white mb-2">{m.title}</h3>
              <p className="text-xs" style={{ color: "#64748b" }}>{m.desc}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-5" id="quiz-creation">
        <SectionHeading>Creation &amp; Tools</SectionHeading>
        <div className="grid gap-4 md:grid-cols-2">
          {[
            { emoji: "🤖", title: "AI Generation",   desc: "Input a topic and difficulty — AI builds a full quiz with 4 options and verified answers automatically." },
            { emoji: "📄", title: "PDF-to-Quiz",     desc: "Upload a whitepaper or document. The system extracts key facts to create a study-based competition." },
            { emoji: "✍️", title: "Manual Creation", desc: "Craft custom questions, define exact answers, and tweak time limits to your community's needs." },
            { emoji: "💬", title: "Live Lobby Chat", desc: "Real-time chat lets hosts and players interact before the countdown begins." },
          ].map((c) => (
            <Card key={c.title}>
              <span className="text-2xl mb-3 block">{c.emoji}</span>
              <h3 className="font-black text-sm text-white mb-1">{c.title}</h3>
              <p className="text-xs" style={{ color: "#64748b" }}>{c.desc}</p>
            </Card>
          ))}
        </div>
      </section>

      <section id="quiz-faq" className="space-y-4">
        <SectionHeading>FAQ</SectionHeading>
        <QuizFaq />
      </section>

      <section
        className="rounded-2xl p-8 text-center space-y-4"
        style={{ background: "linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 100%)", border: "1px solid #2563eb60" }}
      >
        <h2 className="text-2xl font-black text-white">Host Your Own Quiz</h2>
        <p className="text-sm" style={{ color: "#bfdbfe" }}>
          Engage your community with a live event. Create a quiz in minutes.
        </p>
        <button
          onClick={() => window.open("https://app.faucetdrops.io/quiz/create", "_blank")}
          className="px-8 py-3 rounded-2xl font-black text-sm transition-all active:scale-[0.98]"
          style={{ background: "#f59e0b", color: "#0d0f1a" }}
        >
          Create a Quiz
        </button>
      </section>
    </div>
  );
}

// ─── Root page ────────────────────────────────────────────────────────────────

type Tab = "quiz" | "challenge";

export default function QuizDocsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("quiz");
  const sections = activeTab === "quiz" ? quizSections : challengeSections;

  return (
    <div
      className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12"
      style={{ color: "white" }}
    >
      <div className="mt-20 space-y-8">

        {/* Tab bar */}
        <div
          className="flex gap-1 p-1 rounded-2xl w-fit"
          style={{ background: "#13172a", border: "1px solid #1e2340" }}
        >
          {(["quiz", "challenge"] as Tab[]).map((tab) => {
            const active = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="px-5 py-2 rounded-xl text-sm font-black transition-all duration-150"
                style={
                  active
                    ? { background: "#2563eb", color: "#ffffff" }
                    : { color: "#64748b" }
                }
              >
                {tab === "quiz" ? "📋 Quiz" : "⚔️ 1v1 Challenge"}
              </button>
            );
          })}
        </div>

        {/* Content + sidebar */}
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1fr_280px]">
          <main>
            {activeTab === "quiz" ? <QuizContent /> : <ChallengeContent />}
          </main>
          <aside className="hidden lg:block">
            <div className="sticky top-24">
              <TableOfContents sections={sections} />
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}