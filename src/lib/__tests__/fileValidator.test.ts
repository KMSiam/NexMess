import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  validateUploadedFile,
  compressImage,
  prepareImageForUpload,
} from '../fileValidator'

describe('File Upload Security & Magic Byte Validator', () => {
  it('rejects null or missing file objects', async () => {
    // @ts-expect-error testing null input
    const result = await validateUploadedFile(null)
    expect(result.valid).toBe(false)
    expect(result.error).toMatch(/no file provided/i)
  })

  it('rejects empty (0 byte) files', async () => {
    const emptyFile = new File([], 'empty.png', { type: 'image/png' })
    const result = await validateUploadedFile(emptyFile)
    expect(result.valid).toBe(false)
    expect(result.error).toMatch(/empty file/i)
  })

  it('rejects files exceeding maximum size limits', async () => {
    // Create an oversized 3MB file when limit is 2MB
    const bigContent = new Uint8Array(3 * 1024 * 1024)
    const bigFile = new File([bigContent], 'large.jpg', { type: 'image/jpeg' })
    const result = await validateUploadedFile(bigFile, { maxSizeInBytes: 2 * 1024 * 1024 })
    expect(result.valid).toBe(false)
    expect(result.error).toMatch(/exceeds/i)
  })

  it('rejects prohibited file extensions', async () => {
    const fakeScript = new File([new Uint8Array([1, 2, 3, 4, 5])], 'malicious.exe', {
      type: 'application/x-msdownload',
    })
    const result = await validateUploadedFile(fakeScript, { category: 'image' })
    expect(result.valid).toBe(false)
    expect(result.error).toMatch(/invalid file extension/i)
  })

  it('verifies valid PNG binary header magic bytes', async () => {
    // Genuine PNG signature: 89 50 4E 47 0D 0A 1A 0A
    const pngMagic = new Uint8Array([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
    ])
    const pngFile = new File([pngMagic], 'valid.png', { type: 'image/png' })
    const result = await validateUploadedFile(pngFile, { category: 'image' })
    expect(result.valid).toBe(true)
    expect(result.detectedType).toBe('image/png')
  })

  it('verifies valid JPEG binary header magic bytes', async () => {
    // Genuine JPEG signature: FF D8 FF
    const jpegMagic = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46])
    const jpegFile = new File([jpegMagic], 'valid.jpg', { type: 'image/jpeg' })
    const result = await validateUploadedFile(jpegFile, { category: 'image' })
    expect(result.valid).toBe(true)
    expect(result.detectedType).toBe('image/jpeg')
  })

  it('detects disguised files (renamed extension but wrong binary bytes)', async () => {
    // An executable/text file renamed to .png with random non-PNG bytes
    const fakeContent = new TextEncoder().encode('Hello world, I am not a real image!')
    const fakePng = new File([fakeContent], 'fake.png', { type: 'image/png' })
    const result = await validateUploadedFile(fakePng, { category: 'image' })
    expect(result.valid).toBe(false)
    expect(result.error).toMatch(/verification failed/i)
  })
})

describe('Client-Side Image Compression & Upload Presets', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  function mockImageAndCanvas({
    width = 3000,
    height = 2000,
    blobSize = 120,
    blobType = 'image/webp',
  }: {
    width?: number
    height?: number
    blobSize?: number
    blobType?: string
  }) {
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-image')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})

    class MockImage {
      naturalWidth = width
      naturalHeight = height
      width = width
      height = height
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      set src(_val: string) {
        setTimeout(() => this.onload?.(), 0)
      }
    }
    vi.stubGlobal('Image', MockImage)

    const drawImage = vi.fn()
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      drawImage,
    } as unknown as CanvasRenderingContext2D)

    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((cb, requestedType) => {
      const resolvedType = blobType === 'auto' ? requestedType || 'image/webp' : blobType
      cb(new Blob([new Uint8Array(blobSize)], { type: resolvedType }))
    })

    return { drawImage }
  }

  it('resizes oversized images and outputs a smaller WebP file', async () => {
    const { drawImage } = mockImageAndCanvas({ width: 4000, height: 2000, blobSize: 512 })
    const jpegBytes = new Uint8Array(60 * 1024)
    jpegBytes.set([0xff, 0xd8, 0xff, 0xe0], 0)
    const rawFile = new File([jpegBytes], 'receipt.jpg', { type: 'image/jpeg' })

    const result = await compressImage(rawFile, 'jpg', {
      maxDimension: 1440,
      quality: 0.8,
      outputName: 'receipt',
    })

    expect(drawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, 1440, 720)
    expect(result.ext).toBe('webp')
    expect(result.file.type).toBe('image/webp')
    expect(result.file.size).toBe(512)
  })

  it('falls back to JPEG if WebP encoding is unsupported by the browser', async () => {
    mockImageAndCanvas({ width: 2000, height: 1000, blobSize: 400, blobType: 'image/png' })
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((cb, requestedType) => {
      if (requestedType === 'image/webp') {
        // Simulate browsers that return PNG when WebP is unsupported
        cb(new Blob([new Uint8Array(400)], { type: 'image/png' }))
      } else {
        cb(new Blob([new Uint8Array(350)], { type: 'image/jpeg' }))
      }
    })

    const jpegBytes = new Uint8Array(50 * 1024)
    jpegBytes.set([0xff, 0xd8, 0xff, 0xe0], 0)
    const rawFile = new File([jpegBytes], 'photo.jpg', { type: 'image/jpeg' })

    const result = await compressImage(rawFile, 'jpg', { maxDimension: 1280, outputName: 'chat' })
    expect(result.ext).toBe('jpg')
    expect(result.file.type).toBe('image/jpeg')
    expect(result.file.size).toBe(350)
  })

  it('keeps the original file when compressed output is not smaller', async () => {
    mockImageAndCanvas({ width: 800, height: 600, blobSize: 70 * 1024 })
    const pngBytes = new Uint8Array(50 * 1024)
    pngBytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0)
    const rawFile = new File([pngBytes], 'small.png', { type: 'image/png' })

    const result = await compressImage(rawFile, 'png', { maxDimension: 1280 })
    expect(result.file).toBe(rawFile)
    expect(result.ext).toBe('png')
  })

  it('prepares uploads with preset limits and rejects files exceeding bucket cap after compression', async () => {
    // Allow 3MB raw input to compress down for a 2MB avatar/verification bucket
    mockImageAndCanvas({ width: 2400, height: 1800, blobSize: 120 * 1024 })
    const bigJpeg = new Uint8Array(3 * 1024 * 1024)
    bigJpeg.set([0xff, 0xd8, 0xff, 0xe0], 0)
    const rawAvatar = new File([bigJpeg], 'selfie.jpg', { type: 'image/jpeg' })

    const okResult = await prepareImageForUpload(rawAvatar, 'verification')
    expect(okResult.valid).toBe(true)
    if (okResult.valid) {
      expect(okResult.ext).toBe('webp')
      expect(okResult.file.size).toBe(120 * 1024)
    }

    // If compressed output still exceeds 2MB verification bucket limit, reject cleanly
    mockImageAndCanvas({ width: 2400, height: 1800, blobSize: 2.5 * 1024 * 1024 })
    const hugeJpeg = new Uint8Array(4 * 1024 * 1024)
    hugeJpeg.set([0xff, 0xd8, 0xff, 0xe0], 0)
    const tooLargeEvenCompressed = new File([hugeJpeg], 'huge.jpg', { type: 'image/jpeg' })

    const failResult = await prepareImageForUpload(tooLargeEvenCompressed, 'verification')
    expect(failResult.valid).toBe(false)
    if (!failResult.valid) {
      expect(failResult.error).toMatch(/2MB limit/i)
    }
  })
})
