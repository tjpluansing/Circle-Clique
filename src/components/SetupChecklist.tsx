import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radii, spacing, typography } from "../theme/tokens";
import { t } from "../i18n";
import type { ChecklistItem } from "../features/setup/checklistItems";
import { countCompleted, toggleChecklistItem } from "../features/setup/checklistProgress";

/**
 * Shared Setup Checklist UI (CLAUDE.md section 11). Takes the item
 * list and completed-set as props so the Android and iPhone screens
 * are both thin wrappers around the same component — the content
 * differs per platform, the behavior doesn't.
 *
 * Status is never color alone (section 4 rule 5): each row pairs a
 * checkmark icon with its own text, not just a color change.
 */
export interface SetupChecklistProps {
  title: string;
  items: ChecklistItem[];
  completed: ReadonlySet<string>;
  onChangeCompleted: (next: Set<string>) => void;
}

export function SetupChecklist({
  title,
  items,
  completed,
  onChangeCompleted,
}: SetupChecklistProps) {
  const doneCount = countCompleted(items, completed);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.progress}>
        {t("setupChecklist.progressLabel", {
          done: doneCount,
          total: items.length,
        })}
      </Text>

      <View style={styles.list}>
        {items.map((item) => {
          const isDone = completed.has(item.id);
          return (
            <Pressable
              key={item.id}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: isDone }}
              style={styles.row}
              onPress={() =>
                onChangeCompleted(toggleChecklistItem(completed, item.id))
              }
            >
              <View
                style={[styles.checkbox, isDone && styles.checkboxChecked]}
              >
                {isDone && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <View style={styles.rowTextWrap}>
                <Text style={styles.rowText}>{t(item.labelKey)}</Text>
                {item.optional && (
                  <Text style={styles.optionalLabel}>
                    {t("setupChecklist.optionalLabel")}
                  </Text>
                )}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
    gap: spacing.md,
  },
  title: {
    fontSize: typography.size.h1,
    fontFamily: typography.fontFamily.display,
    color: colors.primary,
    fontWeight: "700",
  },
  progress: {
    fontSize: typography.size.body,
    color: colors.mutedText,
  },
  list: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: radii.sm - 4,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
  },
  checkmark: {
    color: colors.textOnPrimary,
    fontWeight: "700",
    fontSize: typography.size.label + 2,
  },
  rowTextWrap: {
    flex: 1,
    gap: spacing.xs,
  },
  rowText: {
    fontSize: typography.size.body,
    color: colors.text,
    lineHeight: typography.size.body * 1.35,
  },
  optionalLabel: {
    fontSize: typography.size.label,
    color: colors.mutedText,
    fontWeight: "700",
  },
});
