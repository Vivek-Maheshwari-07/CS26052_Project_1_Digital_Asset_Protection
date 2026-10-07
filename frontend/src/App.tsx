import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Navbar } from "./components/Navbar";
import { QueryImageProvider } from "./context/QueryImageContext";
import { ThemeProvider } from "./context/ThemeContext";
import { PlaceholderPage } from "./pages/PlaceholderPage";
import { RegisterPage } from "./pages/RegisterPage";
import { VerifyPage } from "./pages/VerifyPage";

export function AppContent() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors">
      <Navbar />
      <main className="flex-1 pb-16">
        <Routes>
          <Route path="/" element={<Navigate to="/register" replace />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/verify" element={<VerifyPage />} />
          <Route
            path="/evidence"
            element={
              <PlaceholderPage
                title="Evidence & Deep Inspection View"
                description="Inspect detailed localized similarity heatmaps, embedding vectors, and trigger on-demand cosine distance re-evaluations."
              />
            }
          />
          <Route
            path="/evidence/:verificationId"
            element={
              <PlaceholderPage
                title="Evidence & Deep Inspection View"
                description="Inspect detailed localized similarity heatmaps, embedding vectors, and trigger on-demand cosine distance re-evaluations."
              />
            }
          />
          <Route
            path="/results"
            element={
              <PlaceholderPage
                title="Benchmark Results Dashboard"
                description="Interactive multi-method benchmark analysis, ROC curves, recall matrices, and master results CSV exports."
              />
            }
          />
          <Route path="*" element={<Navigate to="/register" replace />} />
        </Routes>
      </main>
      <footer className="border-t border-slate-200 dark:border-slate-800 py-6 text-center text-xs text-slate-500 dark:text-slate-400">
        ProvNet Digital Asset Protection System · Research & Evaluation Suite
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
