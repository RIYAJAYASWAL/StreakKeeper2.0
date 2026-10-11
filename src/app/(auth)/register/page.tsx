'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { signIn } from 'next-auth/react';
import { Eye, EyeOff, Loader2, ChevronDown } from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';

const COMMON_TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Toronto',
  'America/Sao_Paulo',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Amsterdam',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Singapore',
  'Asia/Shanghai',
  'Asia/Tokyo',
  'Australia/Sydney',
  'Pacific/Auckland',
  'UTC',
];

const registerSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100, 'Name must be at most 100 characters'),
  email: z.string().trim().min(1, 'Email is required').email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  timezone: z.string().min(1, 'Time zone is required'),
});

export default function RegisterPage() {
  const router = useRouter();
  const { error: toastError, success: toastSuccess } = useToast();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [timezone, setTimezone] = useState('UTC');
  const [availableTimezones, setAvailableTimezones] = useState<string[]>(COMMON_TIMEZONES);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  // Default to user browser's time zone on mount
  useEffect(() => {
    try {
      const detectedTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (detectedTz) {
        setTimezone(detectedTz);
        setAvailableTimezones((prev) =>
          prev.includes(detectedTz) ? prev : [detectedTz, ...prev]
        );
      }
    } catch {
      // Fallback remains UTC
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = registerSchema.safeParse({ name, email, password, timezone });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0].toString()] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    setIsLoading(true);
    try {
      // 1. Call our existing register API
      await api.auth.register({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        timezone,
      });

      // 2. Automatically log in user via Auth.js credentials
      const signInRes = await signIn('credentials', {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
      });

      if (signInRes?.error) {
        toastError('Account created, but sign-in failed. Please log in manually.');
        router.push('/login');
        return;
      }

      toastSuccess('Account created successfully! Welcome to StreakKeeper.');
      router.push('/home');
      router.refresh();
    } catch (err: any) {
      const message = err?.message || 'Failed to create account. Please try again.';
      toastError(message);
      if (message.toLowerCase().includes('already exists') || message.toLowerCase().includes('email')) {
        setErrors({ email: message });
      }
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title & Subtitle */}
      <div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-navy-900 tracking-tight">
          Create account
        </h2>
        <p className="text-sm text-slate-500 mt-1 font-medium">
          Start building kinder, lasting habits
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-3.5">
        {/* Name Field */}
        <div>
          <label
            htmlFor="name"
            className="block text-xs font-semibold text-navy-900 mb-1"
          >
            Full name
          </label>
          <input
            id="name"
            type="text"
            autoComplete="name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (errors.name) setErrors((prev) => ({ ...prev, name: '' }));
            }}
            placeholder="Jane Doe"
            className={`w-full bg-cream-50/70 text-navy-900 placeholder:text-slate-400 text-sm rounded-btn border p-2.5 transition-all duration-150 outline-none focus:outline-none ${
              errors.name
                ? 'border-rose-400 focus:ring-2 focus:ring-rose-200'
                : 'border-border-soft hover:border-slate-300 focus:border-navy-900 focus:bg-white focus:ring-2 focus:ring-navy-900/10'
            }`}
          />
          {errors.name && (
            <p className="text-xs text-rose-500 font-medium mt-1">{errors.name}</p>
          )}
        </div>

        {/* Email Field */}
        <div>
          <label
            htmlFor="email"
            className="block text-xs font-semibold text-navy-900 mb-1"
          >
            Email address
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (errors.email) setErrors((prev) => ({ ...prev, email: '' }));
            }}
            placeholder="you@example.com"
            className={`w-full bg-cream-50/70 text-navy-900 placeholder:text-slate-400 text-sm rounded-btn border p-2.5 transition-all duration-150 outline-none focus:outline-none ${
              errors.email
                ? 'border-rose-400 focus:ring-2 focus:ring-rose-200'
                : 'border-border-soft hover:border-slate-300 focus:border-navy-900 focus:bg-white focus:ring-2 focus:ring-navy-900/10'
            }`}
          />
          {errors.email && (
            <p className="text-xs text-rose-500 font-medium mt-1">{errors.email}</p>
          )}
        </div>

        {/* Password Field */}
        <div>
          <label
            htmlFor="password"
            className="block text-xs font-semibold text-navy-900 mb-1"
          >
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errors.password) setErrors((prev) => ({ ...prev, password: '' }));
              }}
              placeholder="At least 8 characters"
              className={`w-full bg-cream-50/70 text-navy-900 placeholder:text-slate-400 text-sm rounded-btn border p-2.5 pr-11 transition-all duration-150 outline-none focus:outline-none ${
                errors.password
                  ? 'border-rose-400 focus:ring-2 focus:ring-rose-200'
                  : 'border-border-soft hover:border-slate-300 focus:border-navy-900 focus:bg-white focus:ring-2 focus:ring-navy-900/10'
              }`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-navy-900 transition-colors p-1"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
          {errors.password && (
            <p className="text-xs text-rose-500 font-medium mt-1">{errors.password}</p>
          )}
        </div>

        {/* Timezone Select */}
        <div>
          <label
            htmlFor="timezone"
            className="block text-xs font-semibold text-navy-900 mb-1"
          >
            Your time zone
          </label>
          <div className="relative">
            <select
              id="timezone"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full appearance-none bg-cream-50/70 text-navy-900 text-sm rounded-btn border border-border-soft hover:border-slate-300 focus:border-navy-900 focus:bg-white focus:ring-2 focus:ring-navy-900/10 transition-all duration-150 p-2.5 pr-10 outline-hidden"
            >
              {availableTimezones.map((tz) => (
                <option key={tz} value={tz}>
                  {tz.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
              <ChevronDown className="w-4 h-4" />
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Streaks & midnight resets calculate based on this time zone.
          </p>
        </div>

        {/* Create Account Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-[#0B1635] hover:bg-[#12214D] text-white font-semibold text-sm rounded-xl py-3 px-4 shadow-md transition-all duration-150 active:scale-[0.99] disabled:opacity-60 flex items-center justify-center gap-2 mt-3"
        >
          {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
          <span>Create account</span>
        </button>
      </form>

      {/* Footer Link */}
      <p className="text-xs text-center text-slate-500 font-medium pt-1">
        Already have an account?{' '}
        <Link
          href="/login"
          className="font-bold text-navy-900 hover:text-brand-blue transition-colors"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
