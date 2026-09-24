export type CompressionGoal = 'quality' | 'balanced' | 'smallest' | 'target';

export type FileCompressionResult = {
  blob: Blob;
  fileName: string;
  size: number;
  originalSize: number;
  savedPercent: number;
  qualityLabel: string;
  dimensions: string;
  verified: boolean;
  notice?: string;
};

export type ImageCompressionResult = FileCompressionResult;

type ImageFormat = 'jpg' | 'png' | 'webp';

const qualityForGoal: Record<Exclude<CompressionGoal, 'target'>, number> = {
  quality: 0.92,
  balanced: 0.78,
  smallest: 0.52,
};

function canvasBlob(canvas: HTMLCanvasElement, mime: string, quality?: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Your browser could not create a safe image result.'))),
      mime,
      quality,
    );
  });
}

async function decodeAndVerify(blob: Blob) {
  const bitmap = await createImageBitmap(blob);
  const dimensions = `${bitmap.width} × ${bitmap.height}`;
  bitmap.close();
  return dimensions;
}

function outputName(fileName: string, format: ImageFormat) {
  const stem = fileName.replace(/\.[^/.]+$/, '') || 'compressed-image';
  const extension = format === 'jpg' ? 'jpg' : format;
  return `${stem}-compacted.${extension}`;
}

function mimeFor(format: ImageFormat) {
  return format === 'jpg' ? 'image/jpeg' : `image/${format}`;
}

/**
 * Browser-side image compression. The source file never leaves the current tab.
 * PNG is always re-encoded losslessly; JPEG/WebP use a quality ladder.
 */
export async function compressImageFile(
  file: File,
  format: ImageFormat,
  goal: CompressionGoal,
  targetSizeMb?: number,
): Promise<FileCompressionResult> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const context = canvas.getContext('2d');
  if (!context) {
    bitmap.close();
    throw new Error('Your browser could not prepare this image safely.');
  }

  context.drawImage(bitmap, 0, 0);
  bitmap.close();

  const mime = mimeFor(format);
  const isPng = format === 'png';
  let candidates: number[] = isPng
    ? [undefined as unknown as number]
    : goal === 'target'
      ? [0.92, 0.86, 0.8, 0.74, 0.68, 0.6, 0.52, 0.44, 0.36]
      : [qualityForGoal[goal]];

  if (goal === 'target' && (!targetSizeMb || targetSizeMb <= 0)) {
    throw new Error('Enter a target size greater than 0 MB.');
  }

  const targetBytes = targetSizeMb ? targetSizeMb * 1024 * 1024 : undefined;
  const results: Array<{ blob: Blob; quality?: number }> = [];
  for (const quality of candidates) {
    const blob = await canvasBlob(canvas, mime, isPng ? undefined : quality);
    results.push({ blob, quality: isPng ? undefined : quality });
    if (targetBytes && blob.size <= targetBytes) break;
  }

  const bestQualityResult = results[0];
  const smallestResult = results[results.length - 1];
  let selected = goal === 'target'
    ? results.find((candidate) => candidate.blob.size <= targetBytes!)
    : bestQualityResult;
  let notice: string | undefined;

  if (!selected) {
    selected = smallestResult;
    notice = `We couldn't reach ${targetSizeMb} MB without pushing the image too far. This is the smallest practical result from the quality ladder.`;
  }

  if (selected.blob.size >= file.size) {
    selected = { blob: file.slice(0, file.size, file.type || mime), quality: undefined };
    notice = 'This image is already highly optimized. We kept the original because re-encoding would not make it smaller.';
  }

  const dimensions = await decodeAndVerify(selected.blob);
  const savedPercent = Math.max(0, ((file.size - selected.blob.size) / file.size) * 100);
  const qualityLabel = isPng
    ? 'Lossless re-encode'
    : selected.quality && selected.quality >= 0.86
      ? 'High quality'
      : selected.quality && selected.quality >= 0.6
        ? 'Balanced'
        : 'Maximum compression';

  return {
    blob: selected.blob,
    fileName: outputName(file.name, format),
    size: selected.blob.size,
    originalSize: file.size,
    savedPercent,
    qualityLabel,
    dimensions,
    verified: true,
    notice,
  };
}