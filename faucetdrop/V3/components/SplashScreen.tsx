'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

export default function SplashScreen() {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Check if splash was already shown
    const splashShown = sessionStorage.getItem('splashShown');
    
    if (splashShown) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsVisible(false);
      return;
    }

    // Mark splash as shown for this session
    sessionStorage.setItem('splashShown', 'true');

    // Auto-hide after 3 seconds
    const timer = setTimeout(() => {
      setIsVisible(false);
      document.body.style.overflow = 'auto';
    }, 3000);

    // Prevent scrolling while splash is visible
    document.body.style.overflow = 'hidden';

    return () => {
      clearTimeout(timer);
      document.body.style.overflow = 'auto';
    };
  }, []);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-9999 flex items-center justify-center bg-[#020817] transition-opacity duration-1000 ease-in-out">
      <div className="flex flex-col items-center justify-center">
        <div className="animate-bounce">
          <Image
            src="/white_FaucetDrops.png"
            alt="FaucetDrops Logo"
            width={200}
            height={200}
            priority
            className="mb-8"
          />
        </div>
      </div>
    </div>
  );
}
