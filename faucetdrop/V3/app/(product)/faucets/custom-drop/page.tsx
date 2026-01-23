"use client";

import { motion } from "framer-motion";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { CheckCircle, Sparkles, Settings, Radio } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";

export default function CustomDrop() {

    const features = [
        { textHead: "Variable Payouts", textBody: "Unlike standard drops, User A can receive 100 tokens while User B receives 500 tokens within the same campaign." },
        { textHead: "Developer-Friendly", textBody: "Utilizing a Factory + Instance pattern for scalable smart contract deployment." },
        { textHead: "Batch Updates", textBody: "Optimize gas by updating custom amounts and beneficiaries in batches." },
        { textHead: "Full Admin Control", textBody: "Reset claims, modify amounts, or withdraw unclaimed funds post-campaign." },
    ]

    const howItWorks = [
        { textHead: "Map Your Logic", textBody: "Upload CSV/PDF/TXT/XLSX/XLS with specific wallet-to-amount mappings. (e.g., 1st Place: $500, 2nd Place: $250, Participants: $50)." },
        { textHead: "Configure Contract", textBody: "Input specific wallet-to-amount mappings." },
        { textHead: "Fund & Lock", textBody: "Deposit the total required assets (ETH, ERC20, or Stablecoins)." },
        { textHead: "Granular Distribution", textBody: "Users claim their specific, pre-assigned amounts securely." }
    ]

    const useCases = [
        { textHead: "Hackathon Prizes", textBody: "Automate tiered prize payouts (1st, 2nd, 3rd place).", image: "/learnMore/prizes.png" },
        { textHead: "Payroll & Grants", textBody: "Distribute varying salary or grant amounts to contributors.", image: "/learnMore/payroll.png" },
        { textHead: "Gamified Rewards", textBody: "Distribute tokens based on points earned or leaderboard position.", image: "/learnMore/rewards.png" },
    ]

    const createCustomDrop = () => {
        window.open('https://app.faucetdrops.io/faucet/create-faucet?type=custom', '_blank');
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
                    Custom Drop
                </h1>
                <p className="mt-3 text-[#94A3B8] text-lg font-medium">
                    Flexibility, Logic, and Complex Distribution.
                </p>
                <p className="mt-4 text-[#E2E8F0]">
                    Custom Drop: Advanced Distribution Architecture
                    Fully customizable engine for complex payout logic and variable amounts.

                    Break free from &quot;one-size-fits-all.&quot; Assign unique token amounts to specific users based on contribution, tier, or rank in a single transaction.

                </p>
                <Button
                    onClick={createCustomDrop}
                    variant={"outline"}
                    className="mt-5 hover:bg-white/80"
                >
                    Create Custom Drop
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
                            What is a Custom Drop?
                        </AccordionTrigger>
                        <AccordionContent className="pt-2 text-[#94A3B8]">
                            A Custom Drop is an advanced token distribution system that allows you to assign different amounts to different users. It’s ideal for complex reward structures, tiered payouts, and logic-based distributions.
                        </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="2" className="border-b border-gray-700 pb-2">
                        <AccordionTrigger className="hover:no-underline [&[data-state=open]>svg]:rotate-180 text-[#E2E8F0] hover:text-white">
                            How is a Custom Drop different from Open Drops or Whitelist Drops?
                        </AccordionTrigger>
                        <AccordionContent className="pt-2 text-[#94A3B8]">
                            Open Drop: Everyone gets the same amount using a public code.
                            Whitelist Drop: Only approved wallets claim a fixed allocation.
                            Custom Drop: Each wallet can receive a unique, pre-defined amount based on your chosen criteria (rank, contribution, tier, etc.).
                        </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="3" className="border-b border-gray-700 pb-2">
                        <AccordionTrigger className="hover:no-underline [&[data-state=open]>svg]:rotate-180 text-[#E2E8F0] hover:text-white">
                            What makes Custom Drops flexible?
                        </AccordionTrigger>
                        <AccordionContent className="pt-2 text-[#94A3B8]">
                            You can map any logic you want leaderboards, contribution scores, or custom tiers. Every user can receive a different token amount within the same campaign.
                        </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="4" className="border-b border-gray-700 pb-2">
                        <AccordionTrigger className="hover:no-underline [&[data-state=open]>svg]:rotate-180 text-[#E2E8F0] hover:text-white">
                            Can I assign different amounts to each user?
                        </AccordionTrigger>
                        <AccordionContent className="pt-2 text-[#94A3B8]">
                            Yes. The Custom Drop faucet support variable payouts, so every wallet can receive a unique allocation in a single campaign.
                        </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="5" className="border-b border-gray-700 pb-2">
                        <AccordionTrigger className="hover:no-underline [&[data-state=open]>svg]:rotate-180 text-[#E2E8F0] hover:text-white">
                            Do I need to be a developer to use a custom drop?
                        </AccordionTrigger>
                        <AccordionContent className="pt-2 text-[#94A3B8]">
                            No. While the system is developer-friendly, the interface allows non-technical users to upload wallet amount mappings easily in formats such as csv,pdf,txt e.t.c.
                        </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="6" className="border-b-0">
                        <AccordionTrigger className="hover:no-underline [&[data-state=open]>svg]:rotate-180 text-[#E2E8F0] hover:text-white">
                            What does it cost to set up a Custom Faucet?
                        </AccordionTrigger>
                        <AccordionContent className="pt-2 text-[#94A3B8]">
                            A 5% platform fee on the amount you fund for distribution.
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            </motion.div>
        </div>
    );
}
