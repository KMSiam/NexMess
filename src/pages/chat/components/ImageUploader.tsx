import { useState, useRef } from 'react'
import { Image, Loader2 } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import toast from 'react-hot-toast'
import { prepareImageForUpload, generateSafeFileName } from '../../../lib/fileValidator'
import { sanitizeAppError } from '../../../lib/errorHandler'

interface ImageUploaderProps {
  messId: string
  onUploadComplete: (imageUrl: string) => void
}

export default function ImageUploader({ messId, onUploadComplete }: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const prepared = await prepareImageForUpload(file, 'chat')
      if (!prepared.valid) {
        toast.error(prepared.error)
        return
      }

      const safeName = generateSafeFileName('chat', prepared.ext)
      const fileName = `${messId}/${safeName}`

      const { error: uploadError } = await supabase.storage
        .from('chat-media')
        .upload(fileName, prepared.file, { contentType: prepared.file.type })

      if (uploadError) {
        throw uploadError
      }

      const { data } = supabase.storage.from('chat-media').getPublicUrl(fileName)

      if (data?.publicUrl) {
        onUploadComplete(data.publicUrl)
      } else {
        toast.error('Failed to get image link.')
      }
    } catch (err: unknown) {
      toast.error(sanitizeAppError(err, 'Failed to upload image.'))
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div className="relative">
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
        className="hidden"
        ref={fileInputRef}
        id="chat-image-input"
        disabled={uploading}
      />
      <button
        type="button"
        disabled={uploading}
        onClick={() => fileInputRef.current?.click()}
        className="rounded-btn bg-nex-elevated border-nex-border text-nex-muted hover:bg-nex-hover hover:text-nex-text flex items-center justify-center border p-2.5 transition-colors disabled:opacity-50"
        title="Upload Image"
      >
        {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Image className="h-4 w-4" />}
      </button>
    </div>
  )
}
