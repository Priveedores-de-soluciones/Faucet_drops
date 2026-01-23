'use client';

import { useEffect, useRef } from 'react';
import { animate } from 'animejs';

export default function AnimatedBackground() {
  const containerRef = useRef<HTMLDivElement>(null);
  const particlesRef = useRef<HTMLDivElement[]>([]);
  const mousePos = useRef({ x: 0, y: 0 });
  const scrollY = useRef(0);

  useEffect(() => {
    if (!containerRef.current) return;

    // Create particles
    const particleCount = 50;
    const particles: HTMLDivElement[] = [];

    for (let i = 0; i < particleCount; i++) {
      const particle = document.createElement('div');
      particle.className = 'particle';

      const size = Math.random() * 4 + 2;
      const startX = Math.random() * window.innerWidth;
      const startY = Math.random() * window.innerHeight;

      particle.style.cssText = `
        position: absolute;
        width: ${size}px;
        height: ${size}px;
        background: radial-gradient(circle, rgba(168,239,105,${Math.random() * 0.5 + 0.2}) 0%, transparent 70%);
        border-radius: 50%;
        left: ${startX}px;
        top: ${startY}px;
        pointer-events: none;
      `;

      containerRef.current.appendChild(particle);
      particles.push(particle);
    }

    particlesRef.current = particles;

    // Animate particles continuously (note: animate(target, options) signature)
    const animateParticles = () => {
      particles.forEach((particle, index) => {
        const delay = index * 100;

        animate(particle, {
          translateX: () => Math.random() * 400 - 200,
          translateY: () => Math.random() * 400 - 200,
          scale: [
            { value: Math.random() * 1 + 0.5, duration: Math.random() * 2000 + 2000 }
          ],
          opacity: [
            { value: Math.random() * 0.6 + 0.2, duration: Math.random() * 2000 + 1000 }
          ],
          duration: Math.random() * 7000 + 8000,
          delay,
          easing: 'easeInOutQuad',
          loop: true,
          direction: 'alternate'
        });
      });
    };

    animateParticles();

    // Mouse move effect
    const handleMouseMove = (e: MouseEvent) => {
      mousePos.current = { x: e.clientX, y: e.clientY };

      particles.forEach((particle) => {
        const rect = particle.getBoundingClientRect();
        const particleX = rect.left + rect.width / 2;
        const particleY = rect.top + rect.height / 2;

        const distX = mousePos.current.x - particleX;
        const distY = mousePos.current.y - particleY;
        const distance = Math.sqrt(distX * distX + distY * distY);

        if (distance < 150) {
          const force = (150 - distance) / 150;
          const angle = Math.atan2(distY, distX);

          animate(particle, {
            // relative translates are supported as strings '+=...' / '-=...'
            translateX: `+=${Math.cos(angle) * force * -30}`,
            translateY: `+=${Math.sin(angle) * force * -30}`,
            duration: 300,
            easing: 'easeOutExpo'
          });
        }
      });
    };

    // Scroll effect
    const handleScroll = () => {
      scrollY.current = window.scrollY;

      particles.forEach((particle, index) => {
        const scrollFactor = (index % 3 + 1) * 0.3;
        animate(particle, {
          translateY: `-=${scrollFactor}`,
          duration: 100,
          easing: 'linear'
        });
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('scroll', handleScroll, { passive: true });

    // Cleanup
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('scroll', handleScroll);
      particles.forEach((particle) => particle.remove());
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden"
      style={{
        background: 'radial-gradient(ellipse at bottom, #0a0a0a 0%, #000000 100%)'
      }}
    >
      <div className="absolute top-20 left-10 w-96 h-96 bg-lime-500/5 rounded-full blur-3xl animate-pulse-slow"
           style={{ animationDuration: '8s' }} />
      <div className="absolute bottom-20 right-20 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-3xl animate-pulse-slow"
           style={{ animationDuration: '10s', animationDelay: '2s' }} />
      <div className="absolute top-1/2 left-1/2 w-[600px] h-[600px] bg-purple-500/3 rounded-full blur-3xl animate-pulse-slow"
           style={{ animationDuration: '12s', animationDelay: '4s' }} />
    </div>
  );
}
