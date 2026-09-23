import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Layers,
  Lock,
  Cpu
} from 'lucide-react';
import assetService from '../services/assetService';
import ImageUploader from '../components/upload/ImageUploader';
import ProcessingSteps from '../components/upload/ProcessingSteps';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../hooks/useAuth';

export const Register = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();

  const [currentStep, setCurrentStep] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pipelineStepIndex, setPipelineStepIndex] = useState(1);

  // Form State
  const [imageData, setImageData] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [creator, setCreator] = useState(user?.name || 'Alex Vance');
  const [category, setCategory] = useState('Digital 3D & Generative');
  const [license, setLicense] = useState('CC-BY-NC-ND-4.0');
  const [visibility, setVisibility] = useState('Public Registry');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState(['Generative', 'Digital Art']);

  const pipelineStages = [
    { label: 'Uploading High-Resolution File', detail: 'Transmitting binary payload to secure enclave...' },
    { label: 'Extracting Perceptual Hashes', detail: 'Computing pHash, aHash, dHash, and WHash matrices...' },
    { label: 'Generating Semantic Embeddings', detail: 'Running CLIP ViT-B/32 & DINOv2 ViT-L/14 inference...' },
    { label: 'Querying Registry Vector Store', detail: 'Checking pgvector index against 140,000+ records for collisions...' },
    { label: 'Cryptographic Sealing & Timestamping', detail: 'Creating SHA-256 integrity digest and block timestamp...' },
    { label: 'Minting Provenance Certificate', detail: 'Generating verifiable PDF certificate and digital seal...' }
  ];

  const handleAddTag = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const trimmed = tagInput.trim().replace(/^#/, '');
      if (trimmed && !tags.includes(trimmed)) {
        setTags([...tags, trimmed]);
        setTagInput('');
      }
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleNext = () => {
    if (currentStep === 1) {
      if (!imageData) {
        toast.warning('Image Required', 'Please upload an image before proceeding.');
        return;
      }
      if (!title) {
        setTitle(imageData.file?.name?.replace(/\.[^/.]+$/, '') || 'Untitled Artwork');
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (!title.trim()) {
        toast.warning('Title Required', 'Please provide a title for your asset.');
        return;
      }
      setCurrentStep(3);
    }
  };

  const handleRegisterSubmit = async () => {
    setIsProcessing(true);
    try {
      const registeredResult = await assetService.registerAsset(
        {
          title,
          description,
          creator,
          category,
          license,
          visibility,
          tags,
          previewUrl: imageData.previewUrl,
          fileSize: imageData.fileSize,
          dimensions: imageData.dimensions,
          format: imageData.format
        },
        (stageIndex) => {
          setPipelineStepIndex(stageIndex);
        }
      );

      toast.success('Asset Sealed', 'Provenance record created successfully.');
      navigate('/register/result', { state: { registeredAsset: registeredResult } });
    } catch (err) {
      toast.error('Registration Failed', err.message);
      setIsProcessing(false);
    }
  };

  if (isProcessing) {
    return (
      <div className="py-12 px-4">
        <ProcessingSteps
          steps={pipelineStages}
          currentStepIndex={pipelineStepIndex}
          title="Sealing Image Provenance..."
          subtitle="Extracting perceptual hashes and dense vector embeddings through the FastAPI pipeline."
        />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="space-y-2 text-center sm:text-left">
        <div className="flex items-center justify-center sm:justify-start gap-2">
          <Badge variant="cyan" size="sm" icon={ShieldCheck}>
            Registry Enclave
          </Badge>
          <span className="text-xs text-slate-400 font-mono">Step {currentStep} of 3</span>
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">
          Register Original Work
        </h1>
        <p className="text-xs sm:text-sm text-slate-400">
          Create an immutable cryptographic provenance record with dual-pipeline perceptual and semantic fingerprints.
        </p>
      </div>

      {/* Stepper Wizard Bar */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4 p-1.5 bg-slate-900/80 rounded-2xl border border-slate-800">
        <div
          className={`flex items-center justify-center sm:justify-start gap-2.5 p-3 rounded-xl transition-all ${
            currentStep === 1
              ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-500/20'
              : currentStep > 1
              ? 'bg-slate-800/80 text-emerald-400 font-semibold'
              : 'text-slate-500'
          }`}
        >
          <div className="w-6 h-6 rounded-full bg-black/30 flex items-center justify-center text-xs font-mono">
            {currentStep > 1 ? '✓' : '1'}
          </div>
          <span className="text-xs hidden sm:inline">Upload Image</span>
        </div>

        <div
          className={`flex items-center justify-center sm:justify-start gap-2.5 p-3 rounded-xl transition-all ${
            currentStep === 2
              ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-500/20'
              : currentStep > 2
              ? 'bg-slate-800/80 text-emerald-400 font-semibold'
              : 'text-slate-500'
          }`}
        >
          <div className="w-6 h-6 rounded-full bg-black/30 flex items-center justify-center text-xs font-mono">
            {currentStep > 2 ? '✓' : '2'}
          </div>
          <span className="text-xs hidden sm:inline">Asset Metadata</span>
        </div>

        <div
          className={`flex items-center justify-center sm:justify-start gap-2.5 p-3 rounded-xl transition-all ${
            currentStep === 3
              ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-500/20'
              : 'text-slate-500'
          }`}
        >
          <div className="w-6 h-6 rounded-full bg-black/30 flex items-center justify-center text-xs font-mono">
            3
          </div>
          <span className="text-xs hidden sm:inline">Review & Seal</span>
        </div>
      </div>

      {/* Step 1: Upload Image */}
      {currentStep === 1 && (
        <div className="space-y-6 p-6 sm:p-8 rounded-3xl bg-slate-900/60 border border-slate-800">
          <ImageUploader
            selectedFile={imageData}
            previewUrl={imageData?.previewUrl}
            onImageSelected={(data) => setImageData(data)}
            onClear={() => setImageData(null)}
            title="Upload Original High-Resolution Image"
            description="Drag & drop your original master file. We accept PNG, JPEG, WEBP, and TIFF formats."
          />

          <div className="flex justify-end pt-4 border-t border-slate-800">
            <Button
              variant="glow"
              onClick={handleNext}
              disabled={!imageData}
              icon={ArrowRight}
              iconPosition="right"
            >
              Continue to Metadata
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Asset Metadata */}
      {currentStep === 2 && (
        <div className="space-y-6 p-6 sm:p-8 rounded-3xl bg-slate-900/60 border border-slate-800">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Artwork / Image Title <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Cybernetic Monolith in Neon Fog"
                required
                className="w-full px-4 py-2.5 bg-slate-950/80 border border-slate-800 focus:border-cyan-500 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 font-sans"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Description & Artistic Context
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detail the creation technique, optics, generative prompt, or composition details..."
                className="w-full px-4 py-2.5 bg-slate-950/80 border border-slate-800 focus:border-cyan-500 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 font-sans"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Creator / Legal Owner
              </label>
              <input
                type="text"
                value={creator}
                onChange={(e) => setCreator(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-950/80 border border-slate-800 focus:border-cyan-500 rounded-xl text-sm text-slate-100 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Primary Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl text-sm text-slate-100 focus:outline-none"
              >
                <option value="Digital 3D & Generative">Digital 3D & Generative</option>
                <option value="Astrophotography">Astrophotography</option>
                <option value="Macro & Experimental">Macro & Experimental</option>
                <option value="Architecture & Geometry">Architecture & Geometry</option>
                <option value="Scientific Visualization">Scientific Visualization</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Licensing Framework
              </label>
              <select
                value={license}
                onChange={(e) => setLicense(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl text-sm text-slate-100 focus:outline-none"
              >
                <option value="CC-BY-NC-ND-4.0">Creative Commons (CC-BY-NC-ND-4.0)</option>
                <option value="CC-BY-4.0">Creative Commons Attribution (CC-BY-4.0)</option>
                <option value="All Rights Reserved (Commercial)">All Rights Reserved (Commercial Protection)</option>
                <option value="Editorial Only">Editorial Licensing Only</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Registry Visibility
              </label>
              <select
                value={visibility}
                onChange={(e) => setVisibility(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl text-sm text-slate-100 focus:outline-none"
              >
                <option value="Public Registry">Public Registry (Listed in Gallery)</option>
                <option value="Unlisted Enclave">Unlisted (Verifiable via ID only)</option>
                <option value="Private Seal">Private Seal (Protected for Owner only)</option>
              </select>
            </div>

            {/* Tags Input */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Descriptive Tags (Press Enter)
              </label>
              <div className="flex flex-wrap gap-2 p-2 bg-slate-950/80 border border-slate-800 rounded-xl focus-within:border-cyan-500">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-950/70 border border-blue-500/30 text-xs text-cyan-300 font-mono"
                  >
                    #{tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="text-slate-400 hover:text-white"
                    >
                      ×
                    </button>
                  </span>
                ))}
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleAddTag}
                  placeholder="Add tag and press Enter..."
                  className="flex-1 min-w-[140px] bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center pt-4 border-t border-slate-800">
            <Button variant="outline" onClick={() => setCurrentStep(1)} icon={ArrowLeft}>
              Back
            </Button>
            <Button variant="glow" onClick={handleNext} icon={ArrowRight} iconPosition="right">
              Review & Seal
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Review & Seal */}
      {currentStep === 3 && (
        <div className="space-y-6 p-6 sm:p-8 rounded-3xl bg-slate-900/60 border border-slate-800">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            <div className="lg:col-span-5">
              <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-black border border-slate-800 shadow-xl">
                <img
                  src={imageData?.previewUrl}
                  alt={title}
                  className="w-full h-full object-contain"
                />
                <div className="absolute top-2.5 left-2.5">
                  <Badge variant="cyan" size="xs">
                    Ready to Index
                  </Badge>
                </div>
              </div>
            </div>

            <div className="lg:col-span-7 space-y-4">
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Title:</span>
                  <span className="font-bold text-white">{title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Creator:</span>
                  <span className="font-semibold text-cyan-300">{creator}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Dimensions & Format:</span>
                  <span className="font-mono text-slate-300">{imageData?.dimensions} • {imageData?.format}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">File Size:</span>
                  <span className="font-mono text-slate-300">{imageData?.fileSize}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">License:</span>
                  <span className="text-slate-300">{license}</span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-blue-950/30 border border-blue-500/30 text-xs text-blue-200 flex items-start gap-2.5">
                <Cpu className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
                <span>
                  The system will generate perceptual fingerprints (pHash, aHash, dHash, WHash) and deep semantic embeddings (CLIP & DINOv2) through the FastAPI neural backend.
                </span>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center pt-4 border-t border-slate-800">
            <Button variant="outline" onClick={() => setCurrentStep(2)} icon={ArrowLeft}>
              Back
            </Button>
            <Button
              variant="primary"
              size="lg"
              onClick={handleRegisterSubmit}
              icon={ShieldCheck}
            >
              Seal & Register Provenance
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Register;
