import { describe, expect, it } from "vitest";
import { PerfController } from "../perf-controller";

function runFrames(controller: PerfController, frameMs: number, count: number) {
  for (let index = 0; index < count; index += 1) {
    controller.update(frameMs);
  }
}

describe("PerfController", () => {
  it("degrades in the expected order: scale -> chroma -> strength", () => {
    const controller = new PerfController();

    runFrames(controller, 28, 110);
    const afterScaleDrop = controller.getState();
    expect(afterScaleDrop.internalScale).toBe(0.7);
    expect(afterScaleDrop.chromaEnabled).toBe(true);
    expect(afterScaleDrop.strengthMultiplier).toBe(1);

    runFrames(controller, 28, 30);
    const afterChromaDrop = controller.getState();
    expect(afterChromaDrop.internalScale).toBe(0.7);
    expect(afterChromaDrop.chromaEnabled).toBe(false);
    expect(afterChromaDrop.strengthMultiplier).toBe(1);

    runFrames(controller, 28, 45);
    const afterStrengthDrop = controller.getState();
    expect(afterStrengthDrop.strengthMultiplier).toBeLessThan(1);
  });

  it("recovers toward higher quality when frame time improves", () => {
    const controller = new PerfController();

    runFrames(controller, 30, 220);
    const degraded = controller.getState();
    expect(degraded.internalScale).toBe(0.7);

    runFrames(controller, 10, 600);
    const recovered = controller.getState();

    expect(recovered.fpsAvg).toBeGreaterThan(degraded.fpsAvg);
    expect(recovered.chromaEnabled || recovered.internalScale > degraded.internalScale).toBe(
      true
    );
  });

  it("reports fps and p95 with bounded values", () => {
    const controller = new PerfController();
    runFrames(controller, 16, 90);

    const state = controller.getState();
    expect(state.fpsAvg).toBeGreaterThan(50);
    expect(state.frameP95).toBeGreaterThan(0);
  });
});
