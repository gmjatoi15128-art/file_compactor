import { PDFDocument } from 'pdf-lib';
import JSZip from 'jszip';

import type { CompressionGoal } from './compression';
import type { FileCompressionResult } from './compression';

function outputName(fileName: string) {
  const stem = fileName.replace(/\.[^/.]+$/, '') || 'compacted-file';
  const extension = fileName.split('.').pop()?.toLowerCase() || 'bin';
  return `${stem}-compacted.${extension}`;
}

function resultFor(
  file: File,
  blob: Blob,
  qualityLabel: string,
  dimensions: string,
  verified: boolean,
  notice?: string,
): FileCompressionResult {
  return {
    blob,
    fileName: outputName(file.name),
    size: blob.size,
    originalSize: file.size,
    savedPercent: Math.max(0, ((file.size - blob.size) / file.size) * 100),
    qualityLabel,
    dimensions,
    verified,
    notice,
  };
}

async function verifyPdf(blob: Blob, expectedPages: number) {
  const parsed = await PDFDocument.load(await blob.arrayBuffer());
  const pageCount = parsed.getPageCount();
  if (pageCount !== expectedPages) {
    throw new Error('The compressed PDF changed its page count, so the original file was kept.');
  }
}

export async function compressPdfFile(
  file: File,
  goal: CompressionGoal,
  targetSizeMb?: number,
): Promise<FileCompressionResult> {
  if (goal === 'target' && (!targetSizeMb || targetSizeMb <= 0)) {
    throw new Error('Enter a target size greater than 0 MB.');
  }

  const source = await PDFDocument.load(await file.arrayBuffer());
  const pageCount = source.getPageCount();
  const bytes = await source.save({
    useObjectStreams: true,
    addDefaultPage: false,
    updateFieldAppearances: false,
  });
  const safeBytes = new Uint8Array(bytes.byteLength);
  safeBytes.set(bytes);
  const candidate = new Blob([safeBytes.buffer], { type: 'application/pdf' });
  const targetBytes = targetSizeMb ? targetSizeMb * 1024 * 1024 : undefined;
  await verifyPdf(candidate, pageCount);

  const qualityLabel =
    goal === 'quality' ? 'Structure optimized' :
      goal === 'smallest' ? 'Maximum structure optimization' :
        goal === 'target' ? 'Best verified result' :
          'Balanced structure optimization';

  if (candidate.size >= file.size) {
    return resultFor(
      file,
      file.slice(0, file.size, 'application/pdf'),
      'Already optimized',
      `${pageCount} page${pageCount === 1 ? '' : 's'}`,
      true,
      'This PDF is already highly optimized. We kept the original because a smaller verified result was not available.',
    );
  }

  const notice = targetBytes && candidate.size > targetBytes
    ? `We couldn't reach ${targetSizeMb} MB without changing the document structure. Best verified result kept.`
    : undefined;

  return resultFor(
    file,
    candidate,
    qualityLabel,
    `${pageCount} page${pageCount === 1 ? '' : 's'}`,
    true,
    notice,
  );
}

async function verifyOfficePackage(blob: Blob) {
  const parsed = await JSZip.loadAsync(await blob.arrayBuffer());
  if (!parsed.file('[Content_Types].xml')) {
    throw new Error('The compressed document package could not be verified, so the original file was kept.');
  }
}

export async function compressOfficeFile(
  file: File,
  goal: CompressionGoal,
  targetSizeMb?: number,
): Promise<FileCompressionResult> {
  if (goal === 'target' && (!targetSizeMb || targetSizeMb <= 0)) {
    throw new Error('Enter a target size greater than 0 MB.');
  }

  const source = await JSZip.loadAsync(await file.arrayBuffer());
  if (!source.file('[Content_Types].xml')) {
    throw new Error('This does not look like a valid Office document package.');
  }

  const levels = goal === 'target' ? [3, 6, 9] : [
    goal === 'quality' ? 3 : goal === 'smallest' ? 9 : 6,
  ];
  const targetBytes = targetSizeMb ? targetSizeMb * 1024 * 1024 : undefined;
  let selected: Blob | undefined;

  for (const level of levels) {
    const candidate = await source.generateAsync({
      type: 'blob',
      mimeType: file.type || 'application/octet-stream',
      compression: 'DEFLATE',
      compressionOptions: { level },
    });
    selected = candidate;
    if (targetBytes && candidate.size <= targetBytes) break;
  }

  if (!selected) {
    throw new Error('The Office document could not be safely packaged.');
  }
  await verifyOfficePackage(selected);

  if (selected.size >= file.size) {
    return resultFor(
      file,
      file.slice(0, file.size, file.type || 'application/octet-stream'),
      'Already optimized',
      'Office package verified',
      true,
      'This document is already highly optimized. We kept the original because repackaging would not make it smaller.',
    );
  }

  const notice = targetBytes && selected.size > targetBytes
    ? `We couldn't reach ${targetSizeMb} MB without degrading document contents. Best verified result kept.`
    : undefined;

  return resultFor(file, selected, goal === 'smallest' ? 'Maximum package compression' : 'Lossless package re-encode', 'Office package verified', true, notice);
}