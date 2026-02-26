// File: app/page.tsx (or components/home.tsx - the main Home component)
"use client"

import { FaucetList } from "@/components/faucet-list"
import { AnalyticsDashboard } from "@/components/analytics-dashboard"
import { Header } from "@/components/header"
import { NetworkGrid } from "@/components/network"

export default function Faucet() {
 
  
  

  return (
     <main className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <Header pageTitle="Faucet Engine" />
      <div className="container mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8">
        <div className="flex flex-col gap-4 sm:gap-6 lg:gap-8">
          
          <div className="flex flex-col gap-4 sm:gap-6 lg:gap-8">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
              <NetworkGrid />
            </div>
            
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
              <AnalyticsDashboard /> 
            </div>
            
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
              <FaucetList />
            </div>
          </div>
        </div>
      </div>      
    </main>
  )
}
