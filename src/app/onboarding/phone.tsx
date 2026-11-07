import { StyleSheet, Text, View } from "react-native";
import { colors, spacing, typography } from "../../theme/tokens";

/**
 * Placeholder for the real phone-entry screen (CLAUDE.md section 5.5,
 * matching the Phone.dc.html mockup: number input with country code,
 * "Send me a code", Continue with Google/Apple).
 *
 * Deliberately not built out yet: sending a real code needs the SMS/
 * voice provider decided and configured in Supabase Auth first
 * (section 12 Phase 0 open item — Twilio Verify vs. a Philippine
 * provider, and "Test OTP delivery to the real numbers in Circle #1").
 * Wiring this to supabase.auth.signInWithOtp before that would just
 * fail at runtime.
 */
export default function OnboardingPhone() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Phone verification</Text>
      <Text style={styles.body}>
        Coming next, once the SMS provider is set up.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
    gap: spacing.md,
  },
  title: {
    fontSize: typography.size.h1,
    color: colors.primary,
    fontWeight: "700",
  },
  body: {
    fontSize: typography.size.body,
    color: colors.mutedText,
    textAlign: "center",
  },
});
