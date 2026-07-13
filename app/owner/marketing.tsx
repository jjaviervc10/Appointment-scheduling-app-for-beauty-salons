import React, { useEffect, useState } from 'react';
import { ScrollView, View, Text, StyleSheet, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radii } from '../../src/theme';
import { TopHeader } from '../../src/components/layout/TopHeader';
import { LoadingState } from '../../src/components/ui/LoadingState';
import { PrimaryButton } from '../../src/components/ui/PrimaryButton';
import { InstagramProfileCard } from '../../src/components/instagram/InstagramProfileCard';
import { InstagramMediaList } from '../../src/components/instagram/InstagramMediaList';
import { InstagramCreateContainerForm } from '../../src/components/instagram/InstagramCreateContainerForm';
import { InstagramPublishConfirmModal } from '../../src/components/instagram/InstagramPublishConfirmModal';
import { useInstagram } from '../../src/hooks/use-instagram';
import { useMarketingMedia } from '../../src/hooks/use-marketing-media';
import type { InstagramPublishDestination } from '../../src/types/marketing-media.types';

export default function MarketingScreen() {
  const {
    profileState,
    mediaState,
    limitState,
    publishLoading,
    publishError,
    publishSuccess,
    loadAll,
    loadProfile,
    loadMedia,
    loadPublishingLimit,
    publish,
  } = useInstagram();
  const {
    selectedMedia,
    preparedCreationId,
    uploadLoading,
    isGenerating,
    isEditing,
    prepareLoading,
    prepareError,
    error: marketingMediaError,
    uploadMedia,
    generateMedia,
    editMedia,
    listMedia: listMarketingMedia,
    prepareInstagramMedia,
    resetInstagramPreparation,
    resetMediaFlow,
  } = useMarketingMedia();

  const [refreshing, setRefreshing] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [publishDestination, setPublishDestination] = useState<InstagramPublishDestination>('feed');

  useEffect(() => {
    void loadAll();
    void listMarketingMedia();
  }, [listMarketingMedia, loadAll]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadAll(), listMarketingMedia()]);
    setRefreshing(false);
  };

  const handlePublishConfirm = async () => {
    if (!preparedCreationId) return;
    const published = await publish(preparedCreationId);
    if (published) {
      setConfirmVisible(false);
      resetMediaFlow();
    }
  };

  const isInitialLoading =
    profileState.status === 'loading' &&
    mediaState.status === 'loading' &&
    limitState.status === 'loading';

  if (isInitialLoading) {
    return (
      <View style={styles.loadingScreen}>
        <TopHeader title="Instagram" />
        <LoadingState />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <TopHeader title="Instagram" />

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
        {profileState.status === 'idle' ||
        profileState.status === 'loading' ||
        limitState.status === 'idle' ||
        limitState.status === 'loading' ? (
          <SectionLoader label="Cargando estado de Instagram..." />
        ) : null}
        {profileState.status === 'error' ? (
          <SectionError
            title="No pudimos cargar la cuenta de Instagram"
            message={profileState.message}
            onRetry={loadProfile}
          />
        ) : null}
        {limitState.status === 'error' ? (
          <SectionError
            title="No pudimos cargar la cuota"
            message={limitState.message}
            onRetry={loadPublishingLimit}
          />
        ) : null}
        {profileState.status === 'success' ? (
          <InstagramProfileCard
            profile={profileState.data}
            limit={limitState.status === 'success' ? limitState.data : null}
          />
        ) : null}

        {publishSuccess ? (
          <View style={styles.successBanner}>
            <Ionicons name="checkmark-circle" size={20} color={colors.success} />
            <Text style={styles.successText}>
              Publicacion realizada con exito en Instagram.
            </Text>
          </View>
        ) : null}

        <InstagramCreateContainerForm
          uploadLoading={uploadLoading}
          prepareLoading={prepareLoading}
          error={marketingMediaError}
          prepareError={prepareError}
          selectedMedia={selectedMedia}
          preparedCreationId={preparedCreationId}
          publishLoading={publishLoading}
          onUpload={(file, caption) => void uploadMedia(file, caption)}
          onGenerate={(payload) => void generateMedia(payload)}
          onEdit={(payload) => void editMedia(payload)}
          onPrepare={(options) => void prepareInstagramMedia(selectedMedia?.mediaId, options)}
          onDestinationChange={setPublishDestination}
          onPublish={() => setConfirmVisible(true)}
          onResetPreparation={resetInstagramPreparation}
          onReset={resetMediaFlow}
          isGenerating={isGenerating}
          isEditing={isEditing}
        />

        {mediaState.status === 'idle' || mediaState.status === 'loading' ? (
          <SectionLoader label="Cargando publicaciones..." />
        ) : null}
        {mediaState.status === 'error' ? (
          <SectionError
            title="No pudimos cargar publicaciones recientes"
            message={mediaState.message}
            onRetry={() => void loadMedia()}
          />
        ) : null}
        {mediaState.status === 'success' ? (
          <InstagramMediaList items={mediaState.data} initialVisibleCount={3} />
        ) : null}

        <View style={styles.bottomPad} />
      </ScrollView>

      <InstagramPublishConfirmModal
        visible={confirmVisible}
        loading={publishLoading}
        error={publishError}
        destination={publishDestination}
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
  title?: string;
  message: string;
  onRetry: () => void;
}

function SectionError({ title = 'No pudimos cargar esta seccion', message, onRetry }: SectionErrorProps) {
  return (
    <View style={styles.errorCard}>
      <Ionicons name="alert-circle-outline" size={20} color={colors.error} />
      <Text style={styles.errorTitle}>{title}</Text>
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
    backgroundColor: colors.black,
  },
  loadingScreen: {
    flex: 1,
    backgroundColor: colors.black,
  },
  scroll: {
    flex: 1,
    backgroundColor: colors.black,
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
  errorTitle: {
    ...typography.bodySmall,
    color: colors.white,
    fontWeight: '700',
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
  bottomPad: {
    height: spacing.xxl,
  },
});
