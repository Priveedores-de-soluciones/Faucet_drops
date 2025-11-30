'use client';

import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';

const messages = [
  {
    type: 'sender',
    text: 'Hello...',
    sender: 'You',
    avatar: '/avatar.png',
    delay: 0.5
  },
  {
    type: 'receiver',
    text: 'Are you launching a new token, rewarding contributors, onboarding first time users, or running a large-scale marketing Campaign?',
    sender: 'Faucet Team',
    avatar: '/favicon.png',
    delay: 1.5
  },
  {
    type: 'sender',
    text: 'Yes! I need to distribute tokens to thousands of users efficiently.',
    sender: 'You',
    avatar: '/avatar.png',
    delay: 2.5
  },
  {
    type: 'receiver',
    text: 'Faucet Drops gives you everything you need to distribute rewards safely, transparently, and at scale.',
    sender: 'Faucet Team',
    avatar: '/favicon.png',
    delay: 3.5
  }
];

const MessageBubble = ({ message, index }: { message: typeof messages[0], index: number }) => {
  const isSender = message.type === 'sender';
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, message.delay * 1000);

    return () => clearTimeout(timer);
  }, [message.delay]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          key={index}
          initial={{ 
            opacity: 0, 
            x: isSender ? 50 : -50,
            scale: 0.95 
          }}
          animate={{ 
            opacity: 1, 
            x: 0, 
            scale: 1,
            transition: {
              type: 'spring',
              stiffness: 500,
              damping: 25
            }
          }}
          exit={{ opacity: 0, x: isSender ? 50 : -50 }}
          className={`flex gap-3 ${isSender ? 'flex-row-reverse' : 'flex-row'}`}
        >
          {/* Avatar */}
          <motion.div 
            className="w-10 h-10 rounded-full shrink-0 flex items-center justify-center overflow-hidden"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
          >
            <Image 
              src={message.avatar} 
              alt="Avatar" 
              width={40} 
              height={40} 
              className="object-cover w-full h-full"
            />
          </motion.div>

          {/* Message Bubble */}
          <div className={`flex flex-col max-w-[75%] ${isSender ? 'items-end' : 'items-start'}`}>
            <motion.span 
              className="text-white/60 text-xs mb-1 px-2"
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: message.delay + 0.1 }}
            >
              {message.sender}
            </motion.span>
            <motion.div
              className={`rounded-2xl px-4 py-3 ${
                isSender 
                  ? 'bg-primary text-white rounded-br-none' 
                  : 'bg-white/5 text-white rounded-bl-none'
              }`}
              whileHover={{ 
                scale: 1.02,
                transition: { duration: 0.2 }
              }}
            >
              <p className="text-sm leading-relaxed">{message.text}</p>
              <motion.div 
                className="text-right mt-1 text-xs opacity-50"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.5 }}
                transition={{ delay: message.delay + 0.2 }}
              >
                {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </motion.div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const TypingIndicator = ({ isTyping = true }: { isTyping?: boolean }) => {
  if (!isTyping) return null;
  
  return (
    <motion.div 
      className="flex items-center gap-1 pl-2 py-2"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
    >
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-2 h-2 bg-white/50 rounded-full"
          animate={{
            y: ['0%', '50%', '0%'],
          }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
            delay: i * 0.2,
          }}
        />
      ))}
    </motion.div>
  );
};

export default function FaucetChat() {
  const [isTyping, setIsTyping] = useState(true);
  const [showTyping, setShowTyping] = useState(true);

  useEffect(() => {
    // Hide typing indicator after all messages are shown
    const typingTimer = setTimeout(() => {
      setIsTyping(false);
      // Add a small delay before removing the typing indicator from the DOM
      setTimeout(() => setShowTyping(false), 500);
    }, messages[messages.length - 1].delay * 1000 + 1000);

    return () => clearTimeout(typingTimer);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-8 mb-10 text-lg">
      <div className="w-full max-w-4xl">
        <motion.div 
          className="rounded-3xl border border-white/10 shadow-2xl p-6 sm:p-8 space-y-6 bg-linear-to-br from-white/5 to-transparent backdrop-blur-sm"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ 
            opacity: 1, 
            y: 0,
            transition: { duration: 0.6 }
          }}
          viewport={{ once: true, margin: "-100px" }}
        >
          <div className="space-y-4">
            {messages.map((message, index) => (
              <MessageBubble key={index} message={message} index={index} />
            ))}
            
            {showTyping && (
              <motion.div 
                className={`flex gap-3 ${isTyping ? 'opacity-100' : 'opacity-0'} transition-opacity`}
              >
                <div className="w-10 h-10 rounded-full shrink-0 flex items-center justify-center overflow-hidden">
                  <Image 
                    src="/favicon.png" 
                    alt="Typing..." 
                    width={40} 
                    height={40} 
                    className="object-cover w-full h-full"
                  />
                </div>
                <div className="flex items-center">
                  <TypingIndicator isTyping={isTyping} />
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}