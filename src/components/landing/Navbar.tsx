'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Menu, X, ArrowRight } from 'lucide-react';

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      const navOffset = 70;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - navOffset;
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      });
    }
  };

  return (
    <header
      id="navbar"
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-white/80 backdrop-blur-md shadow-sm border-b border-white/60 py-3.5'
          : 'bg-transparent py-5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {/* Logo & Brand Name */}
          <Link
            href="/"
            className="flex items-center gap-2.5 group"
            id="nav-logo-link"
          >
            <div className="w-9 h-9 relative flex items-center justify-center transition-transform group-hover:scale-105">
              <img
                src="/images/logo.png"
                alt="StreakKeeper flame logo"
                className="w-full h-full object-contain drop-shadow-[0_2px_8px_rgba(59,130,246,0.3)]"
              />
            </div>
            <span className="text-xl font-bold tracking-tight text-[#0B1635]">
              StreakKeeper
            </span>
          </Link>

          {/* Center Navigation Links (Desktop) */}
          <nav className="hidden md:flex items-center gap-8">
            <a
              href="#home"
              onClick={(e) => scrollToSection(e, 'home')}
              className="text-sm font-semibold text-[#0B1635] hover:text-blue-600 transition-colors relative py-1 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-blue-600 after:rounded-full after:opacity-100"
              id="nav-link-home"
            >
              Home
            </a>
            <a
              href="#features"
              onClick={(e) => scrollToSection(e, 'features')}
              className="text-sm font-medium text-slate-600 hover:text-[#0B1635] transition-colors py-1"
              id="nav-link-features"
            >
              Features
            </a>
            <a
              href="#about"
              onClick={(e) => scrollToSection(e, 'about')}
              className="text-sm font-medium text-slate-600 hover:text-[#0B1635] transition-colors py-1"
              id="nav-link-about"
            >
              About
            </a>
          </nav>

          {/* Right Action Buttons (Desktop) */}
          <div className="hidden md:flex items-center gap-5">
            <Link
              href="/login"
              id="nav-login-btn"
              className="text-sm font-semibold text-slate-700 hover:text-[#0B1635] transition-colors px-2 py-1.5"
            >
              Log In
            </Link>
            <Link
              href="/register"
              id="nav-get-started-btn"
              className="inline-flex items-center gap-1.5 bg-[#0B1635] hover:bg-[#14234b] text-white px-5 py-2.5 rounded-xl font-medium text-sm shadow-md shadow-navy-950/10 hover:shadow-lg hover:-translate-y-0.5 transition-all active:translate-y-0"
            >
              <span>Get Started</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            id="mobile-menu-toggle"
            aria-label="Toggle Navigation Menu"
            className="md:hidden p-2 rounded-xl text-slate-700 hover:text-navy-950 hover:bg-white/60 transition-colors"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer / Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white/95 backdrop-blur-xl border-b border-slate-200/80 px-6 py-5 shadow-xl transition-all">
          <div className="flex flex-col gap-4">
            <a
              href="#home"
              onClick={(e) => scrollToSection(e, 'home')}
              className="text-base font-semibold text-navy-950 py-1"
            >
              Home
            </a>
            <a
              href="#features"
              onClick={(e) => scrollToSection(e, 'features')}
              className="text-base font-medium text-slate-600 hover:text-navy-950 py-1"
            >
              Features
            </a>
            <a
              href="#about"
              onClick={(e) => scrollToSection(e, 'about')}
              className="text-base font-medium text-slate-600 hover:text-navy-950 py-1"
            >
              About
            </a>

            <div className="pt-3 border-t border-slate-100 flex flex-col gap-3">
              <Link
                href="/login"
                className="w-full text-center py-2.5 font-semibold text-slate-700 hover:text-navy-950 rounded-xl bg-slate-50 border border-slate-200"
              >
                Log In
              </Link>
              <Link
                href="/register"
                className="w-full flex items-center justify-center gap-1.5 bg-[#0B1635] text-white py-3 rounded-xl font-medium shadow-md"
              >
                <span>Get Started</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
