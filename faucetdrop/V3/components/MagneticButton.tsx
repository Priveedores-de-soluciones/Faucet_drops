// components/MagneticButton.tsx
'use client'
import { useRef, useEffect } from 'react';
import gsap from 'gsap';

interface MagneticButtonProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

const MagneticButton: React.FC<MagneticButtonProps> = ({ 
  children, 
  className = '', 
  onClick 
}) => {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const magneticRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  useEffect(() => {
    const button = buttonRef.current;
    if (!button) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = button.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      
      const distance = Math.sqrt(x * x + y * y);
      const maxDistance = 100;
      
      if (distance < maxDistance) {
        const strength = 0.3;
        magneticRef.current = { x: x * strength, y: y * strength };
        
        gsap.to(button, {
          x: magneticRef.current.x,
          y: magneticRef.current.y,
          duration: 0.3,
          ease: 'power2.out'
        });
      }
    };

    const handleMouseLeave = () => {
      gsap.to(button, {
        x: 0,
        y: 0,
        duration: 0.5,
        ease: 'elastic.out(1, 0.5)'
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    button.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      button.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  return (
    <button 
      ref={buttonRef} 
      onClick={onClick}
      className={className}
    >
      {children}
    </button>
  );
};

export default MagneticButton;