import { Link } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radii, spacing, sizes, typography } from "../theme/tokens";
import { t } from "../i18n";

/**
 * Welcome screen (CLAUDE.md section 5.5: "First launch (two paths,
 * never a role picker)"). Matches the Welcome.dc.html mockup board.
 *
 * - "I'm setting up care for someone" → verify phone → create circle
 *   → the user becomes Admin.
 * - "I have an invite" → open a link/QR/6-digit code → verify phone
 *   → role is already set by the invite, never chosen here.
 *
 * Both paths share the same phone-verification UI underneath, so this
 * screen only decides which flow they enter, not how verification
 * itself works.
 */
export default function Welcome() {
  return (
    <View style={styles.container}>
      <Text style={styles.brand}>{t("welcome.brand")}</Text>

      <View style={styles.hero}>
        <Text style={styles.headline}>{t("welcome.headline")}</Text>
        <Text style={styles.subhead}>{t("welcome.subhead")}</Text>
      </View>

      <View style={styles.actions}>
        <Link href="/onboarding/phone" asChild>
          <Pressable style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>
              {t("welcome.settingUpCta")}
            </Text>
          </Pressable>
        </Link>

        <Link href="/invite" asChild>
          <Pressable style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>
              {t("welcome.haveInviteCta")}
            </Text>
          </Pressable>
        </Link>

        <Text style={styles.legalNotice}>{t("welcome.legalNotice")}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl * 1.5,
    paddingBottom: spacing.xl,
    justifyContent: "space-between",
  },
  brand: {
    fontSize: typography.size.h1 - 2,
    fontFamily: typography.fontFamily.display,
    color: colors.primary,
    fontWeight: "700",
  },
  hero: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.lg,
  },
  headline: {
    fontSize: typography.size.h1Large,
    fontFamily: typography.fontFamily.display,
    color: colors.primary,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: typography.size.h1Large * 1.15,
  },
  subhead: {
    fontSize: typography.size.body,
    color: colors.mutedText,
    textAlign: "center",
    lineHeight: typography.size.body * 1.4,
  },
  actions: {
    gap: spacing.md,
  },
  primaryButton: {
    minHeight: sizes.minButtonHeight + 8,
    borderRadius: radii.lg - 2,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
  },
  primaryButtonText: {
    color: colors.textOnPrimary,
    fontSize: typography.size.bodyLarge - 1,
    fontWeight: "700",
    textAlign: "center",
  },
  secondaryButton: {
    minHeight: sizes.minButtonHeight + 8,
    borderRadius: radii.lg - 2,
    borderWidth: 3,
    borderColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
  },
  secondaryButtonText: {
    color: colors.primary,
    fontSize: typography.size.bodyLarge - 1,
    fontWeight: "700",
    textAlign: "center",
  },
  legalNotice: {
    marginTop: spacing.xs,
    fontSize: typography.size.label,
    color: colors.mutedText,
    textAlign: "center",
    lineHeight: typography.size.label * 1.4,
  },
});
