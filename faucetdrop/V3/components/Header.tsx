"use client";

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Droplets, PackageCheck, GraduationCap, Landmark, FileMinus, Github, Info, Briefcase, PaintRoller, LockOpen, List, Columns3Cog } from 'lucide-react';
import GetStartedModal from './GetStartedModal';

interface NavItemBase {
  name: string;
  href: string;
  icon: React.ReactNode;
  description?: string;
  target?: string;
}

interface NavItemWithDropdown extends NavItemBase {
  dropdown: NavItem[];
}

type NavItem = NavItemBase | NavItemWithDropdown;

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [isGetStartedModalOpen, setIsGetStartedModalOpen] = useState(false);

  const navLinks: Array<{
    name: string;
    dropdown: NavItem[];
  }> = [
      {
        name: 'Product',
        dropdown: [
          {
            name: 'Faucets', href: '#', icon: <Droplets />, description: 'Smarter, Flexible, Onchain Distribution',
            dropdown: [
              { name: 'Open Drop', href: '/faucets/open-drop', icon: <LockOpen /> },
              { name: 'Whitelist Drop', href: '/faucets/whitelist-drop', icon: <List /> },
              { name: 'Custom Drop', href: '/faucets/custom-drop', icon: <Columns3Cog /> },
            ]
          },
          { name: 'Quests', href: '/quest/', icon: <PackageCheck />, description: 'Gamified Progress + Automated Rewards' },
          { name: 'Quizzes', href: 'https://app.faucetdrops.io/quiz/', icon: <GraduationCap />, description: 'Fun, Interactive, AI-Powered Web3 Quiz Engine' },
          { name: 'Enterprise', href: 'https://app.faucetdrops.io/enterprise/', icon: <Landmark />, description: 'White Label Solutions' },
          // href: '/product/quests' // path to follow
        ]
      },
      {
        name: 'Developers',
        dropdown: [
          { name: 'Documentation', href: '/coming-soon', icon: <FileMinus />, description: 'A comprehensive guide for seamless integration' },
          // href: '/developers/docs' // path to follow
          { name: 'GitHub', href: 'https://github.com/Priveedores-de-soluciones/Faucet_drops', target: '_blank', icon: <Github />, description: 'Explore our open-source projects' },
        ]
      },
      {
        name: 'Company',
        dropdown: [
          { name: 'About', href: '/coming-soon', icon: <Info />, description: 'Learn more about our company' },
          { name: 'Career', href: '/coming-soon', icon: <Briefcase />, description: 'Explore career opportunities' },
          { name: 'Brand kit', href: '/coming-soon', icon: <PaintRoller />, description: 'Download our brand kit' },
          // ref: '/company/about' // path to follow
        ]
      },
    ];

  return (
    <header className="fixed w-full z-50 transition-colors duration-300 text-white mx-auto max-w-full px-0 max-md:bg-[#020817]/80 max-md:backdrop-blur-sm">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="font-bold text-[#94A3B8] flex items-center space-x-2">
            <Image
              src="/logo.png"
              alt="Logo"
              width={1000}
              height={1000}
              className='h-12 md:h-16 w-fit transition-all duration-300'
              priority
            />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-4 lg:space-x-6 bg-[#020817]/90 px-4 lg:px-6 py-2.5 rounded-2xl ring-1 ring-gray-700">
            {navLinks.map((link) => (
              <div
                key={link.name}
                className="relative group"
                onMouseEnter={() => setOpenDropdown(link.name)}
                onMouseLeave={() => setOpenDropdown(null)}
              >
                <button
                  // href={link.href}
                  className="text-sm lg:text-base hover:text-[#94A3B8] transition-colors text-[#F8FAFC] px-3 py-2 rounded-lg hover:bg-gray-800/50 flex items-center gap-1"
                >
                  {link.name}
                  <svg
                    className={`w-4 h-4 transition-transform duration-200 ${openDropdown === link.name ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Desktop Dropdown */}
                {link.dropdown && (
                  <div className={`absolute top-full left-0 mt-2 w-64 bg-[#0F172A] rounded-xl ring-1 ring-gray-700 shadow-2xl transition-all duration-200 ${openDropdown === link.name ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible -translate-y-2'
                    }`}>
                    <div className="p-2">
                      {link.dropdown.map((item) => (
                        <div key={item.name} className="relative group/item">
                          <Link
                            href={item.href}
                            className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-800/50 transition-colors"
                          >
                            <span className="text-2xl mt-0.5">{item.icon}</span>
                            <div className="flex-1 flex justify-between items-center">
                              <div>
                                <div className="text-sm font-medium text-white group-hover/item:text-[#94A3B8] transition-colors">
                                  {item.name}
                                </div>
                                {item.description && (
                                  <div className="text-xs text-gray-400 mt-0.5">
                                    {item.description}
                                  </div>
                                )}
                              </div>
                              {'dropdown' in item && item.dropdown && (
                                <svg
                                  className="w-4 h-4 text-gray-400"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                              )}
                            </div>
                          </Link>
                          {'dropdown' in item && item.dropdown && (
                            <div className="absolute left-full top-0 ml-1 w-56 bg-[#0F172A] rounded-xl ring-1 ring-gray-700 shadow-2xl opacity-0 invisible group-hover/item:opacity-100 group-hover/item:visible transition-all duration-200">
                              <div className="p-2">
                                {item.dropdown.map((subItem) => (
                                  <Link
                                    key={subItem.name}
                                    href={subItem.href}
                                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800/50 transition-colors"
                                  >
                                    <span className="text-xl">{subItem.icon}</span>
                                    <span className="text-sm text-white">{subItem.name}</span>
                                  </Link>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </nav>

          {/* Auth Buttons - Desktop */}
          <div className="hidden md:flex items-center space-x-3">
            {/* <Link
              href="/coming-soon"
              className="px-4 py-2 text-sm lg:text-base rounded-xl text-white hover:bg-gray-800/50 ring-1 ring-gray-700 transition-colors"
            >
              Login 
            </Link> */}
            {/* <Link
              href="/coming-soon"
              className="px-4 py-2 text-sm lg:text-base bg-[#0052FF] text-white rounded-xl hover:bg-[#2563EB] transition-colors"
            >
              Sign Up
            </Link> */}

            <button
              onClick={() => {
                setIsMenuOpen(false);
                setIsGetStartedModalOpen(true);
              }}
              className="w-full text-center px-4 py-3 mt-2 text-white bg-[#0052FF] rounded-lg hover:bg-[#2564ebe9] transition-colors active:bg-[#1d4ed8]"
            >
              Get Started
            </button>
          </div>

          {/* Mobile menu button */}
          <div className="flex md:hidden items-center">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2.5 rounded-lg focus:outline-none ring-1 ring-gray-700 hover:bg-gray-800/50 transition-colors"
              aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={isMenuOpen}
            >
              {isMenuOpen ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" className="size-5 transition-all duration-300 ease-in-out">
                  <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 6 6 18M6 6l12 12"></path>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" className="size-5 transition-all duration-300 ease-in-out">
                  <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12h12M3 6h18M3 18h18"></path>
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <div
          className={`md:hidden transition-all duration-300 ease-in-out overflow-hidden ${isMenuOpen ? 'max-h-[600px] mt-3 pb-3' : 'max-h-0'
            }`}
        >
          <div className="flex flex-col space-y-3 pt-3 border-t border-gray-800">
            {/* Mobile Accordion Navigation */}
            <Accordion type="single" collapsible className="w-full">
              {navLinks.map((link) => (
                <AccordionItem key={link.name} value={link.name} className="border-b border-gray-800">
                  <AccordionTrigger className="px-4 py-3 text-[#F8FAFC] hover:bg-gray-800/50 rounded-lg hover:no-underline">
                    {link.name}
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-2">
                    <div className="space-y-1 pl-2">
                      {link.dropdown.map((item: NavItem) => (
                        <div key={item.name}>
                          {'dropdown' in item && item.dropdown ? (
                            <Accordion type="single" collapsible className="w-full">
                              <AccordionItem value={item.name} className="border-0">
                                <AccordionTrigger className="p-3 -my-2 hover:no-underline [&>svg]:text-gray-400 [&>svg]:w-4 [&>svg]:h-4">
                                  <div className="flex items-center gap-3">
                                    <span className="text-xl">{item.icon}</span>
                                    <span className="text-sm text-[#F8FAFC]">{item.name}</span>
                                  </div>
                                </AccordionTrigger>
                                <AccordionContent className="pl-4 py-2">
                                  <div className="space-y-1 border-l border-gray-700 ml-4 pl-4">
                                    {item.dropdown.map((subItem) => (
                                      <Link
                                        key={subItem.name}
                                        href={subItem.href}
                                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-800/50 transition-colors"
                                        onClick={() => setIsMenuOpen(false)}
                                      >
                                        <span className="text-lg">{subItem.icon}</span>
                                        <span className="text-sm text-[#F8FAFC]">{subItem.name}</span>
                                      </Link>
                                    ))}
                                  </div>
                                </AccordionContent>
                              </AccordionItem>
                            </Accordion>
                          ) : (
                            <Link
                              href={item.href}
                              className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800/50 transition-colors"
                              onClick={() => setIsMenuOpen(false)}
                            >
                              <span className="text-xl">{item.icon}</span>
                              <div>
                                <div className="text-sm text-[#F8FAFC]">{item.name}</div>
                                {item.description && (
                                  <div className="text-xs text-gray-400 mt-0.5">{item.description}</div>
                                )}
                              </div>
                            </Link>
                          )}
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>

            <div className="pt-2 border-t border-gray-800">
              {/* <Link
                href="/coming-soon"
                className="block w-full text-center px-4 py-3 rounded-lg text-[#F8FAFC] hover:bg-gray-800/50 transition-colors active:bg-gray-800/30"
                onClick={() => setIsMenuOpen(false)}
              >
                Login
              </Link> */}
              {/* <Link
                href="/coming-soon"
                className="block w-full text-center px-4 py-3 mt-2 text-white bg-[#0052FF] rounded-lg hover:bg-[#2563EB] transition-colors active:bg-[#1d4ed8]"
                onClick={() => setIsMenuOpen(false)}
              >
                Sign Up
              </Link> */}

              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  setIsGetStartedModalOpen(true);
                }}
                className="w-full text-center px-4 py-3 mt-2 text-white bg-[#0052FF] rounded-lg hover:bg-[#2563EB] transition-colors active:bg-[#1d4ed8]"
              >
                Get Started
              </button>
            </div>
          </div>
        </div>
      </div>

      <GetStartedModal
        isOpen={isGetStartedModalOpen}
        onClose={() => setIsGetStartedModalOpen(false)}
      />
    </header>
  );
};

export default Header;