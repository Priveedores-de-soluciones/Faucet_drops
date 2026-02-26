"use client";
import React from "react";
import TableOfContents from "./toc";
import Image from "next/image";
import { siTelegram } from "simple-icons";
import { SimpleIcon } from "@/components/ui/simpleIcons";
import { Card, CardHeader } from "@/components/ui/card";

const sections = [
  { id: "who", title: "Who We Are" },
  { id: "mission", title: "Mission" },
  { id: "problem", title: "The Problem We're Solving" },
  { id: "solution", title: "Our Solution" },
  { id: "why", title: "Why FaucetDrops?" },
  { id: "impact", title: "Our Impact" },
  { id: "future", title: "Future We're Building" },
  { id: "ready", title: "Ready to Automate Your Growth?" },
];

export default function AboutUs() {
  return (
    <div className="min-h-screen pt-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 md:py-24">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1fr_280px] text-white">
          {/* MAIN CONTENT */}
          <main className="space-y-16">
            <div className="space-y-10">
              <h1 className="text-3xl md:text-6xl font-bold tracking-tight bg-[#2563EB] bg-clip-text text-transparent">
                About FaucetDrops
              </h1>
              <div className="relative aspect-16/5 rounded-2xl border border-gray-700/50 overflow-hidden shadow-xl hover:shadow-blue-500/20 transition-all duration-300">
                <Image
                  src="/banner.jpeg"
                  alt="FaucetDrops Platform"
                  fill
                  className="object-cover opacity-90 hover:opacity-100 transition-opacity duration-500"
                  priority
                />
              </div>
            </div>

            {/* Who we are */}
            <section id="who" className="group relative rounded-2xl">
              <div className="absolute -inset-0.5 rounded-2xl opacity-0 group-hover:opacity-20 blur transition duration-300 group-hover:duration-200"></div>
              <div className="relative">
                <div className="flex items-center mb-6">
                  <div className="h-10 w-1 bg-[#2563EB] rounded-full mr-4"></div>
                  <h2 className="text-2xl md:text-3xl font-bold bg-[#2563EB] bg-clip-text text-transparent">
                    Who We Are
                  </h2>
                </div>
                <p className="text-base md:text-lg text-gray-300 leading-relaxed">
                  We are an{" "}
                  <span className="font-bold text-blue-300">
                    Automated Onchain Engagement and Reward Distribution
                    Platform
                  </span>{" "}
                  built for the future of Web3. Our platform is designed to help
                  projects grow their communities through transparent,
                  efficient, and engaging token distribution mechanisms.
                </p>
              </div>
            </section>

            {/* Mission */}
            <section id="mission" className="group relative rounded-2xl">
              <div className="absolute -inset-0.5 rounded-2xl opacity-0 group-hover:opacity-20 blur transition duration-300 group-hover:duration-200"></div>
              <div className="relative">
                <div className="flex items-center mb-6">
                  <div className="h-10 w-1 bg-[#2563EB] rounded-full mr-4"></div>
                  <h2 className="text-2xl md:text-3xl font-bold bg-[#2563EB] bg-clip-text text-transparent">
                    Our Mission
                  </h2>
                </div>
                <p className="text-base md:text-lg text-gray-300 leading-relaxed">
                  FaucetDrops helps web3 Projects, DAOs, Protocols, and
                  Communities automate token distribution, run interactive
                  campaigns, and onboard real users at scale - all in one
                  powerful platform. We&apos;re on a mission to make Web3 more
                  accessible and engaging for everyone.
                </p> 
              </div>
            </section>

            {/* Problem */}
            <section id="problem" className="group relative">
              <div className="absolute transition duration-300"></div>
              <div className="relative">
                <div className="flex items-center mb-6">
                  <div className="h-10 w-1 bg-[#2563EB] rounded-full mr-4"></div>
                  <h2 className="text-2xl md:text-3xl font-bold bg-[#2563EB] bg-clip-text text-transparent">
                    The Problem We&apos;re Solving
                  </h2>
                </div>
                <div className="space-y-4 text-gray-300 text-base md:text-lg">
                  <p className="leading-relaxed">
                    Web3 projects face a critical challenge: how do you onboard
                    thousands of users, reward genuine engagement, and build
                    thriving communities without errors and drowning in manual
                    work?
                  </p>
                  <div className="bg-gray-900/50 p-4 mx-10 rounded-lg border-l-4 border-[#2563EB]">
                    <p className="text-[#2563EB] font-medium">
                      The current state of Web3 distribution:
                    </p>
                    <ul className="mt-2 space-y-2 text-gray-300">
                      <li className="flex items-start">
                        <svg
                          className="h-5 w-5 text-[#2563EB] mr-2 mt-0.5 shrink-0"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                        Traditional airdrops lack targeting and often miss the
                        mark
                      </li>
                      <li className="flex items-start">
                        <svg
                          className="h-5 w-5 text-[#2563EB] mr-2 mt-0.5 shrink-0"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                        Manual distribution processes don&apos;t scale with
                        growth
                      </li>
                      <li className="flex items-start">
                        <svg
                          className="h-5 w-5 text-[#2563EB] mr-2 mt-0.5 shrink-0"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                        Spreadsheets and multi-sig wallets create bottlenecks
                      </li>
                    </ul>
                  </div>
                  <p className="text-lg font-medium text-blue-300">
                    We built FaucetDrops to fix these challenges and
                    revolutionize Web3 engagement.
                  </p>
                </div>
              </div>
            </section>

            {/* Solution */}
            <section id="solution" className="space-y-6">
              <div className="flex flex-col md:flex-row items-center gap-8">
                <div className="flex-1 space-y-6">
                  <h2 className="text-2xl md:text-3xl font-bold bg-[#2563EB] bg-clip-text text-transparent border-l-4 border-blue-500 pl-4">
                    Our Solution
                  </h2>
                  <p className="text-base md:text-lg text-gray-400">
                    FaucetDrops transforms how Web3 projects grow by combining
                    three powerful elements:
                  </p>
                  {[
                    {
                      topic: "Automated Distribution",
                      content:
                        "Smart faucets that handle token distribution 24/7. Set your rules once, let the platform handle the rest.",
                    },
                    {
                      topic: "Verifiable Engagement",
                      content:
                        "Gamified quests and quizzes that ensure users aren't just claiming—they're learning, participating, and adding value to your ecosystem.",
                    },
                    {
                      topic: "Onchain Transparency",
                      content:
                        "Every action is verified on-chain. Every reward is traceable. No bots, no gaming the system—just real users earning real rewards.",
                    },
                  ].map((item, index) => (
                    <li key={index} className="flex gap-4">
                      <div className="shrink-0 w-8 h-8 rounded-full bg-blue-900 flex items-center justify-center text-blue-300 font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <h3 className="font-medium text-white">{item.topic}</h3>
                        <p className="text-gray-300">{item.content}</p>
                      </div>
                    </li>
                  ))}
                </div>
              </div>
            </section>

            {/* Why */}
            <section
              id="why"
              className="group relative bg-gray-800/50 p-8 rounded-2xl border border-gray-700/50 hover:border-blue-500/30 transition-all duration-300"
            >
              <div className="absolute -inset-0.5 bg-blue-500/20 rounded-2xl opacity-0 group-hover:opacity-20 transition duration-300 group-hover:duration-200"></div>
              <div className="relative">
                <div className="flex items-center mb-8">
                  <div className="h-10 w-1 bg-[#2563EB] rounded-full mr-4"></div>
                  <h2 className="text-2xl md:text-3xl font-bold bg-[#2563EB] bg-clip-text text-transparent">
                    Why Choose FaucetDrops?
                  </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {[
                    {
                      icon: (
                        <svg
                          className="w-8 h-8 text-blue-300"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M13 10V3L4 14h7v7l9-11h-7z"
                          />
                        </svg>
                      ),
                      title: "Fast, Fair & Frictionless",
                      description:
                        "We've eliminated the friction from token distribution. No complex setup, no technical barriers, no delays.",
                      color: "from-blue-500 to-blue-600",
                    },
                    {
                      icon: (
                        <svg
                          className="w-8 h-8 text-blue-300"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                          />
                        </svg>
                      ),
                      title: "Built for Scale",
                      description:
                        "Whether you're distributing to 100 users or 100,000, our infrastructure handles it seamlessly across multiple chains including Celo, Base, Lisk, and Arbitrum.",
                      color: "from-blue-500 to-blue-600",
                    },
                    {
                      icon: (
                        <svg
                          className="w-8 h-8 text-blue-300"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                          />
                        </svg>
                      ),
                      title: "Data-Driven Growth",
                      description:
                        "Real-time analytics and insights help you understand your community, optimize campaigns, and make smarter distribution decisions.",
                      color: "from-blue-500 to-blue-600",
                    },
                    {
                      icon: (
                        <svg
                          className="w-8 h-8 text-blue-300"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                          />
                        </svg>
                      ),
                      title: "Enterprise-Ready",
                      description:
                        "White-label solutions that grow with you, from early-stage projects to established protocols.",
                      color: "from-blue-500 to-blue-600",
                    },
                  ].map((feature, index) => (
                    <div
                      key={index}
                      className="group-hover:blur-xs hover:blur-none transition-all duration-300 bg-gray-800/20 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50 hover:border-transparent hover:shadow-lg hover:shadow-blue-500/10 hover:bg-linear-to-br from-gray-800/80 to-gray-900/80"
                    >
                      <div
                        className={`w-12 h-12 rounded-lg mb-4 flex items-center justify-center bg-[#2563EB]/20`}
                      >
                        {feature.icon}
                      </div>
                      <h3 className="text-xl font-semibold text-white mb-2">
                        <span>{feature.title}</span>
                      </h3>
                      <p className="text-gray-300 leading-relaxed">
                        {feature.description}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="mt-8 text-center">
                  <p className="text-md md:text-lg text-gray-300 mb-6">
                    Join hundreds of projects already growing with FaucetDrops
                  </p>
                  <div className="flex flex-wrap justify-center gap-6 opacity-80">
                    {[
                      "Celo",
                      "Base",
                      "Lisk",
                      "Arbitrum"
                    ].map((chain, i) => (
                      <div key={i} className="flex items-center text-gray-300 hover:text-white transition-colors">
                        <div className="w-2 h-2 rounded-full bg-[#2563EB] mr-2"></div>
                        <span>{chain}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* Impact */}
            <section id="impact" className="space-y-6">
              <div className="flex flex-col md:flex-row items-center gap-8">
                <div className="flex-1 space-y-6">
                  <h2 className="text-2xl md:text-3xl font-bold border-l-4 border-blue-500 pl-4 bg-[#2563EB] bg-clip-text text-transparent">
                    Our Impact
                  </h2>
                  <p className="text-base md:text-lg text-gray-400">
                    Trusted by top protocols like Celo, Lisk, and Self Protocol,
                    FaucetDrops powers onchain growth at scale:
                  </p>
                  
              <div className="grid grid-cols-1 md:grid-cols-2 px-10 gap-8">
                {[
                  { label: "100+", text: "Faucets created and deployed" },
                  { label: "5,000+", text: "Transactions processed seamlessly" },
                  { label: "2,000+", text: "Active Users onboarded to Web3" },
                  { label: "2,000+", text: "Total Drops distributed fairly" },
                ].map((item, i) => (
                  <Card key={i} className="border border-gray-700/50 bg-gray-800/50">
                    <CardHeader>
                      <div className="flex-1 items-center align-center justify-center gap-2">
                        <p className="text-2xl md:text-3xl font-bold text-white">{item.label}</p>
                        <p className="text-base text-gray-500">{item.text}</p>
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
                </div>
              </div>
            </section>

            {/* future we're building */}
            <section id="future" className="space-y-6">
              <div className="flex flex-col md:flex-row items-center gap-8">
                <div className="flex-1 space-y-6">
                  <h2 className="text-2xl font-bold text-transparent border-l-4 border-blue-500 pl-4 md:text-3xl bg-[#2563EB] bg-clip-text">
                    Future We&apos;re Building
                  </h2>
                  <p className="text-base md:text-lg text-gray-400">
                    The future of Web3 user acquisition is engaging, automated,
                    and verifiable. We&apos;re building it.
                  </p>
                  <blockquote className="space-y-2">
                    <p className="text-base md:text-lg px-5">
                      We believe that every project deserves enterprise-grade
                      distribution infrastructure. That communities should be
                      rewarded for genuine participation. That onboarding to Web3
                      should be as simple as clicking a link.
                    </p>
                  </blockquote>
                  {/* <p className="text-lg text-gray-400">
                    The flow starts here.
                  </p> */}
                </div>
              </div>
            </section>

            {/* ready */}
            <section id="ready" className="space-y-6">
              <div className="flex flex-col md:flex-row items-center gap-8">
                <div className="flex-1 space-y-6">
                  <h2 className="text-2xl font-bold border-l-4 border-blue-500 pl-4 md:text-3xl bg-[#2563EB] bg-clip-text text-transparent">
                    Ready to Automate Your Growth?
                  </h2>
                  <p className="text-base md:text-lg text-gray-400">
                    Join the protocols already using FaucetDrops to scale their
                    communities, reward real users, and build the future of
                    Web3.
                  </p>
                  {/* CTA */}
                  <div className="flex flex-col md:flex-row items-center gap-4 px-16">
                    <button
                      className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 h-12 rounded-md transition-colors duration-200 w-full md:w-auto"
                      onClick={() =>
                        window.open("https://app.faucetdrops.io", "_blank")
                      }
                    >
                      Launch App
                    </button>
                    <button
                      className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 h-12 rounded-md transition-colors duration-200 flex items-center justify-center gap-2 no-wrap w-full md:w-auto"
                      onClick={() =>
                        window.open("https://t.me/faucetdropschat", "_blank")
                      }
                    >
                      Talk to Our Team{" "}
                      <SimpleIcon icon={siTelegram} size={20} />
                    </button>
                  </div>
                </div>
              </div>
            </section>
          </main>

          {/* SIDEBAR - Table of Contents */}
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
