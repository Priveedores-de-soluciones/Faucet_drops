"use client";

import Link from 'next/link';
import { siX, siGithub, siTelegram, siGmail, siYoutube } from 'simple-icons/icons'
import Image from 'next/image';

interface IconProps {
  path: string;
  title?: string;
}

interface SimpleIconProps {
  icon: IconProps;
  size?: number | string;
  className?: string;
}

const SimpleIcon: React.FC<SimpleIconProps> = ({ 
  icon, 
  size = 24, 
  className = 'text-white' 
}) => {
  return (
    <svg
      role="img"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d={icon.path} />
    </svg>
  );
};

const Footer = () => {

  const footerLinks = [
    {
      title: 'Product',
      links: [
        { name: 'Faucets', href: '/coming-soon' },
        { name: 'Quests', href: '/coming-soon' },
        { name: 'Quizzes', href: '/coming-soon' },
        { name: 'Enterprise', href: '/coming-soon' },
      ],
    },
    {
      title: 'Company',
      links: [
        { name: 'About Us', href: '/coming-soon' },
        { name: 'Careers', href: '/coming-soon' },
        { name: 'Blog', href: '/coming-soon' },
        { name: 'Press', href: '/coming-soon' },
      ],
    },
    {
      title: 'Resources',
      links: [
        { name: 'Documentation', href: '/coming-soon' },
        { name: 'Guides', href: '/coming-soon' },
        { name: 'API Status', href: '/coming-soon' },
        { name: 'Help Center', href: '/coming-soon' },
      ],
    },
  ];

  const socialLinks = [
    { icon: <SimpleIcon icon={siX} size={20} />, href: 'https://x.com/faucetdrops', label: 'Twitter' },
    { icon: <SimpleIcon icon={siGithub} size={20} />, href: 'https://github.com/Priveedores-de-soluciones/Faucet_drops', label: 'GitHub' },
    { icon: <SimpleIcon icon={siTelegram} size={20} />, href: 'https://t.me/faucetdropschat', label: 'Telegram' },
    { icon: <SimpleIcon icon={siGmail} size={20} />, href: 'mailto:drops.faucet@gmail.com', label: 'Email' },
    { icon: <SimpleIcon icon={siYoutube} size={20} />, href: 'https://www.youtube.com/@Faucet_Drops', label: 'Youtube' },
  ];

  return (
    <footer className={`w-full bg-linear-to-b from-0% to-[#020817] text-[#94A3B8]`}>
      <div className="container mx-auto px-4 py-12 md:py-16 md:px-20">
        <div className="flex flex-col md:flex-row justify-between gap-12">
          {/* Logo and description */}
          <div className="lg:col-span-4">
            <div className="flex items-center space-x-2 mb-4">
              <Image 
                src='/logo.png'
                alt='Logo'
                className='w-fit h-16'
                width={1000}
                height={1000}
              />
            </div>
            <p className={`mb-6 text-[#94A3B8]`}>
            Free, Fast, Fair & Frictionless Token Distribution 💧
            </p>

            {/* Social links */}
            <div className="flex space-x-4">
              {socialLinks.map((social, index) => (
                <a
                  key={index}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`p-2 rounded-full hover:bg-gray-800`}
                  aria-label={social.label}
                >
                  {social.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Footer links */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-12">
            {footerLinks.map((section, index) => (
              <div key={index}>
                <h3 className={`text-sm font-semibold mb-4 uppercase tracking-wider text-white`}>
                  {section.title}
                </h3>
                <ul className="space-y-3">
                  {section.links.map((link, linkIndex) => (
                    <li key={linkIndex}>
                      <Link 
                        href={link.href}
                        className={`text-sm hover:text-[#2563EB] transition-colors text-[#94A3B8]`}
                      >
                        {link.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom bar */}
        <div className={`border-t mt-12 pt-8 flex flex-col md:flex-row justify-between items-center border-gray-800`}>
          <p className="text-sm">
            &copy; {new Date().getFullYear()} FaucetDrops. All rights reserved.
          </p>
          <div className="flex flex-wrap justify-center md:justify-end gap-4 mt-4 md:mt-0">
            <Link href="/privacy" className="text-sm hover:text-[#2563EB] transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="text-sm hover:text-[#2563EB] transition-colors">
              Terms of Service
            </Link>
            <Link href="/cookie-policy" className="text-sm hover:text-[#2563EB] transition-colors">
              Cookie Policy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
