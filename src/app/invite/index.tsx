import { StyleSheet, Text, View } from "react-native";
import { colors, spacing, typography } from "../../theme/tokens";

/**
 * Placeholder for the "I have an invite" entry screen (CLAUDE.md
 * section 5.5, matching the Invite.dc.html mockup: link/QR/6-digit
 * code redemption, then phone verification with the role already set
 * by the invite).
 *
 * Left as a stub for the same reason as onboarding/phone.tsx: invite
 * redemption still ends in phone verification, which needs the SMS
 * provider configured first.
 */
export default function InviteEntry() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Redeem an invite</Text>
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
