import { Platform } from "react-native";
import { androidAdapter } from "./android";
import { iosAdapter } from "./ios";
import type { PlatformAdapter } from "./types";

/**
 * The one place the rest of the app is allowed to branch on OS. Every
 * screen and hook imports `platform` from here and calls the shared
 * interface — never `Platform.OS === "..."` directly — so that adding
 * a capability always means touching both `android.ts` and `ios.ts`
 * (CLAUDE.md section 2, rule 3).
 */
export const platform: PlatformAdapter =
  Platform.OS === "android" ? androidAdapter : iosAdapter;

export type { PlatformAdapter } from "./types";
