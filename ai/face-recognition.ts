/**
 * Face recognition — browser-side wrapper around face-api.js.
 *
 * Models are served from /public/models. Run `npm run setup:models`
 * (or follow README) to download them.
 *
 * USAGE:
 *   1) await loadFaceModels();
 *   2) const result = await detectFace(videoElement);
 *      // result.descriptor is a 128-dim Float32Array
 *   3) Send result.descriptor to backend (as Array.from(...)) for matching.
 */
'use client';

// face-api.js does not officially type its exports cleanly, so we
// import via dynamic require to avoid bundler issues with `tfjs-node`.

let faceapi: typeof import('face-api.js') | null = null;
let modelsLoaded = false;
let loadingPromise: Promise<void> | null = null;

async function getFaceApi() {
  if (!faceapi) {
    faceapi = await import('face-api.js');
  }
  return faceapi;
}

const MODEL_URL = '/models';

export async function loadFaceModels(): Promise<void> {
  if (modelsLoaded) return;
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    const api = await getFaceApi();
    await Promise.all([
      api.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      api.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      api.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    ]);
    modelsLoaded = true;
  })();

  return loadingPromise;
}

export interface DetectedFace {
  descriptor: Float32Array;
  box: { x: number; y: number; width: number; height: number };
  score: number;
}

/** Detect a single face + 128-dim descriptor in the input source. */
export async function detectSingleFace(
  input: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement,
): Promise<DetectedFace | null> {
  if (!modelsLoaded) await loadFaceModels();
  const api = await getFaceApi();

  const result = await api
    .detectSingleFace(input, new api.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.5 }))
    .withFaceLandmarks()
    .withFaceDescriptor();

  if (!result) return null;

  const { box, score } = result.detection;
  return {
    descriptor: result.descriptor,
    box: { x: box.x, y: box.y, width: box.width, height: box.height },
    score,
  };
}

/** Detect every face in the source — useful for group attendance scans. */
export async function detectAllFaces(
  input: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement,
): Promise<DetectedFace[]> {
  if (!modelsLoaded) await loadFaceModels();
  const api = await getFaceApi();

  const results = await api
    .detectAllFaces(input, new api.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.5 }))
    .withFaceLandmarks()
    .withFaceDescriptors();

  return results.map((r) => ({
    descriptor: r.descriptor,
    box: { x: r.detection.box.x, y: r.detection.box.y, width: r.detection.box.width, height: r.detection.box.height },
    score: r.detection.score,
  }));
}

/** Extract a descriptor from an image element (used during student enrollment). */
export async function descriptorFromImage(img: HTMLImageElement): Promise<Float32Array | null> {
  const result = await detectSingleFace(img);
  return result?.descriptor ?? null;
}

/** Convert a Float32Array descriptor to a plain JSON-friendly array. */
export function descriptorToArray(d: Float32Array): number[] {
  return Array.from(d);
}
