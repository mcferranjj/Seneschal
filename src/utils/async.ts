/**
 * Async Utilities
 *
 * Generic async helpers — no React, no DB dependencies.
 */

/**
 * Process an array of items in bounded-concurrency batches.
 * Calls fn(item) for each item, running at most `concurrency` promises at a time.
 * Invokes onProgress(done, total) after each item completes.
 */
export async function runInBatches<T>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<void>,
  onProgress?: (done: number, total: number) => void,
): Promise<void> {
  let done = 0;
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    await Promise.all(
      batch.map(async item => {
        await fn(item);
        onProgress?.(++done, items.length);
      }),
    );
  }
}
