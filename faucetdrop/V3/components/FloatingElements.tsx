'use client';

import { useEffect, useRef } from 'react';
import * as anime from 'animejs';

export default function FloatingElements() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const shapes = containerRef.current.querySelectorAll('.floating-shape');

    shapes.forEach((shape, index) => {
      // Random initial position
      const randomX = Math.random() * 100;
      const randomY = Math.random() * 100;
      
      anime.set(shape, {
        translateX: `${randomX}vw`,
        translateY: `${randomY}vh`,
      });

      // Continuous floating animation
      anime.animate(shape, {
        translateX: [
          { value: `${randomX}vw` },
          { value: `${randomX + anime.random(-30, 30)}vw` },
          { value: `${randomX}vw` }
        ],
        translateY: [
          { value: `${randomY}vh` },
          { value: `${randomY + anime.random(-30, 30)}vh` },
          { value: `${randomY}vh` }
        ],
        rotate: [0, anime.random(-180, 180), 0],
        duration: anime.random(15000, 25000),
        delay: index * 1000,
        loop: true,
        easing: 'easeInOutSine',
      });
    });
  }, []);

  return (
    <div ref={containerRef} className="fixed inset-0 pointer-events-none z-10 overflow-hidden">
      {/* Hexagons */}
      <div className="floating-shape absolute w-20 h-20 opacity-10">
        <svg viewBox="0 0 100 100" className="text-lime-400">
          <polygon 
            points="50 1 95 25 95 75 50 99 5 75 5 25" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2"
          />
        </svg>
      </div>

      {/* Circles */}
      <div className="floating-shape absolute w-16 h-16 opacity-10">
        <svg viewBox="0 0 100 100" className="text-blue-400">
          <circle 
            cx="50" 
            cy="50" 
            r="45" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2"
          />
        </svg>
      </div>

      {/* Triangles */}
      <div className="floating-shape absolute w-24 h-24 opacity-10">
        <svg viewBox="0 0 100 100" className="text-purple-400">
          <polygon 
            points="50 10 90 90 10 90" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2"
          />
        </svg>
      </div>

      {/* Squares */}
      <div className="floating-shape absolute w-14 h-14 opacity-10">
        <svg viewBox="0 0 100 100" className="text-lime-400">
          <rect 
            x="10" 
            y="10" 
            width="80" 
            height="80" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2"
            transform="rotate(45 50 50)"
          />
        </svg>
      </div>

      {/* More circles */}
      <div className="floating-shape absolute w-12 h-12 opacity-10">
        <svg viewBox="0 0 100 100" className="text-lime-500">
          <circle 
            cx="50" 
            cy="50" 
            r="40" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="3"
            strokeDasharray="10 5"
          />
        </svg>
      </div>

      {/* Stars */}
      <div className="floating-shape absolute w-16 h-16 opacity-10">
        <svg viewBox="0 0 100 100" className="text-yellow-400">
          <path 
            d="M50 10 L61 39 L92 39 L67 58 L77 87 L50 68 L23 87 L33 58 L8 39 L39 39 Z" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2"
          />
        </svg>
      </div>

      {/* Additional shapes for variety */}
      <div className="floating-shape absolute w-18 h-18 opacity-10">
        <svg viewBox="0 0 100 100" className="text-pink-400">
          <polygon 
            points="50 1 95 25 95 75 50 99 5 75 5 25" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2"
          />
        </svg>
      </div>

      <div className="floating-shape absolute w-20 h-20 opacity-10">
        <svg viewBox="0 0 100 100" className="text-cyan-400">
          <circle 
            cx="50" 
            cy="50" 
            r="35" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2"
          />
        </svg>
      </div>
    </div>
  );
}
