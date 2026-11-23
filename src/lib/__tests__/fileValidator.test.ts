import { describe, it, expect } from 'vitest'
import { validateUploadedFile } from '../fileValidator'

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
