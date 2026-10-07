import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { getHealth } from "../api/client";
import type { HealthResponse } from "../api/types";
import { useTheme } from "../context/useTheme";

export const Navbar: React.FC = () => {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [healthStatus, setHealthStatus] = useState<"ok" | "degraded" | "unreachable">("ok");

  useEffect(() => {
    let mounted = true;

    const checkHealth = async () => {
      try {
        const data = await getHealth();
        if (!mounted) return;
        setHealth(data);
        if (data.status === "ok" && data.database === "ok") {
          setHealthStatus("ok");
        } else {
          setHealthStatus("degraded");
        }
      } catch {
        if (!mounted) return;
        setHealth(null);
        setHealthStatus("unreachable");
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const navItems = [
    { path: "/register", label: "Register" },
    { path: "/verify", label: "Verify" },
    { path: "/evidence", label: "Evidence", matchPrefix: "/evidence" },
    { path: "/results", label: "Results" },
  ];

  const getDotColor = () => {
    switch (healthStatus) {
      case "ok":
        return "bg-emerald-500 shadow-emerald-500/50";
      case "degraded":
        return "bg-amber-500 shadow-amber-500/50";
      case "unreachable":
        return "bg-rose-500 shadow-rose-500/50";
    }
  };

  const getHealthTitle = () => {
    if (!health) return "Backend: Unreachable";
    return `Backend: ${health.status.toUpperCase()} | DB: ${health.database} | Models: CLIP ${health.models_loaded.clip ? "✓" : "✗"}, DINO ${health.models_loaded.dino ? "✓" : "✗"} (${health.device}) | Images: ${health.registered_images ?? 0}`;
  };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand / Logo */}
        <div className="flex items-center space-x-3">
          <Link to="/register" className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-lg tracking-wider">
              P
            </div>
            <span className="font-semibold text-lg tracking-tight text-slate-900 dark:text-slate-100">
              ProvNet
            </span>
          </Link>
          <span className="text-xs px-2 py-0.5 rounded font-mono bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
            v2026.10-1
          </span>
        </div>

        {/* Navigation Links */}
        <nav className="flex items-center space-x-1 sm:space-x-2">
          {navItems.map((item) => {
            const isActive = item.matchPrefix
              ? location.pathname.startsWith(item.matchPrefix)
              : location.pathname === item.path;

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`px-3.5 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 font-semibold"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Right tools: Health dot + Theme switch */}
        <div className="flex items-center space-x-4">
          {/* Health indicator */}
          <div
            className="flex items-center space-x-2 cursor-help px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
            title={getHealthTitle()}
          >
            <span
              className={`w-2.5 h-2.5 rounded-full ${getDotColor()} shadow-sm animate-pulse`}
            />
            <span className="capitalize font-mono text-[11px] text-slate-600 dark:text-slate-300">
              {healthStatus}
            </span>
          </div>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {theme === "light" ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 3v1m0 16v1m9-9h-1M4 9H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
