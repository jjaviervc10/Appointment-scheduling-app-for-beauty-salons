import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, spacing, typography } from '../../theme';
import type { InstagramPublishDestination } from '../../types/marketing-media.types';
import { MARKETING_WHATSAPP_PHONE } from '../../config/marketing';

interface Props {
  destination: InstagramPublishDestination;
  imageUrl: string;
  caption: string;
  includeWhatsAppCta: boolean;
  whatsappMessage: string;
}

const DEFAULT_WHATSAPP_MESSAGE = 'Hola, quiero agendar una cita.';

export function InstagramPostPreview({
  destination,
  imageUrl,
  caption,
  includeWhatsAppCta,
  whatsappMessage,
}: Props) {
  const trimmedCaption = caption.trim();
  const previewMessage = whatsappMessage.trim() || DEFAULT_WHATSAPP_MESSAGE;
  const simulatedWhatsAppLink = `wa.me/${MARKETING_WHATSAPP_PHONE}?text=…`;

  if (destination === 'story') {
    return (
      <View style={styles.previewSection}>
        <View style={styles.previewHeadingRow}>
          <Text style={styles.previewHeading}>Vista previa de Historia</Text>
          <Text style={styles.approximateBadge}>Aproximada</Text>
        </View>
        <View style={styles.storyFrame}>
          <Image source={{ uri: imageUrl }} style={styles.storyImage} resizeMode="cover" />
          <View style={styles.storyShade} />
          <View style={styles.storyHeader}>
            <View style={styles.avatar}><Text style={styles.avatarText}>JL</Text></View>
            <Text style={styles.storyAccount}>jlbarberstudio</Text>
            <Ionicons name="ellipsis-horizontal" size={18} color={colors.white} />
          </View>
          <View style={styles.storyFooter}>
            <View style={styles.storyReply}>
              <Text style={styles.storyReplyText}>Enviar mensaje</Text>
            </View>
            <Ionicons name="heart-outline" size={22} color={colors.white} />
            <Ionicons name="paper-plane-outline" size={21} color={colors.white} />
          </View>
        </View>
        <Text style={styles.previewNote}>Las historias no admiten enlace de WhatsApp en este flujo.</Text>
      </View>
    );
  }

  return (
    <View style={styles.previewSection}>
      <View style={styles.previewHeadingRow}>
        <Text style={styles.previewHeading}>Vista previa de Feed</Text>
        <Text style={styles.approximateBadge}>Aproximada</Text>
      </View>
      <View style={styles.feedFrame}>
        <View style={styles.feedHeader}>
          <View style={styles.avatar}><Text style={styles.avatarText}>JL</Text></View>
          <View style={styles.accountCopy}>
            <Text style={styles.accountName}>jlbarberstudio</Text>
            <Text style={styles.location}>JL Barber Studio</Text>
          </View>
          <Ionicons name="ellipsis-horizontal" size={18} color={colors.white} />
        </View>
        <Image source={{ uri: imageUrl }} style={styles.feedImage} resizeMode="cover" />
        <View style={styles.feedActions}>
          <View style={styles.feedActionsLeft}>
            <Ionicons name="heart-outline" size={23} color={colors.white} />
            <Ionicons name="chatbubble-outline" size={21} color={colors.white} />
            <Ionicons name="paper-plane-outline" size={21} color={colors.white} />
          </View>
          <Ionicons name="bookmark-outline" size={22} color={colors.white} />
        </View>
        <View style={styles.captionBlock}>
          {trimmedCaption ? (
            <Text style={styles.captionText}>
              <Text style={styles.accountName}>jlbarberstudio </Text>{trimmedCaption}
            </Text>
          ) : (
            <Text style={styles.emptyCaption}>Sin caption</Text>
          )}
          {includeWhatsAppCta ? (
            <Text style={styles.captionText}>
              <Text style={styles.whatsappCaptionLabel}>Agenda por WhatsApp:</Text>
              {'\n'}
              {simulatedWhatsAppLink}
              {'\n'}
              “{previewMessage}”
            </Text>
          ) : null}
        </View>
      </View>
      <Text style={styles.previewNote}>
        {includeWhatsAppCta
          ? 'Instagram puede ajustar tipografía, recorte y saltos de línea. El enlace de WhatsApp se agregará al texto de la publicación.'
          : 'Instagram puede ajustar tipografía, recorte y saltos de línea.'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  previewSection: { gap: spacing.sm, marginTop: spacing.xs },
  previewHeadingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  previewHeading: { ...typography.bodySmall, color: colors.white, fontWeight: '700' },
  approximateBadge: { ...typography.caption, color: colors.gold, backgroundColor: colors.gold + '18', borderRadius: radii.full, paddingHorizontal: spacing.sm, paddingVertical: spacing.xxs },
  feedFrame: { width: '100%', maxWidth: 380, alignSelf: 'center', backgroundColor: colors.black, borderWidth: 1, borderColor: colors.gray700, borderRadius: radii.md, overflow: 'hidden' },
  feedHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm },
  avatar: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center' },
  avatarText: { ...typography.caption, color: colors.black, fontWeight: '800' },
  accountCopy: { flex: 1 },
  accountName: { ...typography.caption, color: colors.white, fontWeight: '700' },
  location: { ...typography.caption, color: colors.gray400, fontSize: 10 },
  feedImage: { width: '100%', aspectRatio: 1, backgroundColor: colors.gray900 },
  feedActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.sm, paddingTop: spacing.sm },
  feedActionsLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  captionBlock: { padding: spacing.sm, gap: spacing.sm },
  captionText: { ...typography.caption, color: colors.gray200, lineHeight: 17 },
  emptyCaption: { ...typography.caption, color: colors.gray500, fontStyle: 'italic' },
  whatsappCaptionLabel: { color: colors.white, fontWeight: '600' },
  storyFrame: { width: '72%', maxWidth: 280, aspectRatio: 9 / 16, alignSelf: 'center', backgroundColor: colors.gray900, borderRadius: radii.lg, overflow: 'hidden', borderWidth: 1, borderColor: colors.gray700 },
  storyImage: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  storyShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.12)' },
  storyHeader: { position: 'absolute', top: spacing.md, left: spacing.md, right: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  storyAccount: { ...typography.caption, color: colors.white, fontWeight: '700', flex: 1 },
  storyFooter: { position: 'absolute', left: spacing.md, right: spacing.md, bottom: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  storyReply: { flex: 1, borderWidth: 1, borderColor: colors.white, borderRadius: radii.full, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  storyReplyText: { ...typography.caption, color: colors.white },
  previewNote: { ...typography.caption, color: colors.gray500, lineHeight: 16 },
});
