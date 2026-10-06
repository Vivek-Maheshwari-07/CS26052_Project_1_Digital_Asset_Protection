import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, Home } from 'lucide-react';
import Button from '../components/ui/Button';

export const NotFound = () => {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4 space-y-6">
      <div className="p-4 rounded-3xl bg-slate-900/80 border border-slate-800 text-rose-400 shadow-2xl">
        <ShieldAlert className="w-12 h-12" />
      </div>

      <div className="space-y-2">
        <h1 className="text-4xl font-extrabold text-white tracking-tight">404 - Record Not Found</h1>
        <p className="text-sm text-slate-400 max-w-md mx-auto">
          The requested route or provenance record could not be located in the registry enclave.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <Link to="/">
          <Button variant="outline" size="sm" icon={Home}>
            Return to Landing
          </Button>
        </Link>
        <Link to="/dashboard">
          <Button variant="primary" size="sm">
            Creator Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
