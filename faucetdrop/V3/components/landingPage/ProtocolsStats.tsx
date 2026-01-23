'use client';

import { motion, useInView } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

const stats = [
  { label: 'Faucets', value: 100, id: 'faucets', delay: 0.1 },
  { label: 'Transactions', value: 5000, id: 'transactions', delay: 0.2 },
  { label: 'Active users', value: 2000, id: 'users', delay: 0.3 },
  { label: 'Total Drops', value: 2000, id: 'drops', delay: 0.4 },
];

const StatCard = ({ label, value, isHighlighted = false, delay = 0 }: { label: string, value: number, isHighlighted?: boolean, delay?: number }) => {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (!isInView) return;
    
    const duration = 2; // seconds
    const frameDuration = 1000 / 60; // 60fps
    const totalFrames = Math.round(duration * 1000 / frameDuration);
    const increment = value / totalFrames;
    
    let currentCount = 0;
    let frame = 0;
    
    const counter = setInterval(() => {
      frame++;
      currentCount = Math.min(value, Math.ceil(increment * frame));
      setCount(currentCount);
      
      if (currentCount >= value) {
        clearInterval(counter);
      }
    }, frameDuration);
    
    return () => clearInterval(counter);
  }, [isInView, value]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ 
        opacity: 1, 
        y: 0,
        transition: { 
          duration: 0.5, 
          delay: delay,
          ease: [0.16, 1, 0.3, 1] 
        } 
      }}
      viewport={{ once: true, margin: "-50px" }}
      whileHover={{ 
        y: -5,
        transition: { duration: 0.2 }
      }}
      className={`relative overflow-hidden rounded-2xl py-8 px-4 md:px-8 border ${
        isHighlighted 
          ? 'bg-linear-to-br from-[#2563EB]/30 to-[#2563EB]/20 border-[#2563EB]/50' 
          : 'bg-linear-to-br from-gray-900 to-gray-800 border-gray-800'
      }`}
    >
      <div className="relative z-10">
        <div className="text-gray-400 text-sm mb-2">{label}</div>
        <div className="text-4xl md:text-5xl font-bold">
          {count.toLocaleString()}{label === 'Transactions' || label === 'Total Drops' || label === "Active users" || label === "Faucets" ? '+' : ''}
        </div>
      </div>
      
      {/* Animated background highlight on hover */}
      <motion.div 
        className="absolute inset-0 -z-10 opacity-0 group-hover:opacity-100"
        style={{
          background: 'radial-gradient(600px circle at var(--mouse-x) var(--mouse-y), rgba(37, 99, 235, 0.1), transparent 40%)',
        }}
      />
    </motion.div>
  );
};

export default function ProtocolsStats() {
  const containerRef = useRef(null);
  // const isInView = useInView(containerRef, { once: true, margin: "-100px" });

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.3,
      },
    },
  };

  // const item = {
  //   hidden: { opacity: 0, y: 20 },
  //   show: { 
  //     opacity: 1, 
  //     y: 0,
  //     transition: {
  //       duration: 0.6,
  //       ease: [0.16, 1, 0.3, 1]
  //     }
  //   },
  // };

  return (
    <div 
      ref={containerRef}
      className="min-h-screen text-white flex items-center justify-center p-4 sm:p-8 relative overflow-hidden"
    >
      {/* Animated background elements */}
      <motion.div 
        className="absolute -top-32 -right-32 w-64 h-64 bg-[#2563EB]/10 rounded-full blur-3xl"
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          repeatType: "reverse",
        }}
      />
      
      <div className="max-w-7xl w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center relative z-10">
        {/* Left Content */}
        <motion.div 
          className="space-y-6"
          initial={{ opacity: 0, x: -50 }}
          whileInView={{ 
            opacity: 1, 
            x: 0,
            transition: { 
              duration: 0.8,
              ease: [0.16, 1, 0.3, 1]
            } 
          }}
          viewport={{ once: true, margin: "-50px" }}
        >
          <motion.div 
            className="text-4xl sm:text-5xl md:text-6xl font-bold leading-tight"
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
          >
            Smarter Data, Better Decisions
          </motion.div>
          
          <motion.h1 
            className="text-[#2563EB] text-2xl md:text-3xl font-semibold tracking-wide uppercase"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
          >
            Trusted by Top Protocols
          </motion.h1>
          
          <motion.p 
            className="text-gray-400 text-lg leading-relaxed max-w-lg"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 }}
          >
            Companies like Celo, Lisk, & Self Protocol use Faucet Drops to drive Onchain Growth at scale.
          </motion.p>
          
          {/* Animated underline */}
          <motion.div 
            className="w-20 h-1 bg-[#2563EB] rounded-full mt-8"
            initial={{ scaleX: 0, opacity: 0 }}
            whileInView={{ 
              scaleX: 1, 
              opacity: 1,
              transition: { 
                delay: 0.6,
                duration: 0.8,
                ease: [0.16, 1, 0.3, 1]
              } 
            }}
            viewport={{ once: true }}
          />
        </motion.div>
        
        {/* Right Stats Grid */}
        <motion.div 
          className="grid grid-cols-2 gap-4"
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-50px" }}
        >
          {stats.map((stat, index) => (
            <motion.div 
              key={stat.id} 
              // variants={item}
              className="group"
            >
              <StatCard 
                label={stat.label} 
                value={stat.value} 
                isHighlighted={stat.id === 'transactions'}
                delay={0.1 * index}
              />
            </motion.div>
          ))}
        </motion.div>
      </div>
      
      {/* Decorative elements */}
      <motion.div 
        className="absolute -bottom-20 -left-20 w-40 h-40 bg-[#2563EB]/5 rounded-full blur-3xl"
        animate={{
          scale: [1, 1.1, 1],
          opacity: [0.2, 0.4, 0.2],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          repeatType: "reverse",
        }}
      />
    </div>
  );
}