// src/pages/QuestHomePage.tsx
"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge"; // Assuming you have this, otherwise use standard span
import { Plus, Settings, Users, ArrowRight, Coins, Loader2, Calendar, ShieldCheck, Wallet, Sparkles } from 'lucide-react';
import { useWallet } from '@/hooks/use-wallet'; // Ensure this hook exists and returns { address }

// Assume Header is a component defined elsewhere
import { Header } from "@/components/header"; 

const API_BASE_URL = "https://fauctdrop-backend.onrender.com";

interface QuestOverview {
    faucetAddress: string;
    title: string;
    description: string;
    isActive: boolean;
    isFunded: boolean; // Added based on your requirements
    rewardPool: string;
    creatorAddress: string;
    startDate: string; // ISO String
    endDate: string;   // ISO String
    tasksCount: number;
    participantsCount: number;
    imageUrl?: string;
}

interface QuestsResponse {
    success: boolean;
    quests: QuestOverview[];
    count: number;
    message?: string;
}

function createSlug(title: string): string {
    return title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-');
}

// Helper to determine status and styling based on time and funding
const getQuestStatus = (quest: QuestOverview) => {
    const now = new Date();
    const startDate = new Date(quest.startDate);
    const endDate = new Date(quest.endDate);

    if (!quest.isFunded) {
        return { label: "Pending Funding", color: "bg-yellow-100 text-yellow-800 border-yellow-200", interactable: false };
    }
    if (now < startDate) {
        return { label: "Upcoming", color: "bg-blue-100 text-blue-800 border-blue-200", interactable: false };
    }
    if (now > endDate) {
        return { label: "Ended", color: "bg-gray-100 text-gray-600 border-gray-200", interactable: false };
    }
    if (!quest.isActive) {
        return { label: "Paused", color: "bg-red-100 text-red-800 border-red-200", interactable: false };
    }

    return { label: "Active", color: "bg-green-100 text-green-800 border-green-200", interactable: true };
};

export default function QuestHomePage() {
    const router = useRouter();
    const { address } = useWallet(); // Get connected wallet address
    const [quests, setQuests] = useState<QuestOverview[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchQuests = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await fetch(`${API_BASE_URL}/api/quests`);
            if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
            
            const data: QuestsResponse = await response.json();
            if (!data.success) throw new Error(data.message || 'Failed to retrieve quests.');

            setQuests(data.quests || []);
        } catch (err: any) {
            console.error("Error fetching quests:", err);
            setError(err.message || "Could not connect to the Quest API.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchQuests();
    }, []);

    const handleNavigate = (faucetAddress: string, title: string) => {
        const slug = createSlug(title);
        router.push(`/quest/${slug}-${faucetAddress}`);
    };

    return (
        <>
        <Header pageTitle='Quest Hub' />
        <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-8">
            
            {/* Top Section: Title & Create Button */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
               <div>
    <div className="flex items-center gap-3">
        <h2 className="text-3xl font-bold tracking-tight">Explore Quests</h2>
        <Badge variant="secondary" className="bg-purple-100 text-purple-700 border-purple-200 flex items-center gap-1 shadow-sm">
            <Sparkles className="h-3 w-3" /> Beta Testing Phase
        </Badge>
    </div>
    <p className="text-muted-foreground mt-1">Participate in campaigns or manage your own.</p>
</div>
                
                <Button 
                    onClick={() => router.push('/quest/create-quest')} 
                    className="w-full md:w-auto flex items-center gap-2 bg-green-600 hover:bg-green-700 shadow-md"
                >
                    <Plus className="h-4 w-4" />
                    Create New Quest
                </Button>
            </div>

            {/* Content Area */}
            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                    <Loader2 className="h-10 w-10 animate-spin mb-4 text-primary" />
                    <p>Loading Campaigns...</p>
                </div>
            ) : error ? (
                <Card className="p-6 border-red-200 bg-red-50 text-red-800 flex flex-col items-center text-center">
                    <p className="font-semibold text-lg mb-2">Unable to load quests</p>
                    <p className="text-sm mb-4">{error}</p>
                    <Button onClick={fetchQuests} variant="outline" className="border-red-300 hover:bg-red-100">
                        Retry
                    </Button>
                </Card>
            ) : quests.length === 0 ? (
                <Card className="py-20 text-center text-muted-foreground border-dashed">
                    <p className="text-lg">No quests found.</p>
                    <Button variant="link" onClick={() => router.push('/quest/create-quest')}>
                        Be the first to create one!
                    </Button>
                </Card>
            ) : (
                <div className="grid grid-cols-1 gap-6">
                    {quests.map((quest) => {
                        // Logic for View
                        const isOwner = address && quest.creatorAddress.toLowerCase() === address.toLowerCase();
                        const status = getQuestStatus(quest);
                        
                        return (
                            <Card key={quest.faucetAddress} className="group hover:shadow-lg transition-all duration-300 border-slate-200 dark:border-slate-800 overflow-hidden">
                                <div className="flex flex-col md:flex-row">
                                    
                                    {/* Image Section (Optional) */}
                                    {quest.imageUrl && (
                                        <div className="w-full md:w-48 h-32 md:h-auto bg-slate-100 dark:bg-slate-900 relative">
                                             <img src={quest.imageUrl} alt={quest.title} className="w-full h-full object-cover" />
                                        </div>
                                    )}

                                    {/* Details Section */}
                                    <div className="flex-1 flex flex-col p-5 md:p-6">
                                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4">
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-3 flex-wrap">
                                                    <h3 className="text-xl font-bold group-hover:text-primary transition-colors">
                                                        {quest.title}
                                                    </h3>
                                                    <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border ${status.color}`}>
                                                        {status.label}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-muted-foreground line-clamp-2">
                                                    {quest.description}
                                                </p>
                                            </div>
                                            
                                            {/* Action Button */}
                                            <div className="shrink-0 w-full md:w-auto">
                                                <Button 
                                                    size="sm" 
                                                    className={`w-full md:w-auto font-semibold ${
                                                        isOwner 
                                                            ? "bg-slate-900 text-white hover:bg-slate-800" 
                                                            : status.interactable 
                                                                ? "bg-primary text-white hover:bg-primary/90" 
                                                                : "bg-secondary text-secondary-foreground"
                                                    }`}
                                                    onClick={() => handleNavigate(quest.faucetAddress, quest.title)}
                                                >
                                                    {isOwner ? (
                                                        <>
                                                            <Settings className="h-4 w-4 mr-2" /> Manage Quest
                                                        </>
                                                    ) : (
                                                        <>
                                                            {status.interactable ? "Join Quest" : "View Details"} 
                                                            <ArrowRight className="h-4 w-4 ml-2" />
                                                        </>
                                                    )}
                                                </Button>
                                            </div>
                                        </div>

                                        {/* Stats Footer */}
                                        <div className="mt-auto pt-4 border-t grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs sm:text-sm text-muted-foreground">
                                            <div className="flex items-center gap-2">
                                                <div className="p-1.5 bg-blue-50 text-blue-600 rounded-md">
                                                    <Coins className="h-4 w-4" />
                                                </div>
                                                <span>Pool: <span className="font-semibold text-foreground">{quest.rewardPool}</span></span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="p-1.5 bg-purple-50 text-purple-600 rounded-md">
                                                    <Users className="h-4 w-4" />
                                                </div>
                                                <span>{quest.participantsCount} Participants</span>
                                            </div>
                                            <div className="flex items-center gap-2 sm:justify-end">
                                                <div className="p-1.5 bg-orange-50 text-orange-600 rounded-md">
                                                    <Calendar className="h-4 w-4" />
                                                </div>
                                                <span>Ends: {new Date(quest.endDate).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
        </>
    );
}
// import Image from 'next/image';
// import Link from 'next/link';
// import { siX, siTelegram, siGmail } from 'simple-icons/icons'

// interface IconProps {
//   path: string;
//   title?: string;
// }

// interface SimpleIconProps {
//   icon: IconProps;
//   size?: number | string;
//   className?: string;
// }

// export const SimpleIcon: React.FC<SimpleIconProps> = ({
//   icon,
//   size = 24,
//   className = 'text-white'
// }) => {
//   return (
//     <svg
//       role="img"
//       viewBox="0 0 24 24"
//       width={size}
//       height={size}
//       className={className}
//       fill="currentColor"
//       xmlns="http://www.w3.org/2000/svg"
//     >
//       <path d={icon.path} />
//     </svg>
//   );
// };

// export default function ComingSoon() {
//   const socialLinks = [
//     { icon: siX, href: 'https://x.com/faucetdrops', label: 'Twitter' },
//     { icon: siTelegram, href: 'https://t.me/faucetdropschat', label: 'Telegram' },
//     { icon: siGmail, href: 'mailto:drops.faucet@gmail.com', label: 'Email' },
//   ];

//   return (
//     <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-white dark:bg-black transition-colors duration-300">
//       <div className="max-w-2xl w-full text-center space-y-8">
        
//         {/* Logo Section - Adapts to theme */}
//         <div className="flex justify-center relative">
//           {/* Light Mode Logo: Visible by default, hidden in dark mode */}
//           <Image
//             src="/lightlogo.png"
//             alt="FaucetDrops Logo"
//             width={200}
//             height={80}
//             className="h-12 w-auto sm:h-16 lg:h-20 rounded-md object-contain dark:hidden"
//           />
          
//           {/* Dark Mode Logo: Hidden by default, visible in dark mode */}
//           <Image
//             src="/darklogo.png"
//             alt="FaucetDrops Logo"
//             width={200}
//             height={80}
//             className="h-12 w-auto sm:h-16 lg:h-20 rounded-md object-contain hidden dark:block"
//           />
//         </div>

//         {/* Heading Section - Theme aware */}
//         <div className="space-y-4">
//           <h1 className="text-4xl md:text-5xl font-bold text-black dark:text-white">
//             Coming Soon
//           </h1>
//           <p className="text-xl text-gray-600 dark:text-gray-400">
//             We&apos;re working on something amazing!
//           </p>
//           <p className="text-gray-600 dark:text-gray-400">
//             This page is under construction. Please check back later for updates.
//           </p>
//         </div>

//         {/* Status Badge - Theme aware */}
//         <div className="pt-4">
//           <div className="inline-flex items-center px-6 py-3 rounded-md bg-gray-100 dark:bg-white/10 text-black dark:text-white font-medium transition-colors duration-300">
//             <span className="relative flex h-3 w-3 mr-2">
//               <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gray-400 dark:bg-white/75"></span>
//               <span className="relative inline-flex rounded-full h-3 w-3 bg-gray-600 dark:bg-white"></span>
//             </span>
//             Under Development
//           </div>
//         </div>

//         {/* Social Media Links */}
//         <div className="pt-8">
//           <p className="text-sm text-gray-600 dark:text-gray-400">
//             In the meantime, you can follow us on social media or contact our team
//           </p>
//           <div className="flex justify-center space-x-6 pt-4">
//             {socialLinks.map((social, index) => (
//               <Link
//                 key={index}
//                 href={social.href}
//                 target="_blank"
//                 rel="noopener noreferrer"
//                 className="p-3 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-all duration-300 transform hover:scale-110"
//                 aria-label={social.label}
//                 title={social.label}
//               >
//                 <SimpleIcon
//                   icon={social.icon}
//                   size={24}
//                   className="text-black dark:text-white transition-colors duration-300"
//                 />
//               </Link>
//             ))}
//           </div>
//         </div>

//         {/* Footer Link - Theme aware */}
//         <div className="pt-8">
//           <p className="text-sm text-gray-600 dark:text-gray-400">
//             In the meantime, you can check out our
//             <Link 
//               href="/" 
//               className="text-black dark:text-white hover:underline font-semibold ml-1 transition-colors duration-300"
//             >
//               homepage
//             </Link>
//             .
//           </p>
//         </div>
//       </div>
//     </div>
//   );
// }