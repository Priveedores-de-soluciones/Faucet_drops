import React from 'react';
// import { ArrowRight } from 'lucide-react';

export default function ProtocolsStats() {
  return (
    <div className="min-h-screen text-white flex items-center justify-center p-8">
      <div className="max-w-7xl w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        {/* Left Content */}
        <div className="space-y-6">
          <div className="text-[#2563EB] text-sm font-semibold tracking-wide uppercase">
            Smarter Data, Better Decisions
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold leading-tight">
          Trusted by Top Protocols
          </h1>
          
          <p className="text-gray-400 text-lg leading-relaxed max-w-lg">
            Companies like Celo, Lisk, & Self Protocol, use Faucet Drops to drive Onchain Growth at scale.
          </p>
        </div>
        
        {/* Right Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          {/* Users Card */}
          <div className="bg-linear-to-br from-gray-900 to-gray-800 rounded-2xl p-8 border border-gray-800">
            <div className="text-gray-400 text-sm mb-2">Faucets</div>
            <div className="text-5xl font-bold">100+</div>
          </div>
          
          {/* Transactions Card */}
          <div className="bg-linear-to-br from-[#2563EB]/30 to-[#2563EB]/20 rounded-2xl p-8 border border-[#2563EB]/50">
            <div className="text-gray-400 text-sm mb-2">Transactions</div>
            <div className="text-5xl font-bold">5k+</div>
          </div>
          
          {/* Chains Card */}
          <div className="bg-linear-to-br from-gray-900 to-gray-800 rounded-2xl p-8 border border-gray-800">
            <div className="text-gray-400 text-sm mb-2">Active users</div>
            <div className="text-5xl font-bold">2k+</div>
          </div>
          
          {/* Apps Card */}
          <div className="bg-linear-to-br from-gray-900 to-gray-800 rounded-2xl p-8 border border-gray-800">
            <div className="text-gray-400 text-sm mb-2">Total Drops</div>
            <div className="text-5xl font-bold">2k+</div>
          </div>
        </div>
      </div>
    </div>
  );
}