'use client';

import { useState, useRef, useCallback } from 'react';
import ReactCrop, { type Crop, centerCrop, makeAspectCrop } from 'react-image-crop';
import { Upload, Loader2, Check, X } from 'lucide-react';
import 'react-image-crop/dist/ReactCrop.css';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { createImageUploadUrl } from '@/server/images';

type Props = {
  aspect?: number;
  onUploaded?: (imageId: string, publicUrl: string) => void;
  initialUrl?: string | null;
  label?: string;
};

/**
 * Drop-in uploader for organiser artwork. Accepts anything the browser
 * can decode (50MB cap), opens an in-page crop UI, produces a JPEG blob.
 *
 * Upload destination depends on backend mode (decided by server):
 *   - R2 configured → PUT direct to presigned Cloudflare URL
 *   - R2 absent (default) → POST to /api/uploads/image on our server,
 *     authorised by a one-time X-Upload-Token header
 *
 * The crop + client-side resize UX is identical in both cases.
 */
export function ImageUploader({
  aspect = 16 / 9,
  onUploaded,
  initialUrl,
  label = 'Upload event artwork',
}: Props) {
  const [srcPreview, setSrcPreview] = useState<string | null>(initialUrl ?? null);
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState<Crop>();
  const [pixelCrop, setPixelCrop] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [originalName, setOriginalName] = useState<string | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) {
      toast.error('Max 50MB. Choose a smaller file or crop first.');
      return;
    }
    setOriginalName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setRawImageSrc(reader.result as string);
      setSrcPreview(null);
    };
    reader.readAsDataURL(file);
  };

  const onImageLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const { width, height } = e.currentTarget;
      const c = centerCrop(
        makeAspectCrop({ unit: '%', width: 90 }, aspect, width, height),
        width,
        height,
      );
      setCrop(c);
    },
    [aspect],
  );

  async function uploadCropped() {
    if (!imgRef.current || !pixelCrop) return;
    setIsUploading(true);

    try {
      const image = imgRef.current;
      const targetWidth = Math.min(2400, Math.round(pixelCrop.width * (image.naturalWidth / image.width)));
      const targetHeight = Math.round(targetWidth / aspect);

      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas unavailable.');

      const scaleX = image.naturalWidth / image.width;
      const scaleY = image.naturalHeight / image.height;
      ctx.drawImage(
        image,
        pixelCrop.x * scaleX,
        pixelCrop.y * scaleY,
        pixelCrop.width * scaleX,
        pixelCrop.height * scaleY,
        0,
        0,
        targetWidth,
        targetHeight,
      );

      const blob: Blob = await new Promise((resolve, reject) => {
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error('JPEG encode failed.'))),
          'image/jpeg',
          0.88,
        );
      });

      const target = await createImageUploadUrl({
        mimeType: 'image/jpeg',
        sizeBytes: blob.size,
        width: targetWidth,
        height: targetHeight,
        cropX: pixelCrop.x,
        cropY: pixelCrop.y,
        cropWidth: pixelCrop.width,
        cropHeight: pixelCrop.height,
        originalName: originalName ?? undefined,
      });

      if (target.mode === 'r2') {
        // Presigned PUT direct to Cloudflare
        const putResponse = await fetch(target.uploadUrl, {
          method: 'PUT',
          body: blob,
          headers: { 'Content-Type': 'image/jpeg' },
        });
        if (!putResponse.ok) throw new Error(`Upload failed: ${putResponse.status}`);
      } else {
        // Local: POST to our own route with the one-time token
        const postResponse = await fetch(target.uploadPath, {
          method: 'POST',
          body: blob,
          headers: {
            'Content-Type': 'image/jpeg',
            'X-Upload-Token': target.uploadToken,
          },
        });
        if (!postResponse.ok) {
          const text = await postResponse.text().catch(() => '');
          throw new Error(`Upload failed (${postResponse.status}): ${text.slice(0, 200)}`);
        }
      }

      setSrcPreview(target.publicUrl);
      setRawImageSrc(null);
      setCrop(undefined);
      setPixelCrop(null);
      onUploaded?.(target.imageId, target.publicUrl);
      toast.success('Artwork uploaded.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {rawImageSrc ? (
        <div className="border-2 border-primary bg-surface-container-low p-3">
          <ReactCrop
            crop={crop}
            onChange={(_, percent) => setCrop(percent)}
            onComplete={(c) => setPixelCrop({ x: c.x, y: c.y, width: c.width, height: c.height })}
            aspect={aspect}
            keepSelection
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imgRef}
              src={rawImageSrc}
              alt=""
              onLoad={onImageLoad}
              className="max-h-[60vh] w-auto"
            />
          </ReactCrop>

          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" onClick={uploadCropped} disabled={isUploading || !pixelCrop}>
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Uploading…
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" aria-hidden="true" /> Use this crop
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setRawImageSrc(null);
                setCrop(undefined);
                setPixelCrop(null);
              }}
            >
              <X className="h-4 w-4" aria-hidden="true" /> Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className={cn('relative flex min-h-[220px] items-center justify-center border-2 border-dashed border-outline-variant bg-surface-container')}>
          {srcPreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={srcPreview} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="text-center">
              <Upload className="mx-auto h-6 w-6 text-tertiary" aria-hidden="true" />
              <p className="mt-2 text-sm text-muted-foreground">
                {label} — up to 50MB, any shape. We&rsquo;ll crop it to {aspect === 16 / 9 ? '16:9' : `${aspect.toFixed(2)}:1`}.
              </p>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            onChange={onFileChange}
            className="absolute inset-0 cursor-pointer opacity-0"
            aria-label={label}
          />
        </div>
      )}
    </div>
  );
}
