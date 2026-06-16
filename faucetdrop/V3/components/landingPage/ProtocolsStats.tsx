'use client';

import { motion, useInView } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { useDashboard } from '@/hooks/use-dashboard';

const StatCard = ({ label, value, isHighlighted = false, delay = 0, loading = false }: { 
  label: string;
  value: number;
  isHighlighted?: boolean;
  delay?: number;
  loading?: boolean;
}) => {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (!isInView || loading) return;

    const duration = 2;
    const frameDuration = 1000 / 60;
    const totalFrames = Math.round(duration * 1000 / frameDuration);
    const increment = value / totalFrames;

    let currentCount = 0;
    let frame = 0;

    const counter = setInterval(() => {
      frame++;
      currentCount = Math.min(value, Math.ceil(increment * frame));
      setCount(currentCount);
      if (currentCount >= value) clearInterval(counter);
    }, frameDuration);

    return () => clearInterval(counter);
  }, [isInView, value, loading]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{
        opacity: 1,
        y: 0,
        transition: { duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] },
      }}
      viewport={{ once: true, margin: '-50px' }}
      whileHover={{ y: -5, transition: { duration: 0.2 } }}
      className={`relative overflow-hidden rounded-2xl py-8 px-4 md:px-8 border ${
        isHighlighted
          ? 'bg-gradient-to-br from-[#2563EB]/30 to-[#2563EB]/20 border-[#2563EB]/50'
          : 'bg-gradient-to-br from-gray-900 to-gray-800 border-gray-800'
      }`}
    >
      <div className="relative z-10">
        <div className="text-gray-400 text-sm mb-2">{label}</div>

        {loading ? (
          <div className="h-12 w-28 rounded-lg bg-gray-700/60 animate-pulse" />
        ) : (
          <div className="text-4xl md:text-5xl font-bold">
            {count.toLocaleString()}+
          </div>
        )}
      </div>

      <motion.div
        className="absolute inset-0 -z-10 opacity-0 group-hover:opacity-100"
        style={{
          background:
            'radial-gradient(600px circle at var(--mouse-x) var(--mouse-y), rgba(37, 99, 235, 0.1), transparent 40%)',
        }}
      />
    </motion.div>
  );
};

export default function ProtocolsStats() {
  const containerRef = useRef(null);
  const { data, loading } = useDashboard();

  const stats = [
    {
      id:    'faucets',
      label: 'Faucets',
      value: data?.total_faucets ?? 0,
      delay: 0.1,
    },
    {
      id:    'transactions',
      label: 'Transactions',
      value: data?.total_transactions ?? 0,
      delay: 0.2,
    },
    {
      id:    'users',
      label: 'Active users',
      value: data?.total_unique_users ?? 0,
      delay: 0.3,
    },
    {
      id:    'drops',
      label: 'Total Drops',
      value: data?.total_claims ?? 0,
      delay: 0.4,
    },
  ];

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.2, delayChildren: 0.3 },
    },
  };

  return (
    <div
      ref={containerRef}
      className="min-h-screen text-white flex items-center justify-center p-4 sm:p-8 relative overflow-hidden"
    >
      {/* Animated background blob */}
      <motion.div
        className="absolute -top-32 -right-32 w-64 h-64 bg-[#2563EB]/10 rounded-full blur-3xl"
        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 8, repeat: Infinity, repeatType: 'reverse' }}
      />

      <div className="max-w-7xl w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center relative z-10">
        {/* Left Content */}
        <motion.div
          className="space-y-6"
          initial={{ opacity: 0, x: -50 }}
          whileInView={{
            opacity: 1,
            x: 0,
            transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] },
          }}
          viewport={{ once: true, margin: '-50px' }}
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
            Companies like Celo, Lisk, &amp; Self Protocol use FaucetDrops to drive
            Onchain Growth at scale.
          </motion.p>

          {/* Animated underline */}
          <motion.div
            className="w-20 h-1 bg-[#2563EB] rounded-full mt-8"
            initial={{ scaleX: 0, opacity: 0 }}
            whileInView={{
              scaleX: 1,
              opacity: 1,
              transition: { delay: 0.6, duration: 0.8, ease: [0.16, 1, 0.3, 1] },
            }}
            viewport={{ once: true }}
          />

          {/* Live data badge */}
          {data && (
            <motion.p
              className="text-xs text-gray-500"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
            >
              Last updated: {new Date(data.last_updated).toLocaleTimeString()}
            </motion.p>
          )}
        </motion.div>

        {/* Right Stats Grid */}
        <motion.div
          className="grid grid-cols-2 gap-4"
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-50px' }}
        >
          {stats.map((stat, index) => (
            <motion.div key={stat.id} className="group">
              <StatCard
                label={stat.label}
                value={stat.value}
                isHighlighted={stat.id === 'transactions'}
                delay={0.1 * index}
                loading={loading}
              />
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Decorative blob */}
      <motion.div
        className="absolute -bottom-20 -left-20 w-40 h-40 bg-[#2563EB]/5 rounded-full blur-3xl"
        animate={{ scale: [1, 1.1, 1], opacity: [0.2, 0.4, 0.2] }}
        transition={{ duration: 10, repeat: Infinity, repeatType: 'reverse' }}
      />
    </div>
  );
}