export interface SegmentMetadata {
  speaker: string;
  url: string;
  durationMs: number;
  color?: string;
}

export interface SceneProps {
  title?: string;
  accent?: string;
  segments?: SegmentMetadata[];
  waveform?: number[];
}

export const DEFAULT_FPS = 30;
export const MINIMUM_DURATION_IN_FRAMES = DEFAULT_FPS * 5;

export const getSegmentFrames = (durationMs: number, fps: number): number => {
  const safeDurationMs = Number.isFinite(durationMs) ? Math.max(0, durationMs) : 0;
  return Math.max(1, Math.ceil((safeDurationMs / 1000) * fps));
};

export const getDurationFromSegments = (
  segments: SegmentMetadata[] | undefined,
  fps: number,
): number => {
  const totalSegmentFrames = (segments ?? []).reduce((acc, segment) => {
    return acc + getSegmentFrames(segment.durationMs, fps);
  }, 0);

  return Math.max(MINIMUM_DURATION_IN_FRAMES, totalSegmentFrames);
};
