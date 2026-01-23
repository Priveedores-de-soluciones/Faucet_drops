"use client";
import React from "react";
import TableOfContents from "./toc";
import { Faq } from "./components/Faq";
import Link from "next/link";

const sections = [
  { id: "hero", title: "Quests" },
  { id: "hqw", title: "How Quests Work" },
  // { id: "categories", title: "Quest Categories" },
  { id: "point-system", title: "Point System" },
  { id: "distribution-model", title: "Distribution Model" },
  { id: "rules", title: "Rules" },
  // { id: "launchQuest", title: "Launch Your Own Quest Campaign" },
  { id: "faq", title: "Frequently Ask Questions" },
];

export default function QuestPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1fr_280px] text-white mt-20">
        {/* MAIN CONTENT */}
        <main className="space-y-12">
          {/* <div className="text-sm text-gray-300 mb-8">
            Page last updated: January 16, 2026
          </div> */}

          {/* Hero Section */}
          <section className="space-y-6">
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="flex-1 space-y-6">
                <h1 id="hero" className="text-4xl font-bold tracking-tight sm:text-5xl bg-linear-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                  Quests
                </h1>
                <p className="text-2xl text-gray-300">Get Rewarded for Web3 Engagement</p>
                <p className="text-lg text-gray-400">
                  Complete tasks, accumulate points, and claim your rewards. Join thousands of community members earning through quests.
                </p>
                <div className="flex-1">
                <div className="relative aspect-video bg-gray-800/50 rounded-xl border border-gray-700 overflow-hidden">
                  {/* Replace with actual image */}
                  <div className="absolute inset-0 flex items-center justify-center text-gray-500">
                    <span>Hero Image - Quest Platform Interface or walkthrough video</span>
                  </div>
                </div>
              </div>
                <p className="text-lg text-gray-400">
                Participate in community quests, social challenges, and engagement
                campaigns. The more you contribute, the more you earn. Winners are
                selected based on accumulated points and receive their rewards
                through dedicated faucets.
                </p>
                <Link 
                href="https://app.faucetdrops.io/quest"
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-wrap gap-4">
                  <button className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors">
                    Browse Active Quests
                  </button>
                </Link>
              </div>
            </div>
          </section>

          {/* How Quests Work */}
          <section className="space-y-6">
            <h2 id="hqw" className="text-2xl font-bold text-white border-l-4 border-blue-500 pl-4">
              How Quests Work
            </h2>
            <ol className="space-y-6">
              {[
                {
                  title: "Discover Quests",
                  desc: "Browse active quests from your favorite Web3 projects. Each quest has specific tasks, point values, and reward pools.",
                },
                {
                  title: "Complete Tasks",
                  desc: "Engage with communities through social media interactions, content creation, trading activities, and more. Each completed task earns you points.",
                },
                {
                  title: "Climb the Leaderboard",
                  desc: "Track your progress in real-time. Points are awarded instantly upon verification. The more quests you complete, the higher your ranking and the bigger your potential rewards.",
                },
                {
                  title: "Claim Your Rewards",
                  desc: "Winners are automatically mapped to reward faucets. Claim your earned tokens gaslessly based on your final point total.",
                },
              ].map((item, index) => (
                <li key={index} className="flex gap-4">
                  <div className="shrink-0 w-8 h-8 rounded-full bg-blue-900 flex items-center justify-center text-blue-300 font-bold">
                    {index + 1}
                  </div>
                  <div>
                    <h3 className="font-medium text-white">{item.title}</h3>
                    <p className="text-gray-300">{item.desc}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          {/* Quest Categories */}
          {/* <section className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 id="categories" className="text-2xl font-bold text-white border-l-4 border-blue-500 pl-4">
                Quest Categories
              </h2>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {[
                {
                  emoji: "🎯",
                  title: "Social Quests",
                  subtitle: "Grow communities through meaningful engagement",
                  points: "5-50 points per task",
                  image: "social-quests.jpg",
                  items: [
                    "Follow accounts on Twitter/X",
                    "Like and retweet posts",
                    "Join Discord servers and engage",
                    "Join Telegram channels",
                    "Share custom content with hashtags",
                    "Create original content about projects"
                  ]
                },
                {
                  emoji: "💎",
                  title: "Trading Quests",
                  subtitle: "Reward active protocol users",
                  points: "50-500 points per task",
                  image: "trading-quests.jpg",
                  items: [
                    "Swap tokens on DEXs",
                    "Provide liquidity",
                    "Complete transactions above threshold",
                    "Bridge assets cross-chain",
                    "Stake tokens",
                    "Participate in governance votes"
                  ]
                },
                {
                  emoji: "🎨",
                  title: "Creative Quests",
                  subtitle: "Showcase your creativity",
                  points: "100-1000 points per submission",
                  image: "creative-quests.jpg",
                  items: [
                    "Create memes or artwork",
                    "Write threads or articles",
                    "Make videos or tutorials",
                    "Design graphics",
                    "Develop educational content",
                    "Build community tools"
                  ]
                },
                {
                  emoji: "🏆",
                  title: "Challenge Quests",
                  subtitle: "Compete in special events",
                  points: "25-750 points",
                  image: "challenge-quests.jpg",
                  items: [
                    "Limited-time competitions",
                    "Trivia and quizzes",
                    "Scavenger hunts",
                    "Referral competitions",
                    "Tournament participation",
                    "Community votes"
                  ]
                },
                {
                  emoji: "📚",
                  title: "Educational Quests",
                  subtitle: "Learn while earning",
                  points: "10-200 points per task",
                  image: "educational-quests.jpg",
                  items: [
                    "Complete tutorials",
                    "Pass quizzes about protocols",
                    "Read documentation",
                    "Watch educational videos",
                    "Participate in workshops"
                  ]
                }
              ].map((category, index) => (
                <div key={index} className="bg-gray-800/50 rounded-xl border border-gray-700 hover:border-blue-500/50 transition-colors overflow-hidden group pb-6">
                  <div className="h-40 bg-gray-700 relative">
                    <div className="absolute inset-0 flex items-center justify-center text-gray-500">
                      <span>Image: {category.title}</span>
                    </div>
                    <div className="absolute top-3 right-3 bg-black/70 text-white text-xs px-2 py-1 rounded-full">
                      {category.points}
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-2xl">{category.emoji}</span>
                      <h3 className="text-xl font-semibold text-white">{category.title}</h3>
                    </div>
                    <p className="text-gray-300 mb-4">{category.subtitle}</p>
                    <button className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors text-sm">
                      View Quests
                    </button>
                  </div>
                    <ul className="space-y-2 mb-4 px-6">
                      {category.items.map((item, i) => (
                        <li key={i} className="flex items-start">
                          <span className="text-blue-400 mr-2">•</span>
                          <span className="text-gray-300">{item}</span>
                        </li>
                      ))}
                    </ul>
                  <div className="text-sm text-blue-300 font-medium px-6">{category.points}</div>
                </div>
              ))}
            </div>
          </section> */}

          {/* Point System */}
          <section className="space-y-6">
            <h2 id="point-system" className="text-2xl font-bold text-white border-l-4 border-blue-500 pl-4">
              Point System
            </h2>
            <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
              <h3 className="text-xl font-semibold text-white mb-4">How Points Work</h3>
              <p className="text-gray-300 mb-6">
                Points are the currency of quests. Earn points by completing tasks, and your accumulated points determine your reward allocation.
              </p>

              <h4 className="font-semibold text-white mb-3">Point Value Factors:</h4>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="bg-gray-900/50 p-4 rounded-lg">
                  <h5 className="font-medium text-blue-300 mb-2">Task Type</h5>
                  <ul className="space-y-1.5">
                    <li className="flex justify-between"><span>Social Tasks</span> <span className="text-blue-300">5-50 pts</span></li>
                    <li className="flex justify-between"><span>Trading Tasks</span> <span className="text-blue-300">50-500 pts</span></li>
                    <li className="flex justify-between"><span>Creative Tasks</span> <span className="text-blue-300">100-1000 pts</span></li>
                  </ul>
                </div>
                <div className="space-y-3">
                  <div className="bg-gray-900/50 p-4 rounded-lg">
                    <h5 className="font-medium text-blue-300 mb-1">Task Difficulty</h5>
                    <p className="text-sm text-gray-300">More complex tasks = more points</p>
                  </div>
                  <div className="bg-gray-900/50 p-4 rounded-lg">
                    <h5 className="font-medium text-blue-300 mb-1">Time Sensitivity</h5>
                    <p className="text-sm text-gray-300">Early completions may earn bonus points</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Distribution Model */}
          <section className="space-y-6">
            <h2 id="distribution-model" className="text-2xl font-bold text-white border-l-4 border-blue-500 pl-4">
              Distribution Model
            </h2>
            <p className="text-gray-300">Choose from different reward distribution models based on your campaign goals.</p>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
                <h3 className="text-xl font-semibold text-white mb-4">Top Winners</h3>
                <p className="text-gray-300 mb-4">Top point earners receive predetermined reward amounts.</p>
                <div className="space-y-2">
                  <div className="flex justify-between"><span>1st Place</span> <span className="text-blue-300">30% of pool</span></div>
                  <div className="flex justify-between"><span>2nd Place</span> <span className="text-blue-300">20% of pool</span></div>
                  <div className="flex justify-between"><span>3rd Place</span> <span className="text-blue-300">15% of pool</span></div>
                  <div className="flex justify-between"><span>4th-10th</span> <span className="text-blue-300">5% each</span></div>
                  <div className="flex justify-between"><span>11th-50th</span> <span className="text-blue-300">Remainder split</span></div>
                </div>
              </div>

              <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
                <h3 className="text-xl font-semibold text-white mb-4">Proportional Distribution</h3>
                <p className="text-gray-300 mb-4">All participants receive rewards proportional to their points.</p>
                <div className="bg-gray-900/50 p-4 rounded-lg font-mono text-sm">
                  <div className="text-blue-300">Your Reward =</div>
                  <div className="ml-4">(Your Points / Total Points) × Reward Pool</div>
                </div>
              </div>
            </div>

            <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
              <h3 className="text-xl font-semibold text-white mb-4">Threshold-Based</h3>
              <p className="text-gray-300 mb-4">Reach point milestones to unlock reward tiers.</p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="bg-gray-900/50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-blue-300">100</div>
                  <div className="text-sm">points</div>
                  <div className="mt-2 text-sm">10 tokens</div>
                </div>
                <div className="bg-gray-900/50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-blue-300">500</div>
                  <div className="text-sm">points</div>
                  <div className="mt-2 text-sm">75 tokens</div>
                </div>
                <div className="bg-gray-900/50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-blue-300">1,000</div>
                  <div className="text-sm">points</div>
                  <div className="mt-2 text-sm">200 tokens</div>
                </div>
                <div className="bg-gray-900/50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-blue-300">2,500</div>
                  <div className="text-sm">points</div>
                  <div className="mt-2 text-sm">600 tokens</div>
                </div>
              </div>
            </div>
          </section>

          {/* Rules */}
          <section className="space-y-6">
            <h2 id="rules" className="text-2xl font-bold text-white border-l-4 border-blue-500 pl-4">
              Rules & Eligibility
            </h2>
            <div className="space-y-6">
              <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
                <h3 className="text-xl font-semibold text-white mb-4">Eligibility</h3>
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <span className="text-blue-400 mr-2">•</span>
                    <span className="text-gray-300">Must be at least 18 years old or the age of majority in your jurisdiction</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-400 mr-2">•</span>
                    <span className="text-gray-300">Must complete KYC/AML verification if required</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-400 mr-2">•</span>
                    <span className="text-gray-300">Must comply with all applicable laws and regulations</span>
                  </li>
                </ul>
              </div>

              <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
                <h3 className="text-xl font-semibold text-white mb-4">General Rules</h3>
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <span className="text-blue-400 mr-2">•</span>
                    <span className="text-gray-300">One account per participant</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-400 mr-2">•</span>
                    <span className="text-gray-300">No automated or scripted participation</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-400 mr-2">•</span>
                    <span className="text-gray-300">Fair play policy applies to all participants</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-400 mr-2">•</span>
                    <span className="text-gray-300">Rewards are subject to verification</span>
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* FAQ Section */}
          <section id="faq" className="space-y-6">
            <h2 className="text-2xl font-bold text-white border-l-4 border-blue-500 pl-4">
              Frequently Asked Questions
            </h2>
            <Faq />
          </section>

          {/* CTA Section */}
          <section className="bg-linear-to-r from-blue-900/30 to-[#0052FF]/30 rounded-2xl p-8 md:p-12 my-12">
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <div className="max-w-3xl mx-auto">
                <h2 className="text-3xl font-bold text-white mb-4">Ready to Start Earning?</h2>
                <p className="text-gray-300 mb-8 text-lg">
                  Join our community of Web3 enthusiasts and start completing quests to earn rewards today.
                </p>
              </div>
              <Link
               href="https://app.faucetdrops.io/quest"
               target="_blank"
               rel="noopener noreferrer"
               className="px-6 py-3 bg-white hover:bg-gray-100 text-gray-900 font-medium rounded-lg transition-colors flex items-center justify-center gap-2">
                Explore Quests
              </Link>
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
  );
}
