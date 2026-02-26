'use client'
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, FingerprintPattern } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

// type CardProps = {
//   id: number;
//   title: string;
//   desc: string;
//   path: string;
// };

// Flowing Particles along connection lines
// const FlowingParticles: React.FC<{ fromIndex: number; toIndex: number }> = ({ fromIndex, toIndex }) => {
//   const particleRef = useRef<HTMLDivElement>(null);

//   useEffect(() => {
//     if (!particleRef.current) return;

//     // Animate particle along path
//     gsap.to(particleRef.current, {
//       x: (toIndex - fromIndex) * 100,
//       opacity: [0, 1, 1, 0],
//       duration: 2,
//       repeat: -1,
//       ease: 'none',
//       delay: Math.random() * 2
//     });

//     return () => {
//       gsap.killTweensOf(particleRef.current);
//     };
//   }, [fromIndex, toIndex]);

//   return (
//     <div
//       ref={particleRef}
//       className="absolute w-2 h-2 rounded-full bg-[#00E5FF] opacity-0"
//       style={{
//         boxShadow: '0 0 8px #00E5FF',
//       }}
//     />
//   );
// };

// Circuit Pattern Background
const CircuitPattern: React.FC = () => {
  return (
    <div
      className="absolute inset-0 opacity-5 pointer-events-none"
      style={{
        backgroundImage: `
          linear-gradient(90deg, rgba(74, 144, 255, 0.1) 1px, transparent 1px),
          linear-gradient(0deg, rgba(74, 144, 255, 0.1) 1px, transparent 1px)
        `,
        backgroundSize: '40px 40px',
      }}
    />
  );
};

export default function OfferTabs() {
  // const [openCard, setOpenCard] = useState<CardProps | null>(null);
  const [activeTab, setActiveTab] = useState("faucets");
  const titleRef = useRef<HTMLHeadingElement>(null);
  const tabsRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Title glitch-in animation on scroll
      if (titleRef.current) {
        // const text = titleRef.current.textContent || '';

        gsap.fromTo(
          titleRef.current,
          {
            opacity: 0,
            y: 30,
            filter: 'blur(10px)',
          },
          {
            opacity: 1,
            y: 0,
            filter: 'blur(0px)',
            duration: 0.8,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: titleRef.current,
              start: 'top 80%',
              once: true,
            },
            onStart: () => {
              // Glitch effect
              if (!titleRef.current) return;
              const glitchTl = gsap.timeline();
              glitchTl
                .to(titleRef.current, { x: -3, duration: 0.05 })
                .to(titleRef.current, { x: 3, duration: 0.05 })
                .to(titleRef.current, { x: -2, duration: 0.05 })
                .to(titleRef.current, { x: 0, duration: 0.05 });
            }
          }
        );
      }

      // Tabs slide in
      if (tabsRef.current) {
        gsap.fromTo(
          tabsRef.current,
          {
            opacity: 0,
            y: 20,
          },
          {
            opacity: 1,
            y: 0,
            duration: 0.6,
            ease: 'back.out(1.7)',
            scrollTrigger: {
              trigger: tabsRef.current,
              start: 'top 80%',
              once: true,
            },
            delay: 0.3
          }
        );
      }
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={sectionRef} className="relative">
      {/* Circuit Pattern Background */}
      <CircuitPattern />

      <h1
        ref={titleRef}
        className="text-3xl md:text-4xl font-bold leading-tight tracking-[-0.015em] px-4 py-20 text-center text-white"
      >
        The Flow Starts Here
      </h1>

      <div className="w-full flex justify-center items-center">
        <div className="w-full max-w-4xl flex flex-col gap-10">
          <Tabs
            defaultValue="faucets"
            className="w-full"
            onValueChange={(value) => setActiveTab(value)}
          >
            <TabsList
              ref={tabsRef}
              className="w-full flex justify-center bg-transparent p-0"
            >
              <div className="flex w-fit md:w-fit bg-[#020817]/50 border border-white/5 rounded-full p-1 backdrop-blur-sm overflow-x-auto">
                {["faucets", "quests", "quizzes", "enterprise"].map((tab) => (
                  <TabsTrigger
                    key={tab}
                    value={tab}
                    className="rounded-full px-5 md:px-10 py-1.5 md:py-2.5 text-base md:text-lg text-gray-300
                      data-[state=active]:bg-[#2563EB]/10 data-[state=active]:text-white
                      data-[state=active]:ring-1 data-[state=active]:ring-[#0052FF] transition-all"
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </TabsTrigger>
                ))}
              </div>
            </TabsList>

            {/* ============================ FAUCETS TAB ============================ */}
            <TabsContent value="faucets" className="text-white mt-5">
              <TabHeader text="Smarter, Flexibility, Onchain Distribution" />

              <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  {
                    id: 1,
                    title: "Open Drop",
                    desc: "Open-access distribution secured with a unique 6-character drop-code",
                    path: "/faucets/open-drop"
                  },
                  {
                    id: 2,
                    title: "Whitelist Drop",
                    desc: "Reward specific wallets with precision. Only approved addresses can claim.",
                    path: "/faucets/whitelist-drop"
                  },
                  {
                    id: 3,
                    title: "Custom Drop",
                    desc: "Advanced fully customizable distribution engine with complex logic",
                    path: "/faucets/custom-drop"
                  },
                ].map((card, index) => (
                  <GeneralCard
                    key={card.id}
                    card={card}
                    // openCard={openCard}
                    // setOpenCard={setOpenCard}
                    index={index}
                    activeTab={activeTab}
                    tabValue="faucets"
                  />
                ))}
              </CardContent>
            </TabsContent>

            {/* ============================ QUESTS TAB ============================ */}
            <TabsContent value="quests" className="text-white mt-5">
              <TabHeader text="Gamified Progress + Automated Rewards" />

              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <ImgBox src="111.png" activeTab={activeTab} tabValue="quests" />

                <GeneralCard
                  card={{
                    id: 4,
                    title: "Quests",
                    desc: "Create task-based quests with points and automatically distribute rewards upon completion",
                    path: "/quest"
                  }}
                  // openCard={openCard}
                  // setOpenCard={setOpenCard}
                  index={0}
                  activeTab={activeTab}
                  tabValue="quests"
                />
              </CardContent>
            </TabsContent>

            {/* ============================ QUIZZES TAB ============================ */}
            <TabsContent value="quizzes" className="text-white mt-5">
              <TabHeader text="Fun, Interactive, AI-Powered Web3 Quiz Engine" />

              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <ImgBox src="222.png" activeTab={activeTab} tabValue="quizzes" />

                <GeneralCard
                  card={{
                    id: 5,
                    title: "Quizzes",
                    desc: "Set up interactive, time-based, AI-powered Web3 quizzes tied directly to onchain rewards",
                    path: "/quizzes"
                  }}
                  // openCard={openCard}
                  // setOpenCard={setOpenCard}
                  index={0}
                  activeTab={activeTab}
                  tabValue="quizzes"
                />
              </CardContent>
            </TabsContent>

            {/* ============================ ENTERPRISE TAB ============================ */}
            <TabsContent value="enterprise" className="text-white mt-5">
              <TabHeader text="White Label Solutions" />

              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <ImgBox src="333.png" activeTab={activeTab} tabValue="enterprise" />

                <GeneralCard
                  card={{
                    id: 6,
                    title: "Enterprise",
                    desc: "Designed for protocols and large ecosystems running massive airdrops or global onboarding campaigns",
                    path: "/enterprise"
                  }}
                  // openCard={openCard}
                  // setOpenCard={setOpenCard}
                  index={0}
                  activeTab={activeTab}
                  tabValue="enterprise"
                />
              </CardContent>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------- COMPONENTS ---------------------------------- */

function TabHeader({ text }: { text: string }) {
  const headerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const currentHeader = headerRef.current;
    if (!currentHeader) return;

    gsap.fromTo(
      currentHeader,
      {
        opacity: 0,
        y: 20,
      },
      {
        opacity: 1,
        y: 0,
        duration: 0.6,
        ease: 'power2.out',
      }
    );

    return () => {
      gsap.killTweensOf(currentHeader);
    };
  }, [text]);

  return (
    <Card className="bg-transparent text-white border-0">
      <CardHeader>
        <div ref={headerRef} className="flex gap-12 items-center justify-center opacity-0">
          <span className="text-xl opacity-80">{text}</span>
        </div>
      </CardHeader>
    </Card>
  );
}

/* --------------------------- GENERAL CARD (All Tabs) --------------------------- */
function GeneralCard({
  card,
  index,
  activeTab,
  tabValue,
}: {
  card: {
    id: number;
    title: string;
    desc: string;
    path: string;
  };
  index: number;
  activeTab: string;
  tabValue: string;
  // openCard: CardProps | null;
  // setOpenCard: (card: CardProps | null) => void;
}) {
  const [isFlipped, setIsFlipped] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  useEffect(() => {
    const currentCard = cardRef.current;
    if (!currentCard) return;

    // Sequential card entrance when tab becomes active
    if (activeTab === tabValue) {
      gsap.fromTo(
        currentCard,
        {
          opacity: 0,
          y: 30,
          scale: 0.9,
        },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.6,
          delay: index * 0.2,
          ease: 'back.out(1.7)',
        }
      );
    }

    return () => {
      gsap.killTweensOf(currentCard);
    };
  }, [index, activeTab, tabValue]);

  const handleCardClick = () => {
    if (isMobile) {
      setIsFlipped(!isFlipped);
    }
  };

  const handleMouseEnter = () => {
    if (!isMobile) {
      setIsFlipped(true);
    }
  };

  const handleMouseLeave = () => {
    if (!isMobile) {
      setIsFlipped(false);
    }
  };

  return (
    <div
      className="relative h-full min-h-[300px] perspective-1000"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleCardClick}
    >
      {/* Card Container */}
      <div
        ref={cardRef}
        className={`relative w-full h-full transition-transform duration-700 ease-in-out transform-style-preserve-3d ${isFlipped ? 'rotate-y-180' : ''
          }`}
        style={{
          transformStyle: 'preserve-3d',
          transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
        }}
      >
        {/* Front of Card */}
        <div className="absolute w-full h-full backface-hidden bg-[#2563EB] rounded-lg p-6 flex flex-col justify-center items-center text-center">
          <h3 className="text-3xl md:text-4xl font-semibold md:font-bold mb-4">{card.title}</h3>
          {/* <p className="text-lg mb-6">Click or hover to learn more</p> */}
          <div className="flex items-center gap-2 text-white/80">
            <span>{isMobile ? 'Tap' : 'Hover'} to learn more</span>
            <FingerprintPattern className="h-5 w-5 md:hidden" />
          </div>
        </div>

        {/* Back of Card */}
        <div className="absolute w-full h-full backface-hidden border-2 rounded-lg p-6 transform rotate-y-180 border-[#2563EB] flex flex-col justify-between items-start">
          <h3 className="text-3xl font-semibold mb-4">{card.title}</h3>
          <p className="text-lg mb-6">{card.desc}</p>
          <Link href={card.path} passHref>
            <Button
              asChild
              className="flex items-center justify-center w-fit gap-2 text-base font-bold mt-4 rounded px-5 py-3 bg-white text-[#020817] hover:bg-gray-300 transition-colors"
            >
              <Button className="flex items-center gap-2">
                Learn more <ExternalLink className="h-4 w-4" />
              </Button>
            </Button>
          </Link>
        </div>

        {/* Glow effect */}
        <div
          ref={glowRef}
          className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
          style={{
            boxShadow: '0 0 30px rgba(37, 99, 235, 0.5)',
          }}
        />
      </div>
    </div>
  );
}

/* ------------------------------- IMAGE BOX -------------------------------- */

function ImgBox({
  src,
  activeTab,
  tabValue
}: {
  src: string;
  activeTab: string;
  tabValue: string;
}) {
  const imgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const currentImg = imgRef.current;
    if (!currentImg) return;

    // Image entrance animation when tab becomes active
    if (activeTab === tabValue) {
      gsap.fromTo(
        currentImg,
        {
          opacity: 0,
          x: -30,
          scale: 0.95,
        },
        {
          opacity: 1,
          x: 0,
          scale: 1,
          duration: 0.8,
          delay: 0.2,
          ease: 'power2.out',
        }
      );
    }

    return () => {
      gsap.killTweensOf(currentImg);
    };
  }, [activeTab, tabValue]);

  return (
    <div
      ref={imgRef}
      className="order-2 md:order-1 flex items-center justify-center ring-1 ring-[#2563EB] rounded-lg bg-cover bg-center opacity-0 relative overflow-hidden group"
      style={{
        backgroundImage: `url('/${src}')`,
        minHeight: "260px"
      }}
    >
      {/* Hover overlay effect */}
      <div className="absolute inset-0 bg-linear-to-t from-[#0052FF]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      {/* Shine effect on hover */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700"
        style={{
          background: 'linear-gradient(135deg, transparent 40%, rgba(255, 255, 255, 0.1) 50%, transparent 60%)',
          backgroundSize: '200% 200%',
          animation: 'shine 2s infinite',
        }}
      />
    </div>
  );
}