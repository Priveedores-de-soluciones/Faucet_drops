"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ExternalLink
} from "lucide-react";
import Image from "next/image";
import { motion } from "framer-motion";

export default function OfferTabs() {
  return (
    <div className="min-h-screen w-full flex justify-center items-center">
      <div className="w-full max-w-4xl flex flex-col gap-10">
        {/* Tabs */}
        <Tabs defaultValue="faucets" className="w-full">
          {/* Top Tab Bar */}
          <TabsList className="w-full flex justify-center bg-transparent p-0">
            <div className="flex w-full md:w-fit bg-[#020817]/50 border border-white/5 rounded-full p-1 backdrop-blur-sm">
              <TabsTrigger
                value="faucets"
                className="rounded-full px-10 py-2.5 text-sm text-gray-300 data-[state=active]:bg-[#2563EB]/10 data-[state=active]:text-white data-[state=active]:ring-1 data-[state=active]:ring-[#0052FF] transition-all"
              >
                Faucets
              </TabsTrigger>

              <TabsTrigger
                value="quests"
                className="rounded-full px-10 py-2.5 text-sm text-gray-300 data-[state=active]:bg-[#2563EB]/10 data-[state=active]:text-white data-[state=active]:ring-1 data-[state=active]:ring-[#0052FF] transition-all"
              >
                Quests
              </TabsTrigger>

              <TabsTrigger
                value="quizzes"
                className="rounded-full px-10 py-2.5 text-sm text-gray-300 data-[state=active]:bg-[#2563EB]/10 data-[state=active]:text-white data-[state=active]:ring-1 data-[state=active]:ring-[#0052FF] transition-all"
              >
                Quizzes
              </TabsTrigger>
              <TabsTrigger
                value="enterprice"
                className="rounded-full px-10 py-2.5 text-sm text-gray-300 data-[state=active]:bg-[#2563EB]/10 data-[state=active]:text-white data-[state=active]:ring-1 data-[state=active]:ring-[#0052FF] transition-all"
              >
                Enterprice
              </TabsTrigger>
            </div>
          </TabsList>

          {/* TAB CONTENT */}
          <TabsContent value="faucets" className="text-white mt-5">
            <div className="text-center text-sm opacity-60">
              <Card className="bg-transparent text-white border-0">
                <CardHeader>
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    viewport={{ once: true }}
                    className="flex gap-12 items-center justify-center"
                  >
                    <span className="flex items-center justify-center gap-1 text-xl">
                      Smarter, Flexibility, Onchain Distribution
                    </span>
                  </motion.div>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <motion.div
                    whileHover={{ scale: 1.05, y: -6 }}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    viewport={{ once: true }}
                    className="text-left flex flex-col justify-center space-y-4 group relative p-6 bg-[#2563EB] text-white rounded-lg border-0 transition-all duration-300 ease-out hover:bg-transparent hover:ring-1 hover:ring-[#2563EB] hover:scale-[1.03] cursor-pointer"
                  >
                    <h3 className="text-xl font-semibold relative bottom-0">
                      Open Drop
                    </h3>
                    <p className="text-base leading-relaxed opacity-0 group-hover:opacity-100 translate-y-3 group-hover:translate-y-0 transition-all duration-300">
                      Open-access distribution secured with a unique 6-character
                      drop-code
                    </p>

                    <Button className="flex items-center justify-end w-fit text-right gap-2 text-sm font-medium opacity-0 group-hover:opacity-100 translate-y-3 group-hover:translate-y-0 transition-all duration-300 mt-4 bg-[#2563EB] py-3 px-5 cursor-pointer rounded">
                      Learn more <ExternalLink className="h-4 w-4" />
                    </Button>
                  </motion.div>

                  <motion.div
                    whileHover={{ scale: 1.05, y: -6 }}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    viewport={{ once: true }}
                    className="text-left flex flex-col justify-center space-y-4 group relative p-6 bg-[#2563EB] text-white rounded-lg border-0 transition-all duration-300 ease-out hover:bg-transparent hover:ring-1 hover:ring-[#2563EB] hover:scale-[1.03] cursor-pointer"
                  >
                    <h3 className="text-xl font-semibold relative bottom-0">
                      Whitelist Drop
                    </h3>
                    <p className="text-base leading-relaxed opacity-0 group-hover:opacity-100 translate-y-3 group-hover:translate-y-0 transition-all duration-300">
                      Reward specific wallets with precision. Only approved
                      addresses can claim.
                    </p>

                    <Button className="flex items-center justify-end w-fit text-right gap-2 text-sm font-medium opacity-0 group-hover:opacity-100 translate-y-3 group-hover:translate-y-0 transition-all duration-300 mt-4 bg-[#2563EB] py-3 px-5 cursor-pointer rounded">
                      Learn more <ExternalLink className="h-4 w-4" />
                    </Button>
                  </motion.div>

                  <motion.div
                    whileHover={{ scale: 1.05, y: -6 }}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    viewport={{ once: true }}
                    className="text-left flex flex-col justify-center space-y-4 group relative p-6 bg-[#2563EB] text-white rounded-lg border-0 transition-all duration-300 ease-out hover:bg-transparent hover:ring-1 hover:ring-[#2563EB] hover:scale-[1.03] cursor-pointer"
                  >
                    <h3 className="text-xl font-semibold relative bottom-0">
                      Custom Drop
                    </h3>
                    <p className="text-base leading-relaxed opacity-0 group-hover:opacity-100 translate-y-3 group-hover:translate-y-0 transition-all duration-300">
                      Advanced fully customizable distribution engine with
                      complex logic
                    </p>

                    <Button className="flex items-center justify-end w-fit text-right gap-2 text-sm font-medium opacity-0 group-hover:opacity-100 translate-y-3 group-hover:translate-y-0 transition-all duration-300 mt-4 bg-[#2563EB] py-3 px-5 cursor-pointer rounded">
                      Learn more <ExternalLink className="h-4 w-4" />
                    </Button>
                  </motion.div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="quests" className="text-gray-300 mt-5">
            <div className="text-center text-sm opacity-60">
              <Card className="bg-transparent text-white border-0">
                <CardHeader>
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    viewport={{ once: true }}
                    className="flex gap-12 items-center justify-center"
                  >
                    <span className="flex items-center justify-center gap-1 text-xl">
                      Gamified Progress + Automated Rewards
                    </span>
                  </motion.div>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-10">
                  <motion.div
                    whileHover={{ scale: 1.08 }}
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    transition={{ duration: 0.5 }}
                    viewport={{ once: true }}
                    className="flex items-center justify-center ring-1 ring-[#2563EB] rounded-lg"
                  >
                    <Image
                      src="/networks/celo.svg"
                      alt=""
                      width={200}
                      height={200}
                      className="transition-all duration-300 ease-out group-hover:scale-110"
                    />
                  </motion.div>
                  <motion.div
                    whileHover={{ scale: 1.05, y: -6 }}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    viewport={{ once: true }}
                    className="text-left flex flex-col justify-center space-y-4 group relative p-6 bg-[#2563EB] text-white rounded-lg border-0 transition-all duration-300 ease-out hover:bg-transparent hover:ring-1 hover:ring-[#2563EB] hover:scale-[1.03] cursor-pointer"
                  >
                    <h3 className="text-xl font-semibold relative bottom-0">
                      Gamified Progress + Automated Rewards
                    </h3>
                    <p className="text-base leading-relaxed opacity-0 group-hover:opacity-100 translate-y-3 group-hover:translate-y-0 transition-all duration-300">
                      Incentivize users who lend or borrow assets on Aave,
                      Morpho, Euler, and more protocols.
                    </p>

                    <Button className="flex items-center justify-end w-fit text-right gap-2 text-sm font-medium opacity-0 group-hover:opacity-100 translate-y-3 group-hover:translate-y-0 transition-all duration-300 mt-4 bg-[#2563EB] py-3 px-5 cursor-pointer rounded">
                      Learn more <ExternalLink className="h-4 w-4" />
                    </Button>
                  </motion.div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="quizzes" className="text-gray-300 mt-5">
            <div className="text-center text-sm opacity-60">
              <Card className="bg-transparent text-white border-0">
                <CardHeader>
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    viewport={{ once: true }}
                    className="flex gap-12 items-center justify-center"
                  >
                    <span className="flex items-center justify-center gap-1 text-xl">
                      Fun, Interactive, AI-Powered Web3 Quiz Engine
                    </span>
                  </motion.div>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-10">
                  <motion.div
                    whileHover={{ scale: 1.08 }}
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    transition={{ duration: 0.5 }}
                    viewport={{ once: true }}
                    className="flex items-center justify-center ring-1 ring-[#2563EB] rounded-lg"
                  >
                    <Image
                      src="/networks/celo.svg"
                      alt=""
                      width={200}
                      height={200}
                      className="transition-all duration-300 ease-out group-hover:scale-110"
                    />
                  </motion.div>
                  <motion.div
                    whileHover={{ scale: 1.05, y: -6 }}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    viewport={{ once: true }}
                    className="text-left flex flex-col justify-center space-y-4 group relative p-6 bg-[#2563EB] text-white rounded-lg border-0 transition-all duration-300 ease-out hover:bg-transparent hover:ring-1 hover:ring-[#2563EB] hover:scale-[1.03] cursor-pointer"
                  >
                    <h3 className="text-xl font-semibold relative bottom-0">
                      Engagements
                    </h3>
                    <p className="text-base leading-relaxed opacity-0 group-hover:opacity-100 translate-y-3 group-hover:translate-y-0 transition-all duration-300">
                      Set up interactive, time-based, AI-Powered Web3 quizzes,
                      tied directly to onchain rewards
                    </p>

                    <Button className="flex items-center justify-end w-fit text-right gap-2 text-sm font-medium opacity-0 group-hover:opacity-100 translate-y-3 group-hover:translate-y-0 transition-all duration-300 mt-4 bg-[#2563EB] py-3 px-5 cursor-pointer rounded">
                      Learn more <ExternalLink className="h-4 w-4" />
                    </Button>
                  </motion.div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="enterprice" className="text-gray-300 mt-5">
            <div className="text-center text-sm opacity-60">
              <Card className="bg-transparent text-white border-0">
                <CardHeader>
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    viewport={{ once: true }}
                    className="flex gap-12 items-center justify-center"
                  >
                    <span className="flex items-center justify-center gap-1 text-xl">
                      White Label Solutions
                    </span>
                  </motion.div>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-10">
                  <motion.div
                    whileHover={{ scale: 1.08 }}
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    transition={{ duration: 0.5 }}
                    viewport={{ once: true }}
                    className="flex items-center justify-center ring-1 ring-[#2563EB] rounded-lg"
                  >
                    <Image
                      src="/networks/celo.svg"
                      alt=""
                      width={200}
                      height={200}
                      className="transition-all duration-300 ease-out group-hover:scale-110"
                    />
                  </motion.div>
                  <motion.div
                    whileHover={{ scale: 1.05, y: -6 }}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    viewport={{ once: true }}
                    className="text-left flex flex-col justify-center space-y-4 group relative p-6 bg-[#2563EB] text-white rounded-lg border-0 transition-all duration-300 ease-out hover:bg-transparent hover:ring-1 hover:ring-[#2563EB] hover:scale-[1.03] cursor-pointer"
                  >
                    <h3 className="text-xl font-semibold relative bottom-0">
                      White Label Solutions
                    </h3>
                    <p className="text-base leading-relaxed opacity-0 group-hover:opacity-100 translate-y-3 group-hover:translate-y-0 transition-all duration-300">
                      For Protocols and large ecosystems running
                      massiveCardTitle CardTitle Airdrops or global onboarding
                      campaigns
                    </p>

                    <Button className="flex items-center justify-end w-fit text-right gap-2 text-sm font-medium opacity-0 group-hover:opacity-100 translate-y-3 group-hover:translate-y-0 transition-all duration-300 mt-4 bg-[#2563EB] py-3 px-5 cursor-pointer rounded">
                      Learn more <ExternalLink className="h-4 w-4" />
                    </Button>
                  </motion.div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
