'use client'
import Image from "next/image";
import { useRef, useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

// Geometric Shapes Component
const FloatingShapes: React.FC = () => {
  const shapesRef = useRef<(SVGSVGElement | null)[]>([]);

  useEffect(() => {
    const currentShapes = shapesRef.current; // Capture the current value
  
    currentShapes.forEach((shape, i) => {
      if (shape) gsap.to(shape, {
        rotation: Math.random() * 360,
        duration: Math.random() * 3 + 3,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
        delay: i * 0.2
      });
    });
  
    return () => {
      currentShapes.forEach(shape => {
        if (shape) gsap.killTweensOf(shape); // Use the captured value
      });
    };
  }, []);

  const shapes = [
    { type: 'triangle', color: '#4A90FF', size: 40, top: '10%', left: '5%' },
    { type: 'circle', color: '#00E5FF', size: 30, top: '20%', right: '8%' },
    { type: 'hexagon', color: '#B84AFF', size: 35, bottom: '15%', left: '10%' },
    { type: 'square', color: '#4A90FF', size: 25, top: '60%', right: '15%' },
    { type: 'pentagon', color: '#00E5FF', size: 32, top: '40%', left: '3%' },
    { type: 'star', color: '#B84AFF', size: 28, bottom: '20%', right: '5%' },
  ];

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
      {shapes.map((shape, i) => (
        <svg
          key={i}
          ref={el => shapesRef.current[i] = el}
          className="absolute"
          width={shape.size}
          height={shape.size}
          viewBox="0 0 100 100"
          style={{
            top: shape.top,
            left: shape.left,
            right: shape.right,
            bottom: shape.bottom,
          }}
        >
          {shape.type === 'triangle' && (
            <polygon points="50,10 90,90 10,90" fill={shape.color} opacity="0.6" />
          )}
          {shape.type === 'circle' && (
            <circle cx="50" cy="50" r="40" fill={shape.color} opacity="0.6" />
          )}
          {shape.type === 'hexagon' && (
            <polygon points="50,5 90,27.5 90,72.5 50,95 10,72.5 10,27.5" fill={shape.color} opacity="0.6" />
          )}
          {shape.type === 'square' && (
            <rect x="15" y="15" width="70" height="70" fill={shape.color} opacity="0.6" />
          )}
          {shape.type === 'pentagon' && (
            <polygon points="50,10 90,40 75,90 25,90 10,40" fill={shape.color} opacity="0.6" />
          )}
          {shape.type === 'star' && (
            <polygon points="50,10 61,35 88,40 68,60 73,88 50,75 27,88 32,60 12,40 39,35" fill={shape.color} opacity="0.6" />
          )}
        </svg>
      ))}
    </div>
  );
};

// Network Logo with hover animation
const NetworkLogo = ({ src, alt }: { src: string; alt: string }) => {
  const logoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!logoRef.current) return;

    const handleMouseEnter = () => {
      gsap.to(logoRef.current, {
        scale: 1.1,
        opacity: 1,
        duration: 0.3,
        ease: 'back.out(1.7)'
      });
    };

    const handleMouseLeave = () => {
      gsap.to(logoRef.current, {
        scale: 1,
        opacity: 0.7,
        duration: 0.3,
        ease: 'power2.out'
      });
    };

    const element = logoRef.current;
    element.addEventListener('mouseenter', handleMouseEnter);
    element.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      element.removeEventListener('mouseenter', handleMouseEnter);
      element.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  return (
    <div 
      ref={logoRef}
      className="relative h-12 w-32 flex items-center justify-center cursor-pointer"
    >
      <Image
        src={src}
        alt={alt}
        width={100}
        height={40}
        className="object-contain h-full w-full opacity-70 transition-opacity"
      />
    </div>
  );
};

// Network Group for infinite scroll
const NetworkGroup = ({ networks }: { networks: { src: string; alt: string }[] }) => {
  return (
    <div className="flex items-center gap-20 whitespace-nowrap">
      {networks.map((network, i) => (
        <div key={i}>
          <NetworkLogo src={network.src} alt={network.alt} />
        </div>
      ))}
    </div>
  );
};

// Scan Line Effect
const ScanLine: React.FC = () => {
  const scanRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!scanRef.current) return;

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: scanRef.current.parentElement,
        start: 'top 70%',
        once: true,
      }
    });

    tl.fromTo(
      scanRef.current,
      { top: '0%' },
      {
        top: '100%',
        duration: 2,
        ease: 'power1.inOut',
      }
    );

    return () => {
      tl.kill();
    };
  }, []);

  return (
    <div
      ref={scanRef}
      className="absolute left-0 right-0 h-[2px] pointer-events-none"
      style={{
        background: 'linear-gradient(90deg, transparent 0%, #00E5FF 50%, transparent 100%)',
        boxShadow: '0 0 20px #00E5FF',
        opacity: 0.6,
      }}
    />
  );
};

export default function Networks() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const blobRef = useRef<HTMLDivElement>(null);

  const networks = [
    { src: "/networks/celo.svg", alt: "Celo" },
    { src: "/networks/base.svg", alt: "Base" },
    { src: "/networks/lisk.svg", alt: "Lisk" },
    { src: "/networks/arbitrum.svg", alt: "Arbitrum" },
    { src: "/networks/self.svg", alt: "Self" }
  ];

  useEffect(() => {
    // Scroll-triggered section entrance
    const ctx = gsap.context(() => {
      // Expanding gradient blob background
      if (blobRef.current) {
        gsap.fromTo(
          blobRef.current,
          {
            scale: 0,
            opacity: 0
          },
          {
            scale: 1,
            opacity: 1,
            duration: 1.5,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: sectionRef.current,
              start: 'top 70%',
              once: true,
            }
          }
        );

        // Continuous pulse animation after entrance
        gsap.to(blobRef.current, {
          scale: 1.05,
          duration: 3,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
          delay: 1.5
        });
      }

      // Character-by-character text reveal
      if (headlineRef.current) {
        const text = headlineRef.current.textContent || '';
        const chars = text.split('');
        
        headlineRef.current.innerHTML = chars
          .map((char) => {
            if (char === ' ') return '<span class="inline-block">&nbsp;</span>';
            return `<span class="inline-block opacity-0" style="transform: translateY(20px);">${char}</span>`;
          })
          .join('');

        const charElements = headlineRef.current.querySelectorAll('span');

        gsap.to(charElements, {
          opacity: 1,
          y: 0,
          duration: 0.05,
          stagger: 0.02,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: headlineRef.current,
            start: 'top 80%',
            once: true,
          }
        });
      }

      // Infinite horizontal scroll for logos
      if (scrollContainerRef.current) {
        const scrollWidth = scrollContainerRef.current.scrollWidth / 3; // Divide by number of duplicates

        gsap.to(scrollContainerRef.current, {
          x: -scrollWidth,
          duration: 20,
          ease: 'none',
          repeat: -1,
          modifiers: {
            x: gsap.utils.unitize(x => parseFloat(x) % scrollWidth)
          }
        });

        // Pause on hover
        scrollContainerRef.current.addEventListener('mouseenter', () => {
          gsap.to(scrollContainerRef.current, { timeScale: 0, duration: 0.5 });
        });

        scrollContainerRef.current.addEventListener('mouseleave', () => {
          gsap.to(scrollContainerRef.current, { timeScale: 1, duration: 0.5 });
        });
      }
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <div 
      ref={sectionRef}
      className="relative mx-auto max-w-full px-0 w-[1280px] py-14 max-md:py-5 overflow-hidden"
    >
      {/* Floating Geometric Shapes */}
      <FloatingShapes />

      {/* Background Gradient Blob */}
      <div
        ref={blobRef}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
        style={{
          width: '800px',
          height: '800px',
          // background: 'radial-gradient(circle, rgba(74, 144, 255, 0.15) 0%, rgba(0, 229, 255, 0.08) 40%, transparent 70%)',
          filter: 'blur(40px)',
          opacity: 0,
        }}
      />

      {/* Scan Line Effect */}
      <ScanLine />

      <div className="flex flex-col items-center justify-center gap-10 px-4 text-center relative z-10">
        {/* Headline with character reveal */}
        <h2 
          ref={headlineRef}
          className="text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold text-white leading-relaxed relative"
        >
          The future of Web3 user acquisition is automated, verifiable and fun. We&apos;re building it!
        </h2>

        {/* Network Logos Infinite Scroll */}
        <div className="relative w-full">
          <div className="relative flex w-full flex-nowrap overflow-hidden h-[100px]">
            <div 
              ref={scrollContainerRef}
              className="flex items-center gap-20"
            >
              {/* Duplicate networks 3 times for seamless loop */}
              {[...Array(3)].map((_, groupIndex) => (
                <NetworkGroup key={groupIndex} networks={networks} />
              ))}
            </div>
          </div>
        </div>  
      </div>
    </div>
  );
}