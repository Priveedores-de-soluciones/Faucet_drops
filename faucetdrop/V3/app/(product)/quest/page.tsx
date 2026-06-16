"use client";
import React, { useState } from "react";
import TableOfContents from "./toc";
import { Faq } from "./components/Faq";
import Image from "next/image";

// ── Section definitions per audience ──────────────────────────────────────────

const earnerSections = [
  { id: "hero", title: "Quests" },
  { id: "hqw", title: "How Quests Work" },
  { id: "stages", title: "Quest Stages" },
  { id: "types", title: "Types of Tasks" },
  { id: "distribution-model", title: "Reward Distribution" },
  { id: "timing", title: "Campaign Timing" },
  { id: "rules", title: "Rules & Eligibility" },
  { id: "faq", title: "FAQ" },
];

const creatorSections = [
  { id: "creator-hero", title: "Create a Quest" },
  { id: "creator-tiers", title: "Access Tiers" },
  { id: "creator-lifecycle", title: "Campaign Lifecycle" },
  { id: "creator-funding", title: "Funding Requirement" },
  { id: "creator-tasks", title: "Task Configuration" },
  { id: "creator-distribution", title: "Distribution Model" },
  { id: "creator-mustknow", title: "Must-Know Details" },
  { id: "faq", title: "FAQ" },
];

// ── Role Toggle ───────────────────────────────────────────────────────────────

function RoleToggle({
  role,
  onChange,
}: {
  role: "earner" | "creator";
  onChange: (r: "earner" | "creator") => void;
}) {
  return (
    <div className="flex items-center gap-1 bg-gray-800 border border-gray-700 rounded-xl p-1 w-fit">
      {(
        [
          { id: "creator", label: "🛠  I want to create", sub: "Launch quest campaigns" },
          { id: "earner", label: "🎯  I want to earn", sub: "Complete quests & claim rewards" },
        ] as const
      ).map((opt) => (
        <button
          key={opt.id}
          onClick={() => onChange(opt.id)}
          className={`px-5 py-3 rounded-lg text-left transition-all ${
            role === opt.id
              ? "bg-blue-600 text-white shadow-lg shadow-blue-900/40"
              : "text-gray-400 hover:text-white"
          }`}
        >
          <div className="font-semibold text-sm whitespace-nowrap">{opt.label}</div>
          <div className={`text-xs mt-0.5 ${role === opt.id ? "text-blue-200" : "text-gray-500"}`}>
            {opt.sub}
          </div>
        </button>
      ))}
    </div>
  );
}

// ── Earner View ───────────────────────────────────────────────────────────────

function EarnerContent() {
  return (
    <div className="space-y-16">
      {/* Hero */}
      <section id="hero" className="space-y-6">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl bg-linear-to-r from-blue-400 to-[#0052FF] bg-clip-text text-transparent">
          Get Rewarded for Web3 Engagement.
        </h1>
        <p className="text-xl text-gray-300 max-w-2xl">
          Complete tasks, climb stages, and claim Onchain rewards seamlessly. Thousands of community members earn daily through quests. 
        </p>
        <div className="relative rounded-xl border border-gray-700 overflow-hidden">
          <Image
            src="/quest.png"
            alt="Quest Platform"
            width={1000}
            height={1000}
            className="w-full h-auto rounded-xl"
          />
        </div>
        <button
          onClick={() =>
            window.open("https://app.faucetdrops.io/quest", "_blank", "noopener noreferrer")
          }
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
        >
          Browse Campaign
        </button>
      </section>

      {/* How Quests Work */}
      <section id="hqw" className="space-y-6">
        <h2 className="text-2xl font-bold text-white border-l-4 border-blue-500 pl-4">
          How Quests Work
        </h2>
        <ol className="space-y-6">
          {[
            {
              title: "Discover a Quest",
              desc: "Browse live campaigns from Web3 projects. Each quest shows its reward pool, token, and what stages are available before you commit.",
            },
            {
              title: "Complete Tasks Stage by Stage",
              desc: "Progress through Beginner → Intermediate → Advance → Legend → Ultimate. Hit 70% of a stage's points to unlock the next one.",
            },
            {
              title: "Accumulate Points",
              desc: "Every verified task adds to your total. Points determine your share of the reward pool — the more you complete, the bigger your payout.",
            },
            {
              title: "Claim Your Rewards",
              desc: "After the quest ends a claim window opens (default 7 days). Claim your tokens onchain through FaucetDrops faucets — no gas needed.",
            },
          ].map((item, i) => (
            <li key={i} className="flex gap-4">
              <div className="shrink-0 w-8 h-8 rounded-full bg-blue-900 flex items-center justify-center text-blue-300 font-bold">
                {i + 1}
              </div>
              <div>
                <h3 className="font-medium text-white">{item.title}</h3>
                <p className="text-gray-300">{item.desc}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Quest Stages */}
      <section id="stages" className="space-y-6">
        <h2 className="text-2xl font-bold text-white border-l-4 border-blue-500 pl-4">
          Quest Stages
        </h2>
        <p className="text-gray-300">
          Each quest has up to five stages of increasing difficulty. You need to score 70% of a
          stage&apos;s available points before the next one unlocks. When Strict Progression Mode
          is on, you must complete them in order.
        </p>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[
            { emoji: "🌱", title: "Beginner", desc: "Follow accounts, visit pages, join communities. Entry-level actions designed to get you started." },
            { emoji: "⚡", title: "Intermediate", desc: "Deeper engagement: content creation, referrals, daily check-ins." },
            { emoji: "🔥", title: "Advance", desc: "Active participation through trading tasks and creative submissions." },
            { emoji: "💎", title: "Legend", desc: "High-effort tasks with significant point rewards for serious participants." },
            { emoji: "👑", title: "Ultimate", desc: "Top-tier challenges reserved for the most dedicated earners." },
          ].map((s, i) => (
            <div key={i} className="bg-gray-800/50 rounded-xl border border-gray-700 hover:border-blue-500/50 transition-colors p-6">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">{s.emoji}</span>
                <h3 className="text-lg font-semibold text-white">{s.title}</h3>
              </div>
              <p className="text-gray-400 text-sm">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Types of Tasks */}
      <section id="types" className="space-y-6">
        <h2 className="text-2xl font-bold text-white border-l-4 border-blue-500 pl-4">
          Types of Tasks
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            {
              title: "Social Tasks",
              icon: "📣",
              desc: "Follow accounts, join Discord/Telegram channels, share posts on X, and other social media actions.",
            },
            {
              title: "Creative Tasks",
              icon: "🎨",
              desc: "Submit original content, create project-themed art, or complete custom tasks defined by the campaign creator.",
            },
            {
              title: "Trading Tasks",
              icon: "📊",
              desc: "Project-specific DeFi interactions: swaps, liquidity provision, and other onchain trading activities.",
            },
          ].map((c, i) => (
            <div key={i} className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
              <div className="text-3xl mb-3">{c.icon}</div>
              <h4 className="text-lg font-semibold text-white mb-2">{c.title}</h4>
              <p className="text-gray-400 text-sm">{c.desc}</p>
            </div>
          ))}
        </div>

        <h3 className="text-lg font-semibold text-white pt-2">How tasks are verified</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            { title: "Manual Link Submission", desc: "You submit a URL or proof link. A reviewer confirms it meets the task criteria." },
            { title: "Automated Verification", desc: "Verified instantly via the FaucetDrops bot engine — no manual review needed." },
            { title: "Onchain Verification", desc: "Your wallet activity is checked directly on-chain to confirm task completion." },
          ].map((v, i) => (
            <div key={i} className="bg-gray-800/50 rounded-xl p-5 border border-gray-700">
              <h4 className="text-white font-medium mb-2">{v.title}</h4>
              <p className="text-gray-400 text-sm">{v.desc}</p>
            </div>
          ))}
        </div>
        <p className="text-gray-400 text-sm">
          Points are only awarded after successful verification. Each task&apos;s method is set by
          the quest creator and visible before you start.
        </p>
      </section>

      {/* Reward Distribution */}
      <section id="distribution-model" className="space-y-6">
        <h2 className="text-2xl font-bold text-white border-l-4 border-blue-500 pl-4">
          Reward Distribution
        </h2>
        <p className="text-gray-300">
          The distribution model is fixed at campaign creation and shown on every quest page before
          you participate. Two models exist:
        </p>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-3">Equal Split</h3>
            <p className="text-gray-400 text-sm mb-4">
              All winners receive an identical share. The creator sets the number of winner slots.
            </p>
            <div className="bg-gray-900/60 p-3 rounded-lg font-mono text-sm text-blue-300">
              Your share = Total Pool ÷ Number of Winners
            </div>
          </div>
          <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-3">Custom Tier</h3>
            <p className="text-gray-400 text-sm">
              Fixed reward amounts per rank. Top earners get more. Tier amounts are set by the
              creator at launch and shown on the quest page.
            </p>
          </div>
        </div>
        <p className="text-gray-400 text-sm">
          ⚠️ All reward pools include a 1% platform fee collected at deposit. Amounts shown on quest
          pages are after the fee is deducted.
        </p>
      </section>

      {/* Campaign Timing */}
      <section id="timing" className="space-y-6">
        <h2 className="text-2xl font-bold text-white border-l-4 border-blue-500 pl-4">
          Campaign Timing
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            {
              label: "Active Period",
              color: "border-blue-500/40",
              desc: "The window between campaign start and end. Tasks can only be completed during this period.",
            },
            {
              label: "Claim Window",
              color: "border-green-500/40",
              desc: "After the campaign ends, verified winners have 7 days (default) to claim their rewards. Each quest shows its specific window.",
            },
            {
              label: "Gasless Payout",
              color: "border-purple-500/40",
              desc: "Rewards are claimed through a FaucetDrops faucet — you don't pay gas to receive your tokens.",
            },
          ].map((t, i) => (
            <div key={i} className={`bg-gray-800/50 rounded-xl p-5 border ${t.color}`}>
              <h4 className="font-semibold text-white mb-2">{t.label}</h4>
              <p className="text-gray-400 text-sm">{t.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Rules */}
      <section id="rules" className="space-y-6">
        <h2 className="text-2xl font-bold text-white border-l-4 border-blue-500 pl-4">
          Rules & Eligibility
        </h2>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">To participate</h3>
            <ul className="space-y-3 text-sm text-gray-300">
              <li className="flex gap-2"><span className="text-blue-400">•</span>Complete KYC if required by the campaign</li>
              <li className="flex gap-2"><span className="text-blue-400">•</span>Comply with all applicable regulations in your jurisdiction</li>
            </ul>
          </div>
          <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">Fair play</h3>
            <ul className="space-y-3 text-sm text-gray-300">
              <li className="flex gap-2"><span className="text-blue-400">•</span>One account per participant — duplicates will be disqualified</li>
              <li className="flex gap-2"><span className="text-blue-400">•</span>No bots, scripts, or automated participation</li>
              <li className="flex gap-2"><span className="text-blue-400">•</span>Manipulation of tasks or points is prohibited</li>
              <li className="flex gap-2"><span className="text-blue-400">•</span>All rewards are subject to final verification before distribution</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}

// ── Creator View ──────────────────────────────────────────────────────────────

function CreatorContent() {
  return (
    <div className="space-y-16">
      {/* Hero */}
      <section id="creator-hero" className="space-y-6">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl bg-linear-to-r from-blue-400 to-[#0052FF] bg-clip-text text-transparent">
          A Growth engine for your Community
        </h1>
        <p className="text-xl text-gray-300 max-w-2xl">
          Create campaigns that attract users, encourage participation, and help your ecosystem grow.
          
        </p>
        <button
          onClick={() =>
            window.open("https://app.faucetdrops.io/create/quest", "_blank", "noopener noreferrer")
          }
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
        >
          Create Campaign
        </button>
      </section>

      {/* Access Tiers */}
      <section id="creator-tiers" className="space-y-6">
        <h2 className="text-2xl font-bold text-white border-l-4 border-blue-500 pl-4">
          Access Tiers
        </h2>
        <p className="text-gray-300">
          Choose between a free demo mode to test the platform or a subscriber plan to go live
          publicly.
        </p>

        <div className="rounded-xl border border-amber-700/40 bg-amber-900/10 p-4">
          <p className="text-amber-300 text-sm">
            <span className="font-semibold">Profile setup is required before subscribing.</span>{" "}
            You need a username and at least one linked social handle (X, Discord, Telegram, or
            Farcaster) before payment is accepted.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="bg-gray-800/50 rounded-xl p-6 border border-blue-700/50 relative overflow-hidden">
            <div className="absolute top-4 right-4">
              <span className="text-xs font-medium px-3 py-1 rounded-full bg-blue-900/60 text-blue-300 border border-blue-700/50">
                $100 USDT / 30 days
              </span>
            </div>
            <h3 className="text-lg font-semibold text-white mb-4">Subscriber</h3>
            <ul className="space-y-2 text-sm">
              {[
                "Unlimited live quest campaigns",
                "All task types — social, onchain, manual, and custom",
                "Auto-verify engine for Twitter, Discord, and Telegram",
                "Onchain reward contract deployed per quest",
                "Full admin dashboard with submission review",
                "Multi-stage quest progression system",
                "Automatic reward distribution via smart contract",
                "Quest listed publicly in the quest browser",
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-gray-300">
                  <span className="text-blue-400 mt-0.5 shrink-0">✓</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Demo Mode</h3>
              <span className="text-xs font-medium px-3 py-1 rounded-full bg-amber-900/40 text-amber-300 border border-amber-700/40">
                Free
              </span>
            </div>
            <ul className="space-y-2 text-sm">
              {[
                { text: "5 participants max — internal testing only", warn: true },
                { text: "Auto-verify tasks only (social and instant reward)", warn: false },
                { text: "Manual, onchain, and custom task types locked", warn: true },
                { text: "Not visible in the public quest browser", warn: false },
                { text: "No onchain contract deployment", warn: false },
                { text: "Ideal for testing the flow with your team before launch", warn: false },
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-gray-300">
                  <span className={`mt-0.5 shrink-0 ${item.warn ? "text-amber-400" : "text-gray-500"}`}>•</span>
                  {item.text}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Campaign Lifecycle */}
      <section id="creator-lifecycle" className="space-y-6">
        <h2 className="text-2xl font-bold text-white border-l-4 border-blue-500 pl-4">
          Campaign Lifecycle
        </h2>
        <p className="text-gray-300">
          From setup to automatic payout — here&apos;s the full journey for a quest creator.
        </p>
        <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
          <ol className="space-y-0">
            {[
              {
                color: "bg-blue-900 text-blue-300",
                title: "Subscribe or use demo",
                desc: "Pay $100 USDT on any supported chain for 30 days of full access. Or create a demo quest to test with up to 5 participants — no payment required.",
              },
              {
                color: "bg-blue-900 text-blue-300",
                title: "Complete your profile",
                desc: "A username and at least one linked social handle are required before you can subscribe. Set these up in your dashboard.",
              },
              {
                color: "bg-blue-900 text-blue-300",
                title: "Configure quest details",
                desc: "Set the title (must be unique platform-wide), reward token, distribution model, and winner count. Save as draft to return and edit later.",
              },
              {
                color: "bg-blue-900 text-blue-300",
                title: "Build stages and tasks",
                desc: "Add tasks across Beginner through Ultimate stages. Each stage requires 70% of its points to unlock the next. At least one custom task is required to publish. System tasks (daily check-in, referral, X share) are injected automatically.",
              },
              {
                color: "bg-amber-900/60 text-amber-300",
                title: "Set campaign timing",
                desc: "Define start and end date/time. A claim window (default 7 days) opens automatically after the end. Use quick-pick presets for common durations.",
              },
              {
                color: "bg-red-900/50 text-red-300",
                title: "Fund the reward pool",
                desc: "Deposit the full pool plus the 1% platform fee before the campaign end time. Late funding means no rewards are distributed even if participants complete tasks.",
              },
              {
                color: "bg-green-900/50 text-green-300",
                title: "Rewards distribute automatically",
                desc: "Verified winners claim gaslessly through FaucetDrops faucets after the claim window opens. No manual payout needed from you.",
              },
            ].map((step, i) => (
              <li key={i} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${step.color}`}>
                    {i + 1}
                  </div>
                  {i < 6 && <div className="w-px flex-1 bg-gray-700 my-1" style={{ minHeight: "20px" }} />}
                </div>
                <div className="pb-6">
                  <h4 className="font-medium text-white mb-1">{step.title}</h4>
                  <p className="text-gray-400 text-sm leading-relaxed">{step.desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Funding Requirement */}
      <section id="creator-funding" className="space-y-6">
        <h2 className="text-2xl font-bold text-white border-l-4 border-blue-500 pl-4">
          Funding Requirement
        </h2>
        <div className="rounded-xl border border-red-700/40 bg-red-900/20 p-5">
          <p className="text-red-300 font-medium mb-1">
            You must fund the reward pool before the campaign ends.
          </p>
          <p className="text-gray-400 text-sm">
            Unfunded quests cannot distribute rewards. Participants who complete all tasks will
            receive nothing if the pool hasn&apos;t been deposited in time.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { label: "Platform fee", value: "1%", sub: "Added on top of reward pool at deposit" },
            { label: "Funding deadline", value: "Before end", sub: "Must complete before campaign end time" },
            { label: "Claim window", value: "7 days", sub: "Default window after the campaign ends" },
          ].map((stat, i) => (
            <div key={i} className="bg-gray-800/50 rounded-xl p-5 border border-gray-700">
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">{stat.label}</p>
              <p className="text-2xl font-bold text-white mb-1">{stat.value}</p>
              <p className="text-xs text-gray-400">{stat.sub}</p>
            </div>
          ))}
        </div>
        <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700 space-y-3">
          {[
            "Deposit the full pool plus the 1% platform fee into the quest contract before the end date.",
            "Rewards are held in the deployed smart contract — FaucetDrops does not custody your funds.",
            "Participants can see the funding status on the quest page in real time.",
            "⚠️ If the pool is not funded within 3 days of launch, an 'Unfunded' warning banner will appear on the quest detail page for all participants to see.",
            "If the pool remains unfunded by the end time, the claim window still opens but no rewards will be distributed."
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-3">
              <span className="text-red-400 mt-0.5 shrink-0">•</span>
              <span className="text-gray-300 text-sm">{item}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Task Configuration */}
      <section id="creator-tasks" className="space-y-6">
        <h2 className="text-2xl font-bold text-white border-l-4 border-blue-500 pl-4">
          Task Configuration
        </h2>
        <div className="grid gap-5 md:grid-cols-3">
          {[
            { title: "Social Tasks", icon: "📣", desc: "Twitter follows/likes/retweets, Discord membership, Telegram joins. Auto-verify supported for most platforms." },
            { title: "Creative Tasks", icon: "🎨", desc: "Custom tasks that require participants to submit link + image proof. Verified manually by you as the creator." },
            { title: "Trading Tasks", icon: "📊", desc: "DeFi-specific tasks verified onchain — swaps, LP provision, contract interactions." },
          ].map((c, i) => (
            <div key={i} className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
              <div className="text-3xl mb-3">{c.icon}</div>
              <h4 className="text-lg font-semibold text-white mb-2">{c.title}</h4>
              <p className="text-gray-400 text-sm">{c.desc}</p>
            </div>
          ))}
        </div>
        <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700 space-y-4">
          <h3 className="text-white font-semibold">Bot setup for auto-verification</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-blue-300 text-sm font-medium mb-1">Discord</p>
              <p className="text-gray-400 text-sm">Invite the FaucetDrops bot to your server and provide the Server ID in the task form. Use the in-form bot checker to confirm it&apos;s detected before saving.</p>
            </div>
            <div>
              <p className="text-blue-300 text-sm font-medium mb-1">Telegram</p>
              <p className="text-gray-400 text-sm">Add the FaucetDrops bot as an administrator of your group or channel. Use the status checker in the task form to verify admin status before adding the task.</p>
            </div>
          </div>
        </div>
        <p className="text-gray-400 text-sm">
          System tasks (daily check-in, referral, X share) are injected into every quest
          automatically in the Beginner stage and cannot be removed.
        </p>
      </section>

      {/* Distribution Model */}
      <section id="creator-distribution" className="space-y-6">
        <h2 className="text-2xl font-bold text-white border-l-4 border-blue-500 pl-4">
          Distribution Model
        </h2>
        <p className="text-gray-300">
          Set how rewards are split at campaign creation. This cannot be changed after publishing.
        </p>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-3">Equal</h3>
            <p className="text-gray-400 text-sm mb-4">
              Every winner receives an equal share. You set the number of winner slots. Best for
              campaigns focused on broad participation.
            </p>
            <div className="bg-gray-900/60 p-3 rounded-lg font-mono text-sm text-blue-300">
              Each winner = Total Pool ÷ Number of Winners
            </div>
          </div>
          <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-3">Custom Tier</h3>
            <p className="text-gray-400 text-sm">
              Set fixed reward amounts per rank. Top-ranked participants earn more. Best for
              competitive quests where you want to incentivize leaderboard performance.
            </p>
          </div>
        </div>
      </section>

      {/* Must-Know Details */}
      <section id="creator-mustknow" className="space-y-6">
        <h2 className="text-2xl font-bold text-white border-l-4 border-blue-500 pl-4">
          Must-Know Details
        </h2>
        <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700 space-y-4">
          {[
            {
              heading: "Unique title required",
              body: "Quest titles must be unique across the platform and at least 3 characters. The name check runs automatically as you type.",
            },
            {
              heading: "Token and distribution model are locked after publishing",
              body: "These fields cannot be changed once a quest is published. Edit drafts freely before finalizing.",
            },
            {
              heading: "Custom tasks always require link + image",
              body: "Participants submitting custom task proof must provide both a URL and an image upload. No additional configuration needed on your end — verification is manual by default.",
            },
            {
              heading: "Supported chains",
              body: "Subscriptions and reward contracts are supported on Celo, Base, Arbitrum, BNB Chain, and Lisk. Ensure your wallet is on a supported network before subscribing or deploying.",
            },
            {
              heading: "Subscriptions are non-refundable",
              body: "The $100 USDT subscription is non-refundable. If a funded quest is cancelled after launch, contact FaucetDrops support for resolution.",
            },
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-3 border-t border-gray-700/50 pt-4 first:border-0 first:pt-0">
              <span className="text-amber-400 mt-0.5 shrink-0">•</span>
              <div>
                <p className="text-white text-sm font-medium mb-0.5">{item.heading}</p>
                <p className="text-gray-400 text-sm leading-relaxed">{item.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function QuestPage() {
  const [role, setRole] = useState<"earner" | "creator">("creator");

  const sections = role === "earner" ? earnerSections : creatorSections;

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
      <div className="mt-20 mb-8">
        <RoleToggle role={role} onChange={setRole} />
      </div>

      <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1fr_280px] text-white">
        {/* MAIN CONTENT */}
        <main>
          {role === "earner" ? <EarnerContent /> : <CreatorContent />}

          {/* FAQ */}
          <section id="faq" className="space-y-6 mt-16">
            <h2 className="text-2xl font-bold text-white border-l-4 border-blue-500 pl-4">
              Frequently Asked Questions
            </h2>
            <Faq role={role} />
          </section>

          {/* CTA */}
          <section className="bg-linear-to-r from-blue-900/30 to-[#0052FF]/30 rounded-2xl p-8 md:p-12 my-12">
            <div className="flex flex-col items-center text-center gap-6">
              <div className="max-w-3xl">
                <h2 className="text-3xl font-bold text-white mb-4">
                  {role === "earner" ? "Ready to Start Earning?" : "Ready to Launch?"}
                </h2>
                <p className="text-gray-300 mb-2 text-lg">
                  {role === "earner"
                    ? <>Join thousands of Web3 enthusiasts completing quests and earning onchain rewards — <span className="font-semibold">gaslessly</span>.</>
                    : <>Build a campaign, set your reward pool, and let smart contracts handle distribution automatically.</>
                  }
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                {role === "earner" ? (
                  <button
                    onClick={() => window.open("https://app.faucetdrops.io/quest", "_blank", "noopener noreferrer")}
                    className="px-6 py-3 bg-white hover:bg-gray-100 text-gray-900 font-medium rounded-lg transition-colors"
                  >
                    Explore Quests
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => window.open("https://app.faucetdrops.io/create/quest", "_blank", "noopener noreferrer")}
                      className="px-6 py-3 bg-[#0052FF] hover:bg-[#0047DD] text-white font-medium rounded-lg transition-colors"
                    >
                      Create Campaign
                    </button>
                    <button
                      onClick={() => setRole("earner")}
                      className="px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors"
                    >
                      See the Earner Guide
                    </button>
                  </>
                )}
              </div>
            </div>
          </section>
        </main>

        {/* SIDEBAR */}
        <aside className="hidden lg:block">
          <div className="sticky top-24">
            <TableOfContents sections={sections} />
          </div>
        </aside>
      </div>
    </div>
  );
}