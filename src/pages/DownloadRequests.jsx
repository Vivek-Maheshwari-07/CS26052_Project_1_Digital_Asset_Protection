import React, { useState, useEffect } from 'react';
import {
  Download,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  ShieldCheck,
  FileText
} from 'lucide-react';
import downloadRequestService from '../services/downloadRequestService';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Dialog from '../components/ui/Dialog';
import { useToast } from '../context/ToastContext';

export const DownloadRequests = () => {
  const toast = useToast();
  const [requests, setRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Dialog states
  const [activeDialog, setActiveDialog] = useState(null); // { type: 'approve' | 'deny', request: req }
  const [denyReason, setDenyReason] = useState('');
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  const fetchRequests = async () => {
    setIsLoading(true);
    try {
      const data = await downloadRequestService.getRequests();
      setRequests(data || []);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleApprove = async () => {
    if (!activeDialog?.request) return;
    setIsProcessingAction(true);
    try {
      await downloadRequestService.approveRequest(activeDialog.request.id);
      toast.success(
        'Request Approved',
        `Download access granted to ${activeDialog.request.requesterName}.`
      );
      setRequests((prev) =>
        prev.map((r) => (r.id === activeDialog.request.id ? { ...r, status: 'Approved' } : r))
      );
      setActiveDialog(null);
    } catch (err) {
      toast.error('Approval Error', err.message);
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleDeny = async () => {
    if (!activeDialog?.request) return;
    setIsProcessingAction(true);
    try {
      await downloadRequestService.denyRequest(activeDialog.request.id, denyReason);
      toast.info('Request Denied', `Download request from ${activeDialog.request.requesterName} was denied.`);
      setRequests((prev) =>
        prev.map((r) => (r.id === activeDialog.request.id ? { ...r, status: 'Denied' } : r))
      );
      setActiveDialog(null);
      setDenyReason('');
    } catch (err) {
      toast.error('Denial Error', err.message);
    } finally {
      setIsProcessingAction(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="space-y-2 pb-6 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Badge variant="cyan" size="sm" icon={Download}>
            Permission Management
          </Badge>
          <span className="text-xs text-slate-400 font-mono">
            {requests.filter((r) => r.status === 'Pending').length} Pending Requests
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Image Download Requests
        </h1>
        <p className="text-xs sm:text-sm text-slate-400">
          Public visitors must request creator authorization to download full-resolution master files. Approve or deny access below.
        </p>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-32 rounded-2xl bg-slate-900/60 animate-pulse" />
          ))}
        </div>
      ) : requests.length === 0 ? (
        <div className="text-center p-12 bg-slate-900/40 rounded-3xl border border-slate-800 space-y-3">
          <Download className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-white">No Download Requests</h3>
          <p className="text-xs text-slate-400">All pending authorization requests have been handled.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {requests.map((req) => (
            <div
              key={req.id}
              className="p-5 sm:p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-4 shadow-xl"
            >
              {/* Top Row: Requester info & Asset Thumbnail */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <img
                    src={req.requesterAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80'}
                    alt={req.requesterName}
                    className="w-10 h-10 rounded-full object-cover ring-2 ring-cyan-500/30 shrink-0"
                  />
                  <div>
                    <h4 className="text-sm font-bold text-white">{req.requesterName}</h4>
                    <p className="text-xs text-slate-400">{req.requesterEmail}</p>
                    <span className="text-[10px] text-slate-500 font-mono">
                      Requested {new Date(req.requestedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-950 border border-slate-800 sm:self-start">
                  <img
                    src={req.assetThumbnail}
                    alt={req.assetTitle}
                    className="w-10 h-10 rounded-lg object-cover ring-1 ring-slate-700 shrink-0"
                  />
                  <div className="min-w-0 max-w-[180px]">
                    <span className="text-[10px] uppercase font-mono text-slate-500 block truncate">Target Asset</span>
                    <p className="text-xs font-semibold text-white truncate">{req.assetTitle}</p>
                  </div>
                </div>
              </div>

              {/* Purpose Box */}
              <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800/80 space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-300">Intended Purpose:</span>
                  <Badge variant={req.status === 'Approved' ? 'success' : req.status === 'Denied' ? 'danger' : 'warning'} size="xs">
                    {req.status}
                  </Badge>
                </div>
                <p className="text-slate-300 leading-relaxed">{req.purpose}</p>
                <div className="flex items-center gap-1.5 pt-1 text-[11px] font-mono text-cyan-400">
                  <span>License Category: {req.licenseRequested}</span>
                </div>
              </div>

              {/* Action Buttons */}
              {req.status === 'Pending' && (
                <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveDialog({ type: 'deny', request: req })}
                  >
                    Deny Request
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    icon={CheckCircle2}
                    onClick={() => setActiveDialog({ type: 'approve', request: req })}
                  >
                    Approve & Issue Access Key
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Confirmation Dialog: Approve */}
      <Dialog
        isOpen={activeDialog?.type === 'approve'}
        onClose={() => setActiveDialog(null)}
        onConfirm={handleApprove}
        type="success"
        title="Authorize Download"
        description={`Grant high-resolution master file download access to ${activeDialog?.request?.requesterName}? An encrypted authorization key will be issued.`}
        confirmText="Approve Access"
        isLoading={isProcessingAction}
      />

      {/* Confirmation Dialog: Deny */}
      <Dialog
        isOpen={activeDialog?.type === 'deny'}
        onClose={() => setActiveDialog(null)}
        onConfirm={handleDeny}
        type="danger"
        title="Deny Download Request"
        description={`Are you sure you want to decline the download request from ${activeDialog?.request?.requesterName}?`}
        confirmText="Confirm Denial"
        isLoading={isProcessingAction}
      >
        <div className="w-full text-left my-2">
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
            Optional Reason (Visible to requester)
          </label>
          <input
            type="text"
            value={denyReason}
            onChange={(e) => setDenyReason(e.target.value)}
            placeholder="e.g. Asset not available for commercial reuse"
            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none"
          />
        </div>
      </Dialog>
    </div>
  );
};

export default DownloadRequests;
