import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Navbar } from "./components/Navbar";
import { QueryImageProvider } from "./context/QueryImageContext";
import { ThemeProvider } from "./context/ThemeContext";
import { RegisterPage } from "./pages/RegisterPage";
import { VerifyPage } from "./pages/VerifyPage";
import { EvidencePage } from "./pages/EvidencePage";
import { ResultsDashboardPage } from "./pages/ResultsDashboardPage";

export function AppContent() {
  return (
    <div className="min-h-screen bg-[var(--apple-background)] text-[var(--apple-label)] flex flex-col font-sans transition-colors">
      <Navbar />
      <main className="flex-1 pb-16">
        <Routes>
          <Route path="/" element={<Navigate to="/register" replace />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/verify" element={<VerifyPage />} />
          <Route path="/evidence" element={<EvidencePage />} />
          <Route path="/evidence/:verificationId" element={<EvidencePage />} />
          <Route path="/results" element={<ResultsDashboardPage />} />
          <Route path="*" element={<Navigate to="/register" replace />} />
        </Routes>
      </main>
      <footer className="hairline-t py-6 text-center text-caption text-[var(--apple-secondary-label)] bg-[var(--apple-grouped-background)]">
        ProvNet Digital Asset Protection System · Academic Research & Evaluation Suite
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
