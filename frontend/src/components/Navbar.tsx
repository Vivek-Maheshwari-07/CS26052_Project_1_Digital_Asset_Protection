import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Menu,
  X,
  Volume2,
  VolumeX,
  Palette,
} from "lucide-react";
import { FingerprintIcon } from "./ui/Seal";
import { isSoundEnabled, setSoundEnabled, playTick } from "../utils/sound";

export const Navbar: React.FC = () => {
  const location = useLocation();
  const [healthOk, setHealthOk] = useState<boolean | null>(null);
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    const stored = localStorage.getItem("provnet_theme");
    if (stored) return stored === "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });
  const [soundOn, setSoundOn] = useState<boolean>(() => isSoundEnabled());
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Health poll every 30s
  useEffect(() => {
    let isMounted = true;
    const checkHealth = async () => {
      try {
        const res = await fetch("/api/health");
        if (isMounted) {
          setHealthOk(res.ok);
        }
      } catch {
        if (isMounted) {
          setHealthOk(false);
        }
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Theme change
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
      document.documentElement.setAttribute("data-theme", "dark");
      localStorage.setItem("provnet_theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.setAttribute("data-theme", "paper");
      localStorage.setItem("provnet_theme", "paper");
    }
  }, [isDark]);

  const toggleTheme = () => {
    playTick();
    setIsDark((prev) => !prev);
  };

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    setSoundEnabled(next);
    if (next) {
      setTimeout(() => playTick(), 50);
    }
  };

  const navLinks = [
    { to: "/verify", label: "Verify" },
    { to: "/register", label: "Register" },
    { to: "/results", label: "Results" },
  ];

  return (
    <>
      <header className="fixed top-3 inset-x-4 max-w-[1080px] mx-auto z-50">
        <nav
          className="flex items-center justify-between px-5 h-14 bg-(--paper)/92 backdrop-blur-md border border-(--rule) rounded-full shadow-md transition-colors duration-200"
          aria-label="Primary Navigation"
        >
          {/* Brand Wordmark with Blinking Underscore */}
          <Link
            to="/verify"
            onClick={() => playTick()}
            className="flex items-center gap-2 text-(--ink) no-underline group select-none"
            aria-label="ProvNet Home"
          >
            <div className="w-8 h-8 rounded-full bg-(--ink) text-(--paper) flex items-center justify-center shrink-0">
              <FingerprintIcon size={18} />
            </div>
            <span className="font-display text-[22px] tracking-tight font-normal text-(--ink)">
              ProvNet
              <span className="font-mono text-(--cobalt) font-bold animate-pulse inline-block ml-0.5">
                _
              </span>
            </span>
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden sm:flex items-center gap-1">
            {navLinks.map((link) => {
              const isActive =
                location.pathname === link.to ||
                (link.to === "/verify" && location.pathname.startsWith("/evidence"));
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => playTick()}
                  className={`px-3.5 py-1.5 rounded-full font-mono text-[13px] font-bold tracking-wider uppercase transition-colors duration-150 no-underline ${
                    isActive
                      ? "bg-(--ink) text-(--paper)"
                      : "text-(--ink-soft) hover:text-(--ink) hover:bg-(--paper-2)"
                  }`}
                  aria-current={isActive ? "page" : undefined}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>

          {/* Controls: Health + Palette + Sound + Mobile Menu */}
          <div className="flex items-center gap-2">
            {/* Health Dot */}
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 bg-(--paper-2) border border-(--rule) rounded-full font-mono text-[11px] font-bold"
              title={healthOk ? "Backend Online" : "Backend Offline / Connecting"}
              aria-label={healthOk ? "Backend Online" : "Backend Offline"}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  healthOk === true
                    ? "bg-(--sage)"
                    : healthOk === false
                    ? "bg-(--vermilion)"
                    : "bg-(--ochre) animate-pulse"
                }`}
                aria-hidden="true"
              />
              <span className="text-(--ink-soft) uppercase hidden md:inline">
                {healthOk ? "OK" : "SYS"}
              </span>
            </div>

            {/* Sound Toggle */}
            <button
              type="button"
              onClick={toggleSound}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-(--paper-2) border border-(--rule) text-(--ink) hover:bg-(--paper-2)/80 transition-colors"
              title={soundOn ? "Sound on (click to mute)" : "Sound off (click to unmute)"}
              aria-label={soundOn ? "Sound on" : "Sound off"}
            >
              {soundOn ? (
                <Volume2 size={16} strokeWidth={2} className="text-(--cobalt)" />
              ) : (
                <VolumeX size={16} strokeWidth={2} className="text-(--ink-soft)" />
              )}
            </button>

            {/* Palette Theme Button */}
            <button
              type="button"
              onClick={toggleTheme}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-(--paper-2) border border-(--rule) text-(--ink) hover:bg-(--paper-2)/80 transition-colors"
              title={`Switch to ${isDark ? "Paper" : "Ink"} mode`}
              aria-label={`Switch to ${isDark ? "Paper" : "Ink"} mode`}
            >
              <Palette size={16} strokeWidth={2} className="text-(--ochre)" />
            </button>

            {/* Mobile Menu Button (<640px) */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="sm:hidden w-9 h-9 flex items-center justify-center rounded-full bg-(--paper-2) border border-(--rule) text-(--ink) hover:bg-(--paper-2)/80 transition-colors"
              aria-label="Open navigation menu"
              aria-expanded={mobileMenuOpen}
            >
              <Menu size={18} strokeWidth={2} />
            </button>
          </div>
        </nav>
      </header>

      {/* Mobile Menu Sheet Drawer */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-50 bg-(--ink)/60 backdrop-blur-xs flex flex-col justify-end sm:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Mobile Navigation Menu"
        >
          <div className="bg-(--paper) rounded-t-3xl p-6 border-t border-(--rule) shadow-2xl animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between mb-6 pb-3 border-b border-(--rule)">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-(--ink) text-(--paper) flex items-center justify-center">
                  <FingerprintIcon size={16} />
                </div>
                <span className="font-display text-[20px]">ProvNet</span>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="w-9 h-9 rounded-full bg-(--paper-2) flex items-center justify-center text-(--ink)"
                aria-label="Close menu"
              >
                <X size={18} />
              </button>
            </div>

            <nav className="flex flex-col gap-2">
              {navLinks.map((link) => {
                const isActive = location.pathname === link.to;
                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    onClick={() => {
                      playTick();
                      setMobileMenuOpen(false);
                    }}
                    className={`flex items-center justify-between px-4 py-3.5 rounded-xl font-mono text-[15px] font-bold uppercase no-underline transition-colors ${
                      isActive
                        ? "bg-(--ink) text-(--paper)"
                        : "text-(--ink) hover:bg-(--paper-2)"
                    }`}
                  >
                    <span>{link.label}</span>
                    <span className="text-[12px] opacity-60">↗</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      )}
    </>
  );
};

export const FloatingHeader = Navbar;
