"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import Link from "next/link";

interface GetStartedModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function GetStartedModal({
  isOpen,
  onClose,
}: GetStartedModalProps) {
  const options = [
    {
      title: "Faucet",
      description: "Create a faucet and start dripping",
      href: "https://app.faucetdrops.io/faucet/create-faucet", target: "_blank",
    },
    {
      title: "Quest",
      description: "Create a quest and start dripping",
      href: "https://app.faucetdrops.io/quest/create-quest", target: "_blank",
    },
    {
      title: "Quiz",
      description: "Create a quiz and start dripping",
      href: "https://app.faucetdrops.io/quiz/create-quiz", target: "_blank",
    },
  ];

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        {/* Overlay */}
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm data-[state=open]:animate-fadeIn data-[state=closed]:animate-fadeOut" />

        {/* Content */}
        <Dialog.Content
          className="
            fixed left-1/2 top-1/2 z-50 w-full max-w-md
            -translate-x-1/2 -translate-y-1/2
            rounded-2xl bg-gray-900 p-6
            border border-gray-800 shadow-xl
            data-[state=open]:animate-scaleIn
            data-[state=closed]:animate-scaleOut
          "
        >
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <Dialog.Title className="text-lg font-medium text-white">
                Create a Product
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-gray-400">
                Choose the type of product you want to create
              </Dialog.Description>
            </div>

            <Dialog.Close asChild>
              <button
                className="rounded-md p-1 text-gray-400 hover:text-gray-300"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </Dialog.Close>
          </div>

          {/* Options */}
          <div className="mt-6 space-y-4">
            {options.map((option) => (
              <Link
                key={option.href}
                href={option.href}
                onClick={onClose}
                className="
                  block rounded-lg border border-gray-800 p-4
                  transition-colors hover:bg-gray-800/50
                "
              >
                <h4 className="font-medium text-white">
                  {option.title}
                </h4>
                <p className="mt-1 text-sm text-gray-400">
                  {option.description}
                </p>
              </Link>
            ))}
          </div>

          {/* Footer */}
          <div className="mt-6">
            <Dialog.Close asChild>
              <button
                className="w-full px-4 py-2 text-sm font-medium text-gray-400 hover:text-gray-300 transition-colors"
              >
                Cancel
              </button>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
