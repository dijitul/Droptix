import { ImageResponse } from 'next/og';

/**
 * Generated favicon (32×32). Next builds this at request time and caches
 * aggressively. Avoids shipping a binary .ico.
 */
export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: '#111508',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#abd600',
          fontSize: 24,
          fontWeight: 900,
          letterSpacing: -2,
        }}
      >
        D
      </div>
    ),
    { ...size },
  );
}
