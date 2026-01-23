/* eslint-disable @typescript-eslint/no-unused-vars */
'use client'
import Image from "next/image";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";

const NetworkLogo = ({ src, alt }: { src: string; alt: string }) => {
  return (
    <motion.div
      whileHover={{ 
        scale: 1.1,
        transition: { duration: 0.2 }
      }}
      whileTap={{ scale: 0.95 }}
      className="relative h-12 w-32 flex items-center justify-center"
    >
      <Image
        src={src}
        alt={alt}
        width={100}
        height={40}
        className="object-contain h-full w-full opacity-70 hover:opacity-100 transition-opacity"
      />
    </motion.div>
  );
};

const NetworkGroup = ({ networks, delay = 0 }: { networks: { src: string; alt: string }[]; delay?: number }) => {
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: delay,
      },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { 
      opacity: 1, 
      y: 0,
      transition: {
        type: 'spring',
        stiffness: 100,
        damping: 20,
      },
    },
  };

  return (
    <motion.div 
      className="flex items-center gap-20 whitespace-nowrap"
      variants={container}
      initial="hidden"
      animate="show"
    >
      {networks.map((network, i) => (
        <motion.div 
        key={i} 
        // variants={item}
        initial="hidden"
        animate="show"
        >
          <NetworkLogo src={network.src} alt={network.alt} />
        </motion.div>
      ))}
    </motion.div>
  );
};

export default function Networks() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.1 });

  const networks = [
    { src: "/networks/celo.svg", alt: "Celo" },
    { src: "/networks/base.svg", alt: "Base" },
    { src: "/networks/lisk.svg", alt: "Lisk" },
    { src: "/networks/arbitrum.svg", alt: "Arbitrum" },
    { src: "/networks/self.svg", alt: "Self" }
  ];

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        when: "beforeChildren",
      },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { 
      opacity: 1, 
      y: 0,
      transition: {
        type: 'spring',
        stiffness: 100,
        damping: 20,
      },
    },
  };

  return (
    <div ref={ref} className="mx-auto max-w-full px-0 w-[1280px] py-14 max-md:py-5">
      <motion.div 
        className="flex flex-col items-center justify-center gap-10 px-4 text-center"
        variants={container}
        initial="hidden"
        animate={isInView ? "show" : "hidden"}
      >
        <motion.h2 
          className="text-xl md:text-2xl lg:text-3xl xl:text-4xl font-bold text-white leading-relaxed"
          // variants={item}
        >
          The future of Web3 user acquisition is automated, verifiable and fun. We&apos;re building it!
        </motion.h2>

        <div className="relative w-full">
          <div className="relative flex w-full flex-nowrap overflow-hidden h-[100px] ">
            <motion.div 
              className="flex items-center gap-20"
              animate={{
                x: [0, -1000],
              }}
              transition={{
                duration: 20,
                repeat: Infinity,
                ease: 'linear',
              }}
            >
              {[...Array(3)].map((_, i) => (
                <NetworkGroup key={i} networks={networks} delay={i * 0.1} />
              ))}
            </motion.div>
          </div>
          
          {/* Gradient Fade Effect */}
          {/* <div className="pointer-events-none absolute inset-y-0 left-0 w-32 bg-linear-to-r to-transparent z-10" /> */}
          {/* <div className="pointer-events-none absolute inset-y-0 right-0 w-32 bg-linear-to-l to-transparent z-10" /> */}
        </div>
      </motion.div>
    </div>
  );
}
