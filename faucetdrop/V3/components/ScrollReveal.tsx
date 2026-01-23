'use client';

import { useEffect, useRef, ReactNode } from 'react';
import { animate } from 'animejs';

interface ScrollRevealProps {
  children: ReactNode;
  direction?: 'up' | 'down' | 'left' | 'right' | 'scale' | 'fade';
  delay?: number;
  duration?: number;
  className?: string;
}

export default function ScrollReveal({
  children,
  direction = 'up',
  delay = 0,
  duration = 1000,
  className = ''
}: ScrollRevealProps) {
  const elementRef = useRef<HTMLDivElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    // const getTransform = () => {
    //   switch (direction) {
    //     case 'up': return { translateY: [50, 0], opacity: [0, 1] };
    //     case 'down': return { translateY: [-50, 0], opacity: [0, 1] };
    //     case 'left': return { translateX: [50, 0], opacity: [0, 1] };
    //     case 'right': return { translateX: [-50, 0], opacity: [0, 1] };
    //     case 'scale': return { scale: [0.6, 1], opacity: [0, 1] };
    //     case 'fade': return { opacity: [0, 1] };
    //     default: return { translateY: [50, 0], opacity: [0, 1] };
    //   }
    // };

    const getTransform = () => {
      const base = { opacity: [0, 1] as number[] };
      switch (direction) {
        case 'up':
          return { ...base, translateY: [50, 0] as number[] };
        case 'down':
          return { ...base, translateY: [-50, 0] as number[] };
        case 'left':
          return { ...base, translateX: [50, 0] as number[] };
        case 'right':
          return { ...base, translateX: [-50, 0] as number[] };
        case 'scale':
          return { ...base, scale: [0.5, 1] as number[] };
        case 'fade':
          return { opacity: [0, 1] as number[] };
        default:
          return { ...base, translateY: [50, 0] as number[] };
      }
    };

    const startAnimation = () => {
      if (hasAnimated.current) return;
      hasAnimated.current = true;

      const transform = getTransform();
      animate(element, {
        ...transform,
        duration,
        delay,
        easing: 'easeOutCubic'
      });
    };

    // Initial hidden styles
    element.style.opacity = '0';
    element.style.willChange = 'transform, opacity';

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) startAnimation();
        });
      },
      { threshold: 0.15 }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [direction, delay, duration]);

  return (
    <div ref={elementRef} className={className}>
      {children}
    </div>
  );
}
