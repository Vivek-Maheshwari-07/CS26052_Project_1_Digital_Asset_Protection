/**
 * Download Request Service
 * Handles peer image download authorization, approvals, and denials.
 */
import { mockDelay, USE_MOCK } from './api';
import { mockDownloadRequests } from '../data/mockData';

let currentRequests = [...mockDownloadRequests];

export const downloadRequestService = {
  async getRequests() {
    if (USE_MOCK) {
      await mockDelay(300);
      return [...currentRequests];
    }
    // Remote endpoint: GET /api/download-requests
  },

  async requestDownload(payload) {
    if (USE_MOCK) {
      await mockDelay(400);
      const newReq = {
        id: `req_dl_${Date.now()}`,
        requesterName: payload.requesterName || 'Alex Vance',
        requesterEmail: payload.requesterEmail || 'alex.vance@studioaurora.ai',
        requesterAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
        assetId: payload.assetId,
        assetTitle: payload.assetTitle,
        assetThumbnail: payload.assetThumbnail,
        requestedAt: new Date().toISOString(),
        purpose: payload.purpose,
        licenseRequested: payload.licenseRequested || 'Editorial / Personal',
        status: 'Pending'
      };
      currentRequests.unshift(newReq);
      return newReq;
    }
    // Remote endpoint: POST /api/download-requests
  },

  async approveRequest(requestId) {
    if (USE_MOCK) {
      await mockDelay(350);
      currentRequests = currentRequests.map(r => 
        r.id === requestId ? { ...r, status: 'Approved' } : r
      );
      return { ok: true, message: 'Request approved. Download key dispatched to requester.' };
    }
    // Remote endpoint: POST /api/download-requests/:id/approve
  },

  async denyRequest(requestId, reason = '') {
    if (USE_MOCK) {
      await mockDelay(350);
      currentRequests = currentRequests.map(r => 
        r.id === requestId ? { ...r, status: 'Denied', denialReason: reason } : r
      );
      return { ok: true, message: 'Request denied.' };
    }
    // Remote endpoint: POST /api/download-requests/:id/deny
  }
};

export default downloadRequestService;
