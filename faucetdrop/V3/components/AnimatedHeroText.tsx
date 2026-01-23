'use client';

import { useEffect, useRef, useState } from 'react';
import { Timeline } from 'animejs';

interface AnimatedHeroTextProps {
  text: string;
  className?: string;
  delay?: number;
}

export default function AnimatedHeroText({ text, className = '', delay = 0 }: AnimatedHeroTextProps) {
  const [displayText, setDisplayText] = useState<Array<{char: string, id: number}>>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const charId = useRef(0);

  useEffect(() => {
    // Split text into characters with unique IDs
    const chars = text.split('').map(char => ({
      char: char === ' ' ? '\u00A0' : char,
      id: charId.current++
    }));
    
    setDisplayText(chars);
  }, [text]);

  useEffect(() => {
    if (!containerRef.current || displayText.length === 0) return;

    const chars = containerRef.current.querySelectorAll('.char');
    
    // Main intro timeline animation
    const tl = new Timeline();

    tl.add(
      Array.from(chars), {
      opacity: [0, 1],
      translateY: [20, 0],
      duration: 1000,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delay: (el: any, i: number) => delay + i * 30,
      easing: 'easeOutExpo'
    });

    return () => {
      tl.pause();
    };
  }, [displayText, delay]);

  return (
    <div 
      ref={containerRef} 
      className={`inline-block ${className}`}
    >
      {displayText.map(({ char, id }) => (
        <span 
          key={id}
          className="char inline-block opacity-0"
          style={{ transform: 'translateY(20px)' }}
        >
          {char}
        </span>
      ))}
    </div>
  );
}
