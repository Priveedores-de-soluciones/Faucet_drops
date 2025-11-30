"use client"
import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { 
  Plus, 
  Trash2, 
  Save, 
  Settings, 
  Loader2,
  ListPlus,
  Zap,
  Upload,
  Link,
  Wallet,
  Coins,
  Share2,
  Trophy,
  Check,
  AlertTriangle 
} from "lucide-react"
import { Header } from '@/components/header'
import { useWallet } from "@/hooks/use-wallet" 
import { useNetwork, networks, Network } from "@/hooks/use-network" 
import { ethers, BrowserProvider } from 'ethers'; 

// --- IMPORTS/MOCK FROM FAUCET.TS (based on provided structure) ---
const FACTORY_TYPE_CUSTOM = 'custom' as const; 

interface NameValidationResult {
    exists: boolean;
    warning?: string;
    existingFaucet?: { name: string };
    conflictingFaucets?: Array<{
        address: string
        name: string
        owner: string
        factoryAddress: string
        factoryType: typeof FACTORY_TYPE_CUSTOM
    }>
}

interface CheckFaucetNameExistsResult extends NameValidationResult {}


// **MOCK/PLACEHOLDER for checkFaucetNameExistsAcrossAllFactories**
// This simulates querying the blockchain across all factories (including 'custom')
const checkFaucetNameExistsAcrossAllFactories = async (
    provider: BrowserProvider,
    factoryAddresses: Record<string, string>,
    proposedName: string
): Promise<CheckFaucetNameExistsResult> => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500)); 

    // --- START: SIMULATED BLOCKCHAIN QUERY LOGIC ---
    // In a real dApp, this queries the factory contracts. 
    // MOCK DATA for demonstration purposes:
    const existingNames = [
        "The FaucetDrop Launch Campaign", 
        "Celo Mainnet Bounty",
        "Arbi Test Quest"
    ];

    const conflictingName = existingNames.find(name => name.toLowerCase() === proposedName.trim().toLowerCase());

    if (conflictingName) {
        return {
            exists: true,
            existingFaucet: { name: conflictingName },
            conflictingFaucets: [{
                address: "0xMockFaucetAddress",
                name: conflictingName,
                owner: "0xMockOwnerAddress",
                factoryAddress: factoryAddresses.custom || "0xMockFactoryAddress",
                factoryType: FACTORY_TYPE_CUSTOM
            }],
        };
    }

    return { exists: false };
};

// **Implementation of the provided checkFaucetNameExists function**
// This is the function the component calls.
export async function checkFaucetNameExists(
    provider: BrowserProvider,
    network: Network, 
    proposedName: string
): Promise<CheckFaucetNameExistsResult> {
    try {
        if (!proposedName.trim()) {
            // Return early without error for UI cleanliness
            return { exists: false };
        }
        
        // This is where we use the network's factoryAddresses object
        return await checkFaucetNameExistsAcrossAllFactories(
            provider, 
            network.factoryAddresses, 
            proposedName
        );
        
    } catch (error: any) {
        console.error("Error in enhanced name check:", error);
        return { 
            exists: false, 
            warning: "Unable to validate name due to network issues. Please ensure your name is unique."
        };
    }
}
// -------------------------------------------------------------

// Define Zero Address (must be outside the component)
const zeroAddress = ethers.ZeroAddress; 

// --- DATE HELPERS (FIX for Hydration Mismatch) ---
const getTodayDateString = () => new Date().toISOString().split('T')[0];
const getFutureDateString = (days: number) => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);
    return futureDate.toISOString().split('T')[0];
}

// --- TYPE & CONSTANT DEFINITIONS ---

interface TokenConfiguration {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  isNative?: boolean;
  logoUrl?: string; 
}

// Define Supported Chain IDs and Tokens (Reduced for brevity, structure remains)
const ALL_TOKENS_BY_CHAIN: Record<number, TokenConfiguration[]> = {
  // Celo Mainnet (42220)
  42220: [
    { 
      address: "0x471EcE3750Da237f93B8E339c536989b8978a438", 
      name: "Celo",
      symbol: "CELO",
      decimals: 18,
      isNative: true,
      logoUrl: "/celo.png", 
    },
    {
      address: "0x765DE816845861e75A25fCA122bb6898B8B1282a",
      name: "Celo Dollar",
      symbol: "cUSD",
      decimals: 18,
      logoUrl: "/cusd.png",
    },
  ],
  // Arbitrum (42161)
  42161: [
    { 
      address: zeroAddress,
      name: "Ethereum",
      symbol: "ETH",
      decimals: 18,
      isNative: true,
      logoUrl: "/ether.jpeg",
    },
    {
      address: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174", 
      name: "USD Coin",
      symbol: "USDC",
      decimals: 6,
      logoUrl: "/usdc.jpg",
    },
  ],
  // Lisk Mainnet (1135)
  1135: [
    { 
      address: zeroAddress,
      name: "Ethereum",
      symbol: "ETH",
      decimals: 18,
      isNative: true,
      logoUrl: "/ether.jpeg",
    },
    {
      address: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174", 
      name: "USD Coin",
      symbol: "USDC",
      decimals: 6,
      logoUrl: "/usdc.jpg",
    },
  ],
  // Base Mainnet (8453)
  8453: [
    { 
      address: zeroAddress,
      name: "Ethereum",
      symbol: "ETH",
      decimals: 18,
      isNative: true,
      logoUrl: "/ether.jpeg",
    },
    {
      address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      name: "USD Coin",
      symbol: "USDC",
      decimals: 6,
      logoUrl: "/usdc.jpg",
    },
  ],
};


// Task Stage Definition
export type TaskStage = 'Beginner' | 'Intermediate' | 'Advance' | 'Legend' | 'Ultimate';
export const TASK_STAGES: TaskStage[] = ['Beginner', 'Intermediate', 'Advance', 'Legend', 'Ultimate'];
const MAX_PASS_POINT_RATIO = 0.7; // 70%

type VerificationType = 'auto_social' | 'auto_tx' | 'manual_link' | 'manual_upload' | 'none';

interface QuestTask {
  id: string
  title: string
  description: string
  points: number 
  required: boolean
  category: 'social' | 'trading' | 'swap' | 'referral' | 'general'
  url: string 
  action: string 
  verificationType: VerificationType 
  targetPlatform?: string 
  targetHandle?: string 
  targetContractAddress?: string 
  targetChainId?: string
  
  stage: TaskStage 
  minReferrals?: number
}

interface Quest {
  id: string
  creatorAddress: string
  title: string
  description: string
  isActive: boolean
  rewardPool: string 
  startDate: string
  endDate: string
  tasks: QuestTask[]
  
  faucetAddress?: string; 
  rewardTokenType: 'native' | 'erc20'; 
  tokenAddress: string; 
  
  stagePassRequirements: Record<TaskStage, number>; 
}

const initialStagePassRequirements: Record<TaskStage, number> = {
    Beginner: 0,
    Intermediate: 0,
    Advance: 0,
    Legend: 0,
    Ultimate: 0,
}

const initialNewQuest: Omit<Quest, 'id' | 'creatorAddress' | 'stagePassRequirements'> = {
  title: "New Community Campaign",
  description: "Join our ecosystem and earn rewards.",
  isActive: true,
  rewardPool: "TBD",
  startDate: getTodayDateString(), 
  endDate: getFutureDateString(7), 
  tasks: [],
  faucetAddress: undefined,
  rewardTokenType: 'native',
  tokenAddress: ethers.ZeroAddress, 
}

const initialNewTaskForm: Partial<QuestTask> = {
  title: "",
  description: "",
  points: 100,
  required: true,
  category: "social",
  url: "",
  action: "follow",
  verificationType: "manual_link",
  targetPlatform: "Twitter",
  stage: 'Beginner',
  minReferrals: undefined,
}


// --- FACTORY & FAUCET ABI CONTENT (PLACEHOLDERS) ---
const FACTORY_ABI_CUSTOM: any[] = [
    { "inputs": [], "stateMutability": "nonpayable", "type": "constructor" },
    { "inputs": [{ "internalType": "string", "name": "_name", "type": "string" }, { "internalType": "address", "name": "_token", "type": "address" }, { "internalType": "address", "name": "_backend", "type": "address" }], "name": "createCustomFaucet", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "nonpayable", "type": "function" },
    { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "faucet", "type": "address" }, { "indexed": false, "internalType": "address", "name": "owner", "type": "address" }, { "indexed": false, "internalType": "string", "name": "name", "type": "string" }, { "indexed": false, "internalType": "address", "name": "token", "type": "address" }, { "indexed": false, "internalType": "address", "name": "backend", "type": "address" }], "name": "FaucetCreated", "type": "event" }
];
const FAUCET_ABI_CUSTOM: any[] = [
    { "inputs": [{ "internalType": "address[]", "name": "users", "type": "address[]" }, { "internalType": "uint256[]", "name": "amounts", "type": "uint256[]" }], "name": "setCustomClaimAmountsBatch", "outputs": [], "stateMutability": "nonpayable", "type": "function" }
];

// --- CONSTANTS ---
const PLATFORM_BACKEND_ADDRESS = "0x9fBC2A0de6e5C5Fd96e8D11541608f5F328C0785"; 
const API_BASE_URL = "https://fauctdrop-backend.onrender.com"

// --- FACTORY ADDRESS LOOKUP ---
const getCustomFactoryAddress = (currentChainId: number | null) => {
    if (!currentChainId) return null;
    const currentNetworkConfig = networks.find(n => n.chainId === currentChainId);
    return currentNetworkConfig?.factories.custom || null;
};

// ------------------------------------------------------------------

export default function QuestCreator() {
  const { address, isConnected, chainId } = useWallet(); 
  const { network, isConnecting: isNetworkConnecting } = useNetwork(); 
  
  const [newQuest, setNewQuest] = useState<Omit<Quest, 'id' | 'creatorAddress' | 'stagePassRequirements'>>(initialNewQuest)
  const [newTask, setNewTask] = useState<Partial<QuestTask>>(initialNewTaskForm)
  const [editingTask, setEditingTask] = useState<QuestTask | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null); // Dedicated error for name duplication
  const [isCheckingName, setIsCheckingName] = useState(false); // New state for loading indicator

  const [stagePassRequirements, setStagePassRequirements] = useState<Record<TaskStage, number>>(initialStagePassRequirements);

  // --- TOKEN STATE & LOGIC (Unchanged for brevity) ---
  const [selectedToken, setSelectedToken] = useState<TokenConfiguration | null>(null);
  const [isCustomToken, setIsCustomToken] = useState(false);
  const [customTokenAddress, setCustomTokenAddress] = useState('');

  const availableTokens = chainId ? ALL_TOKENS_BY_CHAIN[chainId] || [] : [];
  
  useEffect(() => {
    if (chainId && availableTokens.length > 0) {
      const currentTokenAddress = newQuest.tokenAddress;
      let initialToken = availableTokens.find(t => t.address.toLowerCase() === currentTokenAddress.toLowerCase());
      
      if (!initialToken) {
          initialToken = availableTokens.find(t => t.isNative) || availableTokens[0];
      }

      setSelectedToken(initialToken || null);
      setNewQuest(prev => ({
        ...prev,
        rewardTokenType: initialToken?.isNative ? 'native' : 'erc20',
        tokenAddress: initialToken?.address || zeroAddress,
      }));
      setIsCustomToken(false);
      setCustomTokenAddress('');
    } else if (!chainId) {
      setSelectedToken(null);
      setNewQuest(initialNewQuest); 
      setIsCustomToken(false);
      setCustomTokenAddress('');
    }
  }, [chainId]); 

  const FAUCET_FACTORY_ADDRESS = getCustomFactoryAddress(chainId);
  const isFactoryAvailable = !!FAUCET_FACTORY_ADDRESS && isConnected; 
  
  // Create a provider instance for the name check (needs to be memoized)
  const browserProvider = useMemo(() => {
    // Only attempt to create BrowserProvider if window.ethereum is available
    if (typeof window !== 'undefined' && window.ethereum) {
        return new ethers.BrowserProvider(window.ethereum as any);
    }
    return null;
  }, [isConnected]); // Depend on isConnected to ensure it's initialized correctly
  

  // --- DYNAMIC CALCULATION: Stage Total Points ---
  const stageTotals = useMemo(() => {
    const newTotals: Record<TaskStage, number> = {
        Beginner: 0, Intermediate: 0, Advance: 0, Legend: 0, Ultimate: 0,
    };
    
    newQuest.tasks.forEach(task => {
        newTotals[task.stage] += task.points;
    });

    return newTotals;
  }, [newQuest.tasks]);
  
  // --- Name Validation Logic (Using robust cross-factory check) ---
  const validateFaucetNameAcrossFactories = useCallback(async (nameToValidate: string) => {
    if (!nameToValidate.trim()) {
        setNameError(null);
        return;
    }
    if (!browserProvider || !network) {
        setNameError("Network or wallet provider unavailable for name validation.");
        return;
    }

    setIsCheckingName(true);
    setNameError(null);

    try {
        console.log(`Validating name "${nameToValidate}" across all factories on ${network?.name}...`);
        
        // This calls the imported/mocked logic that checks against all factories
        const result = await checkFaucetNameExists(browserProvider, network, nameToValidate);
        
        if (result.exists) {
            const conflictingName = result.existingFaucet?.name || nameToValidate;
            setNameError(`The name "${conflictingName}" is already in use by a deployed Faucet. Please choose a unique name.`);
        } else if (result.warning) {
            setNameError(`Warning: ${result.warning}`);
        } else {
            setNameError(null);
        }
    } catch (e) {
        console.error("Name check failed:", e);
        setNameError("Error checking name uniqueness. Please ensure your name is unique.");
    } finally {
        setIsCheckingName(false);
    }
  }, [browserProvider, network]);

  // Debounced name validation
  useEffect(() => {
    const title = newQuest.title.trim();
    
    if (title.length < 3) {
        setNameError(null);
        return;
    }
    
    const delayCheck = setTimeout(() => {
        // Only run if the title is long enough to be meaningful
        if (title.length >= 3) {
            validateFaucetNameAcrossFactories(title);
        }
    }, 500); // Debounce the check

    return () => clearTimeout(delayCheck);
  }, [newQuest.title, validateFaucetNameAcrossFactories]); 
  
  // --- Validation Helpers: Task Duplication (Updated) ---

  const validateTask = (): boolean => {
    // Check for duplicate task content (Title, URL, or Description) within any stage
    const isDuplicate = newQuest.tasks.some(t => {
        // Skip comparing against the task being edited
        if (editingTask && t.id === editingTask.id) return false;

        // Check for duplicate title, URL, or description (case-insensitive, trimmed)
        return (newTask.title && t.title.toLowerCase() === newTask.title.trim().toLowerCase())
            || (newTask.url && t.url.toLowerCase() === newTask.url.trim().toLowerCase())
            || (newTask.description && t.description.toLowerCase() === newTask.description.trim().toLowerCase());
    });

    if (isDuplicate) {
        setError("A task already has the same Title, Description, or URL. Quest tasks must be unique.");
        return false;
    }


    if (!newTask.title || !newTask.description || !newTask.url || newTask.points === undefined || newTask.points <= 0 || !newTask.stage) {
      setError("Please fill in all required task fields: Title, Description, URL, Points (must be > 0), and Stage.");
      return false;
    }
    
    if (newTask.category === 'referral' && (newTask.minReferrals === undefined || newTask.minReferrals <= 0)) {
        setError("For 'referral' tasks, please specify a minimum required number of referrals (greater than 0).");
        return false;
    }

    setError(null);
    return true;
  }
  
  // Pure function for render checks (does NOT call setError)
  const checkStagePassPointsValidity = (): boolean => {
    for (const stage of TASK_STAGES) {
        const totalPoints = stageTotals[stage];
        const requiredPass = stagePassRequirements[stage];
        
        if (totalPoints > 0) {
            const maxAllowed = Math.floor(totalPoints * MAX_PASS_POINT_RATIO);
            // Must be > 0 and <= maxAllowed
            if (requiredPass > maxAllowed || requiredPass <= 0) {
                return false;
            }
        }
    }
    return true;
  }
  
  // Function to be called in handleCreateQuest (SETS setError)
  const validateStagePassPoints = (): boolean => {
    let isValid = true;
    for (const stage of TASK_STAGES) {
        const totalPoints = stageTotals[stage];
        const requiredPass = stagePassRequirements[stage];
        
        if (totalPoints > 0) {
            const maxAllowed = Math.floor(totalPoints * MAX_PASS_POINT_RATIO);
            if (requiredPass > maxAllowed || requiredPass <= 0) {
                // Return an error message specific to the max point request
                const errorMessage = `Stage "${stage}" Pass Points (${requiredPass}) must be > 0 and cannot exceed 70% of its total points (${totalPoints}). Expected max point: ${maxAllowed}.`;
                setError(errorMessage);
                isValid = false;
                break;
            }
        }
    }
    if (isValid) setError(null);
    return isValid;
  }
  
  // --- Stage Progression Logic (Unchanged) ---

  const isStageSelectable = (targetStage: TaskStage): boolean => {
    const targetIndex = TASK_STAGES.indexOf(targetStage);
    
    // Always allow 'Beginner' or the current editing stage
    if (targetIndex === 0 || (editingTask && editingTask.stage === targetStage)) {
        return true;
    }

    // Check all previous stages to ensure they are passable
    for (let i = 0; i < targetIndex; i++) {
        const prevStage = TASK_STAGES[i];
        const prevStageTotal = stageTotals[prevStage];
        const prevStageRequiredPass = stagePassRequirements[prevStage];
        
        // If the previous stage has tasks (prevStageTotal > 0):
        if (prevStageTotal > 0) {
            // Check if the set pass points are logically possible (required <= total) and set (> 0)
            if (prevStageRequiredPass > prevStageTotal || prevStageRequiredPass === 0) {
                return false;
            }
        } 
        // If prevStageTotal === 0 (no tasks in the previous stage), 
        // we allow skipping that stage to the next one in the sequence.
    }

    return true;
  }


  // --- Task Handlers (Unchanged) ---
  
  const handleAddTask = () => {
    if (!validateTask()) return

    const task: QuestTask = {
      ...initialNewTaskForm,
      id: Date.now().toString(),
      title: newTask.title!,
      description: newTask.description!,
      points: newTask.points!,
      required: newTask.required!,
      category: newTask.category!,
      url: newTask.url!,
      action: newTask.action!,
      verificationType: newTask.verificationType!,
      targetPlatform: newTask.targetPlatform,
      targetHandle: newTask.targetHandle, 
      targetContractAddress: newTask.targetContractAddress,
      targetChainId: newTask.targetChainId,
      stage: newTask.stage!,
      minReferrals: newTask.category === 'referral' ? newTask.minReferrals : undefined,
    }

    setNewQuest(prev => ({ ...prev, tasks: [...prev.tasks, task] }))
    setNewTask(initialNewTaskForm)
  }

  const handleEditTask = (task: QuestTask) => {
    setEditingTask(task)
    setNewTask({
        ...task,
        minReferrals: task.category === 'referral' ? task.minReferrals : undefined,
    }); 
  }

  const handleUpdateTask = () => {
    if (!editingTask) return;
    
    if (!validateTask()) return; 

    const updatedTask: QuestTask = {
      ...editingTask,
      ...newTask,
      id: editingTask.id, 
      points: newTask.points!,
      stage: newTask.stage!,
      minReferrals: newTask.category === 'referral' ? newTask.minReferrals : undefined,
    }

    setNewQuest(prev => ({
      ...prev,
      tasks: prev.tasks.map(t => t.id === editingTask.id ? updatedTask : t)
    }))
    setEditingTask(null)
    setNewTask(initialNewTaskForm)
  }

  const handleRemoveTask = (taskId: string) => {
    setNewQuest(prev => ({
      ...prev,
      tasks: prev.tasks.filter(t => t.id !== taskId)
    }))
  }

  const handleStagePassRequirementChange = (stage: TaskStage, value: number) => {
    setStagePassRequirements(prev => ({
        ...prev,
        [stage]: value,
    }));
  }


  // --- Web3 Logic: Faucet Deployment (Unchanged) ---
  const handleCreateCustomFaucet = async (questName: string, token: string) => {
    if (!address || !isConnected) {
        setError("You must connect your wallet to deploy the smart contract.");
        return null;
    }
    
    try {
        if (!window.ethereum) {
             throw new Error("Ethereum provider (like Metamask) is not detected.");
        }

        const provider = new ethers.BrowserProvider(window.ethereum as any);
        const signer = await provider.getSigner();

        const factoryContract = new ethers.Contract(
            FAUCET_FACTORY_ADDRESS!,
            FACTORY_ABI_CUSTOM,
            signer
        );
        
        const tx = await factoryContract.createCustomFaucet(
            questName, 
            token, 
            PLATFORM_BACKEND_ADDRESS
        );

        const receipt = await tx.wait();
        let newFaucetAddress: string | null = null;
        for (const log of receipt.logs) {
            try {
                // Must cast log to 'any' for interface parsing with Contract
                const event = factoryContract.interface.parseLog(log as any); 
                if (event && event.name === 'FaucetCreated') {
                    newFaucetAddress = event.args.faucet;
                    break;
                }
            } catch (e) { /* Ignore non-relevant logs */ }
        }
        
        if (newFaucetAddress) {
            return newFaucetAddress;
        }

        throw new Error("Faucet deployment successful, but failed to find FaucetCreated event.");

    } catch (error) {
        console.error('Error deploying custom faucet:', error);
        setError(`Deployment failed. Check your wallet for signature requests and ensure you have enough ${network?.nativeCurrency.symbol || 'native currency'} for gas. Details: ${(error as any).message || 'Unknown error'}`);
        return null;
    }
  };


  // --- Main Save/Launch Handler ---

  const handleCreateQuest = async () => {
    if (!selectedToken) {
        setError("Please select a valid reward token.");
        return;
    }

    if (!address || !isConnected) {
        setError("You must connect your wallet to deploy the smart contract and create the quest.");
        return;
    }
    if (newQuest.tasks.length === 0) {
        setError("Please add at least one task to the quest.");
        return;
    }
    if (!isFactoryAvailable) {
        setError(`Cannot deploy: No Custom Faucet Factory configured for ${network?.name || 'this network'} (Chain ID: ${chainId}). Please switch networks.`);
        return;
    }
    
    // Final Name Check
    if (isCheckingName || nameError) {
        setError(nameError || "Please wait for name validation to complete.");
        return;
    }
    if (newQuest.title.trim().length < 3) {
        setError("Quest title must be at least 3 characters long.");
        return;
    }

    // Call the state-setting validation function here
    if (!validateStagePassPoints()) {
        return;
    }
    
    setError(null);
    setIsSaving(true);
    
    const tokenToDeploy = selectedToken.address;

    const faucetAddress = await handleCreateCustomFaucet(
        newQuest.title, 
        tokenToDeploy 
    );

    if (!faucetAddress) {
        setIsSaving(false);
        return;
    }

    const questData: Quest = {
        id: Date.now().toString(), 
        creatorAddress: address!,
        ...newQuest,
        faucetAddress: faucetAddress, 
        tokenAddress: tokenToDeploy, 
        rewardTokenType: selectedToken.isNative ? 'native' : 'erc20',
        stagePassRequirements: stagePassRequirements,
    };

    try {
        const response = await fetch(`${API_BASE_URL}/api/quests`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(questData)
        })

        if (response.ok) {
            alert(`Quest created on ${network?.name} and Faucet deployed successfully at ${faucetAddress}! Remember to fund the Faucet.`);
            // Reset state
            setNewQuest(initialNewQuest); 
            setNewTask(initialNewTaskForm);
            setStagePassRequirements(initialStagePassRequirements);
        } else {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Failed to save quest data to backend.');
        }
    } catch (e: any) {
        console.error('Quest save failed:', e);
        setError(`Backend Error saving quest details: ${e.message}`);
    } finally {
        setIsSaving(false);
    }
  }


  // --- Render Logic Helpers (Unchanged) ---
  const getStageColor = (stage: TaskStage) => {
    switch (stage) {
        case 'Beginner': return 'bg-green-500 hover:bg-green-600';
        case 'Intermediate': return 'bg-blue-500 hover:bg-blue-600';
        case 'Advance': return 'bg-purple-500 hover:bg-purple-600';
        case 'Legend': return 'bg-yellow-500 hover:bg-yellow-600';
        case 'Ultimate': return 'bg-red-500 hover:bg-red-600';
        default: return 'bg-gray-500 hover:bg-gray-600';
    }
  }
  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'social': return 'bg-blue-100 text-blue-800';
      case 'trading': return 'bg-green-100 text-green-800';
      case 'swap': return 'bg-purple-100 text-purple-800';
      case 'referral': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }
  const getVerificationIcon = (type: VerificationType) => {
    switch (type) {
      case 'auto_social': return <Zap className="h-4 w-4 text-blue-500" />;
      case 'auto_tx': return <Wallet className="h-4 w-4 text-green-500" />;
      case 'manual_link': return <Link className="h-4 w-4 text-yellow-500" />;
      case 'manual_upload': return <Upload className="h-4 w-4 text-red-500" />;
      default: return <Settings className="h-4 w-4 text-gray-500" />;
    }
  }


  if (isNetworkConnecting) {
     return (
      <Card className="max-w-md mx-auto mt-8">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin mr-2" />
          <span>Loading network configuration...</span>
        </CardContent>
      </Card>
    )
  }

  if (!isFactoryAvailable && isConnected) {
    return (
        <div className="max-w-6xl mx-auto p-6 space-y-6">
            <Header pageTitle='Create New Quest Campaign' />
            <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded relative" role="alert">
                <strong className="font-bold">Warning!</strong>
                <span className="block sm:inline ml-2">
                    No Custom Faucet Factory found for **{network?.name || 'this network'}** (Chain ID: {chainId}). Please switch to a supported chain.
                </span>
            </div>
            <Card className="max-w-md mx-auto">
                <CardContent className="py-6 text-center">
                    <p className="text-sm text-red-500">Please switch your wallet network to a supported chain to enable quest deployment.</p>
                </CardContent>
            </Card>
        </div>
    )
  }
  
  // Use the PURE validation function here
  const isSaveDisabled = isSaving 
    || newQuest.tasks.length === 0 
    || !isFactoryAvailable 
    || !isConnected 
    || !selectedToken 
    || !checkStagePassPointsValidity()
    || !!nameError // Disable if name has an error
    || isCheckingName // Disable if name check is pending
    || newQuest.title.trim().length < 3; // Disable if title is too short

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <Header pageTitle='Create New Quest Campaign' />

      {/* ERROR DISPLAY */}
      {(error || nameError) && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
            <strong className="font-bold">Error!</strong>
            <span className="block sm:inline ml-2">{error || nameError}</span>
        </div>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quest Configuration Panel (Top Left) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Settings className="h-5 w-5" /> Quest Details & Rewards
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            
            {/* Basic Details (Title, Description, Pool) */}
            <div className="space-y-2">
              <Label htmlFor="title">Quest Title (also Faucet Name)</Label>
              <div className="relative">
                <Input
                  id="title"
                  value={newQuest.title}
                  onChange={(e) => setNewQuest({...newQuest, title: e.target.value})}
                  placeholder="The FaucetDrop Launch Campaign"
                  className={
                      nameError 
                          ? "border-red-500 pr-10" 
                          : (!isCheckingName && newQuest.title.trim().length >= 3 && !nameError)
                              ? "border-green-500 pr-10"
                              : "pr-10"
                  }
                  disabled={isCheckingName}
                />
                {isCheckingName && (
                    <Loader2 className="h-4 w-4 absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-gray-500" />
                )}
                {!isCheckingName && newQuest.title.trim().length >= 3 && (
                    nameError ? (
                        <AlertTriangle className="h-4 w-4 absolute right-3 top-1/2 -translate-y-1/2 text-red-500" />
                    ) : (
                        <Check className="h-4 w-4 absolute right-3 top-1/2 -translate-y-1/2 text-green-500" />
                    )
                )}
              </div>
               {newQuest.title.trim().length > 0 && newQuest.title.trim().length < 3 && (
                   <p className="text-xs text-red-500">Quest name must be at least 3 characters long.</p>
               )}
               {nameError && newQuest.title.trim().length >= 3 && (
                   <p className="text-xs text-red-500">{nameError}</p>
               )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Quest Description</Label>
              <Textarea
                id="description"
                value={newQuest.description}
                onChange={(e) => setNewQuest({...newQuest, description: e.target.value})}
                placeholder="A campaign to reward early community members."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rewardPool">Reward Pool Description</Label>
              <Input
                id="rewardPool"
                value={newQuest.rewardPool}
                onChange={(e) => setNewQuest({...newQuest, rewardPool: e.target.value})}
                placeholder="5000 $FD tokens + 10 NFT spots"
              />
            </div>
            
            {/* Stage Pass Requirements Panel (STYLED TO MATCH CARD) */}
            <div className="border p-4 rounded-lg space-y-3">
                <h3 className="text-md font-semibold flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-primary" /> Stage Completion Requirements
                </h3>
                <p className="text-xs text-muted-foreground">
                    Set the minimum points required to pass each stage. Max points allowed is **70%** of the total points in that stage.
                </p>
                
                {TASK_STAGES.map((stage) => {
                    const totalPoints = stageTotals[stage];
                    const maxAllowed = Math.floor(totalPoints * MAX_PASS_POINT_RATIO);
                    const requiredPass = stagePassRequirements[stage];
                    const isInvalid = totalPoints > 0 && (requiredPass > maxAllowed || requiredPass <= 0);

                    return (
                        <div key={stage} className={`flex justify-between items-center gap-3 p-2 rounded-md ${totalPoints > 0 ? 'bg-background border' : 'bg-gray-100 dark:bg-gray-800'}`}>
                            <div className="flex flex-col">
                                <span className="font-medium text-sm">{stage} Stage</span>
                                <span className="text-xs text-muted-foreground">Total Points: {totalPoints} {totalPoints > 0 && `(Max Pass: ${maxAllowed})`}</span>
                                {isInvalid && (
                                    <p className="text-xs text-red-500">Max allowed: {maxAllowed} Pts.</p>
                                )}
                            </div>
                            <Input
                                type="number"
                                value={requiredPass || 0}
                                onChange={(e) => handleStagePassRequirementChange(stage, parseInt(e.target.value) || 0)}
                                min={totalPoints > 0 ? 1 : 0}
                                max={maxAllowed || undefined}
                                disabled={totalPoints === 0}
                                className={`w-24 text-right ${isInvalid ? 'border-red-500' : ''}`}
                            />
                        </div>
                    );
                })}
            </div>

            {/* Reward Token Config (Omitted for brevity) */}
            <div className="border p-4 rounded-lg space-y-3">
                <h3 className="text-md font-semibold flex items-center gap-2">
                    <Coins className="h-4 w-4 text-primary" /> Reward System Configuration
                </h3>
                <div className="text-xs text-muted-foreground">
                    This faucet will be deployed on **{network?.name || 'the connected chain'}**.
                </div>

                {/* REWARD TOKEN SELECTOR (Omitted for brevity) */}
                <div className="space-y-2">
                    <Label htmlFor="rewardToken">Reward Token ({network?.name || 'Unknown Chain'})</Label>
                    <Select
                        value={isCustomToken ? "custom" : (selectedToken ? selectedToken.address : undefined)}
                        onValueChange={(value) => {
                            if (value === "custom") {
                                setIsCustomToken(true);
                                setSelectedToken(null);
                            } else {
                                const token = availableTokens.find(t => t.address === value);
                                if (token) {
                                    setSelectedToken(token);
                                    setIsCustomToken(false);
                                    setCustomTokenAddress('');
                                    setNewQuest(prev => ({
                                        ...prev, 
                                        rewardTokenType: token.isNative ? 'native' : 'erc20',
                                        tokenAddress: token.address,
                                    }));
                                }
                            }
                        }}
                        disabled={availableTokens.length === 0}
                    >
                        <SelectTrigger>
                            <SelectValue>
                                {isCustomToken ? (
                                    "Custom Token"
                                ) : selectedToken ? (
                                    <span className="flex items-center gap-2">
                                        {selectedToken.logoUrl && (
                                            <img 
                                                src={selectedToken.logoUrl} 
                                                alt={`${selectedToken.symbol} logo`} 
                                                className="h-4 w-4 rounded-full"
                                            />
                                        )}
                                        {selectedToken.name} ({selectedToken.symbol})
                                    </span>
                                ) : (
                                    availableTokens.length > 0 ? "Select reward token" : "No tokens available on this chain"
                                )}
                            </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                            {availableTokens.map((token) => (
                                <SelectItem key={token.address} value={token.address}>
                                    <div className="flex items-center gap-2">
                                        {token.logoUrl && (
                                            <img 
                                                src={token.logoUrl} 
                                                alt={`${token.symbol} logo`} 
                                                className="h-4 w-4 rounded-full"
                                            />
                                        )}
                                        {token.name} ({token.symbol}) {token.isNative && <Badge variant="secondary" className="text-xs">Native</Badge>}
                                    </div>
                                </SelectItem>
                            ))}
                            <SelectItem value="custom">+ Custom Token</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* CUSTOM TOKEN INPUTS (Omitted for brevity) */}
                {isCustomToken && (
                    <div className="space-y-3 p-3 border rounded-lg bg-gray-50 dark:bg-gray-900">
                        <h4 className="text-sm font-medium">Custom Token Address</h4>
                        <div className="space-y-2">
                            <Label className="text-xs">Token Contract Address</Label>
                            <Input
                                value={customTokenAddress}
                                onChange={(e) => setCustomTokenAddress(e.target.value)}
                                placeholder="0x..."
                            />
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                if (customTokenAddress && ethers.isAddress(customTokenAddress)) {
                                    const fullCustom: TokenConfiguration = {
                                        address: customTokenAddress,
                                        name: 'Custom Token',
                                        symbol: 'CUST',
                                        decimals: 18,
                                        isNative: false,
                                    };
                                    setSelectedToken(fullCustom);
                                    setIsCustomToken(false);
                                    setCustomTokenAddress('');
                                    setNewQuest(prev => ({
                                        ...prev,
                                        rewardTokenType: 'erc20',
                                        tokenAddress: fullCustom.address,
                                    }));
                                } else {
                                    setError("Please enter a valid token contract address.");
                                }
                            }}
                            disabled={!customTokenAddress || !ethers.isAddress(customTokenAddress)}
                            className="w-full"
                        >
                            Set Custom Token
                        </Button>
                    </div>
                )}

                <div className="space-y-2 pt-2">
                    <Label>Faucet Deployment Status</Label>
                    <Badge variant={newQuest.faucetAddress ? 'default' : 'secondary'} className="w-full justify-center">
                        {newQuest.faucetAddress 
                            ? `Deployed: ${newQuest.faucetAddress.slice(0, 6)}...${newQuest.faucetAddress.slice(-4)}`
                            : "Faucet will be deployed upon Quest launch."
                        }
                    </Badge>
                </div>
            </div>
            {/* --- END REWARD CONFIG --- */}
            
            <Button
                onClick={handleCreateQuest}
                disabled={isSaveDisabled}
                className="w-full mt-6"
            >
                {isConnected ? (
                  isSaving ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )
                ) : (
                  <Wallet className="h-4 w-4 mr-2" />
                )}
                {isConnected ? `Save & Deploy Faucet` : "Connect Wallet to Deploy"}
            </Button>
          </CardContent>
        </Card>

        {/* Add/Edit Task Panel (Top Right - Unchanged) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ListPlus className="h-5 w-5" />
              {editingTask ? "Edit Task" : "Define New Task"}
            </CardTitle>
            <CardDescription>
                Define the action, its stage, and the verification method.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            
            {/* Task Details (Unchanged for brevity) */}
            <div className="space-y-2">
              <Label htmlFor="taskTitle">Task Title</Label>
              <Input
                id="taskTitle"
                value={newTask.title || ""}
                onChange={(e) => setNewTask({...newTask, title: e.target.value})}
                placeholder="Follow us on Twitter"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="taskDescription">Description / Guide</Label>
              <Textarea
                id="taskDescription"
                value={newTask.description || ""}
                onChange={(e) => setNewTask({...newTask, description: e.target.value})}
                placeholder="Read our thread on tokenomics and summarize (280 chars)."
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="url">Action URL / Guide Link</Label>
                <Input
                  id="url"
                  value={newTask.url || ""}
                  onChange={(e) => setNewTask({...newTask, url: e.target.value})}
                  placeholder="https://x.com/faucetdrops/status/..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="points">Task Points</Label>
                <Input
                  id="points"
                  type="number"
                  value={newTask.points || 100}
                  onChange={(e) => setNewTask({...newTask, points: parseInt(e.target.value)})}
                  min="1"
                />
              </div>
            </div>
            
            {/* STAGE, CATEGORY & VERIFICATION */}
            <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                    <Label htmlFor="stage">Task Stage</Label>
                    <Select
                      value={newTask.stage || "Beginner"}
                      onValueChange={(value: TaskStage) => setNewTask({...newTask, stage: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select stage" />
                      </SelectTrigger>
                      <SelectContent>
                        {TASK_STAGES.map(stage => (
                            <SelectItem 
                                key={stage} 
                                value={stage} 
                                // Disable stages that haven't met the previous stage's pass points
                                disabled={!editingTask && !isStageSelectable(stage)}
                            >
                                {stage}
                                {!editingTask && !isStageSelectable(stage) && (
                                    <span className="text-xs text-red-500 ml-2">(Locked)</span>
                                )}
                            </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={newTask.category || "social"}
                    onValueChange={(value: any) => setNewTask({...newTask, category: value, minReferrals: value === 'referral' ? (newTask.minReferrals || 1) : undefined})}
                  >
                    <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="social">Social</SelectItem>
                      <SelectItem value="trading">Trading</SelectItem>
                      <SelectItem value="swap">Swap</SelectItem>
                      <SelectItem value="referral">Referral</SelectItem>
                      <SelectItem value="general">General</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="verificationType">Verification</Label>
                    <Select
                      value={newTask.verificationType || "manual_link"}
                      onValueChange={(value: any) => setNewTask({...newTask, verificationType: value})}
                    >
                      <SelectTrigger><SelectValue placeholder="Select method" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto_social">🤖 Auto (Social)</SelectItem>
                        <SelectItem value="auto_tx">💰 Auto (Tx)</SelectItem>
                        <SelectItem value="manual_link">🔗 Manual (Link)</SelectItem>
                        <SelectItem value="manual_upload">🖼️ Manual (Image)</SelectItem>
                      </SelectContent>
                    </Select>
                </div>
            </div>
            
            {/* REFERRAL-SPECIFIC FIELD */}
            {newTask.category === 'referral' && (
                 <div className="space-y-2 p-3 border rounded-lg bg-orange-50 dark:bg-orange-900/50">
                    <div className="flex items-center gap-2 text-sm font-medium text-orange-800 dark:text-orange-200">
                        <Share2 className="h-4 w-4" /> Referral Settings
                    </div>
                    <Label className="text-xs">Minimum Required Referrals</Label>
                    <Input
                      type="number"
                      value={newTask.minReferrals || 1}
                      onChange={(e) => setNewTask({...newTask, minReferrals: parseInt(e.target.value)})}
                      min="1"
                      placeholder="e.g. 5"
                    />
                </div>
            )}


            {/* Dynamic Verification Fields (Omitted for brevity) */}
            {newTask.verificationType === 'auto_social' && (
                <div className="grid grid-cols-2 gap-3 p-3 border rounded-lg bg-gray-50 dark:bg-gray-900">
                    <div className="space-y-2">
                        <Label>Platform</Label>
                        <Input 
                            value={newTask.targetPlatform || ""} 
                            onChange={(e) => setNewTask({...newTask, targetPlatform: e.target.value})} 
                            placeholder="Twitter, Discord, Telegram"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Handle/Username</Label>
                        <Input 
                            value={newTask.targetHandle || ""} 
                            onChange={(e) => setNewTask({...newTask, targetHandle: e.target.value})} 
                            placeholder="@YourHandle"
                        />
                    </div>
                </div>
            )}

            {newTask.verificationType === 'auto_tx' && (
                <div className="grid grid-cols-3 gap-3 p-3 border rounded-lg bg-gray-50 dark:bg-gray-900">
                    <div className="space-y-2">
                        <Label>Chain ID</Label>
                        <Input 
                            value={newTask.targetChainId || ""} 
                            onChange={(e) => setNewTask({...newTask, targetChainId: e.target.value})} 
                            placeholder="1 (ETH), 137 (Polygon)"
                        />
                    </div>
                    <div className="space-y-2 col-span-2">
                        <Label>Target Contract Address</Label>
                        <Input 
                            value={newTask.targetContractAddress || ""} 
                            onChange={(e) => setNewTask({...newTask, targetContractAddress: e.target.value})} 
                            placeholder="0x..."
                        />
                    </div>
                    <div className="space-y-2 col-span-3">
                        <Label>Action (For Internal Reference)</Label>
                        <Input 
                            value={newTask.action || "swap"} 
                            onChange={(e) => setNewTask({...newTask, action: e.target.value})} 
                            placeholder="swap, stake, deposit"
                        />
                    </div>
                </div>
            )}


            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch
                  checked={newTask.required || false}
                  onCheckedChange={(checked) => setNewTask({...newTask, required: checked})}
                />
                <Label>Required Task</Label>
              </div>

              <Button
                onClick={editingTask ? handleUpdateTask : handleAddTask}
                disabled={!newTask.title || !newTask.description || !newTask.url || newTask.points === undefined}
              >
                <Plus className="h-4 w-4 mr-2" />
                {editingTask ? "Update Task" : "Add Task to Quest"}
              </Button>
            </div>

            {editingTask && (
              <Button
                variant="outline"
                onClick={() => {
                  setEditingTask(null)
                  setNewTask(initialNewTaskForm)
                }}
                className="w-full"
              >
                Cancel Edit
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tasks List */}
      <Card>
        <CardHeader>
          <CardTitle>Quest Tasks ({newQuest.tasks.length})</CardTitle>
          <CardDescription>
            Tasks organized by stage. Check the Quest Details panel to set the Pass Points for each stage.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {newQuest.tasks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No tasks created yet. Add a task using the panel above.
            </div>
          ) : (
            <div className="space-y-3">
              {TASK_STAGES.map(stage => {
                  const tasksInStage = newQuest.tasks.filter(t => t.stage === stage);
                  if (tasksInStage.length === 0) return null;
                  
                  const totalPoints = stageTotals[stage];
                  const requiredPass = stagePassRequirements[stage];
                  const maxAllowed = Math.floor(totalPoints * MAX_PASS_POINT_RATIO);
                  const isPassSetValid = requiredPass > 0 && requiredPass <= maxAllowed;
                  
                  return (
                    <div key={stage} className={`space-y-3 p-3 rounded-lg border-2 ${isPassSetValid ? 'border-green-400' : 'border-red-400 bg-red-50/50 dark:bg-red-900/10'}`}>
                        <h4 className="font-semibold text-lg flex items-center justify-between">
                            <Badge className={getStageColor(stage)}>
                                {stage} Stage
                            </Badge>
                            <span className={`text-sm font-bold ${isPassSetValid ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                TOTAL: {totalPoints} Pts | PASS REQUIRED: {requiredPass} Pts
                            </span>
                        </h4>
                        <div className="space-y-3 pl-2">
                            {tasksInStage.map((task) => (
                                <div
                                  key={task.id}
                                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                                >
                                  <div className="flex items-center gap-3">
                                    {getVerificationIcon(task.verificationType)}
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <h3 className="font-medium">{task.title}</h3>
                                        <Badge className={getCategoryColor(task.category)} variant="secondary">
                                          {task.category}
                                        </Badge>
                                        <Badge variant="outline" className="text-xs">
                                            {task.verificationType.replace('_', ' ')}
                                        </Badge>
                                        {task.required && (
                                          <Badge variant="default" className="text-xs bg-red-500 hover:bg-red-600">REQUIRED</Badge>
                                        )}
                                      </div>
                                      <p className="text-sm text-muted-foreground">{task.description}</p>
                                      <div className="flex items-center gap-2 mt-1">
                                        <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                                          +{task.points} Points
                                        </span>
                                        {task.category === 'referral' && (
                                            <span className="text-xs text-orange-600 dark:text-orange-400 font-medium flex items-center gap-1">
                                                <Share2 className="h-3 w-3" /> Min Referrals: {task.minReferrals}
                                            </span>
                                        )}
                                        {(task.targetHandle || task.targetContractAddress) && (
                                            <span className="text-xs text-muted-foreground">
                                                Target: {task.targetHandle || `${task.targetContractAddress?.slice(0, 6)}...`}
                                            </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleEditTask(task)}
                                    >
                                      Edit
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleRemoveTask(task.id)}
                                      className="text-red-600 hover:text-red-700"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                            ))}
                        </div>
                    </div>
                  );
              })}
              
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}