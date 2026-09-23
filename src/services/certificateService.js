/**
 * Provenance Certificate Service
 * Communicates with FastAPI certificate issuance and validation endpoints.
 */
import { mockDelay, USE_MOCK } from './api';
import { mockCertificates } from '../data/mockData';

export const certificateService = {
  async getCertificateById(certificateId) {
    if (USE_MOCK) {
      await mockDelay(300);
      const cert = mockCertificates[certificateId] || mockCertificates['VF-CERT-2026-0814-8821'];
      return cert;
    }
    // Remote endpoint: GET /api/certificates/:id
  },

  async downloadCertificate(certificateId) {
    if (USE_MOCK) {
      await mockDelay(400);
      // Returns download ready signal
      return { ok: true, url: `/certificates/${certificateId}.pdf` };
    }
    // Remote endpoint: GET /api/certificates/:id/download
  },

  async verifyCertificateHash(hash) {
    if (USE_MOCK) {
      await mockDelay(500);
      return {
        verified: true,
        certificateId: 'VF-CERT-2026-0814-8821',
        assetTitle: 'Cybernetic Monolith in Neon Fog',
        owner: 'Alex Vance',
        integrityStatus: 'VALID_CRYPTOGRAPHIC_SEAL'
      };
    }
    // Remote endpoint: POST /api/certificates/verify-hash
  }
};

export default certificateService;
