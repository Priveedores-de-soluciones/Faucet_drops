// app/pricing/page.tsx
// Uses globals.css: bg-background (#020817), foreground blue (#0052FF), Geist fonts, noise overlay

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing & Plans — FaucetDrops",
  description:
    "Simple, transparent pricing for Web3 distribution. Launch campaigns, reward users, and grow your community — without hidden fees.",
};

/* ─────────────────────────────────────────────
   Primitive helpers
───────────────────────────────────────────── */
function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-4 mb-8">
      <span className="text-[10px] font-bold tracking-[0.16em] uppercase text-white/25 whitespace-nowrap font-mono">
        {label}
      </span>
      <div className="flex-1 h-0.5 bg-linear-to-r from-white/10 to-transparent" />
    </div>
  );
}

function CheckIcon({ color }: { color: string }) {
  return (
    <span
      className="mt-0.5 Sshrink-0 w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold"
      style={{ background: `${color}18`, color }}
    >
      ✓
    </span>
  );
}

/* ─────────────────────────────────────────────
   Data
───────────────────────────────────────────── */
const DISTRIBUTION_CARDS = [
  {
    icon: "🔓",
    name: "Open Faucet",
    fee: "3%",
    feeLabel: "Fee",
    tagline: "Public distribution with controlled access",
    accent: "#0052FF",
    features: [
      "Users claim with a secret code",
      "Ideal for campaigns, events & private drops",
      "Fast setup, no whitelist needed",
    ],
  },
  {
    icon: "📋",
    name: "Droplist Faucet",
    fee: "3%",
    feeLabel: "Fee",
    tagline: "Targeted distribution for selected users",
    accent: "#338BFF",
    popular: false,
    features: [
      "Restricted to whitelisted wallets",
      "Perfect for airdrops & early supporters",
      "Full control over who can claim",
    ],
  },
  {
    icon: "⚙️",
    name: "Custom Faucet",
    fee: "5%",
    feeLabel: "Fee",
    tagline: "Advanced distribution with custom allocations",
    accent: "#00C4FF",
    features: [
      "Define exact token amounts per user",
      "Supports complex reward structures",
      "Built for structured campaigns & partnerships",
    ],
  },
];

const WHY_ITEMS = [
  { icon: "🔐", title: "Non-Custodial", desc: "Your keys, your assets. We never hold your funds." },
  { icon: "⛽", title: "Gas Covered", desc: "We cover gas fees for all distribution campaigns." },
  { icon: "🔗", title: "EVM Native", desc: "Works across every major EVM-compatible chain." },
  { icon: "⚡", title: "Fast Deploy", desc: "Go from idea to live campaign in minutes." },
  { icon: "📈", title: "Growth-First", desc: "Designed for teams who think beyond the airdrop." },
];

/* ─────────────────────────────────────────────
   Distribution Card
───────────────────────────────────────────── */
function DistributionCard({
  icon, name, fee, feeLabel, tagline, accent, popular, features,
}: (typeof DISTRIBUTION_CARDS)[0]) {
  return (
    <div
      className="group relative flex flex-col rounded-2xl border p-7 transition-all duration-300 hover:-translate-y-1"
      style={{
        background: popular
          ? `linear-gradient(135deg, ${accent}08, ${accent}04)`
          : "rgba(255,255,255,0.03)",
        borderColor: popular ? `${accent}35` : "rgba(255,255,255,0.07)",
      }}
    >
      {/* top accent line */}
      <div
        className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ background: `linear-gradient(90deg, ${accent}, transparent)` }}
      />
      {popular && (
        <div
          className="absolute top-4 right-4 text-[10px] font-bold tracking-widest uppercase px-2.5 py-1 rounded-full text-[#020817]"
          style={{ background: `linear-gradient(135deg, ${accent}, #338BFF)` }}
        >
          Popular
        </div>
      )}

      {/* icon */}
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center text-lg mb-4"
        style={{ background: `${accent}15` }}
      >
        {icon}
      </div>

      <p className="font-semibold text-white/90 text-base mb-1 font-sans">{name}</p>
      <p className="font-mono font-medium text-2xl mb-0.5" style={{ color: accent }}>
        {fee}
        <span className="text-sm text-white/30 font-sans ml-1">{feeLabel}</span>
      </p>
      <p className="text-xs text-white/35 mb-5 leading-relaxed">{tagline}</p>

      <div className="h-px bg-white/[0.07] mb-5" />

      <ul className="flex flex-col gap-2.5 mt-auto">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm text-white/50 leading-relaxed">
            <CheckIcon color={accent} />
            {f}
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Page
───────────────────────────────────────────── */
export default function PricingPage() {
  return (
    <div className="min-h-screen text-white selection:bg-[#0052FF]/30">

      

      {/* ── HERO ── */}
      <section className="max-w-3xl mx-auto text-center px-6 pb-14 pt-36">
        <div
          className="inline-flex items-center gap-1.5 border rounded-full px-4 py-1.5 text-[11px] font-bold tracking-widest uppercase mb-7"
          style={{
            background: "#0052FF12",
            borderColor: "#0052FF30",
            color: "#0052FF",
          }}
        >
           The all-in-one stack for your Web3 User Growth, Engagement and Token Distribution 💧
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.08] tracking-[-0.03em] mb-5 font-sans">
          Simple, Transparent{" "}
          <span
            style={{
              background: "linear-gradient(90deg, #0052FF, #338BFF, #00C4FF)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Pricing for FaucetDrops
          </span>
        </h1>

        <p className="text-base sm:text-lg text-white/40 leading-relaxed max-w-lg mx-auto">
          Launch campaigns, reward users, and grow your community —
          without hidden fees or complexity.
        </p>
      </section>

      {/* ── TOKEN DISTRIBUTION ── */}
      <section className="max-w-6xl mx-auto px-6 pb-16">
        <SectionDivider label="Token Distribution" />
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-1 font-sans">
          Reliable, On-Chain Distribution
        </h2>
        <p className="text-sm text-white/35 mb-8">
          Built for scale. Choose the model that fits your campaign.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {DISTRIBUTION_CARDS.map((card) => (
            <DistributionCard key={card.name} {...card} />
          ))}
        </div>
      </section>

      {/* ── GROWTH & ENGAGEMENT ── */}
      <section className="max-w-6xl mx-auto px-6 pb-16">
        <SectionDivider label="Growth & Engagement" />
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-1 font-sans">
          Turn Distribution Into Growth
        </h2>
        <p className="text-sm text-white/35 mb-8">
          Interactive experiences that expand your community on-chain.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Quest */}
          <div
            className="group relative flex flex-col rounded-2xl border p-7 transition-all duration-300 hover:-translate-y-1"
            style={{
              background: "rgba(0,82,255,0.04)",
              borderColor: "rgba(0,82,255,0.18)",
            }}
          >
            <div
              className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl"
              style={{ background: "linear-gradient(90deg, #0052FF, transparent)" }}
            />
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-lg mb-4"
              style={{ background: "#0052FF18" }}
            >
              🎯
            </div>
            <p className="font-semibold text-white/90 text-base mb-1">Quest</p>
            <div className="flex items-baseline gap-1 mb-0.5">
              <span className="font-mono text-2xl font-medium" style={{ color: "#0052FF" }}>
                $100
              </span>
              <span className="text-sm text-white/30">/mo</span>
              <span className="text-white/20 mx-1">+</span>
              <span className="font-mono text-lg font-medium" style={{ color: "#338BFF" }}>
                1%
              </span>
              <span className="text-sm text-white/30">Fee</span>
            </div>
            <p className="text-xs text-white/35 mb-5 leading-relaxed">
              Drive user actions and engagement through on-chain quests
            </p>
            <div className="h-px bg-white/[0.07] mb-5" />
            <ul className="flex flex-col gap-2.5">
              {[
                "Create task-based reward campaigns",
                "Track user participation and completion",
                "Designed for ecosystem growth & retention",
              ].map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-white/50 leading-relaxed">
                  <CheckIcon color="#0052FF" />
                  {f}
                </li>
              ))}
            </ul>
          </div>

          {/* Quiz */}
          <div
            className="group relative flex flex-col rounded-2xl border p-7 transition-all duration-300 hover:-translate-y-1"
            style={{
              background: "rgba(0,196,255,0.03)",
              borderColor: "rgba(0,196,255,0.14)",
            }}
          >
            <div
              className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl"
              style={{ background: "linear-gradient(90deg, #00C4FF, transparent)" }}
            />
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-lg mb-4"
              style={{ background: "#00C4FF15" }}
            >
              🧠
            </div>
            <p className="font-semibold text-white/90 text-base mb-1">Quiz</p>
            <p className="font-mono text-lg font-medium mb-0.5" style={{ color: "#00C4FF" }}>
              Flexible Pricing
            </p>
            <p className="text-xs text-white/35 mb-5 leading-relaxed">
              Educate and reward your users in an interactive way
            </p>

            {/* Dual pricing cards */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              {[
                {
                  label: "Subscription",
                  price: "$10/mo",
                  desc: "Unlimited quiz campaigns",
                },
                {
                  label: "Pay-as-you-go",
                  price: "5% / campaign",
                  desc: "Min. deposit $25",
                },
              ].map((opt) => (
                <div
                  key={opt.label}
                  className="rounded-xl border p-3.5"
                  style={{
                    background: "rgba(0,196,255,0.04)",
                    borderColor: "rgba(0,196,255,0.12)",
                  }}
                >
                  <p className="text-[10px] font-bold tracking-widest uppercase text-white/25 mb-1.5 font-mono">
                    {opt.label}
                  </p>
                  <p className="font-mono text-sm font-medium mb-0.5" style={{ color: "#00C4FF" }}>
                    {opt.price}
                  </p>
                  <p className="text-[11px] text-white/30">{opt.desc}</p>
                </div>
              ))}
            </div>

            <div className="h-px bg-white/[0.07] mb-5" />
            <ul className="flex flex-col gap-2.5">
              {[
                "Great for community education & onboarding",
                "Boost engagement with instant rewards",
              ].map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-white/50 leading-relaxed">
                  <CheckIcon color="#00C4FF" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ── ENTERPRISE ── */}
      <section className="max-w-6xl mx-auto px-6 pb-16">
        <div
          className="relative overflow-hidden rounded-2xl border p-8 sm:p-10 grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-8 items-center"
          style={{
            background: "linear-gradient(135deg, rgba(0,82,255,0.08), rgba(51,139,255,0.04))",
            borderColor: "rgba(0,82,255,0.22)",
          }}
        >
          {/* top bar */}
          <div
            className="absolute top-0 left-0 right-0 h-0.5"
            style={{ background: "linear-gradient(90deg, #0052FF, #00C4FF)" }}
          />
          {/* glow */}
          <div
            className="absolute -right-20 -top-20 w-72 h-72 rounded-full pointer-events-none"
            style={{
              background: "radial-gradient(circle, rgba(0,82,255,0.12), transparent 70%)",
            }}
          />

          <div className="relative">
            <p className="text-[11px] font-bold tracking-[0.14em] uppercase mb-2 font-mono" style={{ color: "#338BFF" }}>
              Enterprise
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3 font-sans">
              Custom Integrations &amp;{" "}
              <span
                style={{
                  background: "linear-gradient(90deg, #fff, #338BFF)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                White-Label Solutions
              </span>
            </h2>
            <p className="text-sm text-white/40 mb-6 max-w-lg leading-relaxed">
              Built for ecosystems, protocols, and large-scale communities that need more than
              off-the-shelf.
            </p>
            <div className="flex flex-wrap gap-2">
              {[
                "🏷️ Fully white-labeled",
                "🔗 Custom smart contracts",
                "🛡️ Dedicated support",
                "📡 L1/L2 scalable",
              ].map((tag) => (
                <span
                  key={tag}
                  className="text-xs text-white/50 px-3 py-1.5 rounded-lg border"
                  style={{
                    background: "rgba(0,82,255,0.08)",
                    borderColor: "rgba(0,82,255,0.18)",
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <a
            href="mailto:drops.faucet@gmail.com"
            className="relative lg:self-center w-full lg:w-auto text-center font-semibold text-sm px-8 py-4 rounded-xl text-white no-underline transition-all hover:opacity-90 hover:-translate-y-0.5"
            style={{
              background: "linear-gradient(135deg, #0052FF, #338BFF)",
              boxShadow: "0 8px 32px rgba(0,82,255,0.35)",
            }}
          >
            Contact Sales →
          </a>
        </div>
      </section>

      {/* ── WHY FAUCETDROPS ── */}
      <section className="max-w-6xl mx-auto px-6 pb-16">
        <SectionDivider label="Why FaucetDrops" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {WHY_ITEMS.map(({ icon, title, desc }) => (
            <div
              key={title}
              className="rounded-xl border p-4 transition-all duration-200 hover:-translate-y-1 hover:border-white/10"
              style={{
                background: "rgba(255,255,255,0.03)",
                borderColor: "rgba(255,255,255,0.06)",
              }}
            >
              <span className="text-xl block mb-2.5">{icon}</span>
              <p className="text-sm font-semibold text-white/80 mb-1">{title}</p>
              <p className="text-xs text-white/30 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── TRUST BAR ── */}
      <section className="max-w-6xl mx-auto px-6 pb-20">
        <div
          className="flex flex-col sm:flex-row items-start sm:items-center gap-4 rounded-2xl border p-6 sm:p-7"
          style={{
            background: "rgba(0,82,255,0.04)",
            borderColor: "rgba(0,82,255,0.14)",
          }}
        >
          <span className="text-2xl shrink-0">🛡️</span>
          <p className="text-sm text-white/40 leading-relaxed">
            <span className="font-semibold" style={{ color: "#338BFF" }}>
              No hidden charges. Full transparency.
            </span>{" "}
            Fees apply only to deposited funds — never to wallets or withdrawals. You remain in
            complete control of your assets at all times.
          </p>
        </div>
      </section>

    </div>
  );
}