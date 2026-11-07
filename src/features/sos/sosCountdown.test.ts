import {
  initialSosCountdownState,
  reduceSosCountdown,
  SOS_COUNTDOWN_SECONDS,
} from "./sosCountdown";

describe("sosCountdown", () => {
  it("starts counting from the configured number of seconds", () => {
    const state = initialSosCountdownState();
    expect(state).toEqual({
      status: "counting",
      secondsLeft: SOS_COUNTDOWN_SECONDS,
    });
  });

  it("ticks down by one second at a time", () => {
    let state = initialSosCountdownState(5);
    state = reduceSosCountdown(state, { type: "tick" });
    expect(state).toEqual({ status: "counting", secondsLeft: 4 });
    state = reduceSosCountdown(state, { type: "tick" });
    expect(state).toEqual({ status: "counting", secondsLeft: 3 });
  });

  it("transitions to sent when the countdown reaches zero", () => {
    let state = initialSosCountdownState(2);
    state = reduceSosCountdown(state, { type: "tick" });
    expect(state.status).toBe("counting");
    state = reduceSosCountdown(state, { type: "tick" });
    expect(state).toEqual({ status: "sent", secondsLeft: 0 });
  });

  it("cancel moves straight to cancelled from any point in the countdown", () => {
    const state = reduceSosCountdown(initialSosCountdownState(5), {
      type: "cancel",
    });
    expect(state).toEqual({ status: "cancelled", secondsLeft: 5 });
  });

  it("sendNow jumps straight to sent, skipping the rest of the countdown", () => {
    const state = reduceSosCountdown(initialSosCountdownState(5), {
      type: "sendNow",
    });
    expect(state).toEqual({ status: "sent", secondsLeft: 0 });
  });

  it("is terminal: a tick after cancel never resurrects or sends the alert", () => {
    const cancelled = reduceSosCountdown(initialSosCountdownState(5), {
      type: "cancel",
    });
    const afterStrayTick = reduceSosCountdown(cancelled, { type: "tick" });
    expect(afterStrayTick).toEqual(cancelled);
  });

  it("is terminal: cancel after sent can never un-send the alert", () => {
    const sent = reduceSosCountdown(initialSosCountdownState(5), {
      type: "sendNow",
    });
    const afterStrayCancel = reduceSosCountdown(sent, { type: "cancel" });
    expect(afterStrayCancel).toEqual(sent);
  });

  it("is terminal: further ticks after reaching zero never go negative", () => {
    let state = initialSosCountdownState(1);
    state = reduceSosCountdown(state, { type: "tick" });
    expect(state).toEqual({ status: "sent", secondsLeft: 0 });
    state = reduceSosCountdown(state, { type: "tick" });
    expect(state).toEqual({ status: "sent", secondsLeft: 0 });
  });
});
