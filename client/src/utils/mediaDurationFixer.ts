import ysFixWebmDuration from 'fix-webm-duration';

// Normalize ESM and CJS default export interop
const fixWebmDuration = (ysFixWebmDuration as any)?.default || ysFixWebmDuration;

/**
 * In-place binary patcher for ISOBMFF / fMP4 ArrayBuffer containers.
 * Traverses top-level and nested box hierarchies without shifting byte offsets:
 * - mvhd: updates movie timescale duration
 * - tkhd: updates track timescale duration (uses mvhd timescale)
 * - mdhd: updates media timescale duration (uses track mdhd timescale)
 * - mehd: updates movie extends header fragment duration (if present)
 *
 * This resolves mobile media framework truncation (e.g. Android Stagefright,
 * TikTok, CapCut, Instagram) where zero mvhd duration causes fallback to
 * reading only the initial 5-6s MediaRecorder keyframe fragment.
 */
export function patchMp4ArrayBuffer(arrayBuffer: ArrayBuffer, durationSeconds: number): ArrayBuffer {
  const dataView = new DataView(arrayBuffer);
  const uint8 = new Uint8Array(arrayBuffer);
  const totalLen = arrayBuffer.byteLength;
  let mvhdTimescale = 1000;

  function getString(offset: number, len: number): string {
    let str = '';
    for (let i = 0; i < len; i++) {
      str += String.fromCharCode(uint8[offset + i]);
    }
    return str;
  }

  function walk(offset: number, end: number) {
    while (offset < end) {
      if (offset + 8 > end) break;
      const size = dataView.getUint32(offset, false);
      const type = getString(offset + 4, 4);

      let boxSize = size;
      let headerLen = 8;
      if (size === 1) {
        if (offset + 16 > end) break;
        boxSize = Number(dataView.getBigUint64(offset + 8, false));
        headerLen = 16;
      } else if (size === 0) {
        boxSize = end - offset;
      }

      if (boxSize < headerLen || offset + boxSize > end) break;

      if (type === 'moov' || type === 'trak' || type === 'mdia' || type === 'mvex') {
        walk(offset + headerLen, offset + boxSize);
      } else if (type === 'mvhd') {
        const v = dataView.getUint8(offset + 8);
        const timescaleOffset = v === 0 ? offset + 20 : offset + 28;
        const durationOffset = timescaleOffset + 4;
        mvhdTimescale = dataView.getUint32(timescaleOffset, false) || 1000;
        const target = Math.round(durationSeconds * mvhdTimescale);
        if (v === 0) {
          dataView.setUint32(durationOffset, target, false);
        } else {
          dataView.setBigUint64(durationOffset, BigInt(target), false);
        }
      } else if (type === 'tkhd') {
        const v = dataView.getUint8(offset + 8);
        const durationOffset = v === 0 ? offset + 28 : offset + 36;
        const target = Math.round(durationSeconds * mvhdTimescale);
        if (v === 0) {
          dataView.setUint32(durationOffset, target, false);
        } else {
          dataView.setBigUint64(durationOffset, BigInt(target), false);
        }
      } else if (type === 'mdhd') {
        const v = dataView.getUint8(offset + 8);
        const timescaleOffset = v === 0 ? offset + 20 : offset + 28;
        const durationOffset = timescaleOffset + 4;
        const trackTimescale = dataView.getUint32(timescaleOffset, false) || 1000;
        const target = Math.round(durationSeconds * trackTimescale);
        if (v === 0) {
          dataView.setUint32(durationOffset, target, false);
        } else {
          dataView.setBigUint64(durationOffset, BigInt(target), false);
        }
      } else if (type === 'mehd') {
        const v = dataView.getUint8(offset + 8);
        const durationOffset = offset + 12;
        const target = Math.round(durationSeconds * mvhdTimescale);
        if (v === 0) {
          dataView.setUint32(durationOffset, target, false);
        } else {
          dataView.setBigUint64(durationOffset, BigInt(target), false);
        }
      }

      offset += boxSize;
    }
  }

  walk(0, totalLen);
  return arrayBuffer;
}

/**
 * Universal media duration patcher.
 * Automatically handles MP4 (ISOBMFF atom patching) and WebM (EBML Duration insertion).
 */
export async function fixMediaBlobDuration(rawBlob: Blob, durationSeconds: number): Promise<Blob> {
  if (!rawBlob || rawBlob.size === 0 || !durationSeconds || durationSeconds <= 0) {
    return rawBlob;
  }

  try {
    const arrayBuffer = await rawBlob.arrayBuffer();
    const uint8 = new Uint8Array(arrayBuffer);

    // Detect WebM EBML ID (0x1A 0x45 0xDF 0xA3)
    const isWebm =
      (uint8.length >= 4 &&
        uint8[0] === 0x1a &&
        uint8[1] === 0x45 &&
        uint8[2] === 0xdf &&
        uint8[3] === 0xa3) ||
      (rawBlob.type || '').toLowerCase().includes('webm');

    if (isWebm) {
      if (typeof fixWebmDuration === 'function') {
        return await new Promise<Blob>((resolve) => {
          fixWebmDuration(
            rawBlob,
            Math.round(durationSeconds * 1000),
            (fixedBlob: Blob) => {
              resolve(fixedBlob);
            },
            { logger: false }
          );
        });
      }
      return rawBlob;
    }

    // Default or MP4 / ISOBMFF container patch
    const patchedBuffer = patchMp4ArrayBuffer(arrayBuffer, durationSeconds);
    return new Blob([patchedBuffer], { type: rawBlob.type || 'video/mp4' });
  } catch (err) {
    console.warn('[mediaDurationFixer] Failed to patch media container duration, falling back to raw blob:', err);
    return rawBlob;
  }
}
