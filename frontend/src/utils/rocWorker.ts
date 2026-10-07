import {
  parseResultsCsv,
  computeMethodRocPr,
  computeFullBenchmarkCurves,
  type RocPrResult,
} from "./rocCalculator";

export async function processCsvInWorker(csvText: string): Promise<RocPrResult> {
  // Check if Worker & Blob are available (browser environment)
  if (typeof window !== "undefined" && typeof Worker !== "undefined" && typeof Blob !== "undefined") {
    try {
      const workerCode = `
        ${parseResultsCsv.toString()}
        ${computeMethodRocPr.toString()}
        ${computeFullBenchmarkCurves.toString()}

        self.onmessage = function(e) {
          try {
            const rows = parseResultsCsv(e.data);
            const result = computeFullBenchmarkCurves(rows);
            self.postMessage({ success: true, result });
          } catch(err) {
            self.postMessage({ success: false, error: err.message });
          }
        };
      `;

      const blob = new Blob([workerCode], { type: "application/javascript" });
      const workerUrl = URL.createObjectURL(blob);
      const worker = new Worker(workerUrl);

      return new Promise<RocPrResult>((resolve, reject) => {
        worker.onmessage = (e) => {
          URL.revokeObjectURL(workerUrl);
          worker.terminate();
          if (e.data.success) {
            resolve(e.data.result);
          } else {
            reject(new Error(e.data.error));
          }
        };

        worker.onerror = (_err) => {
          URL.revokeObjectURL(workerUrl);
          worker.terminate();
          // Fallback to main thread
          const rows = parseResultsCsv(csvText);
          resolve(computeFullBenchmarkCurves(rows));
        };

        worker.postMessage(csvText);
      });
    } catch {
      // Fallback to synchronous calculation
      const rows = parseResultsCsv(csvText);
      return computeFullBenchmarkCurves(rows);
    }
  }

  // Fallback for Node/JSDOM test environments
  const rows = parseResultsCsv(csvText);
  return computeFullBenchmarkCurves(rows);
}
