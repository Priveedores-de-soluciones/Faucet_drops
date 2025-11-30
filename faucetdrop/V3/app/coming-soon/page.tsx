import Image from 'next/image';
import Link from 'next/link';

export default function ComingSoon() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-white p-6">
      <div className="max-w-2xl w-full text-center space-y-8">
        <div className="relative w-48 h-48 mx-auto">
          <Image
            src="/white_FaucetDrops.png"
            alt="FaucetDrops Logo"
            fill
            className="object-contain"
          />
        </div>
        
        <div className="space-y-4">
          <h1 className="text-4xl md:text-5xl font-bold text-white">Coming Soon</h1>
          <p className="text-xl text-muted-foreground">
            We&apos;re working on something amazing!
          </p>
          <p className="text-muted-foreground">
            This page is under construction. Please check back later for updates.
          </p>
        </div>
        
        <div className="pt-4">
          <div className="inline-flex items-center px-6 py-3 rounded-md bg-white/10 text-white font-medium">
            <span className="relative flex h-3 w-3 mr-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white/75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
            </span>
            Under Development
          </div>
        </div>
        
        <div className="pt-8">
          <p className="text-sm text-muted-foreground">
            In the meantime, you can check out our 
            <Link href="/" className="text-white hover:underline"> homepage</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}
