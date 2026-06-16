"use client";

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ShieldCheck, ShieldX, ScanLine, ExternalLink } from 'lucide-react';
import Link from 'next/link';

const API_BASE_URL = "https://faucetpay-backend.koyeb.app";

interface EmployeeRecord {
  id: string;
  name: string;
  role: string;
  issue_date: string;
  expiry_date: string;
  photo_url?: string | null;
}

function VerificationLogic() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const name = searchParams.get('name');
  const role = searchParams.get('role');

  const [status, setStatus] = useState<'loading' | 'valid' | 'invalid'>('loading');
  const [employee, setEmployee] = useState<EmployeeRecord | null>(null);

  useEffect(() => {
    const verifyIdentity = async () => {
      if (!id || !name || !role) {
        setStatus('invalid');
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, name, role }),
        });

        const data = await response.json();
        setStatus(data.valid ? 'valid' : 'invalid');
        if (data.valid && data.employee) {
          setEmployee(data.employee);
        }
      } catch (error) {
        console.error("Verification failed:", error);
        setStatus('invalid');
      }
    };

    verifyIdentity();
  }, [id, name, role]);

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-4 font-sans">

      {/* ── LOADING ── */}
      {status === 'loading' && (
        <div className="flex flex-col items-center gap-5 max-w-xs w-full text-center">
          <div className="relative w-20 h-20">
            <div className="absolute inset-0 rounded-full border-4 border-white" />
            <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <ScanLine className="w-7 h-7 text-primary animate-pulse" />
            </div>
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Verifying Identity</h2>
            <p className="text-white-400 text-sm mt-1">Checking cryptographic credential...</p>
          </div>
          <div className="w-full bg-zinc-900 border border-white rounded-xl p-4 space-y-2">
            {[id, name, role].map((val, i) => (
              <div key={i} className="h-3 bg-[#020817] rounded-full animate-pulse" style={{ width: `${60 + i * 15}%` }} />
            ))}
          </div>
        </div>
      )}

      {/* ── VALID ── */}
      {status === 'valid' && employee && (
        <div className="w-full max-w-sm animate-in bg-surface fade-in zoom-in-95 duration-500">

          {/* Verified badge */}
          <div className="flex justify-center mb-5">
            <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/30 text-green-400 text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              Cryptographically Verified
            </div>
          </div>

          {/* ID Card */}
          <div className="relative bg-[#020817] border-2 border-green-500/40 rounded-2xl text-white shadow-2xl shadow-green-500/10 overflow-hidden">
            {/* Top linear stripe */}
            <div className="absolute top-0 left-0 w-full h-1.5 bg-linear-to-r from-green-400 via-green-500 to-emerald-400" />

            {/* Header */}
            <div className="px-5 pt-4 pb-3 border-b border-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/darklogo.png" alt="FaucetDrops" className="w-20 h-10 object-contain" />
              </div>
              <ShieldCheck className="w-5 h-5 text-green-500" />
            </div>

            {/* Card body */}
            <div className="p-5">
              <div className="flex gap-4 items-start mb-5">
                {/* Photo */}
                <div className="relative w-20 h-20 rounded-xl overflow-hidden border-2 border-green-500/30 shadow-lg shadow-green-500/10 shrink-0 bg-[#020817] flex items-center justify-center">
                  {employee.photo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={employee.photo_url}
                      alt={employee.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-3xl font-black text-white">
                      {employee.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                  {/* Green verified tick overlay */}
                  <div className="absolute bottom-0.5 right-0.5 w-5 h-5 bg-green-500 rounded-full border-2 border-zinc-900 flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-green-500 mb-0.5">Verified Employee</p>
                  <p className="text-lg font-black text-white leading-tight">{employee.name}</p>
                  <p className="text-sm text-white mt-0.5">{employee.role}</p>
                  <p className="text-xs font-mono font-bold  mt-1.5">{employee.id}</p>
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-2 mb-4">
                <div className="bg-[#020817] border border-white rounded-lg p-2.5">
                  <p className="text-[9px] text-white uppercase font-bold tracking-wider mb-0.5">Issued</p>
                  <p className="text-xs font-semibold text-white font-mono">{employee.issue_date}</p>
                </div>
                <div className="bg-[#020817] border border-white rounded-lg p-2.5">
                  <p className="text-[9px] text-white uppercase font-bold tracking-wider mb-0.5">Expires</p>
                  <p className="text-xs font-semibold text-white font-mono">{employee.expiry_date}</p>
                </div>
              </div>

              {/* Status pill */}
              <div className="flex items-center justify-center gap-2 bg-green-500/10 border border-green-500/20 rounded-xl py-2.5 px-4">
                <ShieldCheck className="w-4 h-4 text-green-500 shrink-0" />
                <p className="text-xs font-bold text-green-400">
                  Identity confirmed in FaucetDrops registry
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 pb-4 flex items-center justify-between">
              <p className="text-[9px] text-white-600 uppercase tracking-widest">faucetdrops.io</p>
              <Link
                href="https://faucetdrops.io"
                className="flex items-center gap-1 text-[10px] text-white hover:underline"
              >
                <ExternalLink className="w-2.5 h-2.5" />
                Explore platform
              </Link>
            </div>
          </div>

          <p className="text-center text-xs text-white mt-4">
            Scanned at {new Date().toLocaleString()}
          </p>
        </div>
      )}

      {/* ── INVALID ── */}
      {status === 'invalid' && (
        <div className="w-full max-w-sm animate-in fade-in zoom-in-95 duration-500">

          {/* Invalid badge */}
          <div className="flex justify-center mb-5">
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              Verification Failed
            </div>
          </div>

          <div className="relative bg-zinc-900 border-2 border-red-500/40 rounded-2xl shadow-2xl shadow-red-500/10 overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-linear-to-r from-red-400 via-red-500 to-red-400" />

            <div className="p-6 flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center mb-4">
                <ShieldX className="w-10 h-10 text-red-500" />
              </div>

              <h2 className="text-3xl font-black text-red-500 tracking-tight mb-2">INVALID</h2>
              <p className="text-white font-semibold mb-1">Credential Not Found</p>
              <p className="text-white-400 text-sm mb-5 leading-relaxed">
                This credential could not be verified against the FaucetDrops employee registry. It may be forged, expired, or tampered with.
              </p>

              {/* What was scanned */}
              {(id || name || role) && (
                <div className="w-full bg-[#020817] border border-white rounded-xl p-4 text-left space-y-2 mb-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-white mb-2">Scanned Data</p>
                  {id && <div className="flex justify-between text-xs"><span className="text-white">ID</span><span className="font-mono font-bold text-white">{id}</span></div>}
                  {name && <div className="flex justify-between text-xs"><span className="text-white">Name</span><span className="font-semibold text-white">{name}</span></div>}
                  {role && <div className="flex justify-between text-xs"><span className="text-white">Role</span><span className="font-semibold text-white">{role}</span></div>}
                </div>
              )}

              <div className="flex items-center justify-center gap-2 w-full bg-red-500/10 border border-red-500/20 rounded-xl py-2.5 px-4">
                <ShieldX className="w-4 h-4 text-red-500 shrink-0" />
                <p className="text-xs font-bold text-red-400">Do not accept this credential</p>
              </div>
            </div>

            <div className="px-5 pb-4 flex items-center justify-between">
              <p className="text-[9px] text-white-600 uppercase tracking-widest">faucetdrops.io</p>
              <p className="text-[10px] text-white-600">{new Date().toLocaleString()}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <VerificationLogic />
    </Suspense>
  );
}