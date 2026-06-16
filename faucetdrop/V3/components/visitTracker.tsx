"use client";

import { useVisitTracker } from '@/hooks/use-visit-tracker';

export default function VisitTracker() {
  // The hook executes safely here in a Client Component
  useVisitTracker(); 
  
  return null; // This component doesn't need to render any UI
}