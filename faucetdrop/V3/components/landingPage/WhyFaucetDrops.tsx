'use client'
import { useMemo, useState, useEffect, useRef, useCallback } from 'react';

const KnowFaucetDrops = () => {
  const [displayText, setDisplayText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [, setCycleComplete] = useState(false);
  const cycleCount = useRef(0);

  const texts = useMemo(() => [
    "Web3 teams want to grow",
    "Users want engagement",
    "But the current tools are fragmented, expensive and complicated",
    "FaucetDrops Unifies Everything..."
  ], []);

  const handleCycleComplete = useCallback(() => {
    setCycleComplete(true);
    setTimeout(() => setCycleComplete(false), 1000);
  }, []);

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    const currentText = texts[currentIndex];

    if (!isDeleting) {
      // Typing effect
      if (displayText.length < currentText.length) {
        timeout = setTimeout(() => {
          setDisplayText(currentText.substring(0, displayText.length + 1));
        }, 10); // Slightly faster typing
      } else {
        // Pause at the end of typing
        timeout = setTimeout(() => {
          setIsDeleting(true);
        }, 1000); // Slightly longer pause
      }
    } else {
      // Deleting effect
      if (displayText.length > 0) {
        timeout = setTimeout(() => {
          setDisplayText(displayText.substring(0, displayText.length - 1));
        }, 20); // Slightly faster deleting
      } else {
        // Move to next text
        const nextIndex = (currentIndex + 1) % texts.length;
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setCurrentIndex(nextIndex);
        setIsDeleting(false);
        
        // Check if we've completed a full cycle
        if (nextIndex === 0) {
          cycleCount.current += 1;
          handleCycleComplete();
        }
        
      }
    }

    return () => clearTimeout(timeout);
  }, [displayText, currentIndex, isDeleting, texts, handleCycleComplete]);

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-16 relative overflow-hidden md:col-span-2 order-2 md:order-1">
      <div className="relative z-10">
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold leading-tight mb-8 md:items-center">
          Why FaucetDrops?
        </h1>

        <div className="min-h-[120px] flex flex-col">
          {currentIndex === texts.length - 1 ? (
            <p className="text-4xl md:text-5xl font-bold text-[#0052FF] mb-6">
              {displayText}
              <span className={`inline-block ${displayText.length > 0 ? 'opacity-100' : 'opacity-0'}`}>
                <span className="animate-pulse">|</span>
              </span>
            </p>
          ) : (
            <p className="text-2xl md:text-3xl text-gray-200 font-semibold tracking-wide mb-6">
              {displayText}
              <span className={`inline-block ${displayText.length > 0 ? 'opacity-100' : 'opacity-0'}`}>
                <span className="animate-pulse text-[#0052FF]">|</span>
              </span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

const WhyFaucetDrops = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-10 w-full py-12 md:px-10 pt-24 md:pt-50 text-white">
      <KnowFaucetDrops />
      <div className="relative w-full max-w-4xl h-[400px] flex items-center justify-center 1 order-1 md:order-2">
        {/* <div className="absolute inset-0 bg-[url('/water-fall-water.gif')] bg-cover bg-center" /> */}
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
              backgroundImage: 'url(/water1.gif)', 
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