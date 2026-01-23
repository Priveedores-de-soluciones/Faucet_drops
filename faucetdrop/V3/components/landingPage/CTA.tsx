'use client'
import React, { useState, useEffect } from 'react'
import ScrollReveal from '@/components/ScrollReveal'
import MagneticButton from '@/components/MagneticButton'
import InfiniteDome from './InfiniteDome'
import { useRouter } from 'next/navigation'

export default function CTA() {

  const router = useRouter()
  const [bend, setBend] = useState(3)

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 640) {
        setBend(0.5) // smaller bend on small screens
      } else {
        setBend(3) // default bend on larger screens
      }
    }

    handleResize() // run on mount
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  const handleLaunch = () => {
    if (navigator.userAgent.includes("MetaMask") || navigator.userAgent.includes("Trust")) {
      window.location.href = "https://app.faucetdrops.io/";
    } else {
      window.open("https://app.faucetdrops.io/", "_blank", "noopener,noreferrer");
    }    
  }

  return (
    <section className="py-20">
      {/* Banner */}
      {/* <ScrollReveal direction='down' delay={200}>
        <div className="w-full h-[400px] bg-[url('/banner.png')] bg-cover bg-center rounded-4xl"></div>
      </ScrollReveal> */}
      <ScrollReveal direction="up" delay={200}>
        <h2 className="text-3xl md:text-4xl font-bold leading-tight tracking-[-0.015em] px-4 py-15 text-center text-white">
          Ready to build your web3 growth engine?
        </h2>
      </ScrollReveal>

      <div style={{ height: '600px', position: 'relative' }} className='-mt-32 max-sm:-mt-20 w-full' data-aos="fade-up" data-aos-delay="1300">
        <InfiniteDome
          bend={bend}
          textColor="#ffffff"
          borderRadius={0.05}
          scrollEase={0.02}
          autoScrollSpeed={0.09}
        />
      </div>

      <ScrollReveal direction="up" delay={400}>
        <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6">
          <MagneticButton
            onClick={handleLaunch}
            className="max-md:w-1/2 bg-linear-to-r from-[#0052FF] to-[#2563EB] hover:from-[#2563EB] hover:to-[#0052FF] text-black font-bold px-8 py-4 rounded-full cursor-pointer transition-all shadow-lg shadow-[#94A3B8]/20 hover:shadow-xl hover:shadow-[#94A3B8]/30"
            >
            Launch App
          </MagneticButton>
          <MagneticButton
            onClick={() => router.push('/coming-soon')}
            className="max-md:w-1/2 bg-transparent text-white border-2 border-[#0052FF] px-8 py-4 rounded-full font-bold hover:bg-[#0052FF]/10 cursor-pointer transition-all"
          >
            Talk to Our Team
          </MagneticButton>
        </div>
      </ScrollReveal>
    </section>
  )
}
