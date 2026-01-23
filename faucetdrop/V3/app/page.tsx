import HeroSection from "@/components/landingPage/Hero";
import Networks from "@/components/Networks";
import OfferTabs from "@/components/landingPage/OfferTabs"
import FaucetChats from "@/components/landingPage/FaucetChats";
import ProtocolsStats from "@/components/landingPage/ProtocolsStats";
import CTA from "@/components/landingPage/CTA";
import FaucetFlow from "@/components/landingPage/FaucetFlow";
import GraphChart from "@/components/landingPage/GraphChart";
import WhyFaucetDrops from "@/components/landingPage/WhyFaucetDrops";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="container">
        <HeroSection />
        <Networks />
        <h1 className="text-3xl md:text-4xl font-bold leading-tight tracking-[-0.015em] px-4 py-20 text-center text-white">The Flow Starts Here</h1>
        <OfferTabs />
        <WhyFaucetDrops />
        <FaucetFlow />
        <ProtocolsStats />
        <GraphChart />
        <CTA />
        <FaucetChats />
      </div>
    </div>
  );
}
