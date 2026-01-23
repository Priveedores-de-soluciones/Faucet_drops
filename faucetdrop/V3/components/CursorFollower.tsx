'use client';

import { useEffect, useRef } from 'react';
import { animate } from 'animejs';

export default function CursorFollower() {
  const cursorRef = useRef<HTMLDivElement>(null);
  const cursorGlowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cursor = cursorRef.current;
    const cursorGlow = cursorGlowRef.current;
    if (!cursor || !cursorGlow) return;

    const handleMouseMove = (e: MouseEvent) => {
      const mouseX = e.clientX;
      const mouseY = e.clientY;

      // Move cursor instantly
      cursor.style.left = `${mouseX}px`;
      cursor.style.top = `${mouseY}px`;

      // Smooth glow animation (must use animate(target, options))
      animate(cursorGlow, {
        left: mouseX,
        top: mouseY,
        duration: 800,
        easing: 'easeOutExpo'
      });
    };

    const handleMouseDown = () => {
      animate([cursor, cursorGlow], {
        scale: 0.8,
        duration: 200,
        easing: 'easeOutQuad'
      });
    };

    const handleMouseUp = () => {
      animate([cursor, cursorGlow], {
        scale: 1,
        duration: 300,
        easing: 'easeOutElastic(1, 0.5)'
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  return (
    <>
      <div
        ref={cursorRef}
        className="fixed w-4 h-4 bg-[#0052FF] rounded-full pointer-events-none z-9999 mix-blend-difference hidden md:block"
        style={{ transform: 'translate(-50%, -50%)' }}
      />
      <div
        ref={cursorGlowRef}
        className="fixed w-8 h-8 bg-[#0052FF]/30 rounded-full pointer-events-none z-9998 blur-md hidden md:block"
        style={{ transform: 'translate(-50%, -50%)' }}
      />
    </>
  );
}
