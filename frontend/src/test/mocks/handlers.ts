import { http, HttpResponse } from 'msw';
import register201 from '../../../../backend/tests/fixtures/spec_examples/register_201.json';
import register409 from '../../../../backend/tests/fixtures/spec_examples/register_409.json';
import verifyHashExit from '../../../../backend/tests/fixtures/spec_examples/verify_hash_exit.json';
import verifyEscalated from '../../../../backend/tests/fixtures/spec_examples/verify_escalated.json';
import healthData from '../../../../backend/tests/fixtures/spec_examples/health.json';
import imageDetail from '../../../../backend/tests/fixtures/spec_examples/image_detail.json';
import benchmarkSummary from '../../../../backend/tests/fixtures/spec_examples/benchmark_summary.json';

export const sampleCsvData = `split,category,original_id,query_file,transform,strength,is_true_copy,method,score_value,score_type,latency_ms
test,identity,img_1,query_1.png,none,none,True,phash,2,hamming,0.4
test,identity,img_1,query_1.png,none,none,True,dhash,1,hamming,0.3
test,identity,img_1,query_1.png,none,none,True,ahash,0,hamming,0.2
test,identity,img_1,query_1.png,none,none,True,whash,1,hamming,0.5
test,identity,img_1,query_1.png,none,none,True,clip,0.98,cosine,12.0
test,identity,img_1,query_1.png,none,none,True,dino,0.99,cosine,15.0
test,hard_negative,img_1,query_neg.png,none,none,False,phash,34,hamming,0.4
test,hard_negative,img_1,query_neg.png,none,none,False,dhash,28,hamming,0.3
test,hard_negative,img_1,query_neg.png,none,none,False,ahash,30,hamming,0.2
test,hard_negative,img_1,query_neg.png,none,none,False,whash,32,hamming,0.5
test,hard_negative,img_1,query_neg.png,none,none,False,clip,0.42,cosine,12.0
test,hard_negative,img_1,query_neg.png,none,none,False,dino,0.35,cosine,15.0
`;

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

  http.post('/api/verify/deep', async ({ request }) => {
    let isDeepError = false;
    try {
      const rawText = await request.clone().text();
      if (rawText.includes('deep_error')) {
        isDeepError = true;
      }
    } catch {
      // fallback
    }

    if (isDeepError) {
      return HttpResponse.json(
        { error: 'busy', message: 'Inference pipeline busy' },
        { status: 503 }
      );
    }

    return HttpResponse.json({
      verification_id: 'a8f5c3d2-4e1b-4f9a-8c2d-7e3f1a5b9c02',
      decided_by: 'hash',
      query_sha256: '9f2b5c0e1a7d4e3f8b6a2c9d0e1f4a5b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f',
      thresholds: {
        dino: 0.9,
        clip: 0.9,
      },
      candidates: [
        {
          rank: 1,
          image_id: '7c1e9a52-3b44-4f0e-8d2a-5e6f7a8b9c01',
          cosine: {
            dino: 0.9654,
            clip: 0.9412,
          },
          above_threshold: {
            dino: true,
            clip: true,
          },
        },
      ],
      embedding_latency_ms: 24.5,
      latency_ms: 28.2,
    });
  }),

  http.get('/api/images/:id', () => {
    return HttpResponse.json(imageDetail);
  }),

  http.get('/api/images/:id/file', () => {
    const pngHeader = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
    return new HttpResponse(pngHeader, {
      headers: {
        'Content-Type': 'image/png',
      },
    });
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

  http.get('/api/benchmark/runs', () => {
    return HttpResponse.json([
      {
        run_id: 'bench_20261007_01',
        created_at: '2026-10-07T10:00:00Z',
        n_rows: 50,
        splits: ['test'],
      },
    ]);
  }),

  http.get('/api/benchmark/summary', () => {
    return HttpResponse.json(benchmarkSummary);
  }),

  http.get('/api/benchmark/results.csv', () => {
    return new HttpResponse(sampleCsvData, {
      headers: {
        'Content-Type': 'text/csv',
      },
    });
  }),
];
