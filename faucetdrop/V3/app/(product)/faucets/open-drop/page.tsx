"use client";

import { motion } from "framer-motion";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { CheckCircle, Sparkles, Settings, Radio } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";

export default function OpenDrop() {

  const features = [
    { textHead: "Simple Access Control", textBody: "Users only need a simple 6-character code to claim. No complex whitelisting required." },
    { textHead: "Sybil-Resistant", textBody: "Powered by Self Protocol, our ZK-powered identity verification ensures only real humans claim even in an open drop." },
    { textHead: "Social Gating: Optional", textBody: "Require Twitter follows or Telegram joins before the code is revealed." },
    { textHead: "Cross-Chain Ready", textBody: "Deploy on Celo, Lisk, Arbitrum, Base, and more." },
  ]

  const howItWorks = [
    { textHead: "Set Your Budget", textBody: "Deposit the total amount of tokens or ETH/stablecoins." },
    { textHead: "Generate Code", textBody: "The system creates a unique 6-character Drop-Code." },
    { textHead: "Share Live", textBody: "Announce the code during your conference, stream, or hackathon." },
    { textHead: "Instant Claims", textBody: "Attendees enter the code and claim gaslessly." }
  ]

  const useCases = [
    { textHead: "Live Conferences", textBody: "Distribute tokens to event attendees with a simple code", image: "/learnMore/conference.png" },
    { textHead: "Twitter Spaces / AMAs", textBody: "Reward listeners who stay until the end", image: "/learnMore/podcast.png" },
    { textHead: "Flash Marketing Campaigns", textBody: "Time-sensitive promotions and giveaways", image: "/learnMore/marketing.png" },
    { textHead: "Community Onboarding", textBody: "Quick distribution to new community members", image: "/learnMore/community.png" },
    { textHead: "Airdrops", textBody: "First come, first serve", image: "/learnMore/early.png" },
  ]
  const createOpenDrop = () => {
    window.open('https://app.faucetdrops.io/faucet/create-faucet?type=open', '_blank');
  }
  return (
    <div className="w-full min-h-screen flex flex-col items-center px-4 sm:px-6 py-20 md:py-24">
      {/* HERO SECTION */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-4xl bg-[#0F172A]/50 shadow-lg rounded-2xl p-6 sm:p-10 text-center border border-gray-700"
      >
        <h1 className="text-3xl sm:text-4xl font-bold text-white">
          Open Drop
        </h1>
        <p className="mt-3 text-[#94A3B8] text-lg font-medium">
          Speed, Accessibility & Instant Event Engagement.
        </p>
        <p className="mt-4 text-[#E2E8F0]">
          Distribute tokens securely in seconds using a unique 6-character access code.
          Perfect for live events, AMAs, hackathons, and onboarding new users instantly.
        </p>
        <Button
          onClick={createOpenDrop}
          variant={"outline"}
          className="mt-5 hover:bg-white/80"
        >
          Create Open Drop
        </Button>
      </motion.div>

      {/* GRID: KEY FEATURES + HOW IT WORKS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8 sm:mt-12 max-w-4xl w-full">
        {/* Key Features */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <Card className="bg-[#0F172A]/50 border-gray-700 hover:shadow-lg transition-shadow">
            <CardHeader>
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                <Sparkles className="text-[#94A3B8]" /> Key Features
              </h2>
            </CardHeader>
            <CardContent className="space-y-3">
              {features.map((feature, index) => (

                <p key={index} className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-green-400 mt-0.5 shrink-0" />
                  <span className="text-[#E2E8F0]"><span className="font-medium text-white">{feature.textHead}: </span>{feature.textBody}</span>
                </p>
              ))}
            </CardContent>
          </Card>
        </motion.div>

        {/* How It Works */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <Card className="bg-[#0F172A]/50 border-gray-700 hover:shadow-lg transition-shadow">
            <CardHeader>
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                <Settings className="text-[#94A3B8]" /> How It Works
              </h2>
            </CardHeader>
            <CardContent className="space-y-3">
              {howItWorks.map((point, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className="shrink-0 h-6 w-6 rounded-full bg-[#1E293B] flex items-center justify-center">
                    <span className="text-[#94A3B8] font-medium text-sm">{index + 1}</span>
                  </div>
                  <p className="text-[#E2E8F0]">
                    <span className="font-bold">{point.textHead}: {' '}</span> {point.textBody}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* USE CASES */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="max-w-4xl w-full bg-[#0F172A]/50 mt-8 sm:mt-12 p-6 sm:p-8 rounded-2xl shadow border border-gray-700"
      >
        <h2 className="text-xl font-semibold text-white flex items-center gap-2 mb-6">
          <Radio className="text-[#94A3B8]" /> Use Cases
        </h2>

        <div className="space-y-4">
          {useCases.map((useCase, index) => (
            <div key={index} className="flex items-start gap-3">
              <div className="flex items-center justify-between w-full">
                <div className="flex items-start gap-2">
                  <div className="shrink-0 h-6 w-6 rounded-full bg-[#1E293B] flex items-center justify-center">
                    <span className="text-[#94A3B8] font-medium text-sm">{index + 1}</span>
                  </div>
                  <div>
                    <h3 className="text-[#E2E8F0] font-bold">{useCase.textHead}</h3>
                    <p className="text-[#E2E8F0] text-sm">{useCase.textBody}</p>
                  </div>
                </div>
                <Image
                  src={useCase.image}
                  alt={useCase.textHead}
                  width={120}
                  height={120}
                  className="object-contain rounded"
                />
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* FAQ */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="max-w-4xl w-full bg-[#0F172A]/50 mt-8 sm:mt-12 p-6 sm:p-8 rounded-2xl shadow border border-gray-700"
      >
        <h2 className="text-xl font-semibold text-white mb-6">Frequently Asked Questions</h2>

        <Accordion type="single" collapsible className="w-full space-y-4">
          <AccordionItem value="1" className="border-b border-gray-700 pb-2">
            <AccordionTrigger className="hover:no-underline [&[data-state=open]>svg]:rotate-180 text-[#E2E8F0] hover:text-white">
              What is Open Drop?
            </AccordionTrigger>
            <AccordionContent className="pt-2 text-[#94A3B8]">
              A fast, secure way to distribute tokens using a unique 6-character access code, perfect for live events and community engagement.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="2" className="border-b border-gray-700 pb-2">
            <AccordionTrigger className="hover:no-underline [&[data-state=open]>svg]:rotate-180 text-[#E2E8F0] hover:text-white">
              How does the Drop-Code work?
            </AccordionTrigger>
            <AccordionContent className="pt-2 text-[#94A3B8]">
              A unique code is generated for each drop. Users simply enter the code to claim tokens — no whitelisting or complicated setup required.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="3" className="border-b border-gray-700 pb-2">
            <AccordionTrigger className="hover:no-underline [&[data-state=open]>svg]:rotate-180 text-[#E2E8F0] hover:text-white">
              How do you prevent bots?
            </AccordionTrigger>
            <AccordionContent className="pt-2 text-[#94A3B8]">
              We use Self Protocol&apos;s zero-knowledge identity verification to ensure only real humans can claim, even in fully open drops.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="4" className="border-b border-gray-700 pb-2">
            <AccordionTrigger className="hover:no-underline [&[data-state=open]>svg]:rotate-180 text-[#E2E8F0] hover:text-white">
              Do users pay gas fees?
            </AccordionTrigger>
            <AccordionContent className="pt-2 text-[#94A3B8]">
              No, all claims are completely gasless for users, making it seamless for community engagement.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="5" className="border-b-0">
            <AccordionTrigger className="hover:no-underline [&[data-state=open]>svg]:rotate-180 text-[#E2E8F0] hover:text-white">
              What does it cost to set up an open-drop faucet?
            </AccordionTrigger>
            <AccordionContent className="pt-2 text-[#94A3B8]">
              A 3% platform fee on the amount you fund for distribution.
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </motion.div>
    </div>
  );
}
