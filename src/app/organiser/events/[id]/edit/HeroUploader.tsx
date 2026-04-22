'use client';

import { ImageUploader } from '@/components/image-uploader';
import { setEventHeroImage } from '@/server/events';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export function HeroUploader({
  eventId,
  initialUrl,
}: {
  eventId: string;
  initialUrl: string | null;
}) {
  const router = useRouter();

  async function onUploaded(imageId: string) {
    try {
      await setEventHeroImage(eventId, imageId);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not attach image.');
    }
  }

  return (
    <ImageUploader
      aspect={16 / 9}
      initialUrl={initialUrl}
      onUploaded={onUploaded}
      label="Hero artwork — 16:9"
    />
  );
}
