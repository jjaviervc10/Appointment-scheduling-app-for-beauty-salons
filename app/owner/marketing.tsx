import React, { useEffect, useState } from 'react';
import { ScrollView, View, Text, StyleSheet, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radii } from '../../src/theme';
import { TopHeader } from '../../src/components/layout/TopHeader';
import { LoadingState } from '../../src/components/ui/LoadingState';
import { PrimaryButton } from '../../src/components/ui/PrimaryButton';
import { InstagramProfileCard } from '../../src/components/instagram/InstagramProfileCard';
import { InstagramPublishingLimitCard } from '../../src/components/instagram/InstagramPublishingLimitCard';
import { InstagramMediaList } from '../../src/components/instagram/InstagramMediaList';
import { InstagramCreateContainerForm } from '../../src/components/instagram/InstagramCreateContainerForm';
import { InstagramPublishConfirmModal } from '../../src/components/instagram/InstagramPublishConfirmModal';
import { useInstagram } from '../../src/hooks/use-instagram';

export default function MarketingScreen() {
  const {
    profileState,
    mediaState,
    limitState,
    creationId,
    containerLoading,
    containerError,
    publishLoading,
    publishError,
    publishSuccess,
    publishedId,
    loadAll,
    loadProfile,
    loadMedia,
    loadPublishingLimit,
    createContainer,
    publish,
    resetContainer,
  } = useInstagram();

  const [refreshing, setRefreshing] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  };

  const handlePublishConfirm = async () => {
    const published = await publish();
    if (published) {
      setConfirmVisible(false);
    }
  };

  const isInitialLoading =
    profileState.status === 'loading' &&
    mediaState.status === 'loading' &&
    limitState.status === 'loading';

  if (isInitialLoading) {
    return (
      <View style={styles.loadingScreen}>
        <TopHeader
          title="Instagram"
          subtitle="Administra la presencia de tu negocio en Instagram."
        />
        <LoadingState />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <TopHeader
        title="Instagram"
        subtitle="Administra la presencia de tu negocio en Instagram."
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void handleRefresh()}
            tintColor={colors.gold}
            colors={[colors.gold]}
          />
        }
      >
        {profileState.status === 'idle' || profileState.status === 'loading' ? (
          <SectionLoader label="Cargando perfil..." />
        ) : null}
        {profileState.status === 'error' ? (
          <SectionError message={profileState.message} onRetry={loadProfile} />
        ) : null}
        {profileState.status === 'success' ? (
          <InstagramProfileCard profile={profileState.data} />
        ) : null}

        {limitState.status === 'idle' || limitState.status === 'loading' ? (
          <SectionLoader label="Cargando cuota..." />
        ) : null}
        {limitState.status === 'error' ? (
          <SectionError message={limitState.message} onRetry={loadPublishingLimit} />
        ) : null}
        {limitState.status === 'success' ? (
          <InstagramPublishingLimitCard limit={limitState.data} />
        ) : null}

        {mediaState.status === 'idle' || mediaState.status === 'loading' ? (
          <SectionLoader label="Cargando publicaciones..." />
        ) : null}
        {mediaState.status === 'error' ? (
          <SectionError message={mediaState.message} onRetry={() => void loadMedia()} />
        ) : null}
        {mediaState.status === 'success' ? (
          <InstagramMediaList items={mediaState.data} />
        ) : null}

        {publishSuccess ? (
          <View style={styles.successBanner}>
            <Ionicons name="checkmark-circle" size={20} color={colors.success} />
            <Text style={styles.successText}>
              Publicacion realizada con exito en Instagram{publishedId ? `: ${publishedId}` : ''}.
            </Text>
          </View>
        ) : null}

        <InstagramCreateContainerForm
          loading={containerLoading}
          error={containerError}
          creationId={creationId}
          onSubmit={(imageUrl, caption) => void createContainer(imageUrl, caption)}
          onReset={resetContainer}
        />

        {creationId ? (
          <View style={styles.publishRow}>
            <PrimaryButton
              label="Publicar en Instagram"
              onPress={() => setConfirmVisible(true)}
              disabled={publishLoading}
              loading={publishLoading}
              icon="paper-plane-outline"
            />
          </View>
        ) : null}

        <View style={styles.bottomPad} />
      </ScrollView>

      <InstagramPublishConfirmModal
        visible={confirmVisible}
        loading={publishLoading}
        error={publishError}
        onConfirm={() => void handlePublishConfirm()}
        onCancel={() => setConfirmVisible(false)}
      />
    </View>
  );
}

function SectionLoader({ label }: { label: string }) {
  return (
    <View style={styles.sectionLoader}>
      <Ionicons name="hourglass-outline" size={20} color={colors.gold} />
      <Text style={styles.sectionLoaderText}>{label}</Text>
    </View>
  );
}

interface SectionErrorProps {
  message: string;
  onRetry: () => void;
}

function SectionError({ message, onRetry }: SectionErrorProps) {
  return (
    <View style={styles.errorCard}>
      <Ionicons name="alert-circle-outline" size={20} color={colors.error} />
      <Text style={styles.errorText}>{message}</Text>
      <PrimaryButton
        label="Reintentar"
        onPress={onRetry}
        style={styles.retryBtn}
        icon="refresh-outline"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.gray100,
  },
  loadingScreen: {
    flex: 1,
    backgroundColor: colors.gray100,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  sectionLoader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
    backgroundColor: colors.gray900,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.gray800,
  },
  sectionLoaderText: {
    ...typography.bodySmall,
    color: colors.gray400,
  },
  errorCard: {
    backgroundColor: colors.gray900,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.error,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
  },
  errorText: {
    ...typography.bodySmall,
    color: colors.error,
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: spacing.xs,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.successLight,
    borderWidth: 1,
    borderColor: colors.success,
    borderRadius: radii.lg,
    padding: spacing.md,
  },
  successText: {
    ...typography.bodySmall,
    color: colors.success,
    flex: 1,
  },
  publishRow: {
    marginTop: spacing.sm,
  },
  bottomPad: {
    height: spacing.xxl,
  },
});
