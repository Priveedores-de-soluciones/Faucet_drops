'use client'
import { Rocket } from 'lucide-react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
// import AnimatedHeroText from '@/components/AnimatedHeroText';
import MagneticButton from '@/components/MagneticButton';
// import { useRouter } from 'next/navigation';
import ScrollReveal from '@/components/ScrollReveal';

const Drops: React.FC = () => {
  return (
    <motion.div
      className="relative w-[500px] h-[500px]"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{
        opacity: 1,
        scale: 1,
        transition: {
          duration: 0.8,
          ease: [0.2, 0.8, 0.2, 1]
        }
      }}
    >
      <Image
        src="/dripin.png"
        alt="DripIn Icon"
        width={1000}
        height={1000}
        className="object-contain blended-img3 hover:scale-105 transition-transform duration-1000"
      />
      <AnimatedGradient />
    </motion.div>
  );
};

const AnimatedGradient = () => {
  const [position, setPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const x = e.clientX / window.innerWidth - 0.5;
      const y = e.clientY / window.innerHeight - 0.5;
      setPosition({ x, y });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <>
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute inset-0 rounded-full opacity-20"
          style={{
            background: `radial-gradient(circle at ${50 + position.x * 20}% ${50 + position.y * 20}%, 
              rgba(99, 102, 241, ${0.1 + i * 0.1}), 
              transparent 70%)`,
            transform: `translate(${position.x * 10}px, ${position.y * 10}px)`,
            transition: 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
        />
      ))}
    </>
  );
};

const HeroSection: React.FC = () => {
  // const router = useRouter();

  const handleLaunchApp = () => {
    if (navigator.userAgent.includes("MetaMask") || navigator.userAgent.includes("Trust")) {
      window.location.href = "https://app.faucetdrops.io/";
    } else {
      window.open("https://app.faucetdrops.io/", "_blank", "noopener,noreferrer");
    }
    
    // window.open('https://app.faucetdrops.io/', '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center py-10 w-full">
      {/* Animated Background Elements */}
      <svg className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute top-10 right-20 w-32 h-32 bg-lime-400/10 rounded-full"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.1, 0.3, 0.1],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
        <motion.div
          className="absolute bottom-20 right-10 w-96 h-96 bg-lime-400/5 rounded-full"
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.05, 0.1, 0.05],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: 1
          }}
        />
        <defs>
          <linearGradient id="lineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#a3e635" stopOpacity="0" />
            <stop offset="50%" stopColor="#a3e635" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#a3e635" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>

      {/* New Pattern */}
      <div className="min-h-screen text-white flex flex-col-reverse md:flex-row items-center justify-center p-8 w-full">
        <motion.div
          className="max-w-7xl w-full  gap-12 items-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.8 }}
        >
          <motion.div
            className=""
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.8 }}
          >
            <ScrollReveal
              direction="up"
              delay={500}
            >
              <h2 className="text-2xl md:text-3xl lg:text-4xl mx:text-5xl font-bold leading-tight">
                Unify Your Onchain Growth, Automate Your Rewards, Scale Engagement
              </h2>
            </ScrollReveal>

            <motion.p
              className="text-gray-400 text-base lg:text-lg leading-relaxed max-w-2xl mt-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 2, duration: 1 }}
            >
              FaucetDrops helps web3 Projects, DAOs, Protocols, and Communities automate token distribution, run interactive campaigns and onboard real users at scale - all in one powerful platform.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 2.5, duration: 0.8 }}
              className="mt-8"
            >
              <MagneticButton
                onClick={handleLaunchApp}
                className="group flex items-center gap-2 bg-linear-to-r from-[#0052FF] to-[#2563EB] hover:from-[#2563EB] hover:to-[#0052FF] text-black font-semibold px-8 py-4 rounded-full transition-all duration-200 shadow-lg shadow-[#94A3B8]/20 hover:shadow-xl hover:shadow-[#94A3B8]/30"
              >
                Launch App
                <Rocket className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </MagneticButton>
            </motion.div>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.8 }}
          className="relative"
        >
          <Drops />
        </motion.div>
      </div>
    </div>
  );
};

export default HeroSection;