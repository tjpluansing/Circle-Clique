import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { colors } from "../theme/tokens";

/**
 * Root layout. Real navigation (Primary Mode vs. Full Mode, the
 * circle/Primary switcher, the auth gate) lands with Phase 1 — this is
 * just enough structure for the scaffold to run and for screens to be
 * added under `src/app/` as they're built.
 */
export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      />
    </SafeAreaProvider>
  );
}
