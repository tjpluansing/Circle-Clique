/**
 * The SOS countdown state machine (CLAUDE.md section 6.3: "5-second
 * countdown with a large Cancel button"; section 4 rule 6: "SOS code
 * is the highest-risk code. Keep it small, tested, and reviewed.
 * Simple and reliable beats clever.").
 *
 * Deliberately a pure reducer with no timers, no navigation, and no
 * network calls inside it — those live in the screen component. That
 * keeps the one piece of logic that must never misfire (does a tick
 * ever "send" after cancel? does cancel ever un-send?) fully testable
 * without mocking React, a clock, or Supabase.
 */

export const SOS_COUNTDOWN_SECONDS = 5;

export type SosCountdownStatus = "counting" | "sent" | "cancelled";

export interface SosCountdownState {
  status: SosCountdownStatus;
  secondsLeft: number;
}

export type SosCountdownAction =
  | { type: "tick" }
  | { type: "cancel" }
  | { type: "sendNow" };

export function initialSosCountdownState(
  seconds: number = SOS_COUNTDOWN_SECONDS,
): SosCountdownState {
  return { status: "counting", secondsLeft: seconds };
}

/**
 * `sent` and `cancelled` are terminal: once reached, every further
 * action is a no-op. This is what guarantees a stray tick that fires
 * after Cancel (e.g. an interval callback that ran before cleanup
 * took effect) can never resurrect the countdown or trigger a send.
 */
export function reduceSosCountdown(
  state: SosCountdownState,
  action: SosCountdownAction,
): SosCountdownState {
  if (state.status !== "counting") {
    return state;
  }

  switch (action.type) {
    case "tick": {
      const secondsLeft = state.secondsLeft - 1;
      if (secondsLeft <= 0) {
        return { status: "sent", secondsLeft: 0 };
      }
      return { status: "counting", secondsLeft };
    }
    case "cancel":
      return { status: "cancelled", secondsLeft: state.secondsLeft };
    case "sendNow":
      return { status: "sent", secondsLeft: 0 };
    default:
      return state;
  }
}
