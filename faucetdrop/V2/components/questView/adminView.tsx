import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from "../../components/ui/button";
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Badge } from '../../components/ui/badge';
import { Progress } from '../../components/ui/progress';
import { 
  CheckCircle, 
  Clock, 
  ExternalLink, 
  Upload,
  Trophy,
  Zap,
  Lock,
  Loader2,
  AlertTriangle
} from 'lucide-react';

// IMPORTANT: Update this to match your backend URL
const API_BASE_URL = "https://fauctdrop-backend.onrender.com";

interface QuestTask {
  id: string;
  title: string;
  description: string;
  points: number;
  category: string;
  verificationType: string;
  url: string;
  stage: string;
  required: boolean;
}

interface StagePassRequirements {
  Beginner: number;
  Intermediate: number;
  Advance: number;
  Legend: number;
  Ultimate: number;
}

interface QuestData {
  faucetAddress: string;
  title: string;
  description: string;
  isActive: boolean;
  rewardPool: string;
  creatorAddress: string;
  imageUrl: string;
  tasks: QuestTask[];
  stagePassRequirements: StagePassRequirements;
}

interface UserProgress {
  totalPoints: number;
  stagePoints: { [key: string]: number };
  completedTasks: string[];
  currentStage: string;
}

export default function QuestParticipantView() {
  // URL parameter - get faucet address from route
  const faucetAddress = "0x958e411FDC547bbEE3ABEfC81023079ae17c6ceE"; // Replace with useParams() in Next.js
  const userWalletAddress = "0x9fBC2A0de6e5C5Fd96e8D11541608f5F328C0785"; // Replace with useWallet() hook

  const [questData, setQuestData] = useState<QuestData | null>(null);
  const [userProgress, setUserProgress] = useState<UserProgress>({
    totalPoints: 0,
    stagePoints: {},
    completedTasks: [],
    currentStage: 'Beginner'
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<QuestTask | null>(null);
  const [submissionData, setSubmissionData] = useState({ proofUrl: '', notes: '', file: null });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch Quest Data
  useEffect(() => {
    const fetchQuestData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`${API_BASE_URL}/api/quests/${faucetAddress}`);
        
        if (!response.ok) {
          throw new Error(`Failed to load quest: ${response.status}`);
        }

        const data = await response.json();
        
        if (!data.success) {
          throw new Error(data.message || 'Failed to load quest');
        }

        setQuestData(data.quest);
      } catch (err: any) {
        console.error('Error fetching quest:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    if (faucetAddress) {
      fetchQuestData();
    }
  }, [faucetAddress]);

  // Fetch User Progress
  useEffect(() => {
    const fetchUserProgress = async () => {
      if (!userWalletAddress || !faucetAddress) return;

      try {
        const response = await fetch(
          `${API_BASE_URL}/api/quests/${faucetAddress}/progress/${userWalletAddress}`
        );
        
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setUserProgress(data.progress);
          }
        }
      } catch (err) {
        console.error('Error fetching user progress:', err);
      }
    };

    fetchUserProgress();
  }, [faucetAddress, userWalletAddress]);

  // Group tasks by stage
  const tasksByStage = questData?.tasks.reduce((acc, task) => {
    if (!acc[task.stage]) {
      acc[task.stage] = [];
    }
    acc[task.stage].push(task);
    return acc;
  }, {} as Record<string, QuestTask[]>) || {};

  const stages = ['Beginner', 'Intermediate', 'Advance', 'Legend', 'Ultimate'];

  const getStageData = (stageName: string) => {
    const tasks = tasksByStage[stageName] || [];
    const totalPoints = tasks.reduce((sum, task) => sum + task.points, 0);
    const passPoints = questData?.stagePassRequirements[stageName] || 0;
    const userPoints = userProgress.stagePoints[stageName] || 0;
    
    return { tasks, totalPoints, passPoints, userPoints };
  };

  const isStageUnlocked = (stageName: string) => {
    const stageIndex = stages.indexOf(stageName);
    if (stageIndex === 0) return true; // Beginner always unlocked
    
    // Check if previous stage is passed
    const prevStage = stages[stageIndex - 1];
    const prevStageData = getStageData(prevStage);
    
    return (userProgress.stagePoints[prevStage] || 0) >= prevStageData.passPoints;
  };

  const handleTaskAction = (task: QuestTask) => {
    const taskStatus = getTaskStatus(task);
    if (taskStatus === 'locked' || taskStatus === 'completed') return;
    
    // Open task URL in new tab
    if (task.url) {
      window.open(task.url, '_blank');
    }
    
    // Show submission modal
    setTimeout(() => {
      setSelectedTask(task);
      setShowSubmitModal(true);
    }, 500);
  };

  const handleSubmitTask = async () => {
    if (!selectedTask || !userWalletAddress) return;

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('walletAddress', userWalletAddress);
      formData.append('taskId', selectedTask.id);
      formData.append('submittedData', submissionData.proofUrl);
      formData.append('notes', submissionData.notes);
      formData.append('submissionType', selectedTask.verificationType);

      if (submissionData.file) {
        formData.append('file', submissionData.file);
      }

      const response = await fetch(
        `${API_BASE_URL}/api/quests/${faucetAddress}/submissions`,
        {
          method: 'POST',
          body: formData
        }
      );

      if (!response.ok) {
        throw new Error('Failed to submit task');
      }

      const result = await response.json();
      
      if (result.success) {
        // Update local state
        setUserProgress(prev => ({
          ...prev,
          completedTasks: [...prev.completedTasks, selectedTask.id]
        }));

        alert('Task submitted successfully! Waiting for admin approval.');
        setShowSubmitModal(false);
        setSelectedTask(null);
        setSubmissionData({ proofUrl: '', notes: '', file: null });
      } else {
        throw new Error(result.message || 'Submission failed');
      }
    } catch (err: any) {
      console.error('Error submitting task:', err);
      alert(`Submission error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTaskStatus = (task: QuestTask) => {
    if (!isStageUnlocked(task.stage)) return 'locked';
    if (userProgress.completedTasks.includes(task.id)) return 'completed';
    return 'available';
  };

  const getStageColor = (stageName: string) => {
    const colors = {
      'Beginner': 'bg-green-500',
      'Intermediate': 'bg-blue-500',
      'Advance': 'bg-purple-500',
      'Legend': 'bg-yellow-500',
      'Ultimate': 'bg-red-500'
    };
    return colors[stageName] || 'bg-gray-500';
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
        <p>Loading Quest...</p>
      </div>
    );
  }

  if (error || !questData) {
    return (
      <div className="max-w-4xl mx-auto p-6 mt-10">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6 text-center text-red-700">
            <AlertTriangle className="h-10 w-10 mx-auto mb-4" />
            <h2 className="text-lg font-bold mb-2">Unable to Load Quest</h2>
            <p>{error || 'Quest not found'}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentStageData = getStageData(userProgress.currentStage);
  const stageProgress = currentStageData.passPoints > 0
    ? (currentStageData.userPoints / currentStageData.passPoints) * 100
    : 0;

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Quest Header */}
      <Card className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row justify-between items-start gap-4">
            <div className="flex gap-4">
              {questData.imageUrl && (
                <img 
                  src={questData.imageUrl} 
                  alt={questData.title}
                  className="w-20 h-20 rounded-lg object-cover border-2 border-white/20"
                />
              )}
              <div>
                <h1 className="text-3xl font-bold mb-2">{questData.title}</h1>
                <p className="text-blue-100 mb-4">{questData.description}</p>
                <div className="flex items-center gap-4">
                  <Badge className="bg-white/20 text-white border-white/30">
                    <Trophy className="h-3 w-3 mr-1" />
                    {questData.rewardPool}
                  </Badge>
                  <Badge className="bg-white/20 text-white border-white/30">
                    <Zap className="h-3 w-3 mr-1" />
                    {userProgress.totalPoints} Points Earned
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Stage Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Badge className={getStageColor(userProgress.currentStage)}>
                {userProgress.currentStage} Stage
              </Badge>
              <span className="text-sm font-normal text-muted-foreground">
                {currentStageData.userPoints} / {currentStageData.passPoints} points to pass
              </span>
            </span>
            <span className="text-sm text-muted-foreground">
              {Math.round(stageProgress)}% Complete
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Progress value={Math.min(stageProgress, 100)} className="h-3" />
        </CardContent>
      </Card>

      {/* Tasks by Stage */}
      {stages.map((stageName) => {
        const stageData = getStageData(stageName);
        const isUnlocked = isStageUnlocked(stageName);

        if (stageData.tasks.length === 0) return null;

        return (
          <div key={stageName} className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Badge className={getStageColor(stageName)} variant="outline">
                  {stageName} Stage
                </Badge>
                {!isUnlocked && <Lock className="h-5 w-5 text-muted-foreground" />}
              </h2>
              <span className="text-sm text-muted-foreground">
                Pass: {stageData.passPoints} pts | Total: {stageData.totalPoints} pts
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {stageData.tasks.map((task) => {
                const status = getTaskStatus(task);
                const isCompleted = status === 'completed';
                const isLocked = status === 'locked';

                return (
                  <Card 
                    key={task.id} 
                    className={`
                      transition-all hover:shadow-lg
                      ${isCompleted ? 'border-green-500 bg-green-50' : ''}
                      ${isLocked ? 'opacity-50' : 'cursor-pointer'}
                    `}
                    onClick={() => handleTaskAction(task)}
                  >
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-2">
                          {isCompleted ? (
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          ) : isLocked ? (
                            <Lock className="h-5 w-5 text-gray-400" />
                          ) : (
                            <Clock className="h-5 w-5 text-blue-500" />
                          )}
                          <div>
                            <h3 className="font-semibold">{task.title}</h3>
                            <p className="text-xs text-muted-foreground line-clamp-1">
                              {task.description}
                            </p>
                          </div>
                        </div>
                        <Badge variant={isCompleted ? "default" : "secondary"} className={isCompleted ? "bg-green-600" : ""}>
                          +{task.points}
                        </Badge>
                      </div>

                      <div className="flex justify-between items-center mt-4">
                        <span className="text-xs text-muted-foreground capitalize">
                          {task.verificationType.replace('_', ' ')}
                        </span>
                        
                        {!isLocked && !isCompleted && (
                          <Button size="sm" variant="outline">
                            {task.verificationType === 'manual_upload' ? (
                              <>
                                <Upload className="h-3 w-3 mr-1" />
                                Upload
                              </>
                            ) : (
                              <>
                                <ExternalLink className="h-3 w-3 mr-1" />
                                Start
                              </>
                            )}
                          </Button>
                        )}

                        {isCompleted && (
                          <Badge variant="default" className="bg-green-600">
                            Completed ✓
                          </Badge>
                        )}

                        {isLocked && (
                          <Badge variant="secondary">
                            Locked 🔒
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Submission Modal */}
      {showSubmitModal && selectedTask && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-lg w-full">
            <CardHeader>
              <CardTitle>Submit Task Completion</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm font-semibold">{selectedTask.title}</Label>
                <p className="text-xs text-muted-foreground">+{selectedTask.points} points</p>
              </div>

              {selectedTask.verificationType === 'manual_link' && (
                <div className="space-y-2">
                  <Label htmlFor="proof-link">Proof Link / Screenshot URL</Label>
                  <Input 
                    id="proof-link"
                    placeholder="https://twitter.com/yourprofile/status/..."
                    value={submissionData.proofUrl}
                    onChange={(e) => setSubmissionData({...submissionData, proofUrl: e.target.value})}
                  />
                  <p className="text-xs text-muted-foreground">
                    Paste a link showing you completed the task
                  </p>
                </div>
              )}

              {selectedTask.verificationType === 'manual_upload' && (
                <div className="space-y-2">
                  <Label htmlFor="proof-image">Upload Proof Image</Label>
                  <Input 
                    id="proof-image"
                    type="file" 
                    accept="image/*"
                    onChange={(e) => setSubmissionData({...submissionData, file: e.target.files?.[0] || null})}
                  />
                  <p className="text-xs text-muted-foreground">
                    Upload a screenshot proving task completion
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="notes">Additional Notes (Optional)</Label>
                <Textarea 
                  id="notes"
                  placeholder="Add any comments..."
                  rows={3}
                  value={submissionData.notes}
                  onChange={(e) => setSubmissionData({...submissionData, notes: e.target.value})}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => {
                    setShowSubmitModal(false);
                    setSelectedTask(null);
                    setSubmissionData({ proofUrl: '', notes: '', file: null });
                  }}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button 
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  onClick={handleSubmitTask}
                  disabled={isSubmitting || (!submissionData.proofUrl && !submissionData.file)}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    'Submit for Review'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}