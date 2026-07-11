import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SectionCard } from '../ui/SectionCard';
import { colors, spacing, typography, radii } from '../../theme';
import type { InstagramMediaItem, InstagramMediaType } from '../../types/instagram.types';

interface Props {
  items: InstagramMediaItem[];
}

const MEDIA_TYPE_LABELS: Record<InstagramMediaType, string> = {
  IMAGE: 'Imagen',
  VIDEO: 'Video',
  CAROUSEL_ALBUM: 'Carrusel',
};

const MEDIA_TYPE_ICONS: Record<InstagramMediaType, keyof typeof Ionicons.glyphMap> = {
  IMAGE: 'image-outline',
  VIDEO: 'videocam-outline',
  CAROUSEL_ALBUM: 'albums-outline',
};

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return timestamp;

  return date.toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function isHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

function MediaRow({ item }: { item: InstagramMediaItem }) {
  const icon = MEDIA_TYPE_ICONS[item.mediaType];
  const typeLabel = MEDIA_TYPE_LABELS[item.mediaType];
  const canOpenPermalink = isHttpsUrl(item.permalink);

  const handleOpenPermalink = () => {
    if (!canOpenPermalink) return;
    void Linking.openURL(item.permalink);
  };

  return (
    <View style={styles.mediaRow}>
      <View style={styles.mediaIcon}>
        <Ionicons name={icon} size={20} color={colors.gold} />
      </View>
      <View style={styles.mediaInfo}>
        <View style={styles.mediaHeader}>
          <Text style={styles.mediaType}>{typeLabel}</Text>
          <Text style={styles.mediaDate}>{formatTimestamp(item.timestamp)}</Text>
        </View>
        {item.caption ? (
          <Text style={styles.mediaCaption} numberOfLines={2}>{item.caption}</Text>
        ) : (
          <Text style={styles.mediaCaptionEmpty}>Sin caption</Text>
        )}
      </View>
      {canOpenPermalink ? (
        <TouchableOpacity
          onPress={handleOpenPermalink}
          activeOpacity={0.7}
          style={styles.linkBtn}
          accessibilityRole="button"
          accessibilityLabel="Abrir publicacion en Instagram"
        >
          <Ionicons name="open-outline" size={16} color={colors.gray500} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

export function InstagramMediaList({ items }: Props) {
  return (
    <SectionCard title="Publicaciones recientes">
      {items.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="images-outline" size={32} color={colors.gray600} />
          <Text style={styles.emptyText}>No hay publicaciones recientes</Text>
        </View>
      ) : (
        <View>
          {items.map((item, index) => (
            <React.Fragment key={item.id}>
              {index > 0 && <View style={styles.divider} />}
              <MediaRow item={item} />
            </React.Fragment>
          ))}
        </View>
      )}
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  mediaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  mediaIcon: {
    width: 36,
    height: 36,
    borderRadius: radii.sm,
    backgroundColor: colors.gray800,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaInfo: {
    flex: 1,
    minWidth: 0,
  },
  mediaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  mediaType: {
    ...typography.bodySmall,
    color: colors.white,
    fontWeight: '600',
  },
  mediaDate: {
    ...typography.caption,
    color: colors.gray500,
  },
  mediaCaption: {
    ...typography.caption,
    color: colors.gray400,
    lineHeight: 16,
  },
  mediaCaptionEmpty: {
    ...typography.caption,
    color: colors.gray600,
    fontStyle: 'italic',
  },
  linkBtn: {
    padding: spacing.xs,
    alignSelf: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: colors.gray800,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  emptyText: {
    ...typography.bodySmall,
    color: colors.gray500,
  },
});
