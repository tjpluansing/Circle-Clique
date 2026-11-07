import { useRouter } from "expo-router";
import { useEffect, useReducer } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radii, spacing, sizes, typography } from "../../theme/tokens";
import { t } from "../../i18n";
import {
  initialSosCountdownState,
  reduceSosCountdown,
} from "../../features/sos/sosCountdown";

/**
 * SOS countdown screen (CLAUDE.md section 6.3, matching SOS.dc.html).
 *
 * The countdown/cancel/send-now logic itself lives in
 * features/sos/sosCountdown.ts and is unit-tested there (section 4
 * rule 6: "SOS code is the highest-risk code... tested and
 * reviewed"). This component is only timer plumbing + rendering.
 *
 * Not yet wired to the backend: actually creating an `sos_events` row
 * and starting the escalation Edge Function needs a signed-in user,
 * which needs phone verification (on hold — Twilio setup paused). The
 * "Who will be alerted" list below is Circle #1's known contacts from
 * section 6.2 as a placeholder; real data comes from `alert_contacts`
 * once auth exists.
 */
export default function SosCountdown() {
  const router = useRouter();
  const [state, dispatch] = useReducer(
    reduceSosCountdown,
    initialSosCountdownState(),
  );

  useEffect(() => {
    if (state.status !== "counting") {
      return;
    }
    const id = setInterval(() => dispatch({ type: "tick" }), 1000);
    return () => clearInterval(id);
  }, [state.status]);

  useEffect(() => {
    if (state.status === "cancelled") {
      router.back();
    }
  }, [state.status, router]);

  if (state.status === "cancelled") {
    return null;
  }

  if (state.status === "sent") {
    return (
      <View style={[styles.container, styles.sentContainer]}>
        <Text style={styles.sentTitle}>{t("sos.alertSentTitle")}</Text>
        <Text style={styles.sentBody}>
          {t("sos.alertSentBody", { names: "Karla, Dad, Cousin" })}
        </Text>
        <Pressable style={styles.secondaryButton} onPress={() => router.back()}>
          <Text style={styles.secondaryButtonText}>{t("common.back")}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.emergencyLabel}>{t("sos.emergencyLabel")}</Text>
        <Text style={styles.headline}>{t("sos.countdownHeadline")}</Text>
      </View>

      <View
        accessibilityRole="timer"
        accessibilityLabel={`${state.secondsLeft} seconds`}
        style={styles.timerCircle}
      >
        <Text style={styles.timerDigit}>{state.secondsLeft}</Text>
      </View>

      <Pressable
        style={styles.cancelButton}
        onPress={() => dispatch({ type: "cancel" })}
      >
        <Text style={styles.cancelButtonText}>{t("sos.cancelImOkButton")}</Text>
      </Pressable>

      <Pressable
        style={styles.sendNowButton}
        onPress={() => dispatch({ type: "sendNow" })}
      >
        <Text style={styles.sendNowButtonText}>{t("sos.sendNowButton")}</Text>
      </Pressable>

      <View style={styles.whoCard}>
        <Text style={styles.whoTitle}>{t("sos.whoWillBeAlertedTitle")}</Text>
        <View style={styles.whoRow}>
          <Text style={styles.whoNames}>Karla, Dad, Cousin</Text>
          <Text style={styles.whoTiming}>{t("sos.rightAway")}</Text>
        </View>
        <View style={styles.whoRow}>
          <Text style={styles.whoNames}>Calls if no reply</Text>
          <Text style={styles.whoTiming}>{t("sos.afterOneMin")}</Text>
        </View>
        <View style={styles.whoRow}>
          <Text style={styles.whoNames}>Brother, guard house</Text>
          <Text style={styles.whoTiming}>{t("sos.afterTwoMin")}</Text>
        </View>
      </View>

      <View style={{ flex: 1 }} />

      <Pressable
        style={styles.call911Button}
        onPress={() => Linking.openURL("tel:911")}
      >
        <Text style={styles.call911ButtonText}>{t("sos.call911Button")}</Text>
      </Pressable>
      <Text style={styles.disclaimer}>{t("sos.disclaimer")}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.emergency,
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  header: {
    alignItems: "center",
  },
  emergencyLabel: {
    color: colors.textOnPrimary,
    fontSize: typography.size.label + 4,
    fontWeight: "700",
    letterSpacing: 2,
  },
  headline: {
    marginTop: spacing.xs,
    color: colors.textOnPrimary,
    fontFamily: typography.fontFamily.display,
    fontSize: typography.size.h1 + 4,
    fontWeight: "700",
    textAlign: "center",
  },
  timerCircle: {
    width: 176,
    height: 176,
    borderRadius: 88,
    borderWidth: 8,
    borderColor: colors.textOnPrimary,
    alignItems: "center",
    justifyContent: "center",
  },
  timerDigit: {
    color: colors.textOnPrimary,
    fontFamily: typography.fontFamily.display,
    fontSize: typography.size.countdownDigit,
    fontWeight: "700",
  },
  cancelButton: {
    width: "100%",
    minHeight: 72,
    borderRadius: radii.lg,
    backgroundColor: colors.textOnPrimary,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButtonText: {
    color: "#8F3320",
    fontSize: typography.size.h1 - 4,
    fontWeight: "700",
  },
  sendNowButton: {
    width: "100%",
    minHeight: sizes.minButtonHeight,
    borderRadius: radii.lg - 2,
    borderWidth: 3,
    borderColor: colors.textOnPrimary,
    alignItems: "center",
    justifyContent: "center",
  },
  sendNowButtonText: {
    color: colors.textOnPrimary,
    fontSize: typography.size.bodyLarge,
    fontWeight: "700",
  },
  whoCard: {
    width: "100%",
    backgroundColor: "#A63F27",
    borderRadius: radii.lg,
    padding: spacing.md,
  },
  whoTitle: {
    color: colors.textOnPrimary,
    fontSize: typography.size.body,
    fontWeight: "700",
    marginBottom: spacing.sm,
  },
  whoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: spacing.xs,
  },
  whoNames: {
    color: colors.textOnPrimary,
    fontSize: typography.size.body,
  },
  whoTiming: {
    color: colors.textOnPrimary,
    fontSize: typography.size.body,
    fontWeight: "700",
  },
  call911Button: {
    width: "100%",
    minHeight: 60,
    borderRadius: radii.lg - 2,
    backgroundColor: colors.text,
    alignItems: "center",
    justifyContent: "center",
  },
  call911ButtonText: {
    color: colors.textOnPrimary,
    fontSize: typography.size.bodyLarge,
    fontWeight: "700",
  },
  disclaimer: {
    color: colors.textOnPrimary,
    fontSize: typography.size.label + 1,
    textAlign: "center",
    lineHeight: (typography.size.label + 1) * 1.35,
  },
  sentContainer: {
    justifyContent: "center",
    gap: spacing.lg,
  },
  sentTitle: {
    color: colors.textOnPrimary,
    fontFamily: typography.fontFamily.display,
    fontSize: typography.size.h1Large,
    fontWeight: "700",
    textAlign: "center",
  },
  sentBody: {
    color: colors.textOnPrimary,
    fontSize: typography.size.bodyLarge,
    textAlign: "center",
  },
  secondaryButton: {
    minHeight: sizes.minButtonHeight,
    borderRadius: radii.lg - 2,
    borderWidth: 3,
    borderColor: colors.textOnPrimary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  secondaryButtonText: {
    color: colors.textOnPrimary,
    fontSize: typography.size.bodyLarge,
    fontWeight: "700",
  },
});
