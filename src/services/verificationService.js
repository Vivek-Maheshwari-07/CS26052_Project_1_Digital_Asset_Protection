/**
 * Verification & Forensic Service
 * Handles suspicious image submission, dual-pipeline comparison, and evidence retrieval.
 */
import { mockDelay, USE_MOCK } from './api';
import { mockVerificationResults, mockEvidenceRecords } from '../data/mockData';

export const verificationService = {
  async verifyImage(file, onProgress) {
    if (USE_MOCK) {
      // Step 1: Uploading
      if (onProgress) onProgress(1, 'Uploading query image to forensic enclave...');
      await mockDelay(600);

      // Step 2: Extracting perceptual fingerprints
      if (onProgress) onProgress(2, 'Extracting perceptual hashes (pHash, aHash, dHash, WHash)...');
      await mockDelay(700);

      // Step 3: Generating semantic embeddings
      if (onProgress) onProgress(3, 'Computing CLIP & DINOv2 dense vector embeddings...');
      await mockDelay(800);

      // Step 4: Searching registry
      if (onProgress) onProgress(4, 'Scanning 140,000+ registered provenance records via pgvector...');
      await mockDelay(700);

      // Step 5: Calculating similarity
      if (onProgress) onProgress(5, 'Calculating Hamming distances & Cosine similarities...');
      await mockDelay(600);

      // Step 6: Ranking matches
      if (onProgress) onProgress(6, 'Ranking candidate matches through dual-pipeline fusion engine...');
      await mockDelay(500);

      // Step 7: Generating evidence
      if (onProgress) onProgress(7, 'Synthesizing forensic evidence report and manipulation heuristics...');
      await mockDelay(400);

      return mockVerificationResults[0];
    }
    // Remote endpoint: POST /api/verify
  },

  async getLatestResults() {
    if (USE_MOCK) {
      await mockDelay(300);
      return mockVerificationResults[0];
    }
    // Remote endpoint: GET /api/verification/:id
  },

  async getEvidenceById(evidenceId) {
    if (USE_MOCK) {
      await mockDelay(350);
      const record = mockEvidenceRecords[evidenceId] || mockEvidenceRecords['evi_vf_882190_01'];
      return record;
    }
    // Remote endpoint: GET /api/evidence/:id
  },

  async disputeMatch(evidenceId, data) {
    if (USE_MOCK) {
      await mockDelay(400);
      return { ok: true, message: 'Dispute submitted for forensic review', disputeId: `dsp_${Date.now()}` };
    }
    // Remote endpoint: POST /api/evidence/:id/dispute
  }
};

export default verificationService;
