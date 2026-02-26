/* eslint-disable react-hooks/purity */
'use client'

import { useEffect, useRef } from 'react';
import gsap from 'gsap';

const ParticleSystem: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const particlesRef = useRef<HTMLDivElement[]>([]);

  useEffect(() => {
    if (!containerRef.current) return;

    const particles = particlesRef.current;
    
    // Animate each particle
    particles.forEach((particle) => {
      if (!particle) return;

      gsap.to(particle, {
        x: `+=${Math.random() * 100 - 50}`,
        y: `+=${Math.random() * 100 - 50}`,
        opacity: Math.random() * 0.5 + 0.3,
        duration: Math.random() * 3 + 2,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
        delay: Math.random() * 2
      });
    });

    return () => {
      particles.forEach((particle) => {
        if (particle) gsap.killTweensOf(particle);
      });
    };
  }, []);

  return (
    <div ref={containerRef} className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(1000)].map((_, i) => (
        <div
          key={i}
          ref={(el) => {
            if (el) particlesRef.current[i] = el;
          }}
          className="absolute rounded-full bg-white"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            width: `${Math.random() * 3 + 1}px`,
            height: `${Math.random() * 3 + 1}px`,
            opacity: 0.3,
            boxShadow: '0 0 4px rgba(255, 255, 255, 0.5)',
          }}
        />
      ))}
    </div>
  );
};

function NoiseBackground() {
  return (
      <div>
          {/* Particle System Background */}
          <ParticleSystem />
  
          {/* Noise Texture Overlay */}
          <div
              className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-overlay"
              style={{
                  backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 400 400\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' /%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\' /%3E%3C/svg%3E")',
                  backgroundRepeat: 'repeat',
              }}
          />
  
          {/* Animated Background Gradients */}
          <svg className="absolute inset-0 overflow-hidden pointer-events-none">
              <defs>
                  <linearGradient id="lineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#a3e635" stopOpacity="0" />
                      <stop offset="50%" stopColor="#a3e635" stopOpacity="0.6" />
                      <stop offset="100%" stopColor="#a3e635" stopOpacity="0" />
                  </linearGradient>
                  <radialGradient id="glowGradient">
                      <stop offset="0%" stopColor="#4A90FF" stopOpacity="0.3" />
                      <stop offset="50%" stopColor="#00E5FF" stopOpacity="0.1" />
                      <stop offset="100%" stopColor="transparent" stopOpacity="0" />
                  </radialGradient>
              </defs>
          </svg>
      </div>
  )
}

export default NoiseBackground

