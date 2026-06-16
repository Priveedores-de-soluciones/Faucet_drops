"use client";

import React, { useState } from "react";
import {
  ChevronDown, ChevronUp, Zap, Shield, Trophy,
  Coins, Wifi, HelpCircle, ExternalLink, MessageCircle,
} from "lucide-react";

// ─── Design tokens (match app screenshot) ────────────────────────────────────
// bg:      #0d0f1a   card: #13172a   border: #1e2340
// primary: #2563eb   gold: #f59e0b
// text:    #ffffff   muted: #64748b  subtle: #94a3b8

// ── Types ─────────────────────────────────────────────────────────────────────
interface FAQItem { q: string; a: string }
interface FAQSection {
  icon: React.ReactNode;
  title: string;
  accentColor: string;
  items: FAQItem[];
}

// ── FAQ data (updated for DROPS / DropsIQ logic) ───────────────────────────────
const FAQ_SECTIONS: FAQSection[] = [
  {
    icon: <Zap className="h-4 w-4" />,
    title: "Getting Started",
    accentColor: "#f59e0b",
    items: [
      {
        q: "What is DropsIQ?",
        a: "DropsIQ is a 1v1 quiz dueling platform built by Faucetdrops on the Celo blockchain. You challenge another player on any topic, both stake DROPS, and the winner takes the full pot — settled automatically by smart contracts.",
      },
      {
        q: "What wallet do I need?",
        a: "DropsIQ works with any wallet that supports the Celo network — connect via your preferred wallet provider when you open the app."
      },
      {
        q: "How do I get DROPS to play?",
        a: "Every new wallet receives 100 free Game DROPS on registration — credited automatically, no action needed. You can also buy more DROPS with $G at a rate of 100 DROPS per $1 USD worth of $G.",
      },
      {
        q: "How do I create a challenge?",
        a: 'Tap "Create Challenge", enter a topic (e.g. "Solana & DeFi"), choose your stake amount (minimum 10 DROPS), set visibility to Public or Private, and hit Launch. AI generates 15 questions across Easy, Medium, and Hard rounds.',
      },
      {
        q: "How do I join a challenge?",
        a: "Browse the public hub to find open challenges, or paste a challenge code shared by a friend. Once you join the pre-lobby, negotiate the stake if you want, then stake your DROPS and click Ready to start.",
      },
    ],
  },
  {
    icon: <Coins className="h-4 w-4" />,
    title: "DROPS & Stakes",
    accentColor: "#22c55e",
    items: [
      {
        q: "What are Game DROPS vs Reward DROPS?",
        a: "Game DROPS come from your welcome bonus (100 free) or purchases with $G — they can only be used to stake in games. Reward DROPS are earned by winning games and can be redeemed for $G or auto-staked for APY.",
      },
      {
        q: "What is the minimum stake?",
        a: "The minimum stake is 10 DROPS per player. Before earning your Rematch Badge (10 games played), you cannot stake more than 10 DROPS per game.",
      },
      {
        q: "How do I buy DROPS with $G?",
        a: "You can buy Drops from the Challenge Tab in your Dashboard, 100 DROPS = $1 USD (live $G price). Equivalent amount got transfered to your Game Pouch. Purchased DROPS are play-only.",
      },
      {
        q: "How does pre-lobby stake negotiation work?",
        a: "When you enter a challenge's pre-lobby, you can accept the creator's opening stake or propose a different amount. The creator can counter privately, and you can counter back. Once both sides agree, the stake locks on-chain — no further changes.",
      },
      {
        q: "When do I receive my winnings?",
        a: "Winnings are transfer directly into your Reward Pouch as DROPS immediately after the game ends — no separate claim step required. From there you can redeem them for $G and let them auto-stake.",
      },
      {
        q: "What happens in a tie?",
        a: "If both players finish with equal scores, the smart contract calls declareTie() and each player's stake is transfer back into their Game Pouch in full. (which can't happen)", 
      },
    ],
  },
  {
    icon: <Trophy className="h-4 w-4" />,
    title: "Rematch Badge & Tiers",
    accentColor: "#f59e0b",
    items: [
      {
        q: "What is the Rematch Badge?",
        a: "After completing 10 games (wins, losses, and ties all count), you permanently earn the Rematch Badge. It removes the 10 DROPS stake cap, unlocks stake negotiation, lets you play the same opponent again, and unlocks Reward DROPS redemption.",
      },
      {
        q: "What are player tiers?",
        a: "Tiers are based on total games played: Droplet (0–50), Drizzle (51–150), Downpour (151–300), Torrent (301–500), Flood (501+). Your tier determines the APY you earn when Reward DROPS are auto-staked.",
      },
      {
        q: "What APY does each tier earn?",
        a: "Droplet: 15% | Drizzle: 20% | Downpour: 25% | Torrent: 30% | Flood: 35%. These are annual rates that accrue continuously, per second, from the moment you stake — there's no fixed cycle. APY is snapshotted at the moment each stake is created.",
      },
    ],
  },
  {
    icon: <Trophy className="h-4 w-4" />,
    title: "Weekly Rank Rewards",
    accentColor: "#22c55e",
    items: [
      {
        q: "What is the Weekly Rank Program?",
        a: "Every week, the top 3 ranked players — based on games played and wins from the Rank page — earn a reward they can claim from the Duel Faucet.",
      },
      {
        q: "How is my rank determined?",
        a: "Your rank is calculated live on the Rank page using your total games played and wins for the current weekly cycle.",
      },
      {
        q: "When can I claim my reward?",
        a: "The claim window opens at 11:00 PM Saturday (week 1) and stays open until 10:59 PM Saturday (week 2) — a full week. Tap the Claim button on the Rank page, which routes you to the Duel Faucet to claim or check your allocation.",
      },
      {
        q: "What happens if I don't claim in time?",
        a: "You have one full week to claim the previous week's reward. Ranks reset at 12:00 AM UTC+1 every Sunday — if you miss the claim window before the reset, that reward is forfeited.",
      },
    ],
  },
  {
    icon: <Coins className="h-4 w-4" />,
    title: "Redeem & Staking",
    accentColor: "#a78bfa",
    items: [
      {
        q: "How does redeeming Reward DROPS work?",
        a: "Redeem requires the Rematch Badge. Your DROPS are burned on-chain. 75% of the value is sent to you in $G in full. 25% is auto-staked at your tier APY for 30 days. A 10% service fee on the 75% leg is paid from the pool — not deducted from your share.",
      },
      {
        q: "What happens when I claim a matured stake?",
        a: "Two things happen at once: (1) The pool pays your APY earnings in $G directly to your wallet — earnings have been accruing every second since you staked, so the longer you wait past the 30-day lock, the more you receive. (2) The pool transfers your locked DROPS capital back to your Game Pouch.",
      },
      {
        q: "Can I have multiple stakes running at once?",
        a: "Yes. Each redeem creates a new independent stake entry with its own 30-day clock and APY snapshot. There is no cap on concurrent stakes.",
      },
      {
        q: "Does APY accrue in cycles or all at once?",
        a: "Neither — earnings accumulate continuously, second by second, based on your tier APY. The 30-day lock just determines when you're first able to claim. Claimable amount = principal × (1 + APY/365 × days elapsed), computed live whenever you check or claim.",
      },
      {
        q: "What is the $G price used for redemptions?",
        a: "The backend fetches the live $G/USD price from an external API immediately before each redeem and updates the contract. The rate is 100 DROPS = $1 USD, so the $G amount you receive fluctuates with $G's market price.",
      },
    ],
  },
  {
    icon: <Trophy className="h-4 w-4" />,
    title: "Gameplay",
    accentColor: "#60a5fa",
    items: [
      {
        q: "How are questions generated?",
        a: "Questions are generated by AI (Gemini 2.5 Flash, with Groq llama-3.3-70b as fallback) based on the topic you provide. Each game has 3 rounds — Easy, Medium, and Hard — with 5 questions each (15 total).",
      },
      {
        q: "How is scoring calculated?",
        a: "Correct answers earn 500 base points plus up to 500 speed bonus points. Formula: 500 + (500 × time_remaining / time_limit). Answering instantly earns 1,000 pts; wrong answers score 0.",
      },
      {
        q: "What are the time limits per round?",
        a: "Easy: 7 seconds per question. Medium: 10 seconds. Hard: 13 seconds.",
      },
      {
        q: "Can I rematch my opponent?",
        a: "Yes — once you have the Rematch Badge. After a game ends, tap Request Rematch. Your opponent has 30 seconds to accept. A new challenge is created with fresh AI questions on the same topic.",
      },
    ],
  },
  {
    icon: <Shield className="h-4 w-4" />,
    title: "Security & Contracts",
    accentColor: "#a78bfa",
    items: [
      {
        q: "Are my DROPS safe?",
        a: "DROPS are non-transferable — only the resolver wallet (operated by the platform) can mint them, and only you can burn them. Stakes in QuizHub cannot be withdrawn by the platform — only released to the verified winner or refunded on a tie.",
      },
      {
        q: "What if my opponent disconnects mid-game?",
        a: "Your opponent gets a 60-second reconnect window with a visible countdown broadcast to both players. If they don't return, you win by forfeit and receive the full 2× stake into your Reward Pouch.",
      },
      {
        q: "Who calls setWinner on-chain?",
        a: "A resolver wallet operated by the platform calls setWinner() or declareTie() after game logic confirms a result. This wallet can only designate outcomes — it cannot move funds, mint DROPS arbitrarily, or access player balances.",
      },
      {
        q: "How is the DropsRedeemPool funded?",
        a: "The pool holds $G deposited by the platform owner via depositG(). It pays out player redemptions and APY earnings. The pool must hold enough $G liquidity to cover all active stakes plus new redemptions.",
      },
    ],
  },
  {
    icon: <Wifi className="h-4 w-4" />,
    title: "Technical Issues",
    accentColor: "#f97316",
    items: [
      {
        q: "My burn transaction failed — what do I do?",
        a: 'If your DropsToken.redeem() was signed but the game didn\'t register it, tap "Sync my stake" on the lobby screen. This calls the contract\'s getQuiz() to check your burn status on-chain and syncs without a new transaction.',
      },
      {
        q: "I burned my DROPS but the game won't start.",
        a: "Both players must burn their stake AND click Ready. Check the lobby — if your status shows \"Stake verified\", just click Ready. If it still shows \"Awaiting stake\", tap the Sync button to re-check on-chain.",
      },
      {
        q: "My Reward DROPS balance looks wrong.",
        a: "Reward DROPS are credited immediately after game resolution on-chain. If there's a delay, refresh the balance from your profile page. If the issue persists after a few minutes, contact support with your game code.",
      },
      {
        q: "The lobby isn't updating / I can't see my opponent.",
        a: "Tap the refresh icon (↻) on the lobby screen to manually pull the latest state. The lobby syncs via WebSocket — if your connection dropped, reopening the challenge link will reconnect and replay the current game state.",
      },
    ],
  },
];

// ── FAQ Accordion ─────────────────────────────────────────────────────────────

function FAQAccordion({ items, accentColor }: { items: FAQItem[]; accentColor: string }) {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div
          key={i}
          className="rounded-2xl overflow-hidden transition-all duration-200"
          style={{
            background: open === i ? "#13172a" : "#13172a",
            border: open === i
              ? `1px solid ${accentColor}50`
              : "1px solid #1e2340",
          }}
        >
          <button
            onClick={() => setOpen(open === i ? null : i)}
            className="w-full flex items-start justify-between gap-3 px-4 py-3.5 text-left"
          >
            <span className="text-sm font-bold text-white leading-snug flex-1">{item.q}</span>
            <span className="shrink-0 mt-0.5" style={{ color: "#64748b" }}>
              {open === i
                ? <ChevronUp className="h-4 w-4" />
                : <ChevronDown className="h-4 w-4" />
              }
            </span>
          </button>
          {open === i && (
            <div className="px-4 pb-4">
              <p className="text-sm leading-relaxed" style={{ color: "#94a3b8" }}>{item.a}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function SupportPage() {
  return (
    <div className="min-h-screen" style={{ background: "#0d0f1a" }}>

      {/* Header */}
      <div
        className="sticky top-0 z-20 backdrop-blur-md"
        style={{ background: "#13172a", borderBottom: "1px solid #1e2340" }}
      >
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
          <button
            onClick={() => window.history.back()}
            className="flex items-center justify-center w-8 h-8 rounded-xl transition-colors active:scale-95 shrink-0"
            style={{ background: "#0d0f1a", border: "1px solid #1e2340", color: "#94a3b8" }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <HelpCircle className="h-5 w-5 shrink-0" style={{ color: "#2563eb" }} />
          <h1 className="font-black text-white text-base">Support &amp; FAQ</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 pb-24 space-y-10">

        {/* Hero */}
        <div className="text-center space-y-3 pt-2">
          <div className="text-5xl">🧠</div>
          <div>
            <h2 className="text-2xl font-black text-white">How can we help?</h2>
            <p className="text-sm mt-1 max-w-xs mx-auto" style={{ color: "#64748b" }}>
              Everything you need to know about DropsIQ — DROPS, challenges, staking, and troubleshooting.
            </p>
          </div>
        </div>

        {/* Quick-stat strip */}
        <div
          className="rounded-2xl p-5 space-y-3"
          style={{ background: "linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)", border: "1px solid #3b82f640" }}
        >
          <p className="text-xs font-bold uppercase tracking-wider text-blue-200">DropsIQ at a glance</p>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Welcome DROPS",  value: "100 Free" },
              { label: "Min Stake",      value: "10 DROPS" },
              { label: "Winner Gets",    value: "2× Stake" },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-xl p-3 text-center"
                style={{ background: "rgba(255,255,255,0.12)" }}
              >
                <div className="text-sm font-black text-white">{s.value}</div>
                <div className="text-[10px] text-blue-200 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ Sections */}
        {FAQ_SECTIONS.map((section) => (
          <section key={section.title} className="space-y-3">
            <div className="flex items-center gap-2">
              <span
                className="flex items-center justify-center w-7 h-7 rounded-xl"
                style={{
                  background: `${section.accentColor}15`,
                  border: `1px solid ${section.accentColor}30`,
                  color: section.accentColor,
                }}
              >
                {section.icon}
              </span>
              <h3 className="font-black text-white text-sm">{section.title}</h3>
            </div>
            <FAQAccordion items={section.items} accentColor={section.accentColor} />
          </section>
        ))}

        {/* Contract info */}
        <div
          className="rounded-3xl overflow-hidden"
          style={{ background: "#13172a", border: "1px solid #1e2340" }}
        >
          <div className="px-5 py-4" style={{ borderBottom: "1px solid #1e2340" }}>
            <h3 className="font-black text-sm text-white flex items-center gap-2">
              <Shield className="h-4 w-4" style={{ color: "#a78bfa" }} /> Smart Contracts (Celo)
            </h3>
          </div>
          <div className="px-5 py-4 space-y-4">
            {[
              {
                label: "QuizHub Contract",
                address: "0x9088298cd07BE0cAA1e256d3f3761313e1a1447E",
                note: "Holds no tokens — only records quiz state. Resolver can call setWinner, declareTie, confirmBurn. Players retain rights to their stakes.",
              },
              {
                label: "DropsToken Contract",
                address: "Contract address shown in app",
                note: "Non-transferable ERC-20. Only the resolver wallet can mint (claim). Any holder can burn (redeem). Total supply changes with game activity.",
              },
              {
                label: "DropsRedeemPool",
                address: "Contract address shown in app",
                note: "Holds $G liquidity for redemptions and continuously-accruing APY payouts. Owner can deposit/withdraw surplus $G. Resolver calls redeemForPlayer and releaseCapital, which transfers staked DROPS capital back to the player.",
              },
            ].map((c, i) => (
              <div
                key={i}
                className="rounded-xl p-4 space-y-2"
                style={{ background: "#0d0f1a", border: "1px solid #1e2340" }}
              >
                <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "#64748b" }}>{c.label}</p>
                <p className="font-mono text-xs text-white break-all">{c.address}</p>
                <p className="text-[11px] leading-relaxed" style={{ color: "#64748b" }}>{c.note}</p>
              </div>
            ))}

            <a
              href="https://celoscan.io/address/0x9088298cd07BE0cAA1e256d3f3761313e1a1447E"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs font-bold transition-opacity hover:opacity-70 w-fit"
              style={{ color: "#2563eb" }}
            >
              View QuizHub on Celoscan <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>

        {/* Contact */}
        <div
          className="rounded-3xl p-6 text-center space-y-4"
          style={{ background: "#13172a", border: "2px solid #2563eb30" }}
        >
          <div className="text-3xl">💬</div>
          <div>
            <h3 className="font-black text-white">Still need help?</h3>
            <p className="text-sm mt-1" style={{ color: "#64748b" }}>
              Reach us directly — we typically respond within a few hours.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <a
              href="https://t.me/faucetdropschat"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl font-black text-sm transition-all active:scale-[0.99]"
              style={{ background: "#2563eb", color: "#ffffff" }}
            >
              <MessageCircle className="h-4 w-4" /> Telegram Support
            </a>
            <a
              href="mailto:drops.faucet@gmail.com"
              className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl font-black text-sm transition-all active:scale-[0.99]"
              style={{ background: "#13172a", border: "2px solid #1e2340", color: "#ffffff" }}
            >
              ✉️ Email Us
            </a>
          </div>
        </div>

      </div>
    </div>
  );
}