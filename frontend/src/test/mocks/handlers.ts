import { http, HttpResponse } from 'msw';
import register201 from '../../../../backend/tests/fixtures/spec_examples/register_201.json';
import register409 from '../../../../backend/tests/fixtures/spec_examples/register_409.json';
import verifyHashExit from '../../../../backend/tests/fixtures/spec_examples/verify_hash_exit.json';
import verifyEscalated from '../../../../backend/tests/fixtures/spec_examples/verify_escalated.json';
import healthData from '../../../../backend/tests/fixtures/spec_examples/health.json';
import imageDetail from '../../../../backend/tests/fixtures/spec_examples/image_detail.json';
import benchmarkSummary from '../../../../backend/tests/fixtures/spec_examples/benchmark_summary.json';

export const sampleCsvData = `run_id,split,category,original_id,query_file,transform,strength,is_true_copy,method,score,score_kind,latency_ms,created_at
run_1,test,identity,img_1,query_1.png,none,none,True,phash,2,distance,0.4,2026-10-01T00:00:00Z
run_1,test,identity,img_1,query_1.png,none,none,True,dhash,1,distance,0.3,2026-10-01T00:00:00Z
run_1,test,identity,img_1,query_1.png,none,none,True,ahash,0,distance,0.2,2026-10-01T00:00:00Z
run_1,test,identity,img_1,query_1.png,none,none,True,whash,1,distance,0.5,2026-10-01T00:00:00Z
run_1,test,identity,img_1,query_1.png,none,none,True,clip,0.98,cosine,12.0,2026-10-01T00:00:00Z
run_1,test,identity,img_1,query_1.png,none,none,True,dino,0.99,cosine,15.0,2026-10-01T00:00:00Z
run_1,test,hard_negative,img_1,query_neg.png,none,none,False,phash,34,distance,0.4,2026-10-01T00:00:00Z
run_1,test,hard_negative,img_1,query_neg.png,none,none,False,dhash,28,distance,0.3,2026-10-01T00:00:00Z
run_1,test,hard_negative,img_1,query_neg.png,none,none,False,ahash,30,distance,0.2,2026-10-01T00:00:00Z
run_1,test,hard_negative,img_1,query_neg.png,none,none,False,whash,32,distance,0.5,2026-10-01T00:00:00Z
run_1,test,hard_negative,img_1,query_neg.png,none,none,False,clip,0.42,cosine,12.0,2026-10-01T00:00:00Z
run_1,test,hard_negative,img_1,query_neg.png,none,none,False,dino,0.35,cosine,15.0,2026-10-01T00:00:00Z
`;

export const handlers = [
  http.get('/api/health', () => {
    return HttpResponse.json(healthData);
  }),

  http.post('/api/register', async ({ request }) => {
    let isConflict = false;
    const headerFilename = request.headers.get('x-filename') || '';
    if (headerFilename.includes('conflict')) {
      isConflict = true;
    }

    try {
      const formData = await request.formData();
      const file = formData.get('file');
      const owner = formData.get('owner_name');
      if (
        (file && typeof file === 'object' && 'name' in file && (file as File).name.includes('conflict')) ||
        (typeof file === 'string' && file.includes('conflict')) ||
        (typeof owner === 'string' && owner.includes('conflict'))
      ) {
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
    const headerFilename = request.headers.get('x-filename') || '';
    if (headerFilename.includes('escalated')) {
      isEscalated = true;
    }

    try {
      const formData = await request.formData();
      const file = formData.get('file');
      if (
        (file && typeof file === 'object' && 'name' in file && (file as File).name.includes('escalated')) ||
        (typeof file === 'string' && file.includes('escalated'))
      ) {
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
    const headerFilename = request.headers.get('x-filename') || '';
    if (headerFilename.includes('deep_error')) {
      isDeepError = true;
    }

    try {
      const formData = await request.formData();
      const file = formData.get('file');
      if (
        (file && typeof file === 'object' && 'name' in file && (file as File).name.includes('deep_error')) ||
        (typeof file === 'string' && file.includes('deep_error'))
      ) {
        isDeepError = true;
      }
    } catch {
      // fallback
    }

    if (isDeepError) {
      return HttpResponse.json(
        { error: 'inference_error', message: 'Inference pipeline busy' },
        { status: 500 }
      );
    }

    return HttpResponse.json({
      verification_id: 'b3f1c2e4-6a0d-4d6e-9f31-2c7a8e5d1a90',
      candidates: [
        {
          image_id: '7c1e9a52-3b44-4f0e-8d2a-5e6f7a8b9c01',
          cosine: {
            dino: 0.9654,
            clip: 0.9412,
          },
        },
      ],
    });
  }),

  http.get('/api/images/:id/record', () => {
    return HttpResponse.json({
      ...imageDetail,
      record_type: 'provnet.registration_record',
    });
  }),

  http.get('/api/images/:id', () => {
    return HttpResponse.json(imageDetail);
  }),

  http.get('/api/benchmark/runs', () => {
    return HttpResponse.json([
      { run_id: 'run_2026_10_01_001', created_at: '2026-10-01T12:00:00Z' },
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
