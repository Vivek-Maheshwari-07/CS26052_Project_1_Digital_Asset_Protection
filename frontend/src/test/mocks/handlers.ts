import { http, HttpResponse } from 'msw';
import register201 from '../../../../backend/tests/fixtures/spec_examples/register_201.json';
import register409 from '../../../../backend/tests/fixtures/spec_examples/register_409.json';
import verifyHashExit from '../../../../backend/tests/fixtures/spec_examples/verify_hash_exit.json';
import verifyEscalated from '../../../../backend/tests/fixtures/spec_examples/verify_escalated.json';
import healthData from '../../../../backend/tests/fixtures/spec_examples/health.json';
import imageDetail from '../../../../backend/tests/fixtures/spec_examples/image_detail.json';
import benchmarkSummary from '../../../../backend/tests/fixtures/spec_examples/benchmark_summary.json';

export const handlers = [
  http.get('/api/health', () => {
    return HttpResponse.json(healthData);
  }),

  http.post('/api/register', async ({ request }) => {
    let isConflict = false;
    try {
      const rawText = await request.clone().text();
      if (rawText.includes('conflict')) {
        isConflict = true;
      }
    } catch {
      // fallback
    }

    if (isConflict) {
      return HttpResponse.json(register409, { status: 409 });
    }
    return HttpResponse.json(register201, { status: 201 });
  }),

  http.post('/api/verify', async ({ request }) => {
    let isEscalated = false;
    try {
      const rawText = await request.clone().text();
      if (rawText.includes('escalated')) {
        isEscalated = true;
      }
    } catch {
      // fallback
    }

    if (isEscalated) {
      return HttpResponse.json(verifyEscalated, { status: 200 });
    }
    return HttpResponse.json(verifyHashExit, { status: 200 });
  }),

  http.get('/api/images/:id', () => {
    return HttpResponse.json(imageDetail);
  }),

  http.get('/api/images/:id/record', () => {
    return HttpResponse.json({
      record_type: 'provnet.registration_record',
      record_version: '1',
      image_id: '7c1e9a52-3b44-4f0e-8d2a-5e6f7a8b9c01',
      owner_name: 'Aarav Mehta',
      owner_name_verified: false,
      registered_at: '2026-10-04T09:12:44Z',
      issued_at: '2026-10-04T09:12:44Z',
      sha256: '9f2b5c0e1a7d4e3f8b6a2c9d0e1f4a5b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f',
      sha256_scope: 'original_upload_bytes',
      width: 3024,
      height: 4032,
      source_format: 'JPEG',
      low_detail: false,
      fingerprints: {
        phash: 'c3a1f0e4b2d59687',
        dhash: '8e0f1c3e7c7e3c18',
        ahash: 'ffe7c38181c3e7ff',
        whash: 'ffc3818181c3e7ff',
      },
      models: {
        clip: 'openai/clip-vit-base-patch32',
        dino: 'facebook/dinov2-base',
        config_version: '2026.10-1',
      },
      file_url: '/api/images/7c1e9a52-3b44-4f0e-8d2a-5e6f7a8b9c01/file',
      record_url: '/api/images/7c1e9a52-3b44-4f0e-8d2a-5e6f7a8b9c01/record',
      disclaimer: 'This Registration Record attests only that an image with the fingerprints above was submitted to ProvNet.',
    });
  }),

  http.get('/api/benchmark/summary', () => {
    return HttpResponse.json(benchmarkSummary);
  }),
];
