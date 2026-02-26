'use client';

import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';
import { MessageCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const QUICK_REPLIES = [
    { label: "🚀 Launch a Faucet", value: "How do I create and launch a faucet campaign?" },
    { label: "🎁 Claim Issue", value: "I completed tasks but didn’t receive my tokens." },
    { label: "🔌 Wallet Problem", value: "My wallet won’t connect or my transaction failed." },
    { label: "🛡️ Anti-Bot Protection", value: "How does FaucetDrops prevent bots and abuse?" },
    { label: "🏢 Enterprise / API", value: "Do you offer API access or enterprise integrations?" },
];

export default function ChatBot() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        {
            role: 'bot',
            text: "Hi! How may I help you today?",
            sender: 'Gemini Bot',
            avatar: '/favicon.png',
        }
    ]);
    const [inputValue, setInputValue] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [step, setStep] = useState(0);
    const scrollRef = useRef<HTMLDivElement>(null);
    const toggleChat = () => setIsOpen(!isOpen);

    // Auto-scroll logic
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isTyping]);

    const handleSend = async (text: string) => {
        if (!text.trim() || isTyping) return;

        const userMsg = {
            role: 'user',
            text,
            sender: 'You',
            avatar: '/avatar.png'
        };

        // Add user message first
        setMessages(prev => [...prev, userMsg]);
        setInputValue('');
        setIsTyping(true);

        try {
            // Build history from current messages + user message
            // const history = [...messages, userMsg].map(m => ({
            //     role: m.role === 'user' ? 'user' : 'model',
            //     parts: [{ text: m.text }]
            // }));

            const history = messages
                .filter(m => m.role === 'user') // only include user messages
                .map(m => ({
                    role: 'user',
                    parts: [{ text: m.text }]
                }));

            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: text,
                    history
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to get response from chat service');
            }

            const data = await response.json();

            if (!data || typeof data.text !== 'string') {
                throw new Error('Invalid response format from server');
            }

            // Optional small delay for realism
            await new Promise(resolve => setTimeout(resolve, 600));

            const botMsg = {
                role: 'bot',
                text: data.text,
                sender: 'Gemini Bot',
                avatar: '/favicon.png'
            };

            setMessages(prev => [...prev, botMsg]);

            // Escalation trigger
            if (data.text.includes("chat")) {
                setStep(2);
            }

        } catch (error) {
            console.error("Chat error:", error);

            setMessages(prev => [
                ...prev,
                {
                    role: 'bot',
                    text: "Something went wrong. Please try again.",
                    sender: 'Gemini Bot',
                    avatar: '/favicon.png'
                }
            ]);
        } finally {
            setIsTyping(false);
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end space-y-2">
            {isOpen && (
                <div className="w-4/5 h-[600px] rounded-lg    md:rounded-3xl border border-white/10 shadow-2xl bg-black/40 backdrop-blur-xl overflow-hidden flex flex-col relative">

                    {/* Header */}
                    <div className="p-4 border-b border-white/10 bg-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                            <span className="text-sm font-semibold text-white/90">FaucetDrops Support Agent</span>
                        </div>

                        <button
                            onClick={toggleChat}
                            className="text-white hover:bg-white/20 p-1 rounded-full"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    {/* Chat Body */}
                    <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6">
                        {messages.map((msg, idx) => (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, x: msg.role === 'user' ? 20 : -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                            >
                                <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 border border-white/10">
                                    <Image src={msg.avatar} alt="avatar" width={32} height={32} />
                                </div>
                                <div className={`p-4 rounded-2xl text-sm leading-relaxed ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white/10 text-white/90 rounded-tl-none'
                                    }`}>
                                    {msg.text}
                                </div>
                            </motion.div>
                        ))}

                        {isTyping && (
                            <div className="flex flex-col gap-2">
                                <span className="text-[10px] text-blue-400 font-mono ml-11 animate-pulse">ANALYZING REQUEST...</span>
                                <div className="flex gap-3 items-center">
                                    <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center px-6">
                                        <div className="flex gap-1.5">
                                            <div className="w-1 h-1 bg-white/40 rounded-full animate-bounce" />
                                            <div className="w-1 h-1 bg-white/40 rounded-full animate-bounce [animation-delay:0.2s]" />
                                            <div className="w-1 h-1 bg-white/40 rounded-full animate-bounce [animation-delay:0.4s]" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Telegram CTA */}
                        {step === 2 && !isTyping && (
                            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="flex flex-col items-center gap-4 py-4">
                                <div className="h-px w-full bg-white/10" />
                                <a
                                    href="https://t.me/faucetdropschat"
                                    target="_blank"
                                    className="group relative flex items-center gap-3 bg-white text-black px-8 py-4 rounded-full font-bold transition-all hover:scale-105 active:scale-95 overflow-hidden"
                                >
                                    <div className="absolute inset-0 bg-blue-400 translate-y-full group-hover:translate-y-0 transition-transform duration-300 -z-10" />
                                    <span>Talk to Numan on Telegram</span>
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" /></svg>
                                </a>
                            </motion.div>
                        )}
                    </div>

                    {/* Footer Area with Quick Replies */}
                    <div className="p-4 bg-white/5 border-t border-white/10">
                        <AnimatePresence>
                            {step < 2 && (
                                <motion.div exit={{ opacity: 0, height: 0 }} className="flex flex-wrap gap-2 mb-4">
                                    {QUICK_REPLIES.map((reply) => (
                                        <button
                                            key={reply.label}
                                            onClick={() => handleSend(reply.value)}
                                            className="text-[11px] bg-white/10 hover:bg-white/20 border border-white/10 text-white/80 px-3 py-1.5 rounded-full transition-colors"
                                        >
                                            {reply.label}
                                        </button>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <form onSubmit={(e) => { e.preventDefault(); handleSend(inputValue); }} className="flex gap-2">
                            <input
                                type="text"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                placeholder={step === 2 ? "Conversation finished" : "Ask about distribution..."}
                                disabled={step === 2}
                                className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-30"
                            />
                            <button
                                disabled={step === 2 || !inputValue.trim()}
                                className="bg-blue-600 p-3 rounded-2xl hover:bg-blue-500 transition-all disabled:grayscale"
                            >
                                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Chat toggle button */}
            <button
                onClick={toggleChat}
                className={cn(
                    'h-14 w-14 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg hover:bg-blue-700 transition-all',
                    isOpen && 'hidden'
                )}
            >
                <MessageCircle className="h-6 w-6" />
            </button>
        </div>
    );
}