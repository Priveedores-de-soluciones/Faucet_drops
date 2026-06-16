"use client";

import { useState, useRef, useCallback } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { Header } from '@/components/header';
import { usePrivy } from '@privy-io/react-auth';
import { useWallet } from '@/components/wallet-provider';
import { toast } from 'sonner';
import { Upload, Download, UserPlus, ShieldCheck, X, ImageIcon } from 'lucide-react';

const API_BASE_URL = "https://faucetpay-backend.koyeb.app";
const ADMIN_ADDRESS = process.env.NEXT_PUBLIC_ADMIN_ADDRESS?.toLowerCase();
interface EmployeeData {
  id: string;
  name: string;
  role: string;
  issue_date: string;
  expiry_date: string;
  photo_url?: string | null;
}

export default function AdminRegistrationPage() {
  const { ready, authenticated, login } = usePrivy();
  const { address, isConnected } = useWallet();

  const [name, setName] = useState('');
  const [role, setRole] = useState(''); 
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [employeeData, setEmployeeData] = useState<EmployeeData | null>(null);
  const [loading, setLoading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const qrRef = useRef<HTMLCanvasElement>(null);

  const isAdmin = !!address && address.toLowerCase() === ADMIN_ADDRESS;

  // --- Photo handling ---
  const handlePhotoChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }
    setPhoto(file);
    const reader = new FileReader();
    reader.onloadend = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);
  }, []);

  const removePhoto = useCallback(() => {
    setPhoto(null);
    setPhotoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  // --- Register ---
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !role.trim()) return;
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('name', name.trim());
      formData.append('role', role.trim());
      if (photo) formData.append('photo', photo);

      const response = await fetch(`${API_BASE_URL}/register`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.detail || 'Registration failed');
      }

      const data: EmployeeData = await response.json();
      setEmployeeData(data);
      setName('');
      setRole('');
      setPhoto(null);
      setPhotoPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      toast.success(`Employee ${data.id} registered!`);
    } catch (error: any) {
      console.error("Registration failed:", error);
      toast.error(error.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  // --- QR Download ---
  const downloadQR = useCallback(() => {
    if (!employeeData) return;
    const canvas = document.getElementById('employee-qr') as HTMLCanvasElement;
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `${employeeData.id}-${employeeData.name.replace(/\s+/g, '_')}-QR.png`;
    a.click();
    toast.success("QR code downloaded!");
  }, [employeeData]);

  // --- NOT READY ---
  if (!ready) {
    return (
      <div className="min-h-screen bg-surface-base flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // --- NOT CONNECTED ---
  if (!authenticated || !isConnected) {
    return (
      <div className="min-h-screen bg-surface-base mobile-safe-top flex items-center justify-center p-4 font-sans">
        <div className="relative bg-surface-card border border-surface rounded-2xl shadow-2xl p-8 max-w-md w-full text-center overflow-hidden">
          {/* Decorative top bar */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-primary/60 to-transparent" />

          <div className="w-16 h-16 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <ShieldCheck className="w-8 h-8 text-primary" />
          </div>

          <div className="inline-flex items-center gap-1.5 bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            Restricted Access
          </div>

          <h1 className="text-2xl font-bold text-surface-primary mb-2">Admin Portal</h1>
          <p className="text-surface-secondary text-sm leading-relaxed mb-7">
            Connect the authorized FaucetDrops deployer wallet to access the employee credential system.
          </p>

          <button
            onClick={login}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3.5 px-4 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-primary/20"
          >
            Connect Wallet
          </button>
        </div>
      </div>
    );
  }

  // --- WRONG WALLET ---
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-surface-base mobile-safe-top flex items-center justify-center p-4 font-sans">
        <div className="relative bg-surface-card border border-destructive/30 rounded-2xl shadow-2xl p-8 max-w-md w-full text-center overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-destructive via-destructive/60 to-transparent" />

          <div className="w-16 h-16 bg-destructive/10 border border-destructive/20 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <svg className="w-8 h-8 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          </div>

          <h1 className="text-2xl font-bold text-surface-primary mb-2">Access Denied</h1>
          <p className="text-surface-secondary text-sm mb-3">
            Connected wallet is not authorized.
          </p>
          <p className="text-xs font-mono text-surface-muted bg-surface-card-2 border border-surface px-3 py-2 rounded-lg mb-2">
            {address?.slice(0, 10)}...{address?.slice(-8)}
          </p>
          <p className="text-xs text-surface-muted">Switch to the admin wallet and reconnect.</p>
        </div>
      </div>
    );
  }

  const qrValue = employeeData
    ? `https://faucetdrops.io/verify?id=${employeeData.id}&name=${encodeURIComponent(employeeData.name)}&role=${encodeURIComponent(employeeData.role)}`
    : '';

  // --- MAIN ADMIN UI ---
  return (
    <div className="min-h-screen bg-surface-base mobile-safe-top text-surface-primary font-sans pb-16">
      <Header pageTitle="Career Portal" />

      <main className="max-w-2xl mx-auto mt-8 px-4 space-y-6">

        {/* Registration Form */}
        <section className="bg-surface-card border border-surface rounded-2xl overflow-hidden shadow-sm">
          <div className="p-5 border-b border-surface flex items-center gap-3">
            <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
              <UserPlus className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-surface-primary">Register New Worker</h2>
              <p className="text-surface-muted text-xs">Generate a secure cryptographic credential</p>
            </div>
          </div>

          <form onSubmit={handleRegister} className="p-5 space-y-5">

            {/* Photo Upload */}
            <div>
              <label className="block text-sm font-medium text-surface-secondary mb-2">
                Photo <span className="text-surface-muted font-normal">(optional)</span>
              </label>

              {photoPreview ? (
                <div className="flex items-center gap-4">
                  <div className="relative w-20 h-20 rounded-xl overflow-hidden border-2 border-primary/30 shadow-md flex-shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={removePhoto}
                      className="absolute top-0.5 right-0.5 w-5 h-5 bg-black/70 hover:bg-red-600 rounded-full flex items-center justify-center transition-colors"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                  <div className="flex flex-col gap-1">
                    <p className="text-sm font-medium text-surface-primary truncate max-w-[180px]">{photo?.name}</p>
                    <p className="text-xs text-surface-muted">{photo ? (photo.size / 1024).toFixed(0) + ' KB' : ''}</p>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-xs text-primary hover:underline text-left"
                    >
                      Change photo
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-surface hover:border-primary/50 bg-surface-card-2 hover:bg-primary/5 rounded-xl p-6 flex flex-col items-center gap-2 transition-all group"
                >
                  <div className="w-10 h-10 bg-surface-card border border-surface rounded-xl flex items-center justify-center group-hover:border-primary/30 transition-colors">
                    <ImageIcon className="w-5 h-5 text-surface-muted group-hover:text-primary transition-colors" />
                  </div>
                  <p className="text-sm font-medium text-surface-secondary group-hover:text-surface-primary transition-colors">
                    Click to upload photo
                  </p>
                  <p className="text-xs text-surface-muted">JPG, PNG, WEBP · max 5MB</p>
                </button>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handlePhotoChange}
                className="hidden"
              />
            </div>

            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-surface-secondary mb-1.5">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-surface-card-2 border border-surface text-surface-primary px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary transition-all placeholder:text-surface-muted"
                placeholder="e.g. Alex Nakamoto"
                required
              />
            </div>

            {/* Role */}
            <div>
              <label className="block text-sm font-medium text-surface-secondary mb-1.5">Assigned Role</label>
              <input
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full bg-surface-card-2 border border-surface text-surface-primary px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary transition-all placeholder:text-surface-muted"
                placeholder="e.g. Smart Contract Auditor"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading || !name.trim() || !role.trim()}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3.5 rounded-xl transition-all hover:scale-[1.01] active:scale-[0.99] shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 disabled:shadow-none"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-primary-foreground/40 border-t-primary-foreground rounded-full animate-spin" />
                  Minting Identity...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <UserPlus className="w-4 h-4" />
                  Generate Employee ID
                </span>
              )}
            </button>
          </form>
        </section>

        {/* Generated ID Card */}
        {employeeData && (
          <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-bold tracking-widest text-surface-muted uppercase">Generated Credential</p>
              <button
                onClick={downloadQR}
                className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/80 bg-primary/10 hover:bg-primary/15 border border-primary/20 px-3 py-1.5 rounded-lg transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                Download QR
              </button>
            </div>

            {/* ID Card */}
            <div className="relative bg-surface-card border border-surface rounded-2xl shadow-xl overflow-hidden">
              {/* Top accent */}
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-primary/80 to-primary/30" />

              <div className="p-6">
                <div className="flex gap-4 items-start mb-6">
                  {/* Photo */}
                  <div className="w-16 h-16 rounded-xl overflow-hidden border-2 border-surface flex-shrink-0 bg-surface-card-2 flex items-center justify-center">
                    {employeeData.photo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={employeeData.photo_url} alt={employeeData.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-2xl font-black text-surface-muted">
                        {employeeData.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg font-black text-primary tracking-tight">{employeeData.id}</span>
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full">Active</span>
                    </div>
                    <p className="text-base font-bold text-surface-primary truncate">{employeeData.name}</p>
                    <p className="text-sm text-surface-secondary">{employeeData.role}</p>
                  </div>
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                  <div className="bg-surface-card-2 border border-surface rounded-xl p-3">
                    <p className="text-[10px] text-surface-muted uppercase font-bold tracking-wider mb-0.5">Issued</p>
                    <p className="text-sm font-semibold text-surface-primary font-mono">{employeeData.issue_date}</p>
                  </div>
                  <div className="bg-surface-card-2 border border-surface rounded-xl p-3">
                    <p className="text-[10px] text-surface-muted uppercase font-bold tracking-wider mb-0.5">Expires</p>
                    <p className="text-sm font-semibold text-surface-primary font-mono">{employeeData.expiry_date}</p>
                  </div>
                </div>

                {/* QR Code */}
                <div className="flex flex-col items-center bg-white rounded-xl p-4 border border-surface/20">
                  <QRCodeCanvas
                    id="employee-qr"
                    value={qrValue}
                    size={180}
                    level="H"
                    imageSettings={{
                      src: "/favicon.png",
                      height: 40,
                      width: 30,
                      excavate: true,
                    }}
                  />
                  <p className="text-[10px] text-gray-400 font-mono mt-2 tracking-wider uppercase">
                    Scan to verify · {employeeData.id}
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}

      </main>
    </div>
  );
}
