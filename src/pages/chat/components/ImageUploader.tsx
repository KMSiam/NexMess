import { useState, useRef } from 'react'
import { Image, Loader2 } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import toast from 'react-hot-toast'

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

    if (!file.type.startsWith('image/')) {
      toast.error('You can only upload images here.')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB.')
      return
    }

    setUploading(true)
    const ext = file.name.split('.').pop()
    const fileName = `${messId}/chat-${Date.now()}.${ext}`

    try {
      const { error: uploadError } = await supabase.storage
        .from('chat-media')
        .upload(fileName, file)

      if (uploadError) {
        throw uploadError
      }

      const { data } = supabase.storage.from('chat-media').getPublicUrl(fileName)

      if (data?.publicUrl) {
        onUploadComplete(data.publicUrl)
      } else {
        toast.error('Failed to get download URL.')
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload image.')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div className="relative">
      <input
        type="file"
        accept="image/*"
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
