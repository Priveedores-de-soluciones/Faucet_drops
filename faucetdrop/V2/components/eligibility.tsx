import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { AlertTriangle, Trash2, Plus, Check, Lock, Unlock, Shield, FileUp, Link as LinkIcon } from 'lucide-react';

// ============================================
// VERIFICATION TYPES & INTERFACES
// ============================================

type EligibilityType = 'token' | 'nft' | 'none';
type VerificationMode = 'auto' | 'manual';
type ManualVerificationMethod = 'file_upload' | 'link_submission' | 'both';

interface TokenEligibility {
  type: 'token';
  chainId: number;
  tokenAddress: string;
  tokenName: string;
  minBalance: string; // In wei or smallest unit
  symbol: string;
}

interface NFTEligibility {
  type: 'nft';
  chainId: number;
  contractAddress: string;
  contractName: string;
  minQuantity: number;
  chainName: string;
}

type EligibilityRequirement = TokenEligibility | NFTEligibility;

interface EnhancedVerificationConfig {
  taskId: string;
  category: 'social' | 'trading' | 'swap' | 'referral' | 'content' | 'general';
  mode: VerificationMode;
  manualMethods?: ManualVerificationMethod;
  requiresProfileMatch?: boolean; // For social tasks
}

interface GlobalEligibilityConfig {
  requiresVerification: boolean;
  eligibilityType: EligibilityType;
  requirements: EligibilityRequirement[];
}

// ============================================
// ELIGIBILITY MANAGER COMPONENT
// ============================================

interface EligibilityManagerProps {
  eligibilityConfig: GlobalEligibilityConfig;
  setEligibilityConfig: React.Dispatch<React.SetStateAction<GlobalEligibilityConfig>>;
}

const EligibilityManager: React.FC<EligibilityManagerProps> = ({ eligibilityConfig, setEligibilityConfig }) => {
  const [isAddingRequirement, setIsAddingRequirement] = useState(false);
  const [newRequirement, setNewRequirement] = useState<{ type: EligibilityType; chainId: number; address: string; name: string; value: string; }>({
    type: 'token',
    chainId: 42220,
    address: '',
    name: '',
    value: '',
  });

  const chains = [
    { id: 42220, name: 'Celo' },
    { id: 1135, name: 'Lisk' },
    { id: 42161, name: 'Arbitrum' },
    { id: 8453, name: 'Base' },
  ];

  const handleAddRequirement = () => {
    if (!newRequirement.address || !newRequirement.name || !newRequirement.value) {
      alert('Please fill in all fields');
      return;
    }

    const selectedChain = chains.find(c => c.id === newRequirement.chainId);

    if (newRequirement.type === 'token') {
      const tokenReq: TokenEligibility = {
        type: 'token',
        chainId: newRequirement.chainId,
        tokenAddress: newRequirement.address,
        tokenName: newRequirement.name,
        minBalance: newRequirement.value,
        symbol: newRequirement.name.split(' ')[0],
      };
      setEligibilityConfig(prev => ({
        ...prev,
        requirements: [...prev.requirements, tokenReq],
      }));
    } else {
      const nftReq: NFTEligibility = {
        type: 'nft',
        chainId: newRequirement.chainId,
        contractAddress: newRequirement.address,
        contractName: newRequirement.name,
        minQuantity: parseInt(newRequirement.value),
        chainName: selectedChain?.name || 'Unknown',
      };
      setEligibilityConfig(prev => ({
        ...prev,
        requirements: [...prev.requirements, nftReq],
      }));
    }

    setNewRequirement({ type: 'token', chainId: 42220, address: '', name: '', value: '' });
    setIsAddingRequirement(false);
  };

  const handleRemoveRequirement = (index: number) => {
    setEligibilityConfig(prev => ({
      ...prev,
      requirements: prev.requirements.filter((_, i) => i !== index),
    }));
  };

  return (
    <Card className="border-2 border-blue-200 dark:border-blue-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" /> Eligibility Requirements
        </CardTitle>
        <CardDescription>
          Set token or NFT requirements for quest participation
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <Switch
            checked={eligibilityConfig.requiresVerification}
            onCheckedChange={(checked) =>
              setEligibilityConfig(prev => ({ ...prev, requiresVerification: checked }))
            }
          />
          <Label>Require token/NFT verification</Label>
        </div>

        {eligibilityConfig.requiresVerification && (
          <>
            <div className="space-y-2">
              <Label>Eligibility Type</Label>
              <Select
                value={eligibilityConfig.eligibilityType}
                onValueChange={(value: any) =>
                  setEligibilityConfig(prev => ({ ...prev, eligibilityType: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="token">Token Balance</SelectItem>
                  <SelectItem value="nft">NFT Ownership</SelectItem>
                  <SelectItem value="none">No Requirement</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {eligibilityConfig.eligibilityType !== 'none' && (
              <div className="space-y-3 p-3 border rounded-lg bg-blue-50 dark:bg-blue-900/20">
                {isAddingRequirement ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label className="text-xs">Chain</Label>
                        <Select
                          value={newRequirement.chainId.toString()}
                          onValueChange={(v) => setNewRequirement({ ...newRequirement, chainId: parseInt(v) })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {chains.map(c => (
                              <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Type</Label>
                        <Select
                          value={newRequirement.type}
                          onValueChange={(v: any) => setNewRequirement({ ...newRequirement, type: v })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="token">Token</SelectItem>
                            <SelectItem value="nft">NFT</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs">Contract Address</Label>
                      <Input
                        value={newRequirement.address}
                        onChange={(e) => setNewRequirement({ ...newRequirement, address: e.target.value })}
                        placeholder="0x..."
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs">{newRequirement.type === 'token' ? 'Token Name' : 'Collection Name'}</Label>
                      <Input
                        value={newRequirement.name}
                        onChange={(e) => setNewRequirement({ ...newRequirement, name: e.target.value })}
                        placeholder="e.g., Celo or Ape Yacht Club"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs">{newRequirement.type === 'token' ? 'Min Balance' : 'Min Quantity'}</Label>
                      <Input
                        value={newRequirement.value}
                        onChange={(e) => setNewRequirement({ ...newRequirement, value: e.target.value })}
                        placeholder={newRequirement.type === 'token' ? 'e.g., 1000000000000000000' : 'e.g., 1'}
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleAddRequirement} className="flex-1">
                        <Plus className="h-3 w-3 mr-1" /> Add
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setIsAddingRequirement(false)} className="flex-1">
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => setIsAddingRequirement(true)} className="w-full">
                    <Plus className="h-3 w-3 mr-1" /> Add Requirement
                  </Button>
                )}

                {eligibilityConfig.requirements.length > 0 && (
                  <div className="space-y-2 mt-3">
                    <p className="text-xs font-semibold text-blue-700 dark:text-blue-200">Current Requirements:</p>
                    {eligibilityConfig.requirements.map((req, idx) => (
                      <div key={idx} className="flex justify-between items-center p-2 bg-white dark:bg-gray-800 rounded text-sm">
                        <div>
                          <p className="font-medium">
                            {req.type === 'token' ? `${req.tokenName}` : req.contractName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {req.type === 'token' ? `Min: ${req.minBalance}` : `Min: ${req.minQuantity} NFT(s)`}
                          </p>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 text-red-500"
                          onClick={() => handleRemoveRequirement(idx)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

// ============================================
// VERIFICATION MODE SELECTOR COMPONENT
// ============================================

interface VerificationModeSelectorProps {
  taskId: string;
  category: string;
  verificationMode: VerificationMode;
  manualMethods: ManualVerificationMethod;
  onModeChange: (mode: VerificationMode) => void;
  onMethodsChange: (methods: ManualVerificationMethod) => void;
}

const VerificationModeSelector: React.FC<VerificationModeSelectorProps> = ({
  taskId,
  category,
  verificationMode,
  manualMethods,
  onModeChange,
  onMethodsChange,
}) => {
  const isSocialTask = category === 'social';

  return (
    <div className="space-y-3 p-3 border-2 border-green-200 dark:border-green-800 rounded-lg bg-green-50 dark:bg-green-900/20">
      <h4 className="font-semibold text-sm text-green-700 dark:text-green-200">Verification Configuration</h4>

      <div className="space-y-2">
        <Label className="text-xs font-semibold">Verification Mode</Label>
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant={verificationMode === 'auto' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onModeChange('auto')}
            className="text-xs"
          >
            <Check className="h-3 w-3 mr-1" /> Auto
          </Button>
          <Button
            variant={verificationMode === 'manual' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onModeChange('manual')}
            className="text-xs"
          >
            <Shield className="h-3 w-3 mr-1" /> Manual
          </Button>
        </div>

        {isSocialTask && (
          <p className="text-xs text-muted-foreground bg-blue-50 dark:bg-blue-900/30 p-2 rounded">
            💡 <strong>Auto verification</strong> will check if the submitted username matches the platform username in their profile.
          </p>
        )}
      </div>

      {verificationMode === 'manual' && (
        <div className="space-y-2">
          <Label className="text-xs font-semibold">Verification Method(s)</Label>
          <div className="space-y-2">
            <div className="flex items-center gap-2 p-2 bg-white dark:bg-gray-800 rounded border">
              <input
                type="checkbox"
                id={`file-${taskId}`}
                checked={manualMethods === 'file_upload' || manualMethods === 'both'}
                onChange={(e) => {
                  if (e.target.checked) {
                    onMethodsChange(manualMethods === 'link_submission' ? 'both' : 'file_upload');
                  } else {
                    onMethodsChange(manualMethods === 'both' ? 'link_submission' : 'file_upload');
                  }
                }}
              />
              <label htmlFor={`file-${taskId}`} className="text-xs flex items-center gap-2 cursor-pointer flex-1">
                <FileUp className="h-3 w-3" /> File Upload
              </label>
            </div>

            <div className="flex items-center gap-2 p-2 bg-white dark:bg-gray-800 rounded border">
              <input
                type="checkbox"
                id={`link-${taskId}`}
                checked={manualMethods === 'link_submission' || manualMethods === 'both'}
                onChange={(e) => {
                  if (e.target.checked) {
                    onMethodsChange(manualMethods === 'file_upload' ? 'both' : 'link_submission');
                  } else {
                    onMethodsChange(manualMethods === 'both' ? 'file_upload' : 'link_submission');
                  }
                }}
              />
              <label htmlFor={`link-${taskId}`} className="text-xs flex items-center gap-2 cursor-pointer flex-1">
                <LinkIcon className="h-3 w-3" /> Link Submission
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================
// DEMO: INTEGRATED STEP 3 WITH VERIFICATION
// ============================================

interface DemoTaskWithVerificationProps {
  onTaskUpdate: (taskId: string, config: EnhancedVerificationConfig) => void;
}

const DemoTaskWithVerification: React.FC<DemoTaskWithVerificationProps> = ({ onTaskUpdate }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('social');
  const [taskId] = useState('demo-task-1');
  const [verificationMode, setVerificationMode] = useState<VerificationMode>('auto');
  const [manualMethods, setManualMethods] = useState<ManualVerificationMethod>('both');
  const [eligibilityConfig, setEligibilityConfig] = useState<GlobalEligibilityConfig>({
    requiresVerification: false,
    eligibilityType: 'none',
    requirements: [],
  });

  const handleModeChange = (mode: VerificationMode) => {
    setVerificationMode(mode);
    onTaskUpdate(taskId, {
      taskId,
      category: selectedCategory as any,
      mode,
      manualMethods,
      requiresProfileMatch: selectedCategory === 'social' && mode === 'auto',
    });
  };

  const handleMethodsChange = (methods: ManualVerificationMethod) => {
    setManualMethods(methods);
    onTaskUpdate(taskId, {
      taskId,
      category: selectedCategory as any,
      mode: verificationMode,
      manualMethods: methods,
      requiresProfileMatch: selectedCategory === 'social' && verificationMode === 'auto',
    });
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Task Verification Setup</CardTitle>
          <CardDescription>Configure how task completion will be verified</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Task Category</Label>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="social">Social (Twitter, Discord, etc)</SelectItem>
                <SelectItem value="trading">Trading (Swap, Stake, etc)</SelectItem>
                <SelectItem value="referral">Referral</SelectItem>
                <SelectItem value="content">Content</SelectItem>
                <SelectItem value="general">General</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <VerificationModeSelector
            taskId={taskId}
            category={selectedCategory}
            verificationMode={verificationMode}
            manualMethods={manualMethods}
            onModeChange={handleModeChange}
            onMethodsChange={handleMethodsChange}
          />

          <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded border border-blue-200 dark:border-blue-800">
            <p className="text-xs font-semibold text-blue-700 dark:text-blue-200 mb-2">Current Configuration:</p>
            <ul className="text-xs space-y-1 text-blue-600 dark:text-blue-300">
              <li>✓ Mode: <strong>{verificationMode.toUpperCase()}</strong></li>
              {verificationMode === 'manual' && <li>✓ Methods: <strong>{manualMethods.replace(/_/g, ' ')}</strong></li>}
              {selectedCategory === 'social' && verificationMode === 'auto' && (
                <li>✓ Profile Match: <strong>Username will be verified</strong></li>
              )}
            </ul>
          </div>
        </CardContent>
      </Card>

      <EligibilityManager
        eligibilityConfig={eligibilityConfig}
        setEligibilityConfig={setEligibilityConfig}
      />

      <Card className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" /> Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <p>
            <strong>Eligibility:</strong>{' '}
            {eligibilityConfig.requiresVerification
              ? `${eligibilityConfig.eligibilityType === 'token' ? 'Token' : 'NFT'} verification required (${eligibilityConfig.requirements.length} requirement(s))`
              : 'No eligibility requirements'}
          </p>
          <p>
            <strong>Task Verification:</strong> {verificationMode === 'auto' ? 'Automatic' : 'Manual (requires review)'}
          </p>
          {verificationMode === 'manual' && (
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Submissions via: {manualMethods === 'both' ? 'File upload or link' : manualMethods === 'file_upload' ? 'File upload only' : 'Link submission only'}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// ============================================
// MAIN DEMO COMPONENT
// ============================================

export default function VerificationDemo() {
  const [verificationConfigs, setVerificationConfigs] = useState<Record<string, EnhancedVerificationConfig>>({});

  const handleTaskUpdate = (taskId: string, config: EnhancedVerificationConfig) => {
    setVerificationConfigs(prev => ({
      ...prev,
      [taskId]: config,
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Quest Verification System</h1>
          <p className="text-muted-foreground">Configure eligibility and verification modes for tasks</p>
        </div>

        <DemoTaskWithVerification onTaskUpdate={handleTaskUpdate} />

        {Object.keys(verificationConfigs).length > 0 && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Configuration State</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-gray-100 dark:bg-gray-900 p-3 rounded text-xs overflow-auto max-h-96">
                {JSON.stringify(verificationConfigs, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}