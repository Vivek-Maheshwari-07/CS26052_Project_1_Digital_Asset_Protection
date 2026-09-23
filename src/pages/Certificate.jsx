import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Award, ShieldCheck } from 'lucide-react';
import certificateService from '../services/certificateService';
import CertificatePreview from '../components/certificate/CertificatePreview';
import Button from '../components/ui/Button';

export const Certificate = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [certificate, setCertificate] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCertificate = async () => {
      setIsLoading(true);
      try {
        const data = await certificateService.getCertificateById(id);
        setCertificate(data);
      } finally {
        setIsLoading(false);
      }
    };
    fetchCertificate();
  }, [id]);

  if (isLoading || !certificate) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-400 font-mono">Loading Cryptographic Certificate...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto py-4">
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        <span className="text-xs font-mono text-slate-400">
          Certificate ID: <span className="text-cyan-400 font-bold">{certificate.certificateId}</span>
        </span>
      </div>

      <CertificatePreview certificate={certificate} />
    </div>
  );
};

export default Certificate;
