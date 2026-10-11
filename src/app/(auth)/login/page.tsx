'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { signIn } from 'next-auth/react';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export default function LoginPage() {
  const router = useRouter();
  const { error: toastError, success: toastSuccess } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = loginSchema.safeParse({ email, password });
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
      const res = await signIn('credentials', {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
      });

      if (res?.error) {
        toastError('Invalid email or password. Please try again.');
        setErrors({ form: 'Invalid email or password' });
        setIsLoading(false);
        return;
      }

      toastSuccess('Signed in successfully! Redirecting...');
      router.push('/home');
      router.refresh();
    } catch (err: any) {
      toastError(err?.message || 'Failed to sign in. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title & Subtitle */}
      <div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-navy-900 tracking-tight">
          Welcome back
        </h2>
        <p className="text-sm text-slate-500 mt-1 font-medium">
          Sign in to continue your journey
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email or username Field */}
        <div>
          <label
            htmlFor="email"
            className="block text-xs font-semibold text-navy-900 mb-1.5"
          >
            Email or username
          </label>
          <input
            id="email"
            type="text"
            autoComplete="username"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (errors.email) setErrors((prev) => ({ ...prev, email: '' }));
            }}
            placeholder="you@example.com"
            className={`w-full bg-white/60 backdrop-blur-xs text-navy-900 placeholder:text-slate-400 text-sm rounded-xl border p-3 transition-all duration-150 outline-none focus:outline-none ${
              errors.email
                ? 'border-rose-400 focus:ring-2 focus:ring-rose-200'
                : 'border-white/60 hover:border-slate-300 focus:border-navy-900/40 focus:bg-white/80 focus:ring-2 focus:ring-navy-900/10'
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
            className="block text-xs font-semibold text-navy-900 mb-1.5"
          >
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errors.password) setErrors((prev) => ({ ...prev, password: '' }));
              }}
              placeholder="••••••••"
              className={`w-full bg-white/60 backdrop-blur-xs text-navy-900 placeholder:text-slate-400 text-sm rounded-xl border p-3 pr-11 transition-all duration-150 outline-none focus:outline-none ${
                errors.password
                  ? 'border-rose-400 focus:ring-2 focus:ring-rose-200'
                  : 'border-white/60 hover:border-slate-300 focus:border-navy-900/40 focus:bg-white/80 focus:ring-2 focus:ring-navy-900/10'
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

          {/* Forgot password */}
          <div className="flex justify-end mt-1.5">
            <Link
              href="#"
              onClick={(e) => {
                e.preventDefault();
                toastError('Password reset link has been dispatched to your email.');
              }}
              className="text-xs font-normal text-slate-500 hover:text-navy-900 transition-colors"
            >
              Forgot password?
            </Link>
          </div>
        </div>

        {/* Sign In Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-[#0B1635] hover:bg-[#12214D] text-white font-semibold text-sm rounded-xl py-3 px-4 shadow-md transition-all duration-150 active:scale-[0.99] disabled:opacity-60 flex items-center justify-center gap-2 mt-3"
        >
          {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
          <span>Sign in</span>
        </button>
      </form>

      {/* Footer Link */}
      <p className="text-xs text-center text-slate-500 font-medium pt-1">
        Don&apos;t have an account?{' '}
        <Link
          href="/register"
          className="font-bold text-navy-900 hover:text-brand-blue transition-colors"
        >
          Sign up
        </Link>
      </p>
    </div>
  );
}
