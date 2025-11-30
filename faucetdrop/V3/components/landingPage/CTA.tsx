import React from 'react'
import { Button } from '../ui/button'

export default function CTA() {
  return (
    <section className="py-10">
        <h2 className="text-xl md:text-2xl font-bold leading-tight tracking-[-0.015em] px-4 pb-3 pt-5 text-center text-white">Ready to build your web3 growth engine?</h2>
        <div className="">
          <div className="flex flex-col sm:flex-row items-center justify-center space-y-3 sm:space-y-0 sm:space-x-4">
            <Button className="bg-[--color-dark] text-white font-bold px-6 py-2 rounded-md hover:bg-opacity-90 hover:bg-[--color-dark]/90 cursor-pointer transition">
              Launch App
            </Button>
            <Button className="bg-gray-200 text-[--color-dark] border border-[--color-dark] px-6 py-2 rounded-md font-bold hover:bg-gray-100 cursor-pointer transition">
              Talk to Our Team
            </Button>
          </div>
        </div>
      </section>
  )
}
