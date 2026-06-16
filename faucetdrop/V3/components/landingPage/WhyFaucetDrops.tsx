'use client'
import { useMemo, useState, useEffect, useRef } from 'react';
import gsap from 'gsap';
import SplitText from 'gsap/SplitText';

const KnowFaucetDrops = () => {
  const textRef = useRef<HTMLParagraphElement | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const splitRef = useRef<any>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const texts = useMemo(() => [
    "Web3 teams want to grow",
    "Users want engagement",
    "But the current tools are fragmented, expensive and complicated",
    "FaucetDrops Unifies Everything..."
  ], []);

  useEffect(() => {
    if (!textRef.current) return;

    const ctx = gsap.context(() => {
      const animateText = () => {
        // Clean previous split
        if (splitRef.current) {
          splitRef.current.revert();
        }

        // Insert new text
        textRef.current!.textContent = texts[currentIndex];

        // Split into chars
        splitRef.current = SplitText.create(textRef.current, {
          type: "chars,words"
        });

        // Animate in
        gsap.from(splitRef.current.chars, {
          y: 80,
          opacity: 0,
          duration: 0.6,
          ease: "power4.out",
          stagger: 0.02,
          onComplete: () => {
            // Pause before next text
            gsap.delayedCall(1.2, () => {
              // Animate out
              gsap.to(splitRef.current.chars, {
                y: -40,
                opacity: 0,
                duration: 0.4,
                ease: "power2.in",
                stagger: 0.015,
                onComplete: () => {
                  setCurrentIndex((prev) => (prev + 1) % texts.length);
                }
              });
            });
          }
        });
      };

      animateText();
    });

    return () => ctx.revert();
  }, [currentIndex, texts]);

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-16 relative overflow-hidden md:col-span-2 order-2 md:order-1">
      <div className="relative z-10">
        <h1 className="quote text-4xl sm:text-5xl md:text-6xl font-bold leading-tight mb-8 md:items-center">
          Why FaucetDrops?
        </h1>

        <p
          ref={textRef}
          className={`min-h-[80px] ${currentIndex === texts.length - 1
              ? "text-4xl md:text-5xl font-bold text-[#0052FF]"
              : "text-2xl md:text-3xl text-gray-200 font-semibold"
            }`}
        ></p>
      </div>
    </div>
  );
};

const WhyFaucetDrops = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-10 w-full py-12 md:px-10 pt-24 md:pt-50 text-white">
      <KnowFaucetDrops />
      <div className="relative w-full max-w-4xl h-[400px] flex items-center justify-center 1 order-1 md:order-2">

        {/* <div className="relative z-10 w-[400px] h-[400px] md:w-[600px] md:h-[600px]">
          <div 
            className="w-full h-full"
            style={{
              backgroundColor: 'transparent',
              backgroundImage: 'url(/dripin1.png)', 
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              maskImage: 'radial-gradient(circle, rgba(74, 144, 255, 0.6) 0%, rgba(0, 229, 255, 0.3) 30%, rgba(0, 229, 255, 0.1) 60%, transparent 100%)',
            }}
          />
        </div> */}

        <div className="relative z-10 w-[300px] h-[300px] md:w-[500px] md:h-[500px]">
          <div
            className="w-full h-full"
            style={{
              WebkitMaskImage: 'url(/favicon.png)',
              WebkitMaskSize: 'contain',
              WebkitMaskRepeat: 'no-repeat',
              WebkitMaskPosition: 'center',
              maskImage: 'url(/favicon.png)',
              maskSize: 'contain',
              maskRepeat: 'no-repeat',
              maskPosition: 'center',
              backgroundColor: 'transparent',
              backgroundImage: 'url(/dripin1.png)', // previously use  water1.gif
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default WhyFaucetDrops;