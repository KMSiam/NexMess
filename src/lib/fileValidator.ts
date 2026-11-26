/**
 * Safe File Upload Validator & Magic Number (Binary Signature) Inspector
 * 
 * Verifies that uploaded files actually contain genuine image/document binary data
 * and prevents disguised executable, script (e.g. malicious SVG with XSS), or oversized uploads.
 */

export type AllowedCategory = 'image' | 'document' | 'all'

export interface FileValidationOptions {
  category?: AllowedCategory
  maxSizeInBytes?: number
  allowedExtensions?: string[]
}

const DEFAULT_IMAGE_MAX_SIZE = 2 * 1024 * 1024 // 2MB
const DEFAULT_MEDIA_MAX_SIZE = 5 * 1024 * 1024 // 5MB

export interface FileValidationResult {
  valid: boolean
  error?: string
  detectedType?: string
  sanitizedExt?: string
}

/**
 * Checks file magic numbers (binary header signatures) asynchronously
 */
async function detectBinaryMimeType(file: File): Promise<string | null> {
  const headerSlice = file.slice(0, 16)
  const arrayBuffer = await headerSlice.arrayBuffer()
  const bytes = new Uint8Array(arrayBuffer)

  if (bytes.length < 4) return null

  // 1. JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg'
  }

  // 2. PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return 'image/png'
  }

  // 3. WebP: RIFF ... WEBP (52 49 46 46 .... 57 45 42 50)
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return 'image/webp'
  }

  // 4. PDF: 25 50 44 46 (%PDF)
  if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) {
    return 'application/pdf'
  }

  // 5. GIF: 47 49 46 38 (GIF87a / GIF89a)
  if (
    bytes[0] === 0x47 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x38
  ) {
    return 'image/gif'
  }

  return null
}

/**
 * Validates an uploaded file strictly against type, size, extension, and binary magic bytes.
 */
export async function validateUploadedFile(
  file: File,
  options?: FileValidationOptions
): Promise<FileValidationResult> {
  const category = options?.category || 'image'
  const maxSize =
    options?.maxSizeInBytes ||
    (category === 'image' ? DEFAULT_IMAGE_MAX_SIZE : DEFAULT_MEDIA_MAX_SIZE)

  if (!file) {
    return { valid: false, error: 'No file provided.' }
  }

  // 1. File Size Check
  if (file.size > maxSize) {
    const sizeInMb = (maxSize / (1024 * 1024)).toFixed(0)
    return { valid: false, error: `File size exceeds the ${sizeInMb}MB limit.` }
  }

  if (file.size === 0) {
    return { valid: false, error: 'Cannot upload an empty file.' }
  }

  // 2. Extension Check
  const rawExt = (file.name.split('.').pop() || '').toLowerCase().trim()
  const imageExtensions = ['jpg', 'jpeg', 'png', 'webp']
  const docExtensions = ['pdf', 'jpg', 'jpeg', 'png', 'webp']

  const allowedExts =
    options?.allowedExtensions ||
    (category === 'image' ? imageExtensions : docExtensions)

  if (!allowedExts.includes(rawExt)) {
    return {
      valid: false,
      error: `Invalid file extension .${rawExt}. Allowed formats: ${allowedExts.join(', ')}.`,
    }
  }

  // Explicitly block dangerous extensions (including SVG which can carry embedded JavaScript/XSS)
  const forbiddenExts = ['svg', 'html', 'htm', 'exe', 'bat', 'sh', 'php', 'js', 'vbs', 'ps1']
  if (forbiddenExts.includes(rawExt)) {
    return {
      valid: false,
      error: 'File format not permitted for security reasons.',
    }
  }

  // 3. Binary Magic Number Inspection
  const detectedMime = await detectBinaryMimeType(file)
  if (!detectedMime) {
    return {
      valid: false,
      error: 'File content verification failed. Please upload a genuine image or PDF file.',
    }
  }

  // 4. Verify MIME matches requested category
  if (category === 'image' && !detectedMime.startsWith('image/')) {
    return { valid: false, error: 'Uploaded file is not a valid image format.' }
  }

  if (category === 'document' && !detectedMime.startsWith('image/') && detectedMime !== 'application/pdf') {
    return { valid: false, error: 'Uploaded document is not a supported image or PDF.' }
  }

  // Normalized extension
  let sanitizedExt = rawExt
  if (detectedMime === 'image/jpeg') sanitizedExt = 'jpg'
  else if (detectedMime === 'image/png') sanitizedExt = 'png'
  else if (detectedMime === 'image/webp') sanitizedExt = 'webp'
  else if (detectedMime === 'application/pdf') sanitizedExt = 'pdf'

  return {
    valid: true,
    detectedType: detectedMime,
    sanitizedExt,
  }
}

/**
 * Creates a sanitized, collision-safe filename without path traversal risk
 */
export function generateSafeFileName(prefix: string, ext: string): string {
  const cleanPrefix = prefix.replace(/[^a-zA-Z0-9_-]/g, '')
  const randomSuffix =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID().replace(/-/g, '').slice(0, 12)
      : Array.from(crypto.getRandomValues(new Uint8Array(6)), (b) =>
          b.toString(16).padStart(2, '0')
        ).join('')
  const cleanExt = ext.replace(/[^a-zA-Z0-9]/g, '')
  return `${cleanPrefix}-${Date.now()}-${randomSuffix}.${cleanExt}`
}

/**
 * Resizes and compresses any uploaded image client-side via native HTML5 <canvas>
 * before uploading to Supabase Storage (WebP first, JPEG fallback, zero external deps).
 * Falls back safely to the original file if canvas encoding is unavailable or larger.
 */
export type ImageUploadPreset = 'avatar' | 'chat' | 'receipt' | 'verification'

export interface ImageCompressionOptions {
  maxDimension?: number
  quality?: number
  outputName?: string
  skipBelowBytes?: number
}

const MAX_RAW_IMAGE_INPUT_BYTES = 15 * 1024 * 1024 // 15MB safety limit before client resize

export const IMAGE_UPLOAD_PRESETS: Record<
  ImageUploadPreset,
  { maxDimension: number; quality: number; maxOutputBytes: number; outputName: string }
> = {
  avatar: {
    maxDimension: 256,
    quality: 0.82,
    maxOutputBytes: 2 * 1024 * 1024,
    outputName: 'avatar',
  },
  chat: {
    maxDimension: 1280,
    quality: 0.78,
    maxOutputBytes: 5 * 1024 * 1024,
    outputName: 'chat',
  },
  receipt: {
    maxDimension: 1440,
    quality: 0.8,
    maxOutputBytes: 5 * 1024 * 1024,
    outputName: 'receipt',
  },
  verification: {
    maxDimension: 1600,
    quality: 0.84,
    maxOutputBytes: 2 * 1024 * 1024,
    outputName: 'verification',
  },
}

function encodeCanvas(
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality: number
): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, mimeType, quality))
}

export async function compressImage(
  file: File,
  fallbackExt: string,
  options: ImageCompressionOptions = {}
): Promise<{ file: File; ext: string }> {
  const {
    maxDimension = 1280,
    quality = 0.8,
    outputName = 'image',
    skipBelowBytes = 0,
  } = options

  if (
    typeof document === 'undefined' ||
    typeof URL === 'undefined' ||
    typeof URL.createObjectURL !== 'function' ||
    !file.type.startsWith('image/')
  ) {
    return { file, ext: fallbackExt }
  }

  let objectUrl: string | null = null
  try {
    objectUrl = URL.createObjectURL(file)
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = () => reject(new Error('Image decode failed'))
      el.src = objectUrl!
    })

    const width = img.naturalWidth || img.width
    const height = img.naturalHeight || img.height
    if (!width || !height) return { file, ext: fallbackExt }

    const maxSide = Math.max(width, height)
    if (skipBelowBytes > 0 && file.size <= skipBelowBytes && maxSide <= maxDimension) {
      return { file, ext: fallbackExt }
    }

    const scale = Math.min(1, maxDimension / maxSide)
    const targetW = Math.max(1, Math.round(width * scale))
    const targetH = Math.max(1, Math.round(height * scale))

    const canvas = document.createElement('canvas')
    canvas.width = targetW
    canvas.height = targetH
    const ctx = canvas.getContext('2d')
    if (!ctx) return { file, ext: fallbackExt }

    ctx.drawImage(img, 0, 0, targetW, targetH)

    let blob = await encodeCanvas(canvas, 'image/webp', quality)
    // Fall back to JPEG if the browser doesn't support WebP canvas export
    if ((!blob || blob.type !== 'image/webp') && (file.type === 'image/jpeg' || scale < 1)) {
      blob = await encodeCanvas(canvas, 'image/jpeg', quality)
    }

    if (!blob || blob.size === 0 || blob.size >= file.size) {
      return { file, ext: fallbackExt }
    }

    const outExt =
      blob.type === 'image/webp' ? 'webp' : blob.type === 'image/png' ? 'png' : 'jpg'
    const compressed = new File([blob], `${outputName}.${outExt}`, {
      type: blob.type || 'image/webp',
    })
    return { file: compressed, ext: outExt }
  } catch {
    return { file, ext: fallbackExt }
  } finally {
    if (objectUrl) URL.revokeObjectURL(objectUrl)
  }
}

/**
 * Validates an uploaded image (magic bytes & extension) and compresses it
 * using the target bucket preset before enforcing the storage bucket limit.
 */
export async function prepareImageForUpload(
  file: File,
  presetKey: ImageUploadPreset
): Promise<{ valid: true; file: File; ext: string } | { valid: false; error: string }> {
  const preset = IMAGE_UPLOAD_PRESETS[presetKey]
  const validation = await validateUploadedFile(file, {
    category: 'image',
    maxSizeInBytes: MAX_RAW_IMAGE_INPUT_BYTES,
  })

  if (!validation.valid) {
    return { valid: false, error: validation.error || 'Invalid image file.' }
  }

  const fallbackExt = validation.sanitizedExt || 'jpg'
  const { file: compressedFile, ext } = await compressImage(file, fallbackExt, {
    maxDimension: preset.maxDimension,
    quality: preset.quality,
    outputName: preset.outputName,
    skipBelowBytes: 40 * 1024,
  })

  if (compressedFile.size > preset.maxOutputBytes) {
    const sizeInMb = (preset.maxOutputBytes / (1024 * 1024)).toFixed(0)
    return { valid: false, error: `Compressed image still exceeds the ${sizeInMb}MB limit.` }
  }

  return { valid: true, file: compressedFile, ext }
}

/**
 * Backward-compatible avatar optimizer wrapper around compressImage.
 */
export async function optimizeAvatarImage(
  file: File,
  fallbackExt: string,
  maxDimension = IMAGE_UPLOAD_PRESETS.avatar.maxDimension,
  quality = IMAGE_UPLOAD_PRESETS.avatar.quality
): Promise<{ file: File; ext: string }> {
  return compressImage(file, fallbackExt, {
    maxDimension,
    quality,
    outputName: 'avatar',
  })
}
