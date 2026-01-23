'use client'
import Image from 'next/image';
import { useEffect, useState } from 'react';

export default function Loading() {
  const [isVisible, setIsVisible] = useState(true);

  // This effect will run once when the component mounts
  useEffect(() => {
    // Hide the loading screen after a delay (e.g., 2 seconds)
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, 3000);

    // Clean up the timer when the component unmounts
    return () => clearTimeout(timer);
  }, []);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 transition-opacity duration-3000 ease-in-out">
      <div className="animate-pulse">
        {/* Replace with your actual logo */}
        <div className="flex flex-col items-center">
          <Image
            src="/logo.png"
            alt="Logo"
            width={120}
            height={120}
            className="mb-4"
          />
        </div>
      </div>
    </div>
  );
}
