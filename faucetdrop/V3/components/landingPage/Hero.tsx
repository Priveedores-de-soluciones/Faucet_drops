'use client'
import { Rocket } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import MagneticButton from '@/components/MagneticButton';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// Register GSAP plugins
if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

// Water Drop Component
const WaterDrop: React.FC<{ delay: number }> = ({ delay }) => {
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!dropRef.current) return;

    // Animate water drop falling
    const tl = gsap.timeline({ 
      repeat: -1, 
      delay,
      repeatDelay: Math.random() * 2 + 1 
    });

    tl.set(dropRef.current, { 
      y: -50, 
      opacity: 1, 
      scale: 1 
    })
    .to(dropRef.current, {
      y: 300,
      opacity: 0.3,
      scale: 0.8,
      duration: 1.5,
      ease: 'power1.in'
    });

    return () => {
      tl.kill();
    };
  }, [delay]);

  return (
    <div 
      ref={dropRef}
      className="absolute left-1/2 top-0 w-7 h-10 md:w-10 md:h-16 -ml-3"
      style={{
        // background: 'linear-gradient(180deg, #00E5FF 0%, #4A90FF 100%)',
        background: 'url(/gsap/water-drop.svg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: "no-repeat",
        // borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%',
        // boxShadow: '0 0 10px rgba(0, 229, 255, 0.6)',
      }}
    />
  );
};

// Ripple Effect Component
const Ripple: React.FC<{ x: number; y: number; onComplete: () => void }> = ({ x, y, onComplete }) => {
  const rippleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!rippleRef.current) return;

    gsap.fromTo(
      rippleRef.current,
      { 
        scale: 0, 
        opacity: 0.8 
      },
      {
        scale: 3,
        opacity: 0,
        duration: 1.2,
        ease: 'power2.out',
        onComplete
      }
    );
  }, [onComplete]);

  return (
    <div
      ref={rippleRef}
      className="absolute pointer-events-none"
      style={{
        left: x,
        top: y,
        width: '60px',
        height: '60px',
        marginLeft: '-30px',
        marginTop: '-30px',
      }}
    >
      <svg width="60" height="60" viewBox="0 0 60 60">
        <circle
          cx="30"
          cy="30"
          r="20"
          fill="none"
          stroke="#00E5FF"
          strokeWidth="2"
          opacity="0.8"
          filter="url(#glow)"
        />
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
      </svg>
    </div>
  );
};

// Enhanced Drops Component with Glow and Water Animation
const Drops: React.FC = () => {
  const [ripples, setRipples] = useState<Array<{ id: number; x: number; y: number }>>([]);
  const imageRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const rippleIdRef = useRef(0);

  useEffect(() => {
    // Pulsing glow animation
    if (glowRef.current) {
      gsap.to(glowRef.current, {
        scale: 1.1,
        opacity: 0.9,
        duration: 3,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut'
      });
    }

    // Float animation for the faucet
    if (imageRef.current) {
      gsap.to(imageRef.current, {
        y: -10,
        duration: 2.5,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut'
      });
    }

    // Create ripples periodically
    const rippleInterval = setInterval(() => {
      const newRipple = {
        id: rippleIdRef.current++,
        x: 250, // Center of 500px container
        y: 400  // Near bottom
      };
      
      setRipples(prev => [...prev, newRipple]);
      
      // Remove ripple after animation
      setTimeout(() => {
        setRipples(prev => prev.filter(r => r.id !== newRipple.id));
      }, 1200);
    }, 2000);

    return () => {
      clearInterval(rippleInterval);
    };
  }, []);

  return (
    <div className="relative w-full h-full max-w-[500px] max-h-[500px] flex items-center justify-center">
      {/* Glow Effect */}
      <div
        ref={glowRef}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
        style={{
          width: '500px',
          height: '500px',
          background: 'radial-gradient(circle, rgba(74, 144, 255, 0.6) 0%, rgba(0, 229, 255, 0.3) 30%, rgba(0, 229, 255, 0.1) 60%, transparent 100%)',
          mixBlendMode: 'screen',
          opacity: 0.8,
          filter: 'blur(20px)',
        }}
      />

      {/* Water Drops */}
      <div className="absolute top-[90%] left-1/8 -translate-x-1/2 -z-10">
        {[...Array(5)].map((_, i) => (
          <WaterDrop key={i} delay={i * 0.3} />
        ))}
      </div>

      {/* Main Faucet Image */}
      <div 
        ref={imageRef}
        className="relative w-full h-full z-10"
        style={{
          transform: 'scale(0.9)',
        }}
      >
        <Image
          src="/dripin.png"
          alt="DripIn Icon"
          width={800}
          height={800}
          className="w-full h-full object-contain"
          priority
        />
      </div>

      {/* Ripples */}
      {ripples.map(ripple => (
        <Ripple
          key={ripple.id}
          x={ripple.x}
          y={ripple.y}
          onComplete={() => {}}
        />
      ))}
    </div>
  );
};

const HeroSection: React.FC = () => {
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const subtextRef = useRef<HTMLParagraphElement>(null);
  const buttonRef = useRef<HTMLDivElement>(null);
  const faucetContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Page load animation sequence
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

    // Split headline into words for animation
    if (headlineRef.current) {
      const words = headlineRef.current.textContent?.split(' ') || [];
      headlineRef.current.innerHTML = words
        .map(word => `<span class="inline-block opacity-0" style="transform: translateY(50px)">${word}</span>`)
        .join(' ');

      const wordElements = headlineRef.current.querySelectorAll('span');
      
      tl.to(wordElements, {
        opacity: 1,
        y: 0,
        duration: 0.8,
        stagger: 0.1,
        ease: 'back.out(1.7)'
      }, 0.8);
    }

    // Subtext fade up with blur
    if (subtextRef.current) {
      tl.fromTo(
        subtextRef.current,
        { 
          opacity: 0, 
          y: 30,
          filter: 'blur(10px)'
        },
        {
          opacity: 1,
          y: 0,
          filter: 'blur(0px)',
          duration: 1
        },
        1.2
      );
    }

    // Button scale in
    if (buttonRef.current) {
      tl.fromTo(
        buttonRef.current,
        { 
          scale: 0,
          opacity: 0 
        },
        {
          scale: 1,
          opacity: 1,
          duration: 0.6,
          ease: 'back.out(1.7)'
        },
        1.6
      );
    }

    // Faucet materialize
    if (faucetContainerRef.current) {
      tl.fromTo(
        faucetContainerRef.current,
        { 
          opacity: 0,
          scale: 0.5,
          filter: 'blur(20px)'
        },
        {
          opacity: 1,
          scale: 1,
          filter: 'blur(0px)',
          duration: 1.2,
          ease: 'power2.out'
        },
        1.8
      );
    }

  }, []);

  const handleLaunchApp = () => {
    if (navigator.userAgent.includes("MetaMask") || navigator.userAgent.includes("Trust")) {
      window.location.href = "https://app.faucetdrops.io/";
    } else {
      window.open("https://app.faucetdrops.io/", "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center py-10 w-full">

      {/* Main Content */}
      <div className="min-h-screen text-white flex flex-col-reverse md:flex-row items-center justify-center p-8 w-full relative z-10">
        <div className="max-w-7xl w-full gap-12 items-center">
          <div>
            <h2 
              ref={headlineRef}
              className="text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold leading-tight"
            >
              Unify Your Onchain Growth, Automate Your Rewards, Scale Engagement
            </h2>

            <p
              ref={subtextRef}
              className="text-gray-400 text-base lg:text-lg leading-relaxed max-w-2xl mt-6"
            >
              FaucetDrops helps web3 Projects, DAOs, Protocols, and Communities automate token distribution, run interactive campaigns and onboard real users at scale - all in one powerful platform.
            </p>

            <div ref={buttonRef} className="mt-8">
              <MagneticButton
                onClick={handleLaunchApp}
                className="group flex items-center gap-2 bg-linear-to-r from-[#0052FF] to-[#2563EB] hover:from-[#2563EB] hover:to-[#0052FF] text-white font-semibold px-8 py-4 rounded-full transition-all duration-200 shadow-lg shadow-[#0052FF]/30 hover:shadow-xl hover:shadow-[#0052FF]/50 relative overflow-hidden"
              >
                {/* Button glow effect on hover */}
                <span className="absolute inset-0 bg-linear-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                <span className="relative z-10">Launch App</span>
                <Rocket className="w-5 h-5 group-hover:translate-x-1 transition-transform relative z-10" />
              </MagneticButton>
            </div>
          </div>
        </div>

        {/* <div ref={faucetContainerRef} className="relative"> */}
          <Drops />
        {/* </div> */}
      </div>
    </div>
  );
};

export default HeroSection;