import Link from 'next/link';
import Image from 'next/image';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-foreground p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="relative w-40 h-40 mx-auto">
          <Image
            src="/white_FaucetDrops.png"
            alt="FaucetDrops Logo"
            fill
            className="object-contain"
          />
        </div>
        
        <h1 className="text-6xl text-white font-bold">404</h1>
        <h2 className="text-2xl font-semibold text-white">Page Not Found</h2>
        
        <p className="text-muted-foreground">
          Oops! The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        
        <div className="pt-4">
          <Link
            href="/"
            className="inline-flex items-center px-6 py-3 rounded-md bg-white text-black font-medium hover:bg-white/90 transition-colors"
          >
            Return Home
          </Link>
        </div>
      </div>
    </div>
  );
}
