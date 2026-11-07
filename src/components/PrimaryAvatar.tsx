import { Image, StyleSheet, Text, View } from "react-native";
import { colors, typography } from "../theme/tokens";
import { getInitials } from "./avatarInitials";

/**
 * The Primary's photo, shown "beside their name everywhere" — My
 * People cards, health file header, SOS alerts and countdown,
 * responder screen, push notifications, the live-location web link,
 * and the printed emergency card (CLAUDE.md section 4 rule 9). Falls
 * back to initials when there's no photo yet; initials parsing is
 * unit-tested separately in avatarInitials.test.ts.
 *
 * One component, one set of rules, used everywhere a Primary's photo
 * appears — so "every screen and alert" (section 4 rule 9) is true by
 * construction instead of by every screen remembering to match it.
 *
 * Platform notes (section 2): pure React Native (Image/View/Text,
 * theme tokens), identical on Android and iPhone — no
 * src/platform/ adapter needed.
 */
export interface PrimaryAvatarProps {
  /** The Primary's full name — used for initials and the accessibility label. */
  name: string;
  /** Signed URL for the Primary's photo, once one exists. */
  photoUri?: string | null;
  /** Diameter in dp/pt. Defaults to 48 (a typical list-row size). */
  size?: number;
  /** Border width in dp/pt. Defaults to a thin ring; the setup screen uses a thicker one. */
  borderWidth?: number;
}

export function PrimaryAvatar({
  name,
  photoUri,
  size = 48,
  borderWidth = 2,
}: PrimaryAvatarProps) {
  const dimensionStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
    borderWidth,
  };

  if (photoUri) {
    return (
      <Image
        source={{ uri: photoUri }}
        accessibilityRole="image"
        accessibilityLabel={`Photo of ${name}`}
        style={[styles.photo, dimensionStyle]}
      />
    );
  }

  const initials = getInitials(name);
  // Scale the initials' font size with the avatar, same ratio as the
  // mockups' large setup-screen placeholder vs. small list-row ones.
  const fontSize = Math.max(size * 0.38, typography.size.label);

  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={`${name}'s initials`}
      style={[styles.initialsCircle, dimensionStyle]}
    >
      <Text style={[styles.initialsText, { fontSize }]}>{initials}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  photo: {
    borderColor: colors.highlight,
    backgroundColor: colors.card,
  },
  initialsCircle: {
    borderColor: colors.highlight,
    backgroundColor: colors.secondary,
    alignItems: "center",
    justifyContent: "center",
  },
  initialsText: {
    color: colors.text,
    fontWeight: "700",
  },
});
