import { StyleSheet, Text, View } from "react-native";
import { colors, spacing, typography } from "../theme/tokens";
import { t } from "../i18n";

/**
 * Placeholder home route. Real routing (the two first-launch paths
 * from section 5.5, the Primary Mode "My Day" home, Full Mode
 * dashboard) replaces this in Phase 1 once auth and circles exist.
 */
export default function PlaceholderHome() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Circle Clique</Text>
      <Text style={styles.body}>{t("sos.disclaimer")}</Text>
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
    color: colors.text,
    textAlign: "center",
  },
});
