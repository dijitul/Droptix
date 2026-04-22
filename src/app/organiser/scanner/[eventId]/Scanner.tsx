'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, XCircle, AlertTriangle, CameraOff, Keyboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

/**
 * Door scanner PWA UI.
 *
 * Design rules (from UX research brief):
 *  - Opens camera immediately
 *  - Valid = full-screen green + tick + short beep + single haptic pulse
 *  - Invalid = full-screen red + X + distinct buzz pattern
 *  - Already-scanned = amber + warning icon + time + crew
 *  - Announces result via aria-live for screen-reader crew
 *  - Manual door-code fallback always available (low light, broken cam)
 *  - Double-scan lockout: 1200ms after any scan before we'll process another
 *
 * For now runs online-only; offline sync via service worker + IndexedDB
 * will land in a follow-up with the service-worker wiring. The scan HTTP
 * wrapper (/api/scanner/verify) is already idempotent so sync is trivial.
 */

type ScanResult =
  | { status: 'ACCEPTED'; ticket: { holderName: string; ticketTypeName: string; doorCode: string } }
  | { status: 'REJECTED_ALREADY_SCANNED'; message: string; ticket?: { holderName: string; ticketTypeName: string; scannedAt?: string } }
  | { status: 'REJECTED_INVALID_SIG' | 'REJECTED_NOT_FOUND' | 'REJECTED_WRONG_EVENT' | 'REJECTED_VOIDED' | 'REJECTED_NOT_YET_VALID'; message: string };

type EventInfo = {
  id: string;
  title: string;
  venueName: string | null;
  city: string | null;
  totalSold: number;
};

export function Scanner({ event }: { event: EventInfo }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<ScanResult | null>(null);
  const [localCount, setLocalCount] = useState(0);
  const [manualMode, setManualMode] = useState(false);
  const processing = useRef(false);
  const lastProcessedAt = useRef(0);
  const deviceId = useRef<string>('');

  // Persist a stable device ID in localStorage so the server can group scans per device
  useEffect(() => {
    const key = 'droptix.deviceId';
    let id = localStorage.getItem(key);
    if (!id) {
      id = `dev_${crypto.randomUUID()}`;
      localStorage.setItem(key, id);
    }
    deviceId.current = id;
  }, []);

  // Start camera with BarcodeDetector (native on Chrome-Android, Safari 17+)
  useEffect(() => {
    let stream: MediaStream | null = null;
    let raf = 0;
    const Detector = (window as unknown as { BarcodeDetector?: new (opts: { formats: string[] }) => { detect: (src: CanvasImageSource) => Promise<Array<{ rawValue: string }>> } }).BarcodeDetector;

    async function start() {
      if (!Detector) {
        setCameraError('Your browser can\'t decode QR codes natively. Use manual entry, or open in Chrome.');
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        const detector = new Detector({ formats: ['qr_code'] });
        const loop = async () => {
          if (!videoRef.current || videoRef.current.readyState < 2) {
            raf = requestAnimationFrame(loop);
            return;
          }
          try {
            const results = await detector.detect(videoRef.current);
            if (results.length > 0 && !processing.current) {
              const since = Date.now() - lastProcessedAt.current;
              if (since > 1200) {
                void handleScan(results[0]!.rawValue);
              }
            }
          } catch {
            // Transient — ignore and try again
          }
          raf = requestAnimationFrame(loop);
        };
        loop();
      } catch (err) {
        setCameraError(err instanceof Error ? err.message : 'Camera unavailable.');
      }
    }
    start();

    return () => {
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleScan = useCallback(
    async (payload: string) => {
      processing.current = true;
      lastProcessedAt.current = Date.now();
      try {
        const res = await fetch('/api/scanner/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ eventId: event.id, payload, deviceId: deviceId.current }),
        });
        const data = (await res.json()) as ScanResult;
        setLastResult(data);
        if (data.status === 'ACCEPTED') {
          setLocalCount((c) => c + 1);
          try {
            navigator.vibrate?.(120);
          } catch {}
          beep(880, 120);
        } else if (data.status === 'REJECTED_ALREADY_SCANNED') {
          try {
            navigator.vibrate?.([80, 60, 80]);
          } catch {}
          beep(440, 200);
        } else {
          try {
            navigator.vibrate?.([200, 100, 200]);
          } catch {}
          beep(220, 300);
        }
      } catch (err) {
        setLastResult({
          status: 'REJECTED_NOT_FOUND',
          message: err instanceof Error ? err.message : 'Network error — try again.',
        });
      } finally {
        setTimeout(() => {
          processing.current = false;
        }, 1200);
      }
    },
    [event.id],
  );

  const onManualSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const code = String(form.get('code') ?? '').trim().toUpperCase();
    if (!code) return;
    // Manual entry — the QR payload we don't have, so we look up by door code via the
    // verify endpoint using a special `doorCode:XXXX-XXXX` payload prefix recognised
    // by the server. Until that branch ships, reject with a helpful message.
    setLastResult({
      status: 'REJECTED_NOT_FOUND',
      message: 'Manual code entry lands in the next update. Use camera for now.',
    });
    void code;
  };

  const bgClass =
    lastResult?.status === 'ACCEPTED'
      ? 'bg-primary text-primary-foreground'
      : lastResult?.status === 'REJECTED_ALREADY_SCANNED'
      ? 'bg-secondary text-secondary-foreground'
      : lastResult
      ? 'bg-destructive text-destructive-foreground'
      : '';

  return (
    <div className={`fixed inset-0 z-50 flex flex-col ${bgClass} transition-colors duration-150`}>
      {/* Top bar */}
      <header className="flex items-center justify-between border-b-2 border-primary/30 bg-surface/90 px-4 py-3 backdrop-blur">
        <Link href="/organiser/scanner" className="flex items-center gap-2 label-tech">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back
        </Link>
        <div className="text-center">
          <div className="label-tech text-tertiary">Scanning</div>
          <div className="truncate font-display font-bold">{event.title}</div>
        </div>
        <Badge variant="tech" className="shrink-0">
          {localCount}/{event.totalSold}
        </Badge>
      </header>

      {/* Camera / result area */}
      <div className="relative flex-1 overflow-hidden">
        {cameraError ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center text-foreground">
            <CameraOff className="h-12 w-12 text-secondary" aria-hidden="true" />
            <h2 className="font-display text-xl font-bold uppercase">Camera unavailable</h2>
            <p className="max-w-sm text-muted-foreground">{cameraError}</p>
            <Button onClick={() => setManualMode(true)} variant="secondary">
              <Keyboard className="h-4 w-4" aria-hidden="true" /> Enter code manually
            </Button>
          </div>
        ) : (
          <video
            ref={videoRef}
            aria-label="Ticket QR scanner — point camera at code"
            playsInline
            muted
            className="h-full w-full object-cover"
          />
        )}

        {/* Scan frame overlay */}
        {!cameraError && !lastResult && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="relative h-64 w-64 md:h-80 md:w-80">
              {/* 4 corner brackets */}
              <span className="absolute left-0 top-0 h-8 w-8 border-l-4 border-t-4 border-primary" />
              <span className="absolute right-0 top-0 h-8 w-8 border-r-4 border-t-4 border-primary" />
              <span className="absolute bottom-0 left-0 h-8 w-8 border-b-4 border-l-4 border-primary" />
              <span className="absolute bottom-0 right-0 h-8 w-8 border-b-4 border-r-4 border-primary" />
            </div>
          </div>
        )}

        {/* Result overlay */}
        {lastResult && (
          <div
            role="status"
            aria-live="assertive"
            className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 backdrop-blur-sm"
          >
            {lastResult.status === 'ACCEPTED' ? (
              <>
                <CheckCircle2 className="h-28 w-28" aria-hidden="true" />
                <div className="label-tech mt-4 opacity-80">Valid · Admit one</div>
                <div className="mt-2 font-display text-3xl font-bold uppercase">
                  {lastResult.ticket.holderName}
                </div>
                <div className="mt-1 label-tech opacity-70">{lastResult.ticket.ticketTypeName}</div>
                <div className="mt-3 font-mono text-sm opacity-60">{lastResult.ticket.doorCode}</div>
              </>
            ) : lastResult.status === 'REJECTED_ALREADY_SCANNED' ? (
              <>
                <AlertTriangle className="h-28 w-28" aria-hidden="true" />
                <div className="label-tech mt-4 opacity-80">Already scanned</div>
                <div className="mt-2 font-display text-3xl font-bold uppercase">
                  {lastResult.ticket?.holderName ?? '—'}
                </div>
                <div className="mt-1 label-tech opacity-70">{lastResult.message}</div>
              </>
            ) : (
              <>
                <XCircle className="h-28 w-28" aria-hidden="true" />
                <div className="label-tech mt-4 opacity-80">Rejected</div>
                <div className="mt-2 font-display text-2xl font-bold uppercase">
                  {lastResult.status.replace('REJECTED_', '').replace('_', ' ')}
                </div>
                <div className="mt-1 label-tech opacity-70">{lastResult.message}</div>
              </>
            )}

            <Button
              onClick={() => setLastResult(null)}
              size="lg"
              variant="outline"
              className="mt-8 border-foreground text-foreground hover:bg-foreground/10"
            >
              Scan next
            </Button>
          </div>
        )}
      </div>

      {/* Bottom bar */}
      <footer className="border-t-2 border-primary/30 bg-surface/90 px-4 py-3 backdrop-blur">
        <div className="flex justify-between items-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setManualMode(!manualMode)}
            className="text-foreground"
          >
            <Keyboard className="h-4 w-4" aria-hidden="true" /> Manual
          </Button>
          <span className="label-tech text-muted-foreground">Offline-capable · pre-release</span>
        </div>

        {manualMode && (
          <form onSubmit={onManualSubmit} className="mt-3 flex gap-2">
            <Input
              name="code"
              placeholder="XXXX-XXXX"
              className="flex-1 uppercase"
              autoComplete="off"
              autoCapitalize="characters"
            />
            <Button type="submit" variant="outline">
              Check
            </Button>
          </form>
        )}
      </footer>

      <Label htmlFor="__" className="sr-only">
        Scanner
      </Label>
    </div>
  );
}

function beep(freq: number, ms: number) {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = freq;
    osc.type = 'sine';
    gain.gain.value = 0.2;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    setTimeout(() => {
      osc.stop();
      ctx.close();
    }, ms);
  } catch {
    // Silent — not critical
  }
}
