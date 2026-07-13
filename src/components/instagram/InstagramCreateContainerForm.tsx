import React, { useEffect, useState } from 'react';
import {
  Image,
  Linking,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  StyleSheet,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SectionCard } from '../ui/SectionCard';
import { PrimaryButton } from '../ui/PrimaryButton';
import { InstagramPostPreview } from './InstagramPostPreview';
import {
  MARKETING_WHATSAPP_DEFAULT_MESSAGE,
  MARKETING_WHATSAPP_PHONE,
} from '../../config/marketing';
import { buildWhatsAppLink } from '../../utils/whatsapp';
import { colors, spacing, typography, radii } from '../../theme';
import type {
  EditMarketingMediaRequest,
  GenerateMarketingMediaRequest,
  MarketingMediaMimeType,
  MarketingMediaHumanError,
  MarketingMediaResult,
  MarketingMediaUploadFile,
  InstagramPublishDestination,
  PrepareInstagramOptions,
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
  prepareError: MarketingMediaHumanError | null;
  selectedMedia: MarketingMediaResult | null;
  preparedCreationId: string | null;
  publishLoading: boolean;
  onUpload: (file: MarketingMediaUploadFile, caption: string) => void;
  onGenerate: (payload: GenerateMarketingMediaRequest) => void;
  onEdit: (payload: EditMarketingMediaRequest) => void;
  onPrepare: (options: PrepareInstagramOptions) => void;
  onDestinationChange: (destination: InstagramPublishDestination) => void;
  onPublish: () => void;
  onResetPreparation: () => void;
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
  prepareError,
  selectedMedia,
  preparedCreationId,
  publishLoading,
  onUpload,
  onGenerate,
  onEdit,
  onPrepare,
  onDestinationChange,
  onPublish,
  onResetPreparation,
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
  const [destination, setDestination] = useState<InstagramPublishDestination>('feed');
  const [includeWhatsAppCta, setIncludeWhatsAppCta] = useState(false);
  const [whatsappMessage, setWhatsappMessage] = useState('');
  const [showPublishingPreview, setShowPublishingPreview] = useState(true);
  const [selectedWizardStep, setSelectedWizardStep] = useState<WizardStepKey>('content');
  const [contentDirty, setContentDirty] = useState(false);
  const [fileSelectionDirty, setFileSelectionDirty] = useState(false);
  const [whatsappTestError, setWhatsappTestError] = useState<string | null>(null);

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

  useEffect(() => {
    if (preparedCreationId) {
      setSelectedWizardStep('publish');
    } else if (selectedMedia) {
      setSelectedWizardStep('prepare');
    }
  }, [preparedCreationId, selectedMedia]);

  useEffect(() => {
    if (selectedMedia) {
      setContentDirty(false);
      setFileSelectionDirty(false);
    }
  }, [selectedMedia]);

  const isWorking = uploadLoading || isGenerating || isEditing || prepareLoading || publishLoading;
  const config = MODE_CONFIG[mode];
  const hasPreparedPost = Boolean(preparedCreationId);
  const hasSavedMedia = Boolean(selectedMedia) && !contentDirty;
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
  const previewUrl = fileSelectionDirty ? draftPreviewUrl : resultPreviewUrl || draftPreviewUrl;
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
    setDestination('feed');
    setIncludeWhatsAppCta(false);
    setWhatsappMessage('');
    setShowPublishingPreview(true);
    setSelectedWizardStep('content');
    setContentDirty(false);
    setFileSelectionDirty(false);
    setWhatsappTestError(null);
    onDestinationChange('feed');
    onReset();
  };

  const handleDestinationChange = (nextDestination: InstagramPublishDestination) => {
    if (isWorking || preparedCreationId || nextDestination === destination) return;
    setDestination(nextDestination);
    onDestinationChange(nextDestination);
    if (nextDestination === 'story') {
      setIncludeWhatsAppCta(false);
      setWhatsappTestError(null);
    }
  };

  const handleTestWhatsApp = async () => {
    setWhatsappTestError(null);
    const message = whatsappMessage.trim() || MARKETING_WHATSAPP_DEFAULT_MESSAGE;
    const whatsappLink = buildWhatsAppLink(MARKETING_WHATSAPP_PHONE, message);

    try {
      await Linking.openURL(whatsappLink);
    } catch {
      setWhatsappTestError('No pudimos abrir WhatsApp. Revisa que el navegador permita abrir enlaces externos.');
    }
  };

  const handlePrepare = () => {
    if (destination === 'story') {
      onPrepare({ destination: 'story' });
      return;
    }

    if (!includeWhatsAppCta) {
      onPrepare({ destination: 'feed' });
      return;
    }

    const message = whatsappMessage.trim();
    onPrepare({
      destination: 'feed',
      includeWhatsAppCta: true,
      ...(message ? { whatsappMessage: message } : {}),
    });
  };

  const handleModeChange = (nextMode: CreationMode) => {
    if (nextMode === mode || isWorking) return;
    resetLocalFlow();
    setMode(nextMode);
  };

  const handleSelectedFile = (file: File, targetMode: 'upload' | 'edit') => {
    setValidationError(null);
    if (selectedMedia || preparedCreationId) {
      onResetPreparation();
      setContentDirty(true);
      setFileSelectionDirty(true);
    }

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

  const markContentDirty = () => {
    if (selectedMedia || preparedCreationId) {
      onResetPreparation();
      setContentDirty(true);
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
    setSelectedWizardStep('save');
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

  const isWizardStepAvailable = (step: WizardStepKey): boolean => {
    switch (step) {
      case 'content':
        return true;
      case 'save':
        return hasContent || hasSavedMedia || hasPreparedPost;
      case 'prepare':
        return hasSavedMedia || hasPreparedPost;
      case 'publish':
        return hasPreparedPost;
    }
  };

  const handleWizardStepPress = (step: WizardStepKey) => {
    if (isWorking || !isWizardStepAvailable(step)) return;

    setValidationError(null);
    setSelectedWizardStep(step);

    if (step === 'content' || step === 'save') {
      if (hasPreparedPost) {
        onResetPreparation();
      }
      return;
    }

    if (step === 'prepare' && hasPreparedPost) {
      onResetPreparation();
    }
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
        {wizardSteps.map((step, index) => {
          const isAvailable = isWizardStepAvailable(step.key);
          const isSelected = selectedWizardStep === step.key;
          return (
          <TouchableOpacity
            key={step.key}
            style={[styles.wizardStep, isSelected && styles.wizardStepSelected]}
            onPress={() => handleWizardStepPress(step.key)}
            disabled={isWorking || !isAvailable}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityState={{ disabled: !isAvailable, selected: isSelected }}
            accessibilityLabel={`${step.label}. ${isAvailable ? 'Disponible' : 'Pendiente'}`}
          >
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
          </TouchableOpacity>
          );
        })}
      </View>
      <Text style={styles.wizardHelp}>
        Selecciona un paso completado para revisarlo o modificarlo.
      </Text>

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
              markContentDirty();
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
            onChangeText={(value) => {
              setStylePrompt(value);
              markContentDirty();
            }}
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
        onChangeText={(value) => {
          setCaption(value);
          markContentDirty();
        }}
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

      {prepareError ? (
        <View style={styles.errorRow}>
          <Ionicons name="alert-circle-outline" size={14} color={colors.error} />
          <View style={styles.statusInfo}>
            <Text style={styles.errorTitle}>{prepareError.title}</Text>
            <Text style={styles.errorText}>{prepareError.message}</Text>
          </View>
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

      {contentDirty ? (
        <View style={styles.unsavedBox}>
          <Ionicons name="create-outline" size={18} color={colors.warning} />
          <View style={styles.statusInfo}>
            <Text style={styles.unsavedTitle}>Cambios pendientes de guardar</Text>
            <Text style={styles.unsavedText}>Guarda nuevamente antes de volver a Preparar.</Text>
          </View>
        </View>
      ) : null}

      {preparedCreationId ? (
        <View style={styles.preparedBox}>
          <Ionicons name="checkmark-circle" size={20} color={colors.success} />
          <View style={styles.statusInfo}>
            <Text style={styles.preparedTitle}>
              {destination === 'story' ? 'Historia preparada' : 'Publicación preparada'}
            </Text>
            <Text style={styles.preparedText}>
              {destination === 'story'
                ? 'Ya puedes publicarla como historia cuando estés listo.'
                : includeWhatsAppCta
                  ? 'Se preparó la publicación con enlace de WhatsApp.'
                  : 'Ya puedes publicarla en Instagram cuando estés listo.'}
            </Text>
          </View>
        </View>
      ) : null}

      <View style={styles.buttonStack}>
        {(!selectedMedia || contentDirty) ? (
          <PrimaryButton
            label={isPrimaryLoading ? config.loadingTitle : config.buttonLabel}
            onPress={handlePrimaryAction}
            loading={isPrimaryLoading}
            disabled={isWorking}
            icon={mode === 'upload' ? 'cloud-upload-outline' : 'sparkles-outline'}
          />
        ) : null}

        {selectedMedia && !contentDirty && !preparedCreationId ? (
          <View style={styles.publishingOptions}>
            <Text style={styles.optionsTitle}>Opciones de publicación</Text>
            <Text style={styles.label}>Destino</Text>
            <View style={styles.destinationSelector}>
              {(['feed', 'story'] as const).map((item) => {
                const isActive = destination === item;
                return (
                  <TouchableOpacity
                    key={item}
                    style={[styles.destinationButton, isActive && styles.destinationButtonActive]}
                    onPress={() => handleDestinationChange(item)}
                    disabled={isWorking}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: isActive }}
                  >
                    <Text style={[styles.destinationText, isActive && styles.destinationTextActive]}>
                      {item === 'feed' ? 'Feed' : 'Historia'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={styles.optionHelp}>
              {destination === 'feed'
                ? 'Publicación normal en tu perfil de Instagram.'
                : 'Contenido temporal en historias de Instagram.'}
            </Text>

            {destination === 'feed' ? (
              <>
                <View style={styles.switchRow}>
                  <View style={styles.switchCopy}>
                    <Text style={styles.switchLabel}>Incluir enlace de WhatsApp</Text>
                    <Text style={styles.optionHelp}>Incluye un enlace de WhatsApp dentro del texto de la publicación.</Text>
                  </View>
                  <Switch
                    value={includeWhatsAppCta}
                    onValueChange={(value) => {
                      setIncludeWhatsAppCta(value);
                      setWhatsappTestError(null);
                    }}
                    disabled={isWorking}
                    trackColor={{ false: colors.gray700, true: colors.gold + '80' }}
                    thumbColor={includeWhatsAppCta ? colors.gold : colors.gray400}
                  />
                </View>
                {includeWhatsAppCta ? (
                  <>
                    <Text style={styles.label}>Mensaje para WhatsApp <Text style={styles.optional}>(opcional)</Text></Text>
                    <TextInput
                      style={[styles.input, styles.whatsappInput]}
                      value={whatsappMessage}
                      onChangeText={setWhatsappMessage}
                      placeholder="Hola, quiero agendar una cita."
                      placeholderTextColor={colors.gray600}
                      multiline
                      editable={!isWorking}
                    />
                    <Text style={styles.optionHelp}>Se agregará un enlace de WhatsApp al texto de la publicación.</Text>
                    <TouchableOpacity
                      style={styles.testWhatsAppButton}
                      onPress={() => void handleTestWhatsApp()}
                      disabled={isWorking}
                      activeOpacity={0.8}
                      accessibilityRole="link"
                      accessibilityLabel="Probar WhatsApp"
                      accessibilityHint="Abre el enlace de WhatsApp empresarial con el mensaje precargado"
                    >
                      <Ionicons name="open-outline" size={17} color={colors.gold} />
                      <Text style={styles.testWhatsAppButtonText}>Probar WhatsApp</Text>
                    </TouchableOpacity>
                    {whatsappTestError ? (
                      <Text style={styles.testWhatsAppError}>{whatsappTestError}</Text>
                    ) : null}
                    <Text style={styles.organicWhatsAppNote}>
                      En publicaciones orgánicas, WhatsApp se agrega como enlace en el texto. El botón verde de WhatsApp pertenece a anuncios promocionados.
                    </Text>
                  </>
                ) : null}
              </>
            ) : (
              <View style={styles.storyNotice}>
                <Ionicons name="information-circle-outline" size={18} color={colors.gold} />
                <Text style={styles.storyNoticeText}>Las historias no admiten enlace de WhatsApp en este flujo.</Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.previewToggle}
              onPress={() => setShowPublishingPreview((current) => !current)}
              disabled={isWorking}
              accessibilityRole="button"
              accessibilityState={{ expanded: showPublishingPreview }}
            >
              <View style={styles.previewToggleCopy}>
                <Ionicons name="eye-outline" size={18} color={colors.gold} />
                <Text style={styles.previewToggleText}>
                  {showPublishingPreview ? 'Ocultar vista previa' : 'Ver vista previa'}
                </Text>
              </View>
              <Ionicons
                name={showPublishingPreview ? 'chevron-up-outline' : 'chevron-down-outline'}
                size={18}
                color={colors.gray400}
              />
            </TouchableOpacity>

            {showPublishingPreview && resultPreviewUrl ? (
              <InstagramPostPreview
                destination={destination}
                imageUrl={resultPreviewUrl}
                caption={caption}
                includeWhatsAppCta={destination === 'feed' && includeWhatsAppCta}
                whatsappMessage={whatsappMessage}
              />
            ) : null}

            <PrimaryButton
              label="Preparar para Instagram"
              onPress={handlePrepare}
              loading={prepareLoading}
              disabled={isWorking}
              icon="logo-instagram"
            />
          </View>
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
    borderRadius: radii.md,
    paddingVertical: spacing.xs,
  },
  wizardStepSelected: {
    backgroundColor: colors.gold + '12',
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
  wizardHelp: {
    ...typography.caption,
    color: colors.gray500,
    textAlign: 'center',
    marginTop: -spacing.xs,
    marginBottom: spacing.md,
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
  publishingOptions: {
    borderWidth: 1,
    borderColor: colors.gray700,
    borderRadius: radii.md,
    backgroundColor: colors.gray800,
    padding: spacing.md,
    gap: spacing.sm,
  },
  optionsTitle: {
    ...typography.body,
    color: colors.white,
    fontWeight: '700',
  },
  destinationSelector: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  destinationButton: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.gray700,
    borderRadius: radii.md,
    backgroundColor: colors.gray900,
  },
  destinationButtonActive: {
    borderColor: colors.gold,
    backgroundColor: colors.gold,
  },
  destinationText: {
    ...typography.bodySmall,
    color: colors.gray300,
    fontWeight: '700',
  },
  destinationTextActive: {
    color: colors.black,
  },
  optionHelp: {
    ...typography.caption,
    color: colors.gray400,
    lineHeight: 17,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  switchCopy: {
    flex: 1,
    gap: spacing.xxs,
  },
  switchLabel: {
    ...typography.bodySmall,
    color: colors.white,
    fontWeight: '600',
  },
  whatsappInput: {
    minHeight: 72,
    textAlignVertical: 'top',
    marginBottom: 0,
  },
  testWhatsAppButton: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.gold,
    borderRadius: radii.md,
    backgroundColor: colors.gray900,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginTop: spacing.xs,
  },
  testWhatsAppButtonText: {
    ...typography.button,
    color: colors.gold,
  },
  testWhatsAppError: {
    ...typography.caption,
    color: colors.error,
    lineHeight: 16,
  },
  organicWhatsAppNote: {
    ...typography.caption,
    color: colors.gray500,
    lineHeight: 16,
  },
  storyNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.gold + '55',
    borderRadius: radii.sm,
    backgroundColor: colors.gold + '12',
    padding: spacing.sm,
  },
  storyNoticeText: {
    ...typography.caption,
    color: colors.gray300,
    flex: 1,
    lineHeight: 17,
  },
  previewToggle: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.gray700,
    paddingTop: spacing.sm,
  },
  previewToggleCopy: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  previewToggleText: {
    ...typography.bodySmall,
    color: colors.white,
    fontWeight: '600',
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
  errorTitle: {
    ...typography.caption,
    color: colors.error,
    fontWeight: '700',
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
  unsavedBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.warning + '12',
    borderWidth: 1,
    borderColor: colors.warning + '55',
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  unsavedTitle: {
    ...typography.bodySmall,
    color: colors.warning,
    fontWeight: '700',
  },
  unsavedText: {
    ...typography.caption,
    color: colors.gray400,
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
