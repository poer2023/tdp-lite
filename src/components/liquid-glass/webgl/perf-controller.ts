export interface PerfState {
  internalScale: number;
  chromaEnabled: boolean;
  strengthMultiplier: number;
  fpsAvg: number;
  frameP95: number;
}

interface PerfControllerOptions {
  forceMaxQuality?: boolean;
}

const TARGET_FRAME_MS = 1000 / 60;
const MAX_SAMPLES = 180;
const SCALE_STEPS = [1, 0.9, 0.8, 0.7] as const;
const MIN_STRENGTH_MULTIPLIER = 0.72;

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) {
    return TARGET_FRAME_MS;
  }
  const rawIndex = Math.floor((sorted.length - 1) * p);
  return sorted[Math.max(0, Math.min(sorted.length - 1, rawIndex))] ?? TARGET_FRAME_MS;
}

export class PerfController {
  constructor(private readonly options: PerfControllerOptions = {}) {}

  private frameSamples: number[] = [];

  private scaleIndex = 0;

  private chromaEnabled = true;

  private strengthMultiplier = 1;

  private cooldownFrames = 0;

  update(frameMs: number): PerfState {
    this.frameSamples.push(frameMs);
    if (this.frameSamples.length > MAX_SAMPLES) {
      this.frameSamples.shift();
    }

    if (this.cooldownFrames > 0) {
      this.cooldownFrames -= 1;
    }

    if (
      !this.options.forceMaxQuality &&
      this.frameSamples.length >= 45 &&
      this.cooldownFrames === 0
    ) {
      const avgFrameMs =
        this.frameSamples.reduce((sum, value) => sum + value, 0) /
        this.frameSamples.length;

      if (avgFrameMs > TARGET_FRAME_MS * 1.08) {
        this.degrade();
        this.cooldownFrames = 30;
      } else if (avgFrameMs < TARGET_FRAME_MS * 0.9) {
        this.recover();
        this.cooldownFrames = 45;
      }
    }

    return this.getState();
  }

  getState(): PerfState {
    const sampleCount = this.frameSamples.length || 1;
    const avgFrameMs =
      this.frameSamples.reduce((sum, value) => sum + value, 0) / sampleCount;
    const fpsAvg = Math.max(0, 1000 / Math.max(avgFrameMs, 0.001));
    const sorted = [...this.frameSamples].sort((a, b) => a - b);

    return {
      internalScale: this.options.forceMaxQuality
        ? 1
        : (SCALE_STEPS[this.scaleIndex] ?? 1),
      chromaEnabled: this.options.forceMaxQuality ? true : this.chromaEnabled,
      strengthMultiplier: this.options.forceMaxQuality
        ? 1
        : this.strengthMultiplier,
      fpsAvg,
      frameP95: percentile(sorted, 0.95),
    };
  }

  private degrade() {
    if (this.scaleIndex < SCALE_STEPS.length - 1) {
      this.scaleIndex += 1;
      return;
    }

    if (this.chromaEnabled) {
      this.chromaEnabled = false;
      return;
    }

    this.strengthMultiplier = Math.max(
      MIN_STRENGTH_MULTIPLIER,
      Number((this.strengthMultiplier - 0.06).toFixed(2))
    );
  }

  private recover() {
    if (this.strengthMultiplier < 1) {
      this.strengthMultiplier = Math.min(
        1,
        Number((this.strengthMultiplier + 0.04).toFixed(2))
      );
      return;
    }

    if (!this.chromaEnabled) {
      this.chromaEnabled = true;
      return;
    }

    if (this.scaleIndex > 0) {
      this.scaleIndex -= 1;
    }
  }
}
