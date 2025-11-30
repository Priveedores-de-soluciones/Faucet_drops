"use client";

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

const Header = () => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const navLinks = [
        { name: 'Product', href: '/products' },
        { name: 'Developers', href: '/developer' },
        { name: 'Company', href: '/company' },
    ];

    return (
        <header className={`fixed w-full z-50 transition-colors duration-300 text-white mx-auto max-w-full px-0`}>
            <div className="container mx-auto px-4 py-4">
                <div className="flex items-center justify-between">
                    {/* Logo */}
                    <Link href="/" className="font-bold text-[#94A3B8] flex items-center space-x-2">
                        <Image 
                            src="/white_FaucetDrops.png" 
                            alt="Logo" 
                            width={1000} 
                            height={1000}
                            className='h-16 w-fit'
                        />
                    </Link>

                    {/* Desktop Navigation */}
                    <nav className="hidden md:flex items-center space-x-8 bg-[#020817]/50 px-5 py-3 rounded-2xl ring-1 ring-gray-700">
                        {navLinks.map((link) => (
                            <Link
                                key={link.name}
                                href={link.href}
                                className={`hover:text-[#94A3B8] transition-colors text-[#F8FAFC]`}
                            >
                                {link.name}
                            </Link>
                        ))}
                    </nav>

                    {/* Auth Buttons and Theme Toggle - Desktop */}
                    <div className="hidden md:flex items-center space-x-4">
                        <Link
                            href="/login"
                            className={`px-4 py-2 rounded-xl text-white hover:bg-gray-800 ring-1 ring-gray-700`}
                        >
                            Login
                        </Link>
                        <Link
                            href="/signup"
                            className="px-4 py-2 bg-[#0052FF] text-white rounded-xl hover:bg-[#2563EB] transition-colors"
                        >
                            Sign Up
                        </Link>
                    </div>

                    {/* Mobile menu button */}
                    <div className="flex md:hidden items-center space-x-4">
                        <button
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            className="p-2 rounded-md focus:outline-none ring-1 ring-gray-700"
                            aria-label="Toggle menu"
                        >
                            {isMenuOpen ? <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" className="size-5 transition-all duration-300 ease-linear"><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 6 6 18M6 6l12 12"></path></svg>
                                : <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" className="size-5 transition-all duration-300 ease-linear"><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12h12M3 6h18M3 18h18"></path></svg>}
                        </button>
                    </div>
                </div>

                {/* Mobile Menu */}
                {isMenuOpen && (
                    <div className={`md:hidden mt-4 pb-4 bg-[#020817]`}>
                        <div className="flex flex-col space-y-4 px-2">
                            {navLinks.map((link) => (
                                <Link
                                    key={link.name}
                                    href={link.href}
                                    className={`px-4 py-2 rounded-md text-[#94A3B8] hover:bg-gray-800 ring-1 ring-gray-700`}
                                    onClick={() => setIsMenuOpen(false)}
                                >
                                    {link.name}
                                </Link>
                            ))}
                            <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                                <Link
                                    href="/login"
                                    className={`block px-4 py-2 rounded-md text-white hover:bg-gray-800 ring-1 ring-gray-700`}
                                    onClick={() => setIsMenuOpen(false)}
                                >
                                    Login
                                </Link>
                                <Link
                                    href="/signup"
                                    className="block px-4 py-2 mt-2 text-white bg-[#0052FF] rounded-md hover:bg-[#2563EB] transition-colors"
                                    onClick={() => setIsMenuOpen(false)}
                                >
                                    Sign Up
                                </Link>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </header>
    );
};

export default Header;