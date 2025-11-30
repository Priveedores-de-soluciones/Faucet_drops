// src/pages/QuestHomePage.tsx (or components/QuestHomePage.tsx)

"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Header } from '@/components/header';
import { Plus, Settings, TrendingUp, Users, ArrowRight, Coins, Loader2 } from 'lucide-react';

// Backend API URL
const API_BASE_URL = "https://fauctdrop-backend.onrender.com";

// Simplified Quest Interface (matches what the backend will return)
interface QuestOverview {
    faucetAddress: string;
    title: string;
    description: string;
    isActive: boolean;
    rewardPool: string;
    creatorAddress: string;
    startDate: string;
    endDate: string;
    tasksCount: number;
    participantsCount: number; // Placeholder for activity data
}

// Interface for the expected response structure from the backend
interface QuestsResponse {
    success: boolean;
    quests: QuestOverview[];
    count: number;
    message?: string;
}

/**
 * Creates a URL-friendly slug from a title.
 * @param title The quest title.
 * @returns A slug string (e.g., "Launch Community Campaign" -> "launch-community-campaign").
 */
function createSlug(title: string): string {
    return title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '') // Remove non-alphanumeric characters (except spaces/hyphens)
        .trim()
        .replace(/\s+/g, '-'); // Replace spaces with hyphens
}

export default function QuestHomePage() {
    const router = useRouter();
    const [quests, setQuests] = useState<QuestOverview[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // --- Data Fetching ---
    const fetchQuests = async () => {
        setIsLoading(true);
        setError(null);
        try {
            // --- ACTUAL FETCH FROM FASTAPI BACKEND ---
            const response = await fetch(`${API_BASE_URL}/api/quests`);
            
            if (!response.ok) {
                // If the response status is not 2xx, throw an error
                throw new Error(`HTTP Error: ${response.status} - ${response.statusText}`);
            }
            
            const data: QuestsResponse = await response.json();
            
            if (!data.success) {
                 // If the backend returns a successful HTTP status (e.g., 200) but success: false
                throw new Error(data.message || 'Failed to retrieve quests from backend with no specific error message.');
            }

            const fetchedQuests: QuestOverview[] = data.quests || []; 

            setQuests(fetchedQuests);
            
        } catch (err: any) {
            console.error("Error fetching quests:", err);
            setError(err.message || "Could not connect to the Quest Management API at " + API_BASE_URL);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchQuests();
    }, []);

    // --- Render Logic ---

    const handleViewQuest = (faucetAddress: string, title: string) => {
        // 1. Create slug
        const slug = createSlug(title);
        
        // 2. Create the URL path: /quests/slug-faucetAddress
        const fullPath = `/quests/${slug}-${faucetAddress}`;
        
        console.log(`Navigating to: ${fullPath}`);
        router.push(fullPath);
    };

    return (
        <div className="max-w-6xl mx-auto p-6 space-y-6">
            <Header pageTitle='Quest Management Hub' />

            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Active Quests ({quests.length})</h2>
                <Button onClick={() => router.push('/quest/create')}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create New Quest
                </Button>
            </div>

            {isLoading ? (
                <Card className="p-8 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" /> Loading Quests...</Card>
            ) : error ? (
                // Display specific error message when fetching fails
                <Card className="p-4 border border-red-500 bg-red-50 text-red-700">
                    <p className="font-semibold">Error Loading Quests:</p>
                    <p className="text-sm">{error}</p>
                    <Button 
                        onClick={fetchQuests} 
                        size="sm" 
                        variant="ghost" 
                        className="mt-2 text-red-700 hover:bg-red-100"
                    >
                        Retry Fetch
                    </Button>
                </Card>
            ) : quests.length === 0 ? (
                <Card className="p-8 text-center text-muted-foreground">No quests found. Start by creating one!</Card>
            ) : (
                <div className="space-y-4">
                    {quests.map((quest) => (
                        <Card key={quest.faucetAddress} className="hover:shadow-lg transition-shadow">
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div className='space-y-1'>
                                    <CardTitle className="text-xl">{quest.title}</CardTitle>
                                    <CardDescription>{quest.description}</CardDescription>
                                </div>
                                <div className="flex space-x-2">
                                    <div className={`px-3 py-1 text-xs font-medium rounded-full ${quest.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                        {quest.isActive ? 'Active' : 'Inactive'}
                                    </div>
                                    <Button size="sm" onClick={() => handleViewQuest(quest.faucetAddress, quest.title)}>
                                        Manage / View <ArrowRight className='h-4 w-4 ml-2' />
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="grid grid-cols-3 gap-4 text-sm text-muted-foreground">
                                <div className="flex items-center gap-2"><Settings className="h-4 w-4 text-primary" /> Tasks: {quest.tasksCount}</div>
                                <div className="flex items-center gap-2"><Users className="h-4 w-4 text-primary" /> Participants: {quest.participantsCount}</div>
                                <div className="flex items-center gap-2"><Coins className="h-4 w-4 text-primary" /> Reward Pool: {quest.rewardPool}</div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}