import { Suspense, lazy } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Navbar } from "./components/Navbar";
import { QueryImageProvider } from "./context/QueryImageContext";
import { ThemeProvider } from "./context/ThemeContext";
import { RegisterPage } from "./pages/RegisterPage";
import { VerifyPage } from "./pages/VerifyPage";
import { EvidencePage } from "./pages/EvidencePage";

// Code-split /results with React.lazy so Recharts is in a separate chunk
const ResultsDashboardPage = lazy(() =>
  import("./pages/ResultsDashboardPage").then((module) => ({
    default: module.ResultsDashboardPage,
  }))
);

export function AppContent() {
  return (
    <div className="min-h-screen bg-(--paper) text-(--ink) flex flex-col font-sans transition-colors overflow-x-hidden selection:bg-(--ochre)">
      <Navbar />
      <main className="flex-1 pb-16">
        <Routes>
          <Route path="/" element={<Navigate to="/verify" replace />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/verify" element={<VerifyPage />} />
          <Route path="/evidence" element={<EvidencePage />} />
          <Route path="/evidence/:verificationId" element={<EvidencePage />} />
          <Route
            path="/results"
            element={
              <Suspense
                fallback={
                  <div className="pt-32 text-center font-mono text-[14px] text-(--ink-soft) animate-pulse">
                    Loading results dashboard chunk...
                  </div>
                }
              >
                <ResultsDashboardPage />
              </Suspense>
            }
          />
          <Route path="*" element={<Navigate to="/verify" replace />} />
        </Routes>
      </main>
      <footer className="border-t border-(--rule) py-8 text-center font-mono text-[12px] text-(--ink-soft) bg-(--paper-2) flex flex-col items-center gap-1">
        <span>ProvNet Digital Asset Protection System · CEUP 301</span>
        <span className="text-[11px] opacity-75">
          Registration & hashes establish fingerprint indexes; not legal proof of ownership or copyright.
        </span>
      </footer>
    </div>
  );
}

export function App() {
  return (
    <ThemeProvider>
      <QueryImageProvider>
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </QueryImageProvider>
    </ThemeProvider>
  );
}

export default App;
