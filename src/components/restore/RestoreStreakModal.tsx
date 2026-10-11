'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { RestoreStreakCard } from './RestoreStreakCard';

interface RestoreStreakModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  habitId?: string;
}

export function RestoreStreakModal({
  isOpen = true,
  onClose,
  habitId,
}: RestoreStreakModalProps) {
  const router = useRouter();

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      router.back();
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-navy-950/45 backdrop-blur-sm transition-opacity"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Modal Dialog Content */}
      <div className="relative z-10 w-full max-w-[760px]">
        <RestoreStreakCard
          isModal
          onClose={handleClose}
          preselectedHabitId={habitId}
        />
      </div>
    </div>
  );
}

export default RestoreStreakModal;
