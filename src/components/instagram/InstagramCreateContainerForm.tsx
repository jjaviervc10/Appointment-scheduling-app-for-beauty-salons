import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SectionCard } from '../ui/SectionCard';
import { PrimaryButton } from '../ui/PrimaryButton';
import { colors, spacing, typography, radii } from '../../theme';

interface Props {
  loading: boolean;
  error: string | null;
  creationId: string | null;
  onSubmit: (imageUrl: string, caption: string) => void;
  onReset: () => void;
}

const HTTPS_PREFIX = 'https://';
const MAX_CAPTION_LENGTH = 2200;

function isValidHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

export function InstagramCreateContainerForm({
  loading,
  error,
  creationId,
  onSubmit,
  onReset,
}: Props) {
  const [imageUrl, setImageUrl] = useState('');
  const [caption, setCaption] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = () => {
    setValidationError(null);
    const trimmedUrl = imageUrl.trim();
    const trimmedCaption = caption.trim();

    if (!trimmedUrl) {
      setValidationError('La URL de la imagen es obligatoria.');
      return;
    }
    if (!isValidHttpsUrl(trimmedUrl)) {
      setValidationError('La URL debe comenzar con https:// y ser valida.');
      return;
    }
    if (trimmedCaption.length > MAX_CAPTION_LENGTH) {
      setValidationError(`El caption no puede exceder ${MAX_CAPTION_LENGTH} caracteres.`);
      return;
    }

    onSubmit(trimmedUrl, trimmedCaption);
  };

  const handleReset = () => {
    setImageUrl('');
    setCaption('');
    setValidationError(null);
    onReset();
  };

  if (creationId) {
    return (
      <SectionCard title="Publicacion preparada">
        <View style={styles.successContainer}>
          <Ionicons name="checkmark-circle" size={36} color={colors.success} />
          <Text style={styles.successTitle}>Contenido listo</Text>
          <Text style={styles.successText}>
            El media container fue creado correctamente. Puedes publicarlo ahora o cancelar.
          </Text>
          <View style={styles.idRow}>
            <Ionicons name="key-outline" size={14} color={colors.gray500} />
            <Text style={styles.idText} numberOfLines={1}>ID: {creationId}</Text>
          </View>
        </View>
        <View style={styles.resetRow}>
          <PrimaryButton
            label="Cancelar"
            onPress={handleReset}
            style={styles.resetBtn}
            icon="close-circle-outline"
          />
        </View>
      </SectionCard>
    );
  }

  return (
    <SectionCard title="Preparar publicacion">
      <Text style={styles.hint}>
        Ingresa una imagen HTTPS y un caption para crear el contenido. La publicacion no se realizara automaticamente.
      </Text>

      <Text style={styles.label}>URL de imagen <Text style={styles.required}>*</Text></Text>
      <TextInput
        style={styles.input}
        value={imageUrl}
        onChangeText={setImageUrl}
        placeholder={`${HTTPS_PREFIX}ejemplo.com/imagen.jpg`}
        placeholderTextColor={colors.gray600}
        keyboardType="url"
        autoCapitalize="none"
        autoCorrect={false}
        editable={!loading}
      />

      <View style={styles.captionHeader}>
        <Text style={styles.label}>Caption <Text style={styles.optional}>(opcional)</Text></Text>
        <Text style={styles.captionCount}>{caption.trim().length}/{MAX_CAPTION_LENGTH}</Text>
      </View>
      <TextInput
        style={[styles.input, styles.captionInput]}
        value={caption}
        onChangeText={setCaption}
        placeholder="Escribe un caption para la publicacion..."
        placeholderTextColor={colors.gray600}
        multiline
        numberOfLines={3}
        editable={!loading}
      />

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

      <View style={styles.buttonRow}>
        <PrimaryButton
          label="Preparar contenido"
          onPress={handleSubmit}
          loading={loading}
          disabled={loading}
          icon="cloud-upload-outline"
        />
      </View>
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  hint: {
    ...typography.bodySmall,
    color: colors.gray400,
    marginBottom: spacing.lg,
    lineHeight: 19,
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
    ...typography.body,
    marginBottom: spacing.md,
  },
  captionInput: {
    minHeight: 72,
    textAlignVertical: 'top',
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
  buttonRow: {
    marginTop: spacing.sm,
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  successTitle: {
    ...typography.h3,
    color: colors.white,
  },
  successText: {
    ...typography.bodySmall,
    color: colors.gray400,
    textAlign: 'center',
    lineHeight: 19,
  },
  idRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.gray800,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.sm,
    maxWidth: '100%',
  },
  idText: {
    ...typography.caption,
    color: colors.gray400,
    flex: 1,
  },
  resetRow: {
    marginTop: spacing.md,
  },
  resetBtn: {
    backgroundColor: colors.gray800,
  },
});
