"use client"

import { useState, useEffect } from "react"
import { useAppKitAccount, useAppKitProvider } from "@reown/appkit/react"
import { BrowserProvider, Eip1193Provider } from 'ethers'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Settings, Loader2, Save, Upload, Check, Edit2, RefreshCw, AlertCircle, CheckCircle2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

// Backend URL
const API_BASE_URL = "https://fauctdrop-backend.onrender.com";

interface UserProfile {
  username: string
  email: string
  bio: string
  twitter_handle: string
  discord_handle: string
  telegram_handle: string
  farcaster_handle: string
  avatar_url: string
}

// Map for field status: string = error message, null = valid/available, undefined = initial/unchecked
interface FieldStatus {
  username?: string | null;
  email?: string | null;
  twitter_handle?: string | null;
  discord_handle?: string | null;
  telegram_handle?: string | null;
  farcaster_handle?: string | null;
}

const GENERATED_SEEDS = [
  "Jerry","John", "Aneka", "Zack", "Molly", "Bear", "Crypto", "Whale", "Pepe",
  "Satoshi", "Vitalik", "Gwei", "HODL", "WAGMI", "Doge", "Shiba", "Solana",
  "Ether", "Bitcoin", "Chain", "Block", "DeFi", "NFT", "Alpha", "Beta",
  "Neon", "Cyber", "Pixel", "Glitch", "Retro", "Vapor", "Synth", "Wave",
  "Pulse", "Echo", "Flux", "Spark", "Glow", "Shine", "Shadow", "Light",
  "Dark", "Void", "Zenith", "Apex", "Nova", "Nebula", "Galaxy", "Comet",
  "Zeus", "Hera", "Odin", "Thor", "Loki", "Freya", "Ra", "Anubis",
  "Apollo", "Athena", "Ares", "Hades", "Poseidon", "Atlas", "Titan",
  "Phoenix", "Dragon", "Griffin", "Hydra", "Medusa", "Pegasus", "Sphinx",
  "Wolf", "Eagle", "Hawk", "Lion", "Tiger", "Shark", "Dolphin", "Panda",
  "Fox", "Owl", "Raven", "Crow", "Snake", "Cobra", "Viper", "Toad",
  "River", "Sky", "Ocean", "Forest", "Mountain", "Rain", "Storm", "Snow",
  "Leo", "Zoe", "Max", "Ruby", "Kai", "Luna", "Finn", "Cleo",
  "Jasper", "Milo", "Otis", "Arlo", "Ezra", "Silas", "Jude", "Rowan"
];

export function ProfileSettingsModal() {
  const { address, isConnected } = useAppKitAccount()
  const { walletProvider } = useAppKitProvider('eip155')
  const { toast } = useToast()
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  
  // Field Status: undefined = clean, null = success, string = error
  const [fieldStatus, setFieldStatus] = useState<FieldStatus>({}) 
  
  const [seedOffset, setSeedOffset] = useState(0);
  const ITEMS_PER_PAGE = 8;

  const handleShuffle = () => {
      setSeedOffset((prev) => (prev + ITEMS_PER_PAGE) % GENERATED_SEEDS.length);
  };

  const currentSeeds = GENERATED_SEEDS.slice(seedOffset, seedOffset + ITEMS_PER_PAGE);
  if (currentSeeds.length < ITEMS_PER_PAGE) {
      const remaining = ITEMS_PER_PAGE - currentSeeds.length;
      currentSeeds.push(...GENERATED_SEEDS.slice(0, remaining));
  }

  const [formData, setFormData] = useState<UserProfile>({
    username: "",
    email: "",
    bio: "",
    twitter_handle: "",
    discord_handle: "",
    telegram_handle: "",
    farcaster_handle: "",
    avatar_url: ""
  })

  const isFormValid = formData.email?.trim() !== "" && formData.twitter_handle?.trim() !== "";

  useEffect(() => {
    if (isOpen && address) {
      fetchProfile()
      setFieldStatus({}) // Clear status on open
    }
  }, [isOpen, address])

  const fetchProfile = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE_URL}/api/profile/${address}`)
      const data = await res.json()
      if (data.profile) {
        setFormData({
          username: data.profile.username || "",
          email: data.profile.email || "",
          bio: data.profile.bio || "",
          twitter_handle: data.profile.twitter_handle || "",
          discord_handle: data.profile.discord_handle || "",
          telegram_handle: data.profile.telegram_handle || "",
          farcaster_handle: data.profile.farcaster_handle || "",
          avatar_url: data.profile.avatar_url || ""
        })
      }
    } catch (error) {
      console.error("Failed to fetch profile", error)
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const uploadData = new FormData()
      uploadData.append('file', file)

      const response = await fetch(`${API_BASE_URL}/upload-image`, {
        method: 'POST',
        body: uploadData
      })

      const data = await response.json()
      if (data.success) {
        setFormData(prev => ({ ...prev, avatar_url: data.imageUrl }))
        toast({ title: "Image Uploaded", description: "Your custom avatar is ready to save." })
      } else {
        throw new Error(data.message)
      }
    } catch (error: any) {
      toast({ title: "Upload Failed", description: error.message, variant: "destructive" })
    } finally {
      setUploading(false)
    }
  }

  // Helper to check uniqueness against backend
  const checkUniqueness = async (field: keyof UserProfile, value: string) => {
    if (!value || value.trim() === "") {
        // Reset status if empty
        setFieldStatus(prev => {
            const newStatus = { ...prev };
            delete newStatus[field as keyof FieldStatus];
            return newStatus;
        });
        return true; 
    }
    
    try {
        const res = await fetch(`${API_BASE_URL}/api/profile/check-availability`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ field, value, current_wallet: address })
        });
        const data = await res.json();
        
        if (!data.available) {
            setFieldStatus(prev => ({ ...prev, [field]: data.message })); // Set Error Message
            return false;
        } else {
            setFieldStatus(prev => ({ ...prev, [field]: null })); // Set Success (null means valid)
            return true;
        }
    } catch (error) {
        console.error("Validation error", error);
        return true; // Assume valid if network error
    }
  };

  const handleSave = async () => {
    if (!isConnected || !walletProvider || !address) {
      toast({ title: "Error", description: "Wallet not connected", variant: "destructive" })
      return
    }

    if (!isFormValid) {
        toast({ title: "Missing Information", description: "Email and X (Twitter) are required.", variant: "destructive" })
        return
    }

    setSaving(true)

    // Check all fields
    const validations = await Promise.all([
        checkUniqueness('username', formData.username),
        checkUniqueness('email', formData.email),
        checkUniqueness('twitter_handle', formData.twitter_handle),
        formData.discord_handle ? checkUniqueness('discord_handle', formData.discord_handle) : Promise.resolve(true),
        formData.telegram_handle ? checkUniqueness('telegram_handle', formData.telegram_handle) : Promise.resolve(true),
        formData.farcaster_handle ? checkUniqueness('farcaster_handle', formData.farcaster_handle) : Promise.resolve(true),
    ]);

    // If any validation failed (returned false), stop
    if (validations.includes(false)) {
        setSaving(false);
        toast({ title: "Validation Failed", description: "Some details are already in use.", variant: "destructive" });
        return;
    }

    try {
      const nonce = Math.floor(Math.random() * 1000000).toString()
      const message = `I am updating my FaucetDrops profile.\n\nWallet: ${address}\nNonce: ${nonce}\nTimestamp: ${Date.now()}`

      const ethersProvider = new BrowserProvider(walletProvider as Eip1193Provider)
      const signer = await ethersProvider.getSigner()
      const signature = await signer.signMessage(message)

      const payload = {
        wallet_address: address,
        ...formData,
        signature,
        message,
        nonce
      }

     const res = await fetch(`${API_BASE_URL}/api/profile/update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })

      // Inside handleSave in ProfileSettingsModal
    const result = await res.json()
      if (!res.ok) throw new Error(result.detail || "Update failed")

      toast({ title: "Success", description: "Profile updated successfully!" })
      setIsOpen(false)

      // This triggers the fetchProfile function in your WalletConnectButton
      window.dispatchEvent(new Event("profileUpdated"));

      if (res.ok) {
  window.dispatchEvent(new Event("profileUpdated"));
  
  // If the user just set a username for the first time, 
  // redirect them to the new URL
  if (formData.username && formData.username.toLowerCase() !== "anonymous") {
          router.push(`/dashboard/${formData.username}`);
      }
}

    } catch (error: any) {
      console.error(error)
      toast({ 
        title: "Save Failed", 
        description: error.message || "Could not save profile", 
        variant: "destructive" 
      })
    } finally {
      setSaving(false)
    }
  }

  const handleInputChange = (field: keyof UserProfile, value: string) => {
      setFormData({ ...formData, [field]: value });
      // Clear status when typing to remove old error/success states until blur
      if (fieldStatus[field as keyof FieldStatus] !== undefined) {
          setFieldStatus(prev => {
              const newStatus = { ...prev };
              delete newStatus[field as keyof FieldStatus];
              return newStatus;
          });
      }
  };

  // Helper to render feedback message
  const renderFeedback = (field: keyof FieldStatus) => {
      const status = fieldStatus[field];
      if (status === undefined) return null; // No status yet

      if (status === null) {
          // Success state
          return (
              <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                  <CheckCircle2 className="h-3 w-3" /> Available
              </p>
          );
      }
      
      // Error state
      return <p className="text-xs text-red-500 mt-1">{status}</p>;
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-background shadow-sm hover:bg-muted">
          <Edit2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[95%] sm:max-w-[600px] max-h-[90vh] overflow-y-auto rounded-lg">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
        </DialogHeader>
        
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="flex flex-col gap-6 py-4">
            
            {/* Avatar Section */}
            <div className="flex flex-col items-center gap-4 w-full">
                <Avatar className="h-24 w-24 border-2 border-primary/20 shadow-sm">
                    <AvatarImage src={formData.avatar_url} className="object-cover" />
                    <AvatarFallback className="text-2xl font-bold bg-muted">{formData.username?.[0]?.toUpperCase() || "?"}</AvatarFallback>
                </Avatar>

                <Tabs defaultValue="generate" className="w-full max-w-sm">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="upload">Upload Custom</TabsTrigger>
                        <TabsTrigger value="generate">Choose Avatar</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="upload" className="pt-4">
                        <div className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-6 hover:bg-accent/50 transition-colors cursor-pointer relative bg-muted/20">
                            <input 
                                type="file" 
                                accept="image/*"
                                onChange={handleFileUpload}
                                className="absolute inset-0 opacity-0 cursor-pointer"
                                disabled={uploading}
                            />
                            {uploading ? (
                                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                            ) : (
                                <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                            )}
                            <p className="text-xs sm:text-sm text-muted-foreground text-center">
                                {uploading ? "Uploading..." : "Tap to upload image (max 5MB)"}
                            </p>
                        </div>
                    </TabsContent>

                    <TabsContent value="generate" className="pt-4">
                        <div className="grid grid-cols-4 gap-3">
                            {currentSeeds.map((seed, idx) => { 
                                const url = `https://api.dicebear.com/9.x/notionists/svg?seed=${seed}`
                                const isSelected = formData.avatar_url === url
                                return (
                                    <div 
                                        key={`${seed}-${idx}`}
                                        onClick={() => setFormData(prev => ({...prev, avatar_url: url}))}
                                        className={`
                                            relative aspect-square rounded-full cursor-pointer overflow-hidden border-2 transition-all hover:scale-105
                                            ${isSelected ? 'border-primary ring-2 ring-primary/20' : 'border-transparent bg-muted'}
                                        `}
                                    >
                                        <img src={url} alt={seed} className="w-full h-full" />
                                        {isSelected && (
                                            <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                                                <Check className="h-5 w-5 text-white" />
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={handleShuffle} 
                            className="w-full mt-4 text-muted-foreground hover:text-primary gap-2"
                        >
                            <RefreshCw className="h-3 w-3" />
                            Shuffle Avatars
                        </Button>
                    </TabsContent>
                </Tabs>
            </div>

            {/* Inputs Section */}
            <div className="grid gap-4">
                {/* Username */}
                <div className="grid grid-cols-1 sm:grid-cols-4 items-start gap-2 sm:gap-4">
                    <Label htmlFor="username" className="text-left sm:text-right font-medium text-muted-foreground pt-2">Username</Label>
                    <div className="col-span-1 sm:col-span-3 space-y-1">
                        <Input 
                            id="username" 
                            value={formData.username}
                            onChange={(e) => handleInputChange('username', e.target.value)}
                            onBlur={() => checkUniqueness('username', formData.username)}
                            placeholder="CryptoKing"
                            className={fieldStatus.username ? "border-red-500" : (fieldStatus.username === null ? "border-green-500" : "")}
                        />
                        {renderFeedback('username')}
                    </div>
                </div>

                {/* Email */}
                <div className="grid grid-cols-1 sm:grid-cols-4 items-start gap-2 sm:gap-4">
                    <Label htmlFor="email" className="text-left sm:text-right font-medium text-foreground pt-2">Email <span className="text-red-500">*</span></Label>
                    <div className="col-span-1 sm:col-span-3 space-y-1">
                        <Input 
                            id="email" 
                            required
                            value={formData.email}
                            onChange={(e) => handleInputChange('email', e.target.value)}
                            onBlur={() => checkUniqueness('email', formData.email)}
                            placeholder="you@example.com"
                            className={fieldStatus.email ? "border-red-500" : (fieldStatus.email === null ? "border-green-500" : "")}
                        />
                        {renderFeedback('email')}
                    </div>
                </div>
                
                {/* Bio */}
                <div className="grid grid-cols-1 sm:grid-cols-4 items-start gap-2 sm:gap-4">
                    <Label htmlFor="bio" className="text-left sm:text-right font-medium text-muted-foreground pt-2">Bio</Label>
                    <Textarea 
                        id="bio" 
                        value={formData.bio}
                        onChange={(e) => handleInputChange('bio', e.target.value)}
                        className="col-span-1 sm:col-span-3 min-h-[80px]" 
                        placeholder="Tell us about yourself..."
                    />
                </div>
            </div>

            {/* Socials */}
            <div className="border-t pt-4">
              <h4 className="mb-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Social Connections</h4>
              <div className="grid gap-4">
                
                {/* Twitter */}
                <div className="grid grid-cols-1 sm:grid-cols-4 items-start gap-2 sm:gap-4">
                  <Label className="text-left sm:text-right font-medium text-foreground pt-2">X (Twitter) <span className="text-red-500">*</span></Label>
                  <div className="col-span-1 sm:col-span-3 space-y-1">
                    <Input 
                        required
                        value={formData.twitter_handle} 
                        onChange={(e) => handleInputChange('twitter_handle', e.target.value)} 
                        onBlur={() => checkUniqueness('twitter_handle', formData.twitter_handle)}
                        placeholder="username" 
                        className={fieldStatus.twitter_handle ? "border-red-500" : (fieldStatus.twitter_handle === null ? "border-green-500" : "")}
                    />
                    <div className="flex justify-between items-start">
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" /> No @ symbol
                        </p>
                        {renderFeedback('twitter_handle')}
                    </div>
                  </div>
                </div>

                {/* Discord */}
                <div className="grid grid-cols-1 sm:grid-cols-4 items-start gap-2 sm:gap-4">
                  <Label className="text-left sm:text-right font-medium text-muted-foreground pt-2">Discord</Label>
                  <div className="col-span-1 sm:col-span-3 space-y-1">
                    <Input 
                        value={formData.discord_handle} 
                        onChange={(e) => handleInputChange('discord_handle', e.target.value)} 
                        onBlur={() => checkUniqueness('discord_handle', formData.discord_handle)}
                        placeholder="username" 
                        className={fieldStatus.discord_handle ? "border-red-500" : (fieldStatus.discord_handle === null ? "border-green-500" : "")}
                    />
                    <div className="flex justify-between items-start">
                         <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" /> No @ symbol
                        </p>
                        {renderFeedback('discord_handle')}
                    </div>
                  </div>
                </div>

                {/* Telegram */}
                <div className="grid grid-cols-1 sm:grid-cols-4 items-start gap-2 sm:gap-4">
                  <Label className="text-left sm:text-right font-medium text-muted-foreground pt-2">Telegram</Label>
                  <div className="col-span-1 sm:col-span-3 space-y-1">
                    <Input 
                        value={formData.telegram_handle} 
                        onChange={(e) => handleInputChange('telegram_handle', e.target.value)} 
                        onBlur={() => checkUniqueness('telegram_handle', formData.telegram_handle)}
                        placeholder="username" 
                        className={fieldStatus.telegram_handle ? "border-red-500" : (fieldStatus.telegram_handle === null ? "border-green-500" : "")}
                    />
                    <div className="flex justify-between items-start">
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" /> No @ symbol
                        </p>
                        {renderFeedback('telegram_handle')}
                    </div>
                  </div>
                </div>

                {/* Farcaster */}
                <div className="grid grid-cols-1 sm:grid-cols-4 items-start gap-2 sm:gap-4">
                  <Label className="text-left sm:text-right font-medium text-muted-foreground pt-2">Farcaster</Label>
                  <div className="col-span-1 sm:col-span-3 space-y-1">
                    <Input 
                        value={formData.farcaster_handle} 
                        onChange={(e) => handleInputChange('farcaster_handle', e.target.value)} 
                        onBlur={() => checkUniqueness('farcaster_handle', formData.farcaster_handle)}
                        placeholder="handle" 
                        className={fieldStatus.farcaster_handle ? "border-red-500" : (fieldStatus.farcaster_handle === null ? "border-green-500" : "")}
                    />
                     <div className="flex justify-between items-start">
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" /> No @ symbol
                        </p>
                        {renderFeedback('farcaster_handle')}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="sticky bottom-0 bg-background pt-2 pb-4 sm:static sm:pb-0">
            {/* Disable save button if ANY field has an error (string) */}
            <Button onClick={handleSave} disabled={saving || loading || uploading || !isFormValid || Object.values(fieldStatus).some(val => typeof val === 'string')} className="w-full">
            {saving ? (
                <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Signing & Saving...
                </>
            ) : (
                <>
                <Save className="mr-2 h-4 w-4" /> Save Profile
                </>
            )}
            </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}