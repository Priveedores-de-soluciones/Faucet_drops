'use client';

import { useRef, ReactNode } from 'react';
import * as anime from 'animejs';

interface MagneticButtonProps {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  strength?: number;
}

export default function MagneticButton({ 
  children, 
  onClick, 
  className = '', 
  strength = 0.3 
}: MagneticButtonProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    const button = buttonRef.current;
    if (!button) return;

    const rect = button.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;

    anime.animate(button, {
      translateX: x * strength,
      translateY: y * strength,
      duration: 300,
      easing: 'easeOutCubic',
    });
  };

  const handleMouseLeave = () => {
    const button = buttonRef.current;
    if (!button) return;

    anime.animate(button, {
      translateX: 0,
      translateY: 0,
      duration: 500,
      easing: 'easeOutElastic(1, .6)',
    });
  };

  const handleClick = () => {
    const button = buttonRef.current;
    if (!button) return;

    // Ripple effect
    anime.animate(button, {
      scale: [1, 0.95, 1],
      duration: 400,
      easing: 'easeOutElastic(1, .5)',
    });

    onClick?.();
  };

  return (
    <button
      ref={buttonRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      className={className}
    >
      {children}
    </button>
  );
}
