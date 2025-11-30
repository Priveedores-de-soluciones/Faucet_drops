'use client';

import { motion } from 'framer-motion';
import { ReactNode } from 'react';

type AnimatedTextProps = {
  text: string | ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
};

export function AnimatedText({
  text,
  className = '',
  delay = 0.1,
  duration = 0.5,
}: AnimatedTextProps) {
  const letters = typeof text === 'string' ? text.split('') : [text];

  const container = {
    hidden: { opacity: 0 },
    visible: (i = 1) => ({
      opacity: 1,
      transition: { staggerChildren: 0.03, delayChildren: delay * i },
    }),
  };

  const child = {
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: 'spring',
        damping: 12,
        stiffness: 100,
      },
    },
    hidden: {
      opacity: 0,
      y: 20,
      transition: {
        type: 'spring',
        damping: 12,
        stiffness: 100,
      },
    },
  };

  return (
    <motion.div
      className={`flex flex-wrap ${className}`}
      variants={container}
      initial="hidden"
      animate="visible"
    >
      {letters.map((letter, index) => (
        <motion.span 
        key={index} 
        // variants={child}
        initial="hidden"
        animate="visible"
        >
          {letter === ' ' ? '\u00A0' : letter}
        </motion.span>
      ))}
    </motion.div>
  );
}
