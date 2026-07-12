import React, { useEffect, useState } from 'react';
import {
  Image,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SectionCard } from '../ui/SectionCard';
import { PrimaryButton } from '../ui/PrimaryButton';
import { colors, spacing, typography, radii } from '../../theme';
import type {
  EditMarketingMediaRequest,
  GenerateMarketingMediaRequest,
  MarketingMediaMimeType,
  MarketingMediaResult,
  MarketingMediaUploadFile,
} from '../../types/marketing-media.types';
import {
  MARKETING_MEDIA_ALLOWED_MIME_TYPES,
  MARKETING_MEDIA_MAX_CAPTION_LENGTH,
  MARKETING_MEDIA_MAX_UPLOAD_BYTES,
} from '../../types/marketing-media.types';

interface Props {
  uploadLoading: boolean;
  isGenerating: boolean;
  isEditing: boolean;
  prepareLoading: boolean;
  error: string | null;
  selectedMedia: MarketingMediaResult | null;
  preparedCreationId: string | null;
  publishLoading: boolean;
  onUpload: (file: MarketingMediaUploadFile, caption: string) => void;
  onGenerate: (payload: GenerateMarketingMediaRequest) => void;
  onEdit: (payload: EditMarketingMediaRequest) => void;
  onPrepare: () => void;
  onPublish: () => void;
  onReset: () => void;
}

type CreationMode = 'upload' | 'generate' | 'edit';
type WizardStepKey = 'content' | 'save' | 'prepare' | 'publish';
type WizardStepStatus = 'pending' | 'active' | 'completed';

interface WizardStep {
  key: WizardStepKey;
  label: string;
  status: WizardStepStatus;
}

interface ModeConfig {
  label: string;
  title: string;
  description: string;
  buttonLabel: string;
  loadingTitle: string;
  loadingText: string;
  successTitle: string;
  successText: string;
}

const MIN_PROMPT_LENGTH = 10;
const MAX_PROMPT_LENGTH = 1000;

const MODE_CONFIG: Record<CreationMode, ModeConfig> = {
  upload: {
    label: 'Subir imagen',
    title: 'Subir imagen',
    description: 'Selecciona una imagen lista para preparar tu publicación.',
    buttonLabel: 'Subir imagen',
    loadingTitle: 'Subiendo imagen...',
    loadingText: 'Estamos guardando tu imagen.',
    successTitle: 'Imagen lista',
    successText: 'Tu imagen se guardó correctamente. Ahora puedes prepararla para Instagram.',
  },
  generate: {
    label: 'Generar con IA',
    title: 'Generar con IA',
    description: 'Describe la imagen que quieres crear para tu publicación.',
    buttonLabel: 'Generar imagen',
    loadingTitle: 'Generando imagen...',
    loadingText: 'Esto puede tardar unos segundos.',
    successTitle: 'Imagen generada',
    successText: 'Tu imagen está lista. Revísala y prepárala para Instagram.',
  },
  edit: {
    label: 'Editar con IA',
    title: 'Editar imagen con IA',
    description: 'Sube una imagen de referencia y describe cómo quieres transformarla.',
    buttonLabel: 'Editar imagen',
    loadingTitle: 'Editando imagen...',
    loadingText: 'Esto puede tardar unos segundos.',
    successTitle: 'Imagen editada',
    successText: 'Tu nueva versión está lista. Revísala y prepárala para Instagram.',
  },
};

function isAllowedMimeType(value: string): value is MarketingMediaMimeType {
  return MARKETING_MEDIA_ALLOWED_MIME_TYPES.includes(value as MarketingMediaMimeType);
}

function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function validateImageFile(file: File | null): string | null {
  if (!file) {
    return 'Selecciona una imagen antes de continuar.';
  }

  if (!isAllowedMimeType(file.type)) {
    return 'Usa una imagen JPG, PNG o WebP.';
  }

  if (file.size > MARKETING_MEDIA_MAX_UPLOAD_BYTES) {
    return 'La imagen no puede exceder 10 MB.';
  }

  return null;
}

function validatePrompt(prompt: string): string | null {
  const trimmedPrompt = prompt.trim();
  if (!trimmedPrompt) {
    return 'Escribe una descripción para crear la imagen.';
  }

  if (trimmedPrompt.length < MIN_PROMPT_LENGTH) {
    return `La descripción debe tener al menos ${MIN_PROMPT_LENGTH} caracteres.`;
  }

  if (trimmedPrompt.length > MAX_PROMPT_LENGTH) {
    return `La descripción no puede exceder ${MAX_PROMPT_LENGTH} caracteres.`;
  }

  return null;
}

function buildWizardSteps(hasContent: boolean, hasSavedMedia: boolean, hasPreparedPost: boolean): WizardStep[] {
  return [
    {
      key: 'content',
      label: 'Contenido',
      status: hasContent || hasSavedMedia || hasPreparedPost ? 'completed' : 'active',
    },
    {
      key: 'save',
      label: 'Guardar',
      status: hasSavedMedia || hasPreparedPost ? 'completed' : hasContent ? 'active' : 'pending',
    },
    {
      key: 'prepare',
      label: 'Preparar',
      status: hasPreparedPost ? 'completed' : hasSavedMedia ? 'active' : 'pending',
    },
    {
      key: 'publish',
      label: 'Publicar',
      status: hasPreparedPost ? 'active' : 'pending',
    },
  ];
}

export function InstagramCreateContainerForm({
  uploadLoading,
  isGenerating,
  isEditing,
  prepareLoading,
  error,
  selectedMedia,
  preparedCreationId,
  publishLoading,
  onUpload,
  onGenerate,
  onEdit,
  onPrepare,
  onPublish,
  onReset,
}: Props) {
  const [mode, setMode] = useState<CreationMode>('upload');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [editFile, setEditFile] = useState<File | null>(null);
  const [uploadPreviewUrl, setUploadPreviewUrl] = useState<string | null>(null);
  const [editPreviewUrl, setEditPreviewUrl] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [stylePrompt, setStylePrompt] = useState('');
  const [caption, setCaption] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (uploadPreviewUrl && typeof URL !== 'undefined') {
        URL.revokeObjectURL(uploadPreviewUrl);
      }
      if (editPreviewUrl && typeof URL !== 'undefined') {
        URL.revokeObjectURL(editPreviewUrl);
      }
    };
  }, [editPreviewUrl, uploadPreviewUrl]);

  const isWorking = uploadLoading || isGenerating || isEditing || prepareLoading || publishLoading;
  const config = MODE_CONFIG[mode];
  const hasPreparedPost = Boolean(preparedCreationId);
  const hasSavedMedia = Boolean(selectedMedia);
  const activePrompt = prompt.trim();
  const hasContent =
    mode === 'upload'
      ? Boolean(uploadFile)
      : mode === 'generate'
        ? activePrompt.length >= MIN_PROMPT_LENGTH
        : Boolean(editFile) && activePrompt.length >= MIN_PROMPT_LENGTH;
  const wizardSteps = buildWizardSteps(hasContent, hasSavedMedia, hasPreparedPost);
  const resultPreviewUrl = selectedMedia?.publicUrl ?? null;
  const draftPreviewUrl = mode === 'edit' ? editPreviewUrl : uploadPreviewUrl;
  const previewUrl = resultPreviewUrl || draftPreviewUrl;
  const captionLength = caption.trim().length;
  const resetLabel = hasPreparedPost ? 'Empezar de nuevo' : mode === 'generate' ? 'Cambiar prompt' : 'Cambiar imagen';
  const showPrompt = mode === 'generate' || mode === 'edit';
  const showFilePicker = mode === 'upload' || mode === 'edit';
  const currentFile = mode === 'edit' ? editFile : uploadFile;
  const isPrimaryLoading =
    (mode === 'upload' && uploadLoading) ||
    (mode === 'generate' && isGenerating) ||
    (mode === 'edit' && isEditing);

  const revokePreview = (value: string | null) => {
    if (value && typeof URL !== 'undefined') {
      URL.revokeObjectURL(value);
    }
  };

  const resetLocalFlow = () => {
    revokePreview(uploadPreviewUrl);
    revokePreview(editPreviewUrl);
    setUploadPreviewUrl(null);
    setEditPreviewUrl(null);
    setUploadFile(null);
    setEditFile(null);
    setPrompt('');
    setStylePrompt('');
    setCaption('');
    setValidationError(null);
    onReset();
  };

  const handleModeChange = (nextMode: CreationMode) => {
    if (nextMode === mode || isWorking) return;
    resetLocalFlow();
    setMode(nextMode);
  };

  const handleSelectedFile = (file: File, targetMode: 'upload' | 'edit') => {
    setValidationError(null);
    onReset();

    if (typeof URL !== 'undefined') {
      const nextPreviewUrl = URL.createObjectURL(file);
      if (targetMode === 'upload') {
        revokePreview(uploadPreviewUrl);
        setUploadPreviewUrl(nextPreviewUrl);
      } else {
        revokePreview(editPreviewUrl);
        setEditPreviewUrl(nextPreviewUrl);
      }
    }

    if (targetMode === 'upload') {
      setUploadFile(file);
    } else {
      setEditFile(file);
    }
  };

  const handleSelectFile = () => {
    setValidationError(null);

    if (Platform.OS !== 'web' || typeof document === 'undefined') {
      setValidationError('La selección de imagen está disponible en la versión web.');
      return;
    }

    const targetMode = mode === 'edit' ? 'edit' : 'upload';
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = MARKETING_MEDIA_ALLOWED_MIME_TYPES.join(',');
    input.onchange = () => {
      const file = input.files?.[0];
      if (file) {
        handleSelectedFile(file, targetMode);
      }
    };
    input.click();
  };

  const validateCommonText = (): boolean => {
    if (caption.trim().length > MARKETING_MEDIA_MAX_CAPTION_LENGTH) {
      setValidationError(`El caption no puede exceder ${MARKETING_MEDIA_MAX_CAPTION_LENGTH} caracteres.`);
      return false;
    }

    return true;
  };

  const handleUpload = () => {
    setValidationError(null);
    const fileError = validateImageFile(uploadFile);
    if (fileError) {
      setValidationError(fileError);
      return;
    }
    if (!validateCommonText() || !uploadFile || !isAllowedMimeType(uploadFile.type)) return;

    onUpload(
      {
        file: uploadFile,
        fileName: uploadFile.name || 'instagram-image',
        mimeType: uploadFile.type,
      },
      caption.trim(),
    );
  };

  const handleGenerate = () => {
    setValidationError(null);
    const promptError = validatePrompt(prompt);
    if (promptError) {
      setValidationError(promptError);
      return;
    }
    if (!validateCommonText()) return;

    onGenerate({
      prompt: prompt.trim(),
      caption: caption.trim() || undefined,
      style: stylePrompt.trim() || undefined,
    });
  };

  const handleEdit = () => {
    setValidationError(null);
    const fileError = validateImageFile(editFile);
    if (fileError) {
      setValidationError(fileError);
      return;
    }
    const promptError = validatePrompt(prompt);
    if (promptError) {
      setValidationError(promptError);
      return;
    }
    if (!validateCommonText() || !editFile) return;

    onEdit({
      file: editFile,
      prompt: prompt.trim(),
      caption: caption.trim() || undefined,
      style: stylePrompt.trim() || undefined,
    });
  };

  const handlePrimaryAction = () => {
    if (mode === 'upload') {
      handleUpload();
      return;
    }

    if (mode === 'generate') {
      handleGenerate();
      return;
    }

    handleEdit();
  };

  return (
    <SectionCard title="Crear publicación">
      <View style={styles.modeSelector}>
        {(['upload', 'generate', 'edit'] as const).map((item) => {
          const isActive = item === mode;
          return (
            <TouchableOpacity
              key={item}
              style={[styles.modeButton, isActive && styles.modeButtonActive]}
              onPress={() => handleModeChange(item)}
              activeOpacity={0.8}
              disabled={isWorking}
              accessibilityRole="button"
            >
              <Text style={[styles.modeButtonText, isActive && styles.modeButtonTextActive]}>
                {MODE_CONFIG[item].label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.wizard}>
        {wizardSteps.map((step, index) => (
          <View key={step.key} style={styles.wizardStep}>
            <View style={[styles.stepDot, styles[`stepDot_${step.status}`]]}>
              {step.status === 'completed' ? (
                <Ionicons name="checkmark" size={12} color={colors.black} />
              ) : (
                <Text style={[styles.stepDotText, styles[`stepDotText_${step.status}`]]}>
                  {index + 1}
                </Text>
              )}
            </View>
            <Text style={[styles.stepLabel, styles[`stepLabel_${step.status}`]]} numberOfLines={1}>
              {step.label}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.modeIntro}>
        <Text style={styles.modeTitle}>{config.title}</Text>
        <Text style={styles.hint}>{config.description}</Text>
      </View>

      {showFilePicker ? (
        <TouchableOpacity
          style={styles.filePicker}
          onPress={handleSelectFile}
          activeOpacity={0.75}
          disabled={isWorking}
          accessibilityRole="button"
          accessibilityLabel={mode === 'edit' ? 'Seleccionar imagen de referencia' : 'Seleccionar imagen'}
        >
          <Ionicons name="image-outline" size={20} color={colors.gold} />
          <View style={styles.filePickerTextWrap}>
            <Text style={styles.filePickerTitle}>
              {currentFile ? currentFile.name : mode === 'edit' ? 'Seleccionar referencia' : 'Seleccionar imagen'}
            </Text>
            <Text style={styles.filePickerMeta}>JPG, PNG o WebP · máximo 10 MB</Text>
          </View>
        </TouchableOpacity>
      ) : null}

      {showPrompt ? (
        <>
          <Text style={styles.label}>Prompt <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={[styles.input, styles.promptInput]}
            value={prompt}
            onChangeText={(value) => {
              setPrompt(value);
              if (selectedMedia) onReset();
            }}
            placeholder={
              mode === 'generate'
                ? 'Ejemplo: Imagen promocional premium para barbería, corte clásico, fondo oscuro elegante, iluminación profesional.'
                : 'Ejemplo: Convierte esta imagen en una publicación premium para Instagram, con fondo elegante e iluminación profesional.'
            }
            placeholderTextColor={colors.gray600}
            multiline
            numberOfLines={4}
            editable={!isWorking && !preparedCreationId}
          />

          <Text style={styles.label}>Estilo <Text style={styles.optional}>(opcional)</Text></Text>
          <TextInput
            style={styles.input}
            value={stylePrompt}
            onChangeText={setStylePrompt}
            placeholder="Ejemplo: elegante, profesional, premium"
            placeholderTextColor={colors.gray600}
            editable={!isWorking && !preparedCreationId}
          />
        </>
      ) : null}

      {previewUrl ? (
        <Image source={{ uri: previewUrl }} style={styles.preview} resizeMode="cover" />
      ) : null}

      {currentFile && !resultPreviewUrl ? (
        <Text style={styles.fileMeta}>
          {currentFile.type || 'Imagen'} · {formatFileSize(currentFile.size)}
        </Text>
      ) : null}

      <View style={styles.captionHeader}>
        <Text style={styles.label}>Caption <Text style={styles.optional}>(opcional)</Text></Text>
        <Text style={styles.captionCount}>
          {captionLength}/{MARKETING_MEDIA_MAX_CAPTION_LENGTH}
        </Text>
      </View>
      <TextInput
        style={[styles.input, styles.captionInput]}
        value={caption}
        onChangeText={setCaption}
        placeholder="Escribe un caption para la publicación..."
        placeholderTextColor={colors.gray600}
        multiline
        numberOfLines={3}
        editable={!isWorking && !preparedCreationId}
      />

      {isPrimaryLoading ? (
        <View style={styles.loadingBox}>
          <Ionicons name="sparkles-outline" size={18} color={colors.gold} />
          <View style={styles.statusInfo}>
            <Text style={styles.loadingTitle}>{config.loadingTitle}</Text>
            <Text style={styles.loadingText}>{config.loadingText}</Text>
          </View>
        </View>
      ) : null}

      {validationError ? (
        <View style={styles.errorRow}>
          <Ionicons name="alert-circle-outline" size={14} color={colors.error} />
          <Text style={styles.errorText}>{validationError}</Text>
        </View>
      ) : null}

      {error ? (
        <View style={styles.errorRow}>
          <Ionicons name="alert-circle-outline" size={14} color={colors.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {selectedMedia ? (
        <View style={styles.uploadedBox}>
          <Ionicons name="cloud-done-outline" size={18} color={colors.success} />
          <View style={styles.statusInfo}>
            <Text style={styles.uploadedTitle}>{config.successTitle}</Text>
            <Text style={styles.uploadedText}>{config.successText}</Text>
          </View>
        </View>
      ) : null}

      {preparedCreationId ? (
        <View style={styles.preparedBox}>
          <Ionicons name="checkmark-circle" size={20} color={colors.success} />
          <View style={styles.statusInfo}>
            <Text style={styles.preparedTitle}>Publicación preparada</Text>
            <Text style={styles.preparedText}>Ya puedes publicarla en Instagram cuando estés listo.</Text>
          </View>
        </View>
      ) : null}

      <View style={styles.buttonStack}>
        {!selectedMedia ? (
          <PrimaryButton
            label={isPrimaryLoading ? config.loadingTitle : config.buttonLabel}
            onPress={handlePrimaryAction}
            loading={isPrimaryLoading}
            disabled={isWorking}
            icon={mode === 'upload' ? 'cloud-upload-outline' : 'sparkles-outline'}
          />
        ) : null}

        {selectedMedia && !preparedCreationId ? (
          <PrimaryButton
            label="Preparar para Instagram"
            onPress={onPrepare}
            loading={prepareLoading}
            disabled={isWorking}
            icon="logo-instagram"
          />
        ) : null}

        {preparedCreationId ? (
          <PrimaryButton
            label="Publicar en Instagram"
            onPress={onPublish}
            loading={publishLoading}
            disabled={isWorking}
            icon="paper-plane-outline"
          />
        ) : null}

        {(selectedMedia || uploadFile || editFile || prompt.trim().length > 0) ? (
          <PrimaryButton
            label={resetLabel}
            onPress={resetLocalFlow}
            style={styles.resetBtn}
            disabled={isWorking}
            icon={hasPreparedPost ? 'refresh-outline' : mode === 'generate' ? 'create-outline' : 'image-outline'}
          />
        ) : null}
      </View>
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  modeSelector: {
    flexDirection: 'row',
    gap: spacing.xs,
    backgroundColor: colors.gray800,
    borderRadius: radii.md,
    padding: spacing.xxs,
    marginBottom: spacing.md,
  },
  modeButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  modeButtonActive: {
    backgroundColor: colors.gold,
  },
  modeButtonText: {
    ...typography.caption,
    color: colors.gray400,
    fontWeight: '700',
    textAlign: 'center',
  },
  modeButtonTextActive: {
    color: colors.black,
  },
  wizard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  wizardStep: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    gap: spacing.xs,
  },
  stepDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  stepDot_pending: {
    borderColor: colors.gray700,
    backgroundColor: colors.gray800,
  },
  stepDot_active: {
    borderColor: colors.gold,
    backgroundColor: colors.gold + '18',
  },
  stepDot_completed: {
    borderColor: colors.gold,
    backgroundColor: colors.gold,
  },
  stepDotText: {
    ...typography.caption,
    fontWeight: '700',
  },
  stepDotText_pending: {
    color: colors.gray500,
  },
  stepDotText_active: {
    color: colors.gold,
  },
  stepDotText_completed: {
    color: colors.black,
  },
  stepLabel: {
    ...typography.caption,
    fontWeight: '700',
    textAlign: 'center',
  },
  stepLabel_pending: {
    color: colors.gray600,
  },
  stepLabel_active: {
    color: colors.gold,
  },
  stepLabel_completed: {
    color: colors.gray300,
  },
  modeIntro: {
    marginBottom: spacing.lg,
  },
  modeTitle: {
    ...typography.body,
    color: colors.white,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  hint: {
    ...typography.bodySmall,
    color: colors.gray400,
    lineHeight: 19,
  },
  filePicker: {
    minHeight: 56,
    borderWidth: 1,
    borderColor: colors.gray700,
    borderRadius: radii.md,
    backgroundColor: colors.gray800,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  filePickerTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  filePickerTitle: {
    ...typography.bodySmall,
    color: colors.white,
    fontWeight: '700',
  },
  filePickerMeta: {
    ...typography.caption,
    color: colors.gray500,
    marginTop: spacing.xxs,
  },
  preview: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: radii.md,
    backgroundColor: colors.gray800,
    marginBottom: spacing.sm,
  },
  fileMeta: {
    ...typography.caption,
    color: colors.gray500,
    marginBottom: spacing.md,
  },
  label: {
    ...typography.bodySmall,
    color: colors.gray300,
    marginBottom: spacing.xs,
    fontWeight: '600',
  },
  required: {
    color: colors.error,
  },
  optional: {
    color: colors.gray500,
    fontWeight: '400',
  },
  captionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  captionCount: {
    ...typography.caption,
    color: colors.gray500,
  },
  input: {
    backgroundColor: colors.gray800,
    borderWidth: 1,
    borderColor: colors.gray700,
    borderRadius: radii.md,
    color: colors.white,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 44,
    ...typography.body,
    marginBottom: spacing.md,
  },
  promptInput: {
    minHeight: 92,
    textAlignVertical: 'top',
  },
  captionInput: {
    minHeight: 72,
    textAlignVertical: 'top',
  },
  loadingBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.gold + '14',
    borderWidth: 1,
    borderColor: colors.gold,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  loadingTitle: {
    ...typography.bodySmall,
    color: colors.gold,
    fontWeight: '700',
  },
  loadingText: {
    ...typography.caption,
    color: colors.gold,
    marginTop: spacing.xxs,
    lineHeight: 16,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  errorText: {
    ...typography.caption,
    color: colors.error,
    flex: 1,
  },
  uploadedBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.successLight,
    borderWidth: 1,
    borderColor: colors.success,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  statusInfo: {
    flex: 1,
    minWidth: 0,
  },
  uploadedTitle: {
    ...typography.bodySmall,
    color: colors.success,
    fontWeight: '700',
  },
  uploadedText: {
    ...typography.caption,
    color: colors.success,
    marginTop: spacing.xxs,
    lineHeight: 16,
  },
  preparedBox: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.gold + '14',
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  preparedTitle: {
    ...typography.bodySmall,
    color: colors.gold,
    fontWeight: '700',
  },
  preparedText: {
    ...typography.caption,
    color: colors.gold,
    marginTop: spacing.xxs,
    lineHeight: 16,
  },
  buttonStack: {
    gap: spacing.sm,
  },
  resetBtn: {
    backgroundColor: colors.gray800,
  },
});
