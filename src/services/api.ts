/**
 * API service for communicating with the PhotoClean backend.
 * The backend handles AI-powered photo analysis using LLM vision models.
 */

const API_BASE = "https://aiphotoclean.com";

export interface AnalyzeRequest {
  prompt: string;
  photoUris: string[]; // base64 data URIs of photos to analyze
  photoIds: string[]; // corresponding IDs for matching results
}

export interface AnalyzeResponse {
  matchedIds: string[];
  totalAnalyzed: number;
  prompt: string;
}

/**
 * Convert a local photo URI to a base64 data URI for sending to the API.
 * On iOS, we read the photo asset and convert to base64.
 */
export async function photoToBase64(uri: string): Promise<string> {
  try {
    const response = await fetch(uri);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error("Failed to convert photo to base64:", error);
    throw error;
  }
}

/**
 * Analyze a batch of photos against a text prompt using the backend AI.
 * Sends photos in batches of 5 to avoid payload limits.
 */
export async function analyzePhotos(
  prompt: string,
  photos: { id: string; uri: string }[],
  onProgress?: (analyzed: number, total: number) => void
): Promise<string[]> {
  const BATCH_SIZE = 5;
  const matchedIds: string[] = [];
  const total = photos.length;

  for (let i = 0; i < photos.length; i += BATCH_SIZE) {
    const batch = photos.slice(i, i + BATCH_SIZE);

    // Convert batch photos to base64
    const base64Photos = await Promise.all(
      batch.map(async (photo) => {
        const base64 = await photoToBase64(photo.uri);
        return { id: photo.id, data: base64 };
      })
    );

    try {
      const response = await fetch(`${API_BASE}/api/trpc/photos.analyze`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          json: {
            prompt,
            photos: base64Photos.map((p) => ({
              id: p.id,
              imageData: p.data,
            })),
          },
        }),
      });

      if (response.ok) {
        const result = await response.json();
        const batchMatches = result?.result?.data?.json?.matchedIds || [];
        matchedIds.push(...batchMatches);
      }
    } catch (error) {
      console.error("Batch analysis failed:", error);
      // Continue with next batch even if one fails
    }

    onProgress?.(Math.min(i + BATCH_SIZE, total), total);
  }

  return matchedIds;
}

/**
 * Local AI analysis fallback using simple heuristics.
 * Used when the backend is unavailable or for basic categories.
 */
export function localAnalysis(
  prompt: string,
  photos: { id: string; filename: string; fileSize: number; width: number; height: number }[]
): string[] {
  const lowerPrompt = prompt.toLowerCase();
  const matchedIds: string[] = [];

  for (const photo of photos) {
    const filename = photo.filename.toLowerCase();
    let isMatch = false;

    // Screenshots detection
    if (lowerPrompt.includes("screenshot")) {
      if (
        filename.includes("screenshot") ||
        filename.includes("screen shot") ||
        filename.startsWith("img_") && (photo.width === 1170 || photo.width === 1284 || photo.width === 1125)
      ) {
        isMatch = true;
      }
    }

    // Small/tiny photos (likely memes or downloaded images)
    if (lowerPrompt.includes("meme") || lowerPrompt.includes("downloaded")) {
      if (photo.fileSize < 200 * 1024 && (photo.width < 1000 || photo.height < 1000)) {
        isMatch = true;
      }
    }

    // Receipts (often narrow/tall photos)
    if (lowerPrompt.includes("receipt") || lowerPrompt.includes("document") || lowerPrompt.includes("bill")) {
      if (photo.height > photo.width * 1.8 && photo.fileSize < 500 * 1024) {
        isMatch = true;
      }
    }

    // Duplicates detection by filename pattern
    if (lowerPrompt.includes("duplicate")) {
      if (filename.match(/\(\d+\)/) || filename.match(/_\d{1,2}$/)) {
        isMatch = true;
      }
    }

    if (isMatch) {
      matchedIds.push(photo.id);
    }
  }

  return matchedIds;
}
