"use client"

import React, { useEffect, useState, useMemo, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { useWallet } from "@/hooks/use-wallet"
import { useNetwork } from "@/hooks/use-network" 
import { getUserFaucets } from "@/lib/faucet"
import { Header } from "@/components/header"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
    Settings, Search, Copy, Wallet, Loader2,
    ScrollText, PencilRuler, Rocket, Trash2
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

import { ProfileSettingsModal } from "@/components/profile-setting" 
import { MyCreationsModal } from "@/components/my-creations-modal" 
import { CreateNewModal } from "@/components/create-new-modal" 

// --- Custom Icons ---
const XIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
)
// ... (Other icons remain the same) ...

// --- Types ---
interface FaucetData {
    faucetAddress: string;
    name: string;
    chainId: number;
    faucetType: string;
    createdAt?: string;
}

interface QuestData {
    // We rely on faucetAddress as the unique ID for routing
    faucetAddress?: string; 
    title: string;
    description: string;
    imageUrl: string;
    creatorAddress?: string;
    status?: 'draft' | 'published';
    createdAt?: string;
    participantCount?: number;
}

interface UserProfileData {
    wallet_address: string;
    username: string;
    email?: string;
    bio?: string;
    avatar_url?: string;
    twitter_handle?: string;
    discord_handle?: string;
    telegram_handle?: string;
    farcaster_handle?: string;
}

export default function DashboardPage() {
    const backendUrl = "http://127.0.0.1:8000"; 
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const { address: connectedAddress, isConnected } = useWallet();
    const { networks } = useNetwork();
    
    const targetUsername = params.username as string;
    
    // Data State
    const [faucets, setFaucets] = useState<FaucetData[]>([]);
    const [publishedQuests, setPublishedQuests] = useState<QuestData[]>([]);
    const [draftQuests, setDraftQuests] = useState<QuestData[]>([]);
    
    const [profile, setProfile] = useState<UserProfileData | null>(null);
    const [quizCount, setQuizCount] = useState<number>(0);
    const [loading, setLoading] = useState(true);
    
    // Filters & UI State
    const [searchQuery, setSearchQuery] = useState("");
    const [networkFilter, setNetworkFilter] = useState("all");
    const [activeTab, setActiveTab] = useState("faucets");
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    const isOwner = useMemo(() => {
        if (!connectedAddress || !profile?.wallet_address) return false;
        return connectedAddress.toLowerCase() === profile.wallet_address.toLowerCase();
    }, [connectedAddress, profile]);

    // --- FUNCTION: Delete Draft ---
    const handleDeleteDraft = async (draftId: string) => {
        if (!confirm("Are you sure you want to delete this draft?")) return;
        
        try {
            const res = await fetch(`${backendUrl}/api/quests/draft/${draftId}`, {
                method: 'DELETE'
            });
            const data = await res.json();
            
            if (data.success) {
                toast({ title: "Draft deleted successfully" });
                setDraftQuests(prev => prev.filter(q => q.faucetAddress !== draftId));
            } else {
                toast({ title: "Failed to delete draft", variant: "destructive" });
            }
        } catch (e) {
            console.error(e);
            toast({ title: "Error deleting draft", variant: "destructive" });
        }
    }

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const profRes = await fetch(`${backendUrl}/api/profile/user/${targetUsername}`);
            const profData = await profRes.json();
            
            if (profData.success && profData.profile) {
                const userProfile = profData.profile;
                setProfile(userProfile);
                const userWallet = userProfile.wallet_address;
                
                if (userWallet) {
                    // Fetch Faucets
                    const faucetData = await getUserFaucets(userWallet);
                    setFaucets(faucetData);

                    // Fetch Quests
                    const questRes = await fetch(`${backendUrl}/api/quests`);
                    const qData = await questRes.json();
                    
                    if (qData.success) {
                        // Filter Published Quests
                        const myQuests = qData.quests.filter((q: any) => 
                            q.creatorAddress.toLowerCase() === userWallet.toLowerCase()
                        );
                        // Ensure we aren't displaying Drafts in the Published list
                        // (Backend usually handles this, but good to be safe)
                        setPublishedQuests(myQuests.filter((q: any) => !q.isDraft));
                    }

                    // Fetch Drafts (Only if viewing own profile)
                    if (isConnected && connectedAddress && userWallet.toLowerCase() === connectedAddress.toLowerCase()) {
                        try {
                            const draftRes = await fetch(`${backendUrl}/api/quests/drafts/${userWallet}`);
                            if (draftRes.ok) {
                                const dData = await draftRes.json();
                                if (dData.success) {
                                    const formattedDrafts = dData.drafts.map((d: any) => ({
                                        ...d,
                                        faucetAddress: d.faucet_address, 
                                        creatorAddress: d.creator_address,
                                        imageUrl: d.image_url,
                                        title: d.title,
                                        description: d.description
                                    }));
                                    setDraftQuests(formattedDrafts);
                                }
                            }
                        } catch (err) {
                            console.log("No drafts found", err);
                        }
                    }
                }
            } else {
                // New User Logic
                const isViewingOwnNewProfile = 
                isConnected && 
                connectedAddress && 
                targetUsername.toLowerCase() === connectedAddress.toLowerCase();

                if (isViewingOwnNewProfile) {
                    setProfile({
                        wallet_address: connectedAddress,
                        username: "New User", 
                        bio: "You haven't set up your profile yet. Click settings to get started!",
                        avatar_url: "" 
                    });
                    
                    const faucetData = await getUserFaucets(connectedAddress);
                    setFaucets(faucetData);
                } else {
                    toast({ title: "User not found", variant: "destructive" });
                    setProfile(null);
                }
            }
        } catch (error) {
            console.error("Dashboard load error:", error);
        } finally {
            setLoading(false);
        }
    }, [targetUsername, connectedAddress, isConnected, backendUrl]);

    useEffect(() => {
        if (targetUsername) fetchData();
    }, [targetUsername, fetchData]);

    // Helpers
    const getNetworkName = (id: number) => networks.find(n => n.chainId === id)?.name || `Chain ${id}`;
    const getNetworkColor = (id: number) => networks.find(n => n.chainId === id)?.color || "#64748b";
    
    const getSocialUrl = (platform: string, handle: string) => {
        const cleanHandle = handle.replace('@', '').trim();
        switch (platform) {
            case 'twitter': return `https://x.com/${cleanHandle}`;
            case 'telegram': return `https://t.me/${cleanHandle}`;
            case 'farcaster': return `https://farcaster.xyz/${cleanHandle}`;
            default: return '#';
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast({ title: "Copied to clipboard" });
    };

    const filteredFaucets = useMemo(() => {
        return faucets.filter(f => {
            const matchesSearch = f.name?.toLowerCase().includes(searchQuery.toLowerCase()) || f.faucetAddress.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesNetwork = networkFilter === "all" || f.chainId.toString() === networkFilter;
            return matchesSearch && matchesNetwork;
        });
    }, [faucets, searchQuery, networkFilter]);

    if (loading) return (
        <div className="min-h-screen flex flex-col items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    );

    if (!profile) return <div className="p-20 text-center">User not found.</div>;

    const displayAddress = profile.wallet_address ? `${profile.wallet_address.slice(0,6)}...${profile.wallet_address.slice(-4)}` : "";

    return (
        <main className="min-h-screen bg-background pb-20 relative overflow-x-hidden">
            <div className="container mx-auto px-4 py-8 relative z-10 max-w-7xl">
                <Header pageTitle={isOwner ? "My Dashboard" : `${profile.username}'s Space`} />

                {/* --- 1. USER IDENTITY SECTION --- */}
                <div className="mb-10">
                    <Card className="border-none bg-gradient-to-r from-primary/5 via-primary/10 to-background shadow-sm">
                        <CardContent className="p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center gap-6">
                            <div className="relative">
                                <Avatar className="h-24 w-24 border-4 border-background shadow-lg relative z-10">
                                    <AvatarImage src={profile.avatar_url} className="object-cover" />
                                    <AvatarFallback className="bg-primary text-white text-2xl">
                                        {profile.username.charAt(0).toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>

                                {isOwner && (
                                    <div className="absolute -bottom-2 -right-2 z-20 bg-background rounded-full shadow-md">
                                        <ProfileSettingsModal />
                                    </div>
                                )}
                            </div>

                            <div className="flex-1 space-y-2">
                                <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-wrap">
                                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                                        {profile.username}
                                    </h1>
                                    <div className="flex gap-2 flex-wrap justify-center sm:justify-start">
                                        {profile?.twitter_handle && (
                                            <a href={getSocialUrl('twitter', profile.twitter_handle)} target="_blank" rel="noopener noreferrer" className="no-underline">
                                                <Badge variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-100 gap-1.5 pl-2 pr-2.5 cursor-pointer">
                                                    <XIcon className="h-3 w-3" /> {profile.twitter_handle.replace('@', '')}
                                                </Badge>
                                            </a>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 text-muted-foreground font-mono text-sm">
                                    <Wallet className="h-4 w-4" />
                                    <span>{displayAddress}</span>
                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(profile.wallet_address)}>
                                        <Copy className="h-3 w-3" />
                                    </Button>
                                </div>

                                <p className="text-sm text-muted-foreground max-w-2xl line-clamp-2">
                                    {profile.bio || "No bio set yet."}
                                </p>
                            </div>

                            {/* STATS SECTION */}
                            <div className="flex items-center gap-6 bg-background/50 p-4 rounded-xl border self-start md:self-center w-full md:w-auto justify-around md:justify-start">
                                <div className="text-center">
                                    <div className="text-2xl font-bold">{faucets.length}</div>
                                    <div className="text-xs text-muted-foreground uppercase font-semibold">Faucets</div>
                                </div>
                                <div className="h-10 w-[1px] bg-border" />
                                <div className="text-center">
                                    <div className="text-2xl font-bold">{publishedQuests.length}</div> 
                                    <div className="text-xs text-muted-foreground uppercase font-semibold">Quests</div>
                                </div>
                                <div className="h-10 w-[1px] bg-border" />
                                <div className="text-center">
                                    <div className="text-2xl font-bold">{quizCount}</div> 
                                    <div className="text-xs text-muted-foreground uppercase font-semibold">Quizzes</div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* --- 2. ACTION BAR & TABS --- */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                    <div className="flex items-center gap-2 bg-muted/50 p-1 rounded-lg">
                        <button 
                            onClick={() => setActiveTab('faucets')}
                            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'faucets' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            Faucets ({faucets.length})
                        </button>
                        <button 
                            onClick={() => setActiveTab('quests')}
                            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'quests' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            {/* FIX: REMOVED DRAFT COUNT FROM HERE */}
                            Quests ({publishedQuests.length})
                        </button>
                    </div>

                    {isOwner && (
                        <div className="flex flex-wrap gap-3">
                            <MyCreationsModal faucets={faucets} address={connectedAddress!} />
                            <CreateNewModal onSuccess={fetchData} />
                        </div>
                    )}
                </div>

                {/* --- 3. MAIN CONTENT --- */}
                
                {/* TAB: FAUCETS */}
                {activeTab === 'faucets' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                         <div className="flex flex-col sm:flex-row gap-4 mb-4">
                            <div className="relative flex-1">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input placeholder="Search faucets..." className="pl-9" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                            </div>
                            <Select value={networkFilter} onValueChange={setNetworkFilter}>
                                <SelectTrigger className="w-full sm:w-[180px]">
                                    <SelectValue placeholder="All Networks" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Networks</SelectItem>
                                    {networks.map(n => <SelectItem key={n.chainId} value={n.chainId.toString()}>{n.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-4"}>
                            {filteredFaucets.length > 0 ? filteredFaucets.map((faucet) => (
                                <FaucetCard 
                                    key={faucet.faucetAddress} 
                                    faucet={faucet} 
                                    getNetworkName={getNetworkName}
                                    getNetworkColor={getNetworkColor}
                                    onManage={() => router.push(`/faucet/${faucet.faucetAddress}?networkId=${faucet.chainId}`)}
                                    isOwner={isOwner}
                                />
                            )) : (
                                <div className="col-span-full text-center py-10 text-muted-foreground">No faucets found matching your filters.</div>
                            )}
                        </div>
                    </div>
                )}

                {/* TAB: QUESTS */}
                {activeTab === 'quests' && (
                    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        
                        {/* Section: Active Quests */}
                        <div>
                            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                <Rocket className="h-5 w-5 text-blue-500" /> Published Quests
                            </h3>
                            {publishedQuests.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {publishedQuests.map((quest) => (
                                        <QuestCard 
                                            key={quest.faucetAddress} // Use faucetAddress as Key
                                            quest={quest} 
                                            type="published"
                                            // FIX: Use faucetAddress for routing to the Quest Page
                                            onClick={() => router.push(`/quest/${quest.faucetAddress}`)}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 border rounded-lg bg-muted/20 text-muted-foreground">
                                    No published quests yet.
                                </div>
                            )}
                        </div>

                        {/* Section: Drafts (Only for Owner) */}
                        {isOwner && (
                            <div>
                                <div className="flex items-center gap-3 mb-4">
                                    <h3 className="text-lg font-semibold flex items-center gap-2">
                                        <PencilRuler className="h-5 w-5 text-orange-500" /> Drafts
                                    </h3>
                                    <Badge variant="outline" className="border-orange-200 text-orange-600 bg-orange-50">{draftQuests.length}</Badge>
                                </div>
                                
                                {draftQuests.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {draftQuests.map((quest) => (
                                            <QuestCard 
                                                key={quest.faucetAddress} 
                                                quest={quest} 
                                                type="draft"
                                                onClick={() => router.push(`/quest/create-quest?draftId=${quest.faucetAddress}`)}
                                                onDelete={handleDeleteDraft}
                                            />
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-8 border border-dashed rounded-lg bg-muted/10 text-muted-foreground">
                                        No drafts in progress.
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </main>
    )
}

// --- SUB-COMPONENTS ---

function FaucetCard({ faucet, getNetworkName, getNetworkColor, onManage, isOwner }: any) {
    const networkName = getNetworkName(faucet.chainId)
    const networkColor = getNetworkColor(faucet.chainId)

    return (
        <Card className="hover:shadow-lg transition-all duration-200 flex flex-col group border-l-4" style={{ borderLeftColor: networkColor }}>
            <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                    <Badge variant="outline" className="mb-2 bg-background" style={{ borderColor: networkColor, color: networkColor }}>
                        <span className="w-1.5 h-1.5 rounded-full mr-1.5" style={{ backgroundColor: networkColor }}></span>
                        {networkName}
                    </Badge>
                    <Badge variant="secondary" className="capitalize text-xs">
                        {faucet.faucetType}
                    </Badge>
                </div>
                <CardTitle className="truncate text-lg">{faucet.name}</CardTitle>
                <CardDescription className="font-mono text-xs flex items-center gap-2 mt-1">
                    {faucet.faucetAddress.slice(0, 6)}...{faucet.faucetAddress.slice(-4)}
                </CardDescription>
            </CardHeader>
            <div className="p-4 pt-0 mt-auto">
                <Button onClick={onManage} className="w-full">
                    <Settings className="h-4 w-4 mr-2" /> {isOwner ? "Manage" : "View"} Distribution
                </Button>
            </div>
        </Card>
    )
}

interface QuestCardProps {
    quest: QuestData;
    type: 'published' | 'draft';
    onClick: () => void;
    onDelete?: (id: string) => void;
}

function QuestCard({ quest, type, onClick, onDelete }: QuestCardProps) {
    return (
        <Card className={`hover:shadow-md transition-all group ${type === 'draft' ? 'border-dashed border-orange-200 bg-orange-50/10' : ''}`}>
            <div className="relative h-32 w-full bg-muted overflow-hidden rounded-t-lg cursor-pointer" onClick={onClick}>
                <img src={quest.imageUrl || "https://placehold.co/600x400?text=Quest"} alt={quest.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                
                {/* Delete Button for Drafts */}
                {type === 'draft' && onDelete && (
                    <Button 
                        variant="destructive" 
                        size="icon" 
                        className="absolute top-2 right-2 h-7 w-7 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
                        onClick={(e) => {
                            e.stopPropagation(); // Prevent card click
                            if (quest.faucetAddress) {
                                onDelete(quest.faucetAddress);
                            }
                        }}
                    >
                        <Trash2 className="h-3 w-3" />
                    </Button>
                )}
                
                <div className="absolute top-2 left-2">
                    {type === 'draft' ? (
                        <Badge className="bg-orange-500 text-white">Draft</Badge>
                    ) : (
                        <Badge className="bg-green-500 text-white">Active</Badge>
                    )}
                </div>
            </div>
            <CardContent className="p-4">
                <h4 className="font-bold truncate text-base mb-1">{quest.title || "Untitled Quest"}</h4>
                <p className="text-sm text-muted-foreground line-clamp-2 h-10 mb-3">
                    {quest.description || "No description provided."}
                </p>
                
                <Button variant={type === 'draft' ? "outline" : "default"} size="sm" className="w-full" onClick={onClick}>
                    {type === 'draft' ? (
                        <><PencilRuler className="h-3 w-3 mr-2" /> Continue Editing</>
                    ) : (
                        <><ScrollText className="h-3 w-3 mr-2" /> View Quest</>
                    )}
                </Button>
            </CardContent>
        </Card>
    )
}