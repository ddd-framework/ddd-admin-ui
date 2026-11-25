'use client';

import { useState } from 'react';

import { useTranslate } from '../i18n/useTranslate.ts';
import { cn } from '../primitives/cn.ts';

export interface MediaPreviewProps {
  url: string;
  fileName: string;
  kind: 'video' | 'audio';
  /** `canvas`: a video fills the height it is given. Default `drawer` (a box of fixed height). */
  layout?: 'drawer' | 'canvas';
}

/**
 * A video or a sound in the browser's own player (`<video>` / `<audio>` with its controls): the bytes are decoded as
 * media, nothing of them runs. It loads only its metadata until the reader presses play; a file the browser cannot
 * play says so and leaves the download.
 */
export const MediaPreview = ({ url, fileName, kind, layout = 'drawer' }: MediaPreviewProps) => {
  const { t } = useTranslate();
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const label = t('Preview of %name%', { replacements: { name: fileName } });

  if (failedUrl === url) return <p className="py-6 text-center text-[13px] text-muted-foreground">{t('This file could not be played here. Download it to play it.')}</p>;
  if (kind === 'audio') {
    return (
      <div className="rounded-xl bg-tint p-4">
        {/* biome-ignore lint/a11y/useMediaCaption: a stored file has no caption track */}
        <audio src={url} controls preload="metadata" aria-label={label} className="w-full" onError={() => setFailedUrl(url)} />
      </div>
    );
  }
  return (
    <div className={cn('flex items-center justify-center overflow-hidden rounded-xl bg-black', layout === 'canvas' ? 'min-h-0 flex-1' : 'max-h-96')}>
      {/* biome-ignore lint/a11y/useMediaCaption: a stored file has no caption track */}
      <video
        src={url}
        controls
        playsInline
        preload="metadata"
        aria-label={label}
        className={cn('max-w-full', layout === 'canvas' ? 'max-h-full' : 'max-h-96')}
        onError={() => setFailedUrl(url)}
      />
    </div>
  );
};
