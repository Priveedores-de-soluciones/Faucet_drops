import HeroSection from "@/components/landingPage/Hero";
import Networks from "@/components/Networks";
import OfferTabs from "@/components/landingPage/OfferTabs"
import FaucetChats from "@/components/landingPage/FaucetChats";
import ProtocolsStats from "@/components/landingPage/ProtocolsStats";
import CTA from "@/components/landingPage/CTA";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="container">
        <HeroSection />
        <Networks />
        <FaucetChats />
        <OfferTabs />
        <ProtocolsStats />
        <CTA />
      </div>
    </div>
  );
}
