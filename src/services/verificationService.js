/**
 * Verification & Forensic Service
 * Handles suspicious image submission, dual-pipeline comparison, and evidence retrieval.
 */
import { mockDelay, USE_MOCK } from './api';
import { mockVerificationResults } from '../data/mockData';

export const verificationService = {
  async verifyImage(file, onProgress) {
    if (USE_MOCK) {
      // Step 1: Uploading
      if (onProgress) onProgress(1, 'Uploading image for similarity analysis...');
      await mockDelay(600);

      // Step 2: Extracting perceptual fingerprints
      if (onProgress) onProgress(2, 'Extracting perceptual hashes (pHash, aHash, dHash, WHash)...');
      await mockDelay(700);

      // Step 3: Generating semantic embeddings
      if (onProgress) onProgress(3, 'Generating visual embeddings with CLIP and DINOv2...');
      await mockDelay(800);

      // Step 4: Searching registry
      if (onProgress) onProgress(4, 'Searching registered provenance assets...');
      await mockDelay(700);

      // Step 5: Calculating similarity
      if (onProgress) onProgress(5, 'Calculating Hamming distance and cosine similarities...');
      await mockDelay(600);

      // Step 6: Ranking matches
      if (onProgress) onProgress(6, 'Ranking potential match candidates...');
      await mockDelay(500);

      // Step 7: Generating evidence
      if (onProgress) onProgress(7, 'Generating verification summary and match metrics...');
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
  }
};

export default verificationService;
