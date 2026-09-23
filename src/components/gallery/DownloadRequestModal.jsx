import React, { useState } from 'react';
import { Download, ShieldCheck, Send, AlertCircle } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import downloadRequestService from '../../services/downloadRequestService';
import { useToast } from '../../context/ToastContext';

export const DownloadRequestModal = ({ asset, isOpen, onClose }) => {
  const toast = useToast();
  const [purpose, setPurpose] = useState('');
  const [licenseType, setLicenseType] = useState('Editorial / Academic');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!asset) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!purpose.trim()) {
      toast.warning('Purpose Required', 'Please specify the intended purpose for requesting this asset.');
      return;
    }

    setIsSubmitting(true);
    try {
      await downloadRequestService.requestDownload({
        assetId: asset.id,
        assetTitle: asset.title,
        assetThumbnail: asset.thumbnailUrl || asset.imageUrl,
        purpose,
        licenseRequested: licenseType
      });

      toast.success(
        'Request Dispatched',
        `Your download request for "${asset.title}" has been sent to creator ${asset.creator}.`
      );
      setPurpose('');
      onClose();
    } catch (err) {
      toast.error('Request Failed', err.message || 'Could not submit request');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-lg" title="Request Image Download">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Asset summary bar */}
        <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-900/80 border border-slate-800">
          <img
            src={asset.thumbnailUrl || asset.imageUrl}
            alt={asset.title}
            className="w-14 h-14 rounded-lg object-cover ring-1 ring-slate-700 shrink-0"
          />
          <div className="min-w-0">
            <h4 className="text-sm font-semibold text-white truncate">{asset.title}</h4>
            <p className="text-xs text-slate-400">Creator: {asset.creator}</p>
            <span className="text-[10px] text-cyan-400 font-mono">ID: {asset.id}</span>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
            Intended Usage / License Type
          </label>
          <select
            value={licenseType}
            onChange={(e) => setLicenseType(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 focus:border-cyan-500 rounded-xl text-xs sm:text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          >
            <option value="Editorial / Academic">Editorial / Academic Citation</option>
            <option value="Non-Commercial Creative Reference">Non-Commercial Creative Reference</option>
            <option value="Commercial Editorial Publishing">Commercial Editorial Publishing</option>
            <option value="Forensic / Academic Research">Forensic / Security Research</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
            Purpose & Project Details <span className="text-rose-400">*</span>
          </label>
          <textarea
            rows={3}
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            placeholder="Explain where and how this high-resolution image will be used..."
            required
            className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 focus:border-cyan-500 rounded-xl text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 font-sans"
          />
        </div>

        <div className="p-3 rounded-xl bg-blue-950/40 border border-blue-500/30 flex items-start gap-2.5 text-xs text-blue-200">
          <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <span>
            The creator will review your request in their dashboard. Once approved, you will receive a secure high-resolution download link.
          </span>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" className="flex-1" isLoading={isSubmitting} icon={Send}>
            Submit Request
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default DownloadRequestModal;
