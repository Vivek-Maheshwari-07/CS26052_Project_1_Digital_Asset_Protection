import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  UploadCloud,
  Cpu,
  Fingerprint,
  Layers,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  Database
} from 'lucide-react';
import verificationService from '../services/verificationService';
import ImageUploader from '../components/upload/ImageUploader';
import ProcessingSteps from '../components/upload/ProcessingSteps';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { useToast } from '../context/ToastContext';

export const Verify = () => {
  const navigate = useNavigate();
  const toast = useToast();

  const [imageData, setImageData] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [pipelineStepIndex, setPipelineStepIndex] = useState(1);

  const verificationStages = [
    { label: 'Uploading Query Image', detail: 'Preparing image for similarity analysis...' },
    { label: 'Extracting Perceptual Hashes', detail: 'Computing frequency and gradient hash fingerprints...' },
    { label: 'Generating Semantic Embeddings', detail: 'Extracting high-level visual features with CLIP and DINOv2...' },
    { label: 'Searching Image Registry', detail: 'Comparing embeddings against registered assets in the database...' },
    { label: 'Analyzing Similarity Scores', detail: 'Calculating perceptual Hamming distance and cosine similarity...' },
    { label: 'Ranking Potential Matches', detail: 'Applying weighted scoring to identify original source works...' },
    { label: 'Generating Verification Summary', detail: 'Checking for potential cropping, compression, or alterations...' }
  ];

  const handleStartVerification = async () => {
    if (!imageData) {
      toast.warning('Image Required', 'Please upload a suspicious image to verify.');
      return;
    }

    setIsVerifying(true);
    try {
      const results = await verificationService.verifyImage(
        imageData.file,
        (stageIndex) => {
          setPipelineStepIndex(stageIndex);
        }
      );

      toast.success('Forensic Analysis Complete', 'Ranked matching results generated.');
      navigate('/verify/results', { state: { results, queryImage: imageData.previewUrl } });
    } catch (err) {
      toast.error('Verification Error', err.message);
      setIsVerifying(false);
    }
  };

  if (isVerifying) {
    return (
      <div className="py-12 px-4">
        <ProcessingSteps
          steps={verificationStages}
          currentStepIndex={pipelineStepIndex}
          title="Executing Forensic Search..."
          subtitle="Cross-referencing 140,000+ registered works with dual perceptual and neural models."
        />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center sm:text-left space-y-2">
        <div className="flex items-center justify-center sm:justify-start gap-2">
          <Badge variant="cyan" size="sm" icon={Search}>
            Image Verification
          </Badge>
          <span className="text-xs text-slate-400 font-mono">Dual-Pipeline Verification</span>
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">
          Verify an Image
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 max-w-2xl">
          Upload a suspicious, cropped, or modified image to cross-examine the global provenance registry using perceptual hashing and deep vision models.
        </p>
      </div>

      {/* Upload Box */}
      <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/60 border border-slate-800 shadow-xl space-y-6">
        <ImageUploader
          selectedFile={imageData}
          previewUrl={imageData?.previewUrl}
          onImageSelected={(data) => setImageData(data)}
          onClear={() => setImageData(null)}
          title="Upload Suspicious or Query Image"
          description="Drag & drop any JPEG, PNG, WEBP, or TIFF file to inspect against registered provenance originals."
        />

        {/* Informative Forensic Enclave Notice */}
        <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="flex items-start gap-2.5">
            <Fingerprint className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-slate-200">Perceptual Hashing</p>
              <p className="text-[11px] text-slate-400 leading-snug">Calculates Hamming distance for spatial & frequency modifications.</p>
            </div>
          </div>
          <div className="flex items-start gap-2.5">
            <Cpu className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-slate-200">Semantic Embeddings</p>
              <p className="text-[11px] text-slate-400 leading-snug">CLIP and DINOv2 cosine similarity for stylistic & semantic matching.</p>
            </div>
          </div>
          <div className="flex items-start gap-2.5">
            <Database className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-slate-200">Vector Search</p>
              <p className="text-[11px] text-slate-400 leading-snug">Sub-second pgvector index search over 140,000+ sealed records.</p>
            </div>
          </div>
        </div>

        {/* Start Verification Action Button */}
        <div className="flex justify-end pt-4 border-t border-slate-800">
          <Button
            variant="glow"
            size="lg"
            onClick={handleStartVerification}
            disabled={!imageData}
            icon={Search}
          >
            Start Verification Analysis
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Verify;
