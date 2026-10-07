import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { getHealth } from "../api/client";
import type { HealthResponse } from "../api/types";
import { useTheme } from "../context/useTheme";
import { Shield, Menu, X, Sun, Moon } from "lucide-react";

export const Navbar: React.FC = () => {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [healthStatus, setHealthStatus] = useState<"ok" | "degraded" | "unreachable">("ok");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    let mounted = true;

    const checkHealth = async () => {
      try {
        const data = await getHealth();
        if (!mounted) return;
        setHealth(data);
        if (data.status === "ok") {
          setHealthStatus("ok");
        } else {
          setHealthStatus("degraded");
        }
      } catch {
        if (!mounted) return;
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
    { name: "Register", path: "/register" },
    { name: "Verify", path: "/verify" },
    { name: "Evidence", path: "/evidence" },
    { name: "Results", path: "/results" },
  ];

  const getHealthDotColor = () => {
    switch (healthStatus) {
      case "ok":
        return "bg-[var(--apple-success)]";
      case "degraded":
        return "bg-[var(--apple-warning)]";
      case "unreachable":
      default:
        return "bg-[var(--apple-danger)]";
    }
  };

  const getHealthTooltip = () => {
    switch (healthStatus) {
      case "ok":
        return `ProvNet Backend OK (${health?.device || "online"})`;
      case "degraded":
        return `ProvNet Backend Degraded (${health?.status || "issues"})`;
      case "unreachable":
      default:
        return "ProvNet Backend Unreachable";
    }
  };

  return (
    <nav className="sticky top-0 z-40 material-navbar w-full">
      <div className="max-w-[1080px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand Logo & Title */}
        <div className="flex items-center space-x-3">
          <Link
            to="/register"
            className="flex items-center space-x-2 text-[var(--apple-label)] apple-focus rounded-lg p-1"
          >
            <div className="w-8 h-8 rounded-[9px] bg-[var(--apple-accent)] text-white flex items-center justify-center shadow-sm">
              <Shield className="w-4 h-4 stroke-[1.75]" />
            </div>
            <div className="flex flex-col">
              <span className="text-headline font-bold tracking-tight">ProvNet</span>
              <span className="text-[10px] text-[var(--apple-secondary-label)] -mt-1 font-medium tracking-wide">
                RESEARCH SUITE
              </span>
            </div>
          </Link>
        </div>

        {/* Desktop Nav Items */}
        <div className="hidden sm:flex items-center space-x-1">
          {navItems.map((item) => {
            const isActive =
              location.pathname === item.path ||
              (item.path === "/evidence" && location.pathname.startsWith("/evidence"));
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`px-3.5 py-1.5 rounded-[10px] text-subheadline font-medium transition-colors apple-focus ${
                  isActive
                    ? "bg-[var(--apple-grouped-background)] text-[var(--apple-label)] font-semibold"
                    : "text-[var(--apple-secondary-label)] hover:text-[var(--apple-label)] hover:bg-[var(--apple-grouped-background)]"
                }`}
              >
                {item.name}
              </Link>
            );
          })}
        </div>

        {/* Right Tools: Health Dot, Theme Toggle, Mobile Menu Trigger */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Health Status Dot */}
          <div
            className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-[var(--apple-grouped-background)] border border-[var(--apple-separator)]"
            title={getHealthTooltip()}
          >
            <span
              data-testid="health-dot"
              className={`w-2 h-2 rounded-full ${getHealthDotColor()} animate-pulse`}
            />
            <span className="text-caption font-medium text-[var(--apple-secondary-label)] hidden md:inline capitalize">
              {healthStatus}
            </span>
          </div>

          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            aria-label="Toggle color theme"
            className="p-2 rounded-[10px] text-[var(--apple-secondary-label)] hover:text-[var(--apple-label)] hover:bg-[var(--apple-grouped-background)] apple-focus cursor-pointer transition-colors"
          >
            {theme === "dark" ? (
              <Sun className="w-4 h-4 stroke-[1.75]" />
            ) : (
              <Moon className="w-4 h-4 stroke-[1.75]" />
            )}
          </button>

          {/* Mobile Menu Hamburger Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
            className="sm:hidden p-2 rounded-[10px] text-[var(--apple-secondary-label)] hover:text-[var(--apple-label)] hover:bg-[var(--apple-grouped-background)] apple-focus cursor-pointer"
          >
            {mobileMenuOpen ? (
              <X className="w-5 h-5 stroke-[1.75]" />
            ) : (
              <Menu className="w-5 h-5 stroke-[1.75]" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Sheet Drawer (Below 640px) */}
      {mobileMenuOpen && (
        <div className="sm:hidden material-modal hairline-b px-4 py-3 space-y-1 animate-fadeIn">
          {navItems.map((item) => {
            const isActive =
              location.pathname === item.path ||
              (item.path === "/evidence" && location.pathname.startsWith("/evidence"));
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center justify-between px-3 py-2.5 rounded-[10px] text-body font-medium transition-colors ${
                  isActive
                    ? "bg-[var(--apple-grouped-background)] text-[var(--apple-accent)] font-semibold"
                    : "text-[var(--apple-label)] hover:bg-[var(--apple-grouped-background)]"
                }`}
              >
                <span>{item.name}</span>
                {isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--apple-accent)]" />
                )}
              </Link>
            );
          })}
        </div>
      )}
    </nav>
  );
};
