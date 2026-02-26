import HeroSection from "@/components/landingPage/Hero";
import Networks from "@/components/Networks";
import OfferTabs from "@/components/landingPage/OfferTabs"
// import FaucetChats from "@/components/landingPage/FaucetChats";
import ProtocolsStats from "@/components/landingPage/ProtocolsStats";
import CTA from "@/components/landingPage/CTA";
import FaucetFlow from "@/components/landingPage/FaucetFlow";
import GraphChart from "@/components/landingPage/GraphChart";
import WhyFaucetDrops from "@/components/landingPage/WhyFaucetDrops";
// import ChatBot from "@/components/landingPage/ChatBot";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="container">
        <HeroSection />
        <Networks />
        <OfferTabs />
        <WhyFaucetDrops />
        <FaucetFlow />
        <ProtocolsStats />
        <GraphChart />
        <CTA />
      </div>
    </div>
  );
}
