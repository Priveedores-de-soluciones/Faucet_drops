"use client";

import { motion } from "framer-motion";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { CheckCircle, Sparkles, Settings, Radio } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";

export default function WhitelistDrop() {

    const features = [
        { textHead: "Closed Security", textBody: "If a wallet isn't on your list, they cannot claim." },
        { textHead: "Bulk Uploads", textBody: "Easily add wallet addresses to authorize hundreds of users in one click." },
        { textHead: "Gasless Claiming", textBody: "Whitelisted users claim their allocated tokens without paying gas fees." },
        { textHead: "Claim Tracking", textBody: "Monitor exactly who has claimed their allocation and who hasn't." },
    ]

    const howItWorks = [
        { textHead: "Define the List", textBody: "Add your list of eligible wallet addresses. (e.g., DAO members, NFT holders)." },
        { textHead: "Set Allocation", textBody: "Determine the fixed amount each whitelisted address receives." },
        { textHead: "Activate", textBody: "The drop goes live." },
        { textHead: "Secure Claim", textBody: "Users connect their wallets; the contract verifies their eligibility and releases funds." }
    ]

    const useCases = [
        { textHead: "DAO Distributions", textBody: "Monthly rewards for active governance members.", image: "/learnMore/distribution.png" },
        { textHead: "Mainnet Incentives", textBody: "Distribute tokens securely to approved developers and users.", image: "/learnMore/incentives.png" },
        { textHead: "Private Airdrops", textBody: "Distribute tokens privately to approved wallet addresses.", image: "/learnMore/airdrop.png" },
        { textHead: "Contest winner rewards", textBody: "Distribute rewards securely to contest winners and participants    .", image: "/learnMore/winner.png" }
    ]

    const createWhitelistDrop = () => {
        window.open('https://app.faucetdrops.io/faucet/create-faucet?type=whitelist', '_blank');
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
                    Whitelist Drop
                </h1>
                <p className="mt-3 text-[#94A3B8] text-lg font-medium">
                    Exclusivity, Security, and Loyalty.
                </p>
                <p className="mt-4 text-[#E2E8F0]">
                    Use this Faucet for Precision Rewards for your community. With the Whitelist Drop Faucet, only approved addresses can claim, ensuring your tokens go exactly where they are intended. This distribution logic is ideal for Community/DAO payouts, contest/campaign winner rewards, and private airdrops.
                </p>
                <Button
                    onClick={createWhitelistDrop}
                    variant={"outline"}
                    className="mt-5 hover:bg-white/80"
                >
                    Create Whitelist Drop
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
                            What is a Whitelist Drop?
                        </AccordionTrigger>
                        <AccordionContent className="pt-2 text-[#94A3B8]">
                            A Whitelist Drop is a secure token distribution method where only whitelisted wallet addresses can claim, ensuring rewards go exactly to intended users.
                        </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="2" className="border-b border-gray-700 pb-2">
                        <AccordionTrigger className="hover:no-underline [&[data-state=open]>svg]:rotate-180 text-[#E2E8F0] hover:text-white">
                            How do I create a Whitelist Drop?
                        </AccordionTrigger>
                        <AccordionContent className="pt-2 text-[#94A3B8]">
                            Add a list of eligible wallet addresses, set the allocation amount for each address, activate the drop, and share the claim link with your community.
                        </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="3" className="border-b border-gray-700 pb-2">
                        <AccordionTrigger className="hover:no-underline [&[data-state=open]>svg]:rotate-180 text-[#E2E8F0] hover:text-white">
                            Can users claim if their wallet is not on the whitelist?
                        </AccordionTrigger>
                        <AccordionContent className="pt-2 text-[#94A3B8]">
                            No. If a wallet isn’t on the drop-list, they can not claim. The system enforces strict closed security.
                        </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="4" className="border-b border-gray-700 pb-2">
                        <AccordionTrigger className="hover:no-underline [&[data-state=open]>svg]:rotate-180 text-[#E2E8F0] hover:text-white">
                            Are claims gasless for users?
                        </AccordionTrigger>
                        <AccordionContent className="pt-2 text-[#94A3B8]">
                            Yes. All whitelisted users can claim their rewards without paying gas fees.
                        </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="5" className="border-b border-gray-700 pb-2">
                        <AccordionTrigger className="hover:no-underline [&[data-state=open]>svg]:rotate-180 text-[#E2E8F0] hover:text-white">
                            Can I track who has claimed their allocation?
                        </AccordionTrigger>
                        <AccordionContent className="pt-2 text-[#94A3B8]">
                            Yes. Full claim tracking shows which wallets have claimed and which are still pending.
                        </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="6" className="border-b-0">
                        <AccordionTrigger className="hover:no-underline [&[data-state=open]>svg]:rotate-180 text-[#E2E8F0] hover:text-white">
                            What does it cost to set up a Whitelist Drop Faucet?
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

