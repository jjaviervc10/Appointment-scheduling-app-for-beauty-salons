import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'qrcode';
import { colors, radii, spacing, typography } from '../../theme';
import { getOwnerShareAvailability } from '../../services/ownerApi';
import type { OwnerShareAvailabilityRange, OwnerShareAvailabilityResponse } from '../../types/api';
import { formatLocalDateKey } from '../../utils/date';

interface ShareAvailabilityModalProps {
  visible: boolean;
  onClose: () => void;
}

const RANGE_OPTIONS: Array<{
  key: OwnerShareAvailabilityRange;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}> = [
  { key: 'today', label: 'Hoy', icon: 'sunny-outline' },
  { key: 'tomorrow', label: 'Manana', icon: 'arrow-forward-circle-outline' },
  { key: 'week', label: 'Esta semana', icon: 'calendar-outline' },
  { key: 'date', label: 'Elegir dia', icon: 'create-outline' },
];

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function getDefaultDate(range: OwnerShareAvailabilityRange): string {
  if (range === 'tomorrow') return formatLocalDateKey(addDays(new Date(), 1));
  return formatLocalDateKey(new Date());
}

function formatUpdatedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Actualizado recientemente';

  return `Actualizado ${date.toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
}

function getBookingLinkLabel(data: OwnerShareAvailabilityResponse | null): string {
  const businessName = data?.business.name?.trim();
  if (businessName) return businessName;

  const url = data?.share.bookingUrl;
  if (!url) return 'Jaquelina Barber Studio';

  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return 'Jaquelina Barber Studio';
  }
}

function flattenSlots(data: OwnerShareAvailabilityResponse): Array<{
  dayLabel: string;
  label: string;
}> {
  return data.days.flatMap((day) =>
    day.slots.map((slot) => ({ dayLabel: day.label, label: slot.label })),
  );
}

function isWebRuntime(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

async function copyTextToClipboard(text: string): Promise<void> {
  if (!isWebRuntime() || !navigator.clipboard?.writeText) {
    throw new Error('Copia manual requerida en este dispositivo.');
  }

  await navigator.clipboard.writeText(text);
}

function downloadDataUrl(dataUrl: string, fileName: string): void {
  if (!isWebRuntime()) throw new Error('La descarga de imagen esta disponible en web.');

  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

async function loadDomImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('No se pudo preparar el QR para la imagen.'));
    image.src = source;
  });
}

async function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('No se pudo generar la imagen.'));
        return;
      }
      resolve(blob);
    }, 'image/png');
  });
}

function drawRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function drawWrappedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines = 3,
): number {
  const words = text.split(' ');
  let line = '';
  let currentY = y;
  let lines = 0;

  words.forEach((word) => {
    if (lines >= maxLines) return;
    const testLine = line ? `${line} ${word}` : word;
    if (ctx.measureText(testLine).width > maxWidth && line) {
      ctx.fillText(line, x, currentY);
      currentY += lineHeight;
      lines += 1;
      line = word;
      return;
    }
    line = testLine;
  });

  if (line && lines < maxLines) {
    ctx.fillText(line, x, currentY);
    currentY += lineHeight;
  }

  return currentY;
}

async function renderAvailabilityImage(
  data: OwnerShareAvailabilityResponse,
  qrDataUrl: string | null,
): Promise<{ dataUrl: string; blob: Blob }> {
  if (!isWebRuntime()) {
    throw new Error('La generacion de imagen esta disponible en web.');
  }

  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1920;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas no disponible en este navegador.');

  const slots = flattenSlots(data);
  const hasAvailability = data.summary.hasAvailability && slots.length > 0;
  const visibleSlots = slots.slice(0, 7);

  ctx.fillStyle = '#111111';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const gradient = ctx.createLinearGradient(0, 0, 1080, 1920);
  gradient.addColorStop(0, '#25211A');
  gradient.addColorStop(0.5, '#151515');
  gradient.addColorStop(1, '#0E0E0E');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = 'rgba(200,168,78,0.38)';
  ctx.lineWidth = 4;
  drawRoundRect(ctx, 70, 70, 940, 1780, 46);
  ctx.stroke();

  ctx.fillStyle = '#C8A84E';
  ctx.font = '700 42px Arial';
  ctx.fillText(data.business.name || 'JL Studio', 110, 180);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '800 78px Arial';
  drawWrappedText(ctx, data.share.title || 'Horarios disponibles', 110, 330, 860, 88, 2);

  ctx.fillStyle = '#C8A84E';
  ctx.font = '700 40px Arial';
  ctx.fillText(data.range.label, 110, 500);

  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  drawRoundRect(ctx, 110, 590, 860, hasAvailability ? 640 : 330, 34);
  ctx.fill();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '700 38px Arial';
  ctx.fillText(hasAvailability ? 'Horarios para reservar' : 'Sin horarios disponibles', 150, 680);

  if (hasAvailability) {
    let y = 760;
    visibleSlots.forEach((slot) => {
      ctx.fillStyle = 'rgba(46,125,50,0.9)';
      ctx.beginPath();
      ctx.arc(160, y - 10, 10, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#E8E8E8';
      ctx.font = '700 31px Arial';
      ctx.fillText(slot.dayLabel, 190, y);

      ctx.fillStyle = '#FFFFFF';
      ctx.font = '800 36px Arial';
      ctx.fillText(slot.label, 190, y + 54);
      y += 128;
    });

    if (slots.length > visibleSlots.length) {
      ctx.fillStyle = '#C8A84E';
      ctx.font = '700 30px Arial';
      ctx.fillText(`+${slots.length - visibleSlots.length} horarios mas`, 190, y);
    }
  } else {
    ctx.fillStyle = '#BDBDBD';
    ctx.font = '400 32px Arial';
    drawWrappedText(
      ctx,
      'No hay espacios libres para este periodo. Consulta otro dia o vuelve mas tarde.',
      150,
      760,
      760,
      44,
      3,
    );
  }

  ctx.fillStyle = '#C8A84E';
  ctx.font = '800 44px Arial';
  ctx.fillText('Agenda por WhatsApp', 110, 1360);

  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  drawRoundRect(ctx, 110, 1400, 860, 210, 34);
  ctx.fill();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '800 34px Arial';
  ctx.fillText('Escanea el QR para reservar', 150, 1470);

  ctx.fillStyle = '#C8A84E';
  ctx.font = '700 28px Arial';
  ctx.fillText(getBookingLinkLabel(data), 150, 1520);

  ctx.fillStyle = '#BDBDBD';
  ctx.font = '400 24px Arial';
  ctx.fillText('El enlace completo va en el texto del estado', 150, 1562);

  if (qrDataUrl) {
    const qr = await loadDomImage(qrDataUrl);
    ctx.fillStyle = '#FFFFFF';
    drawRoundRect(ctx, 782, 1430, 158, 158, 22);
    ctx.fill();
    ctx.drawImage(qr, 798, 1446, 126, 126);
  }

  ctx.fillStyle = 'rgba(200,168,78,0.14)';
  drawRoundRect(ctx, 110, 1650, 860, 94, 28);
  ctx.fill();

  ctx.fillStyle = '#E5D5A0';
  ctx.font = '700 28px Arial';
  ctx.fillText('Los horarios vencidos no se incluyen', 150, 1708);

  ctx.fillStyle = '#9E9E9E';
  ctx.font = '400 24px Arial';
  ctx.fillText(formatUpdatedAt(data.summary.updatedAt), 110, 1815);

  const dataUrl = canvas.toDataURL('image/png');
  const blob = await canvasToBlob(canvas);
  return { dataUrl, blob };
}

export function ShareAvailabilityModal({ visible, onClose }: ShareAvailabilityModalProps) {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const [range, setRange] = useState<OwnerShareAvailabilityRange>('today');
  const [customDate, setCustomDate] = useState(getDefaultDate('today'));
  const [shareLoading, setShareLoading] = useState(false);
  const [shareData, setShareData] = useState<OwnerShareAvailabilityResponse | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [workingAction, setWorkingAction] = useState<'copy' | 'download' | 'share' | null>(null);

  const effectiveDate = range === 'date' ? customDate : getDefaultDate(range);

  useEffect(() => {
    if (!visible) return;

    let cancelled = false;
    setShareLoading(true);
    setError(null);
    setActionMessage(null);

    getOwnerShareAvailability({
      range,
      date: range === 'date' ? effectiveDate : undefined,
    })
      .then(async (data) => {
        if (cancelled) return;
        setShareData(data);
        if (!data.share.bookingUrl) {
          setQrDataUrl(null);
          return;
        }
        const qr = await QRCode.toDataURL(data.share.bookingUrl, {
          margin: 1,
          width: 240,
          color: { dark: '#1A1A1A', light: '#FFFFFF' },
        });
        if (!cancelled) setQrDataUrl(qr);
      })
      .catch((loadError) => {
        if (cancelled) return;
        setShareData(null);
        setQrDataUrl(null);
        setError(loadError instanceof Error ? loadError.message : 'No se pudo preparar la disponibilidad.');
      })
      .finally(() => {
        if (!cancelled) setShareLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [effectiveDate, range, visible]);

  const handleClose = useCallback(() => {
    setActionMessage(null);
    setWorkingAction(null);
    onClose();
  }, [onClose]);

  const handleRangeChange = useCallback((nextRange: OwnerShareAvailabilityRange) => {
    setRange(nextRange);
    if (nextRange !== 'date') setCustomDate(getDefaultDate(nextRange));
  }, []);

  const handleCopy = useCallback(async () => {
    if (!shareData) return;
    setWorkingAction('copy');
    setActionMessage(null);
    try {
      await copyTextToClipboard(shareData.share.bodyText);
      setActionMessage('Texto copiado. Pegalo al subir tu estado.');
    } catch (copyError) {
      setActionMessage(copyError instanceof Error ? copyError.message : 'No se pudo copiar el texto.');
    } finally {
      setWorkingAction(null);
    }
  }, [shareData]);

  const handleDownload = useCallback(async () => {
    if (!shareData) return;
    setWorkingAction('download');
    setActionMessage(null);
    try {
      const rendered = await renderAvailabilityImage(shareData, qrDataUrl);
      downloadDataUrl(rendered.dataUrl, `disponibilidad-${shareData.range.startDate}.png`);
      setActionMessage('Imagen descargada. Ya puedes subirla a tu estado.');
    } catch (downloadError) {
      setActionMessage(downloadError instanceof Error ? downloadError.message : 'No se pudo descargar la imagen.');
    } finally {
      setWorkingAction(null);
    }
  }, [qrDataUrl, shareData]);

  const handleShare = useCallback(async () => {
    if (!shareData) return;
    setWorkingAction('share');
    setActionMessage(null);
    try {
      const rendered = await renderAvailabilityImage(shareData, qrDataUrl);
      const fileName = `disponibilidad-${shareData.range.startDate}.png`;
      const file = new File([rendered.blob], fileName, { type: 'image/png' });
      const nav = navigator as Navigator & {
        canShare?: (data: ShareData) => boolean;
      };

      if (nav.share && (!nav.canShare || nav.canShare({ files: [file] }))) {
        await nav.share({
          title: shareData.share.title,
          text: shareData.share.bodyText,
          files: [file],
        });
        setActionMessage('Listo. Revisa WhatsApp para publicar el estado.');
        return;
      }

      if (nav.share) {
        await nav.share({
          title: shareData.share.title,
          text: shareData.share.bodyText,
          url: shareData.share.bookingUrl,
        });
        setActionMessage('Texto compartido. Si necesitas imagen, usa Descargar imagen.');
        return;
      }

      downloadDataUrl(rendered.dataUrl, fileName);
      setActionMessage('Tu navegador no comparte archivos directo; descargue la imagen.');
    } catch (shareError) {
      setActionMessage(shareError instanceof Error ? shareError.message : 'No se pudo compartir.');
    } finally {
      setWorkingAction(null);
    }
  }, [qrDataUrl, shareData]);

  const slots = shareData ? flattenSlots(shareData) : [];
  const previewSlots = slots.slice(0, 4);
  const bookingLinkLabel = getBookingLinkLabel(shareData);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={[styles.card, isMobile && styles.cardMobile]}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIcon}>
                <Ionicons name="share-social-outline" size={20} color={colors.gold} />
              </View>
              <View>
                <Text style={styles.headerTitle}>Compartir disponibilidad</Text>
                <Text style={styles.headerSubtitle}>Imagen y texto listos para estado</Text>
              </View>
            </View>
            <TouchableOpacity onPress={handleClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={24} color={colors.gray500} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} contentContainerStyle={[styles.bodyContent, isMobile && styles.bodyMobile]}>
            <View style={[styles.configPanel, isMobile && styles.panelMobile]}>
              <Text style={styles.sectionTitle}>Periodo</Text>
              <View style={styles.segmentWrap}>
                {RANGE_OPTIONS.map((option) => {
                  const active = range === option.key;
                  return (
                    <TouchableOpacity
                      key={option.key}
                      style={[styles.segment, active && styles.segmentActive]}
                      onPress={() => handleRangeChange(option.key)}
                      activeOpacity={0.75}
                    >
                      <Ionicons name={option.icon} size={14} color={active ? colors.black : colors.gray400} />
                      <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{option.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {range === 'date' ? (
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Fecha</Text>
                  <TextInput
                    value={customDate}
                    onChangeText={setCustomDate}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={colors.gray500}
                    style={styles.input}
                  />
                </View>
              ) : null}

              {error ? (
                <View style={styles.errorBanner}>
                  <Ionicons name="alert-circle-outline" size={16} color={colors.error} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              {shareLoading ? (
                <View style={styles.inlineState}>
                  <ActivityIndicator size="small" color={colors.gold} />
                  <Text style={styles.inlineStateText}>Preparando disponibilidad real...</Text>
                </View>
              ) : null}

              {shareData ? (
                <View style={styles.summary}>
                  <View>
                    <Text style={styles.summaryLabel}>Periodo</Text>
                    <Text style={styles.summaryValue}>{shareData.range.label}</Text>
                  </View>
                  <View>
                    <Text style={styles.summaryLabel}>Horarios</Text>
                    <Text style={styles.summaryValue}>{shareData.summary.totalSlots}</Text>
                  </View>
                  <View>
                    <Text style={styles.summaryLabel}>Enlace</Text>
                    <Text style={styles.summaryValue}>Reserva publica</Text>
                  </View>
                </View>
              ) : null}

              <View style={styles.shareTextBox}>
                <Text style={styles.fieldLabel}>Texto para copiar</Text>
                <Text style={styles.shareText} numberOfLines={7}>
                  {shareData?.share.bodyText ?? 'Selecciona un periodo para preparar el texto.'}
                </Text>
              </View>
            </View>

            <View style={[styles.previewPanel, isMobile && styles.panelMobile]}>
              <View style={styles.previewHeader}>
                <Text style={styles.sectionTitle}>Vista previa</Text>
                <View style={styles.previewBadge}>
                  <Text style={styles.previewBadgeText}>Estado 9:16</Text>
                </View>
              </View>

              <View style={styles.statusCard}>
                <Text style={styles.statusBrand}>{shareData?.business.name ?? 'JL Studio'}</Text>
                <Text style={styles.statusTitle}>{shareData?.share.title ?? 'Horarios disponibles'}</Text>
                <Text style={styles.statusDate}>{shareData?.range.label ?? 'Hoy'}</Text>

                <View style={styles.statusSlots}>
                  {shareData && shareData.summary.hasAvailability && previewSlots.length > 0 ? (
                    previewSlots.map((slot, index) => (
                      <View key={`${slot.dayLabel}-${slot.label}-${index}`} style={styles.statusSlotRow}>
                        <View style={styles.slotDot} />
                        <View style={styles.slotCopy}>
                          <Text style={styles.slotDay}>{slot.dayLabel}</Text>
                          <Text style={styles.slotTime}>{slot.label}</Text>
                        </View>
                      </View>
                    ))
                  ) : (
                    <View style={styles.statusEmpty}>
                      <Ionicons name="calendar-clear-outline" size={28} color={colors.gray500} />
                      <Text style={styles.statusEmptyText}>Sin horarios disponibles para este periodo.</Text>
                    </View>
                  )}
                </View>

                <Text style={styles.statusCta}>Agenda por WhatsApp</Text>
                <View style={styles.statusBookingBox}>
                  <View style={styles.statusBookingCopy}>
                    <Text style={styles.statusBookingTitle}>Escanea el QR para reservar</Text>
                    <Text style={styles.statusBookingLink} numberOfLines={1}>{bookingLinkLabel}</Text>
                  </View>

                  {qrDataUrl ? (
                    <Image source={{ uri: qrDataUrl }} style={styles.qrImage} resizeMode="contain" />
                  ) : (
                    <View style={styles.qrPlaceholder}>
                      <Ionicons name="qr-code-outline" size={34} color={colors.gray500} />
                    </View>
                  )}
                </View>

                <View style={styles.statusNote}>
                  <Text style={styles.statusNoteText}>Los horarios vencidos no se incluyen</Text>
                </View>
                <Text style={styles.statusUpdated}>
                  {shareData ? formatUpdatedAt(shareData.summary.updatedAt) : 'Actualizado recientemente'}
                </Text>
              </View>

              {actionMessage ? (
                <View style={styles.actionMessage}>
                  <Ionicons name="checkmark-circle-outline" size={15} color={colors.success} />
                  <Text style={styles.actionMessageText}>{actionMessage}</Text>
                </View>
              ) : null}

              <View style={styles.actions}>
                <TouchableOpacity
                  style={styles.secondaryAction}
                  onPress={() => void handleCopy()}
                  disabled={!shareData || !!workingAction}
                  activeOpacity={0.75}
                >
                  {workingAction === 'copy' ? (
                    <ActivityIndicator size="small" color={colors.gold} />
                  ) : (
                    <Ionicons name="copy-outline" size={16} color={colors.gold} />
                  )}
                  <Text style={styles.secondaryActionText}>Copiar texto</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.secondaryAction}
                  onPress={() => void handleDownload()}
                  disabled={!shareData || !!workingAction}
                  activeOpacity={0.75}
                >
                  {workingAction === 'download' ? (
                    <ActivityIndicator size="small" color={colors.gold} />
                  ) : (
                    <Ionicons name="download-outline" size={16} color={colors.gold} />
                  )}
                  <Text style={styles.secondaryActionText}>Descargar imagen</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.primaryAction, (!shareData || !!workingAction) && styles.actionDisabled]}
                  onPress={() => void handleShare()}
                  disabled={!shareData || !!workingAction}
                  activeOpacity={0.8}
                >
                  {workingAction === 'share' ? (
                    <ActivityIndicator size="small" color={colors.black} />
                  ) : (
                    <Ionicons name="share-social" size={16} color={colors.black} />
                  )}
                  <Text style={styles.primaryActionText}>Compartir</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.68)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 1100,
    maxHeight: '92%',
    backgroundColor: colors.black,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.gray800,
    overflow: 'hidden',
  },
  cardMobile: {
    maxHeight: '100%',
    borderRadius: radii.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray800,
    backgroundColor: colors.gray900,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flex: 1 },
  headerIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.gold + '18',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { ...typography.h3, color: colors.white },
  headerSubtitle: { ...typography.caption, color: colors.gray500, marginTop: 2 },
  body: { flex: 1 },
  bodyContent: {
    flexDirection: 'row',
    gap: spacing.lg,
    padding: spacing.xl,
  },
  bodyMobile: {
    flexDirection: 'column',
    padding: spacing.md,
  },
  configPanel: {
    flex: 1,
    minWidth: 0,
    gap: spacing.md,
  },
  previewPanel: {
    width: 360,
    gap: spacing.md,
  },
  panelMobile: {
    width: '100%',
  },
  sectionTitle: { ...typography.subtitle, color: colors.white },
  segmentWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  segment: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.gray800,
    backgroundColor: colors.gray900,
  },
  segmentActive: {
    backgroundColor: colors.gold,
    borderColor: colors.gold,
  },
  segmentText: { ...typography.caption, color: colors.gray400, fontWeight: '700' },
  segmentTextActive: { color: colors.black },
  field: { gap: spacing.xs },
  fieldLabel: {
    ...typography.caption,
    color: colors.gray500,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: colors.gray900,
    borderWidth: 1,
    borderColor: colors.gray800,
    borderRadius: radii.md,
    color: colors.white,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  inlineState: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.gray800,
    padding: spacing.md,
  },
  inlineStateText: { ...typography.bodySmall, color: colors.gray400 },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.error + '14',
    borderWidth: 1,
    borderColor: colors.error + '40',
    borderRadius: radii.md,
    padding: spacing.md,
  },
  errorText: { ...typography.bodySmall, color: colors.error, flex: 1 },
  summary: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  summaryLabel: { ...typography.caption, color: colors.gray500 },
  summaryValue: { ...typography.bodySmall, color: colors.white, fontWeight: '700', maxWidth: 220 },
  shareTextBox: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.gray800,
    backgroundColor: colors.gray900,
    padding: spacing.md,
    gap: spacing.sm,
  },
  shareText: { ...typography.bodySmall, color: colors.gray300, lineHeight: 19 },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  previewBadge: {
    borderRadius: radii.full,
    backgroundColor: colors.gold + '15',
    borderWidth: 1,
    borderColor: colors.gold + '35',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
  },
  previewBadgeText: { ...typography.caption, color: colors.gold, fontWeight: '700' },
  statusCard: {
    alignSelf: 'center',
    width: 300,
    aspectRatio: 9 / 16,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.gold + '45',
    backgroundColor: colors.gray900,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  statusBrand: { ...typography.bodySmall, color: colors.gold, fontWeight: '800' },
  statusTitle: { color: colors.white, fontSize: 26, fontWeight: '900', lineHeight: 30 },
  statusDate: { ...typography.bodySmall, color: colors.gold, fontWeight: '700' },
  statusSlots: {
    backgroundColor: colors.black + '88',
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.sm,
    minHeight: 135,
  },
  statusSlotRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  slotDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
    marginTop: 5,
  },
  slotCopy: { flex: 1 },
  slotDay: { ...typography.caption, color: colors.gray400 },
  slotTime: { color: colors.white, fontSize: 14, fontWeight: '800' },
  statusEmpty: { alignItems: 'center', justifyContent: 'center', flex: 1, gap: spacing.sm },
  statusEmptyText: { ...typography.caption, color: colors.gray500, textAlign: 'center' },
  statusCta: { ...typography.subtitle, color: colors.gold, fontWeight: '900' },
  statusBookingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: colors.white + '10',
    padding: spacing.sm,
  },
  statusBookingCopy: {
    flex: 1,
    minWidth: 0,
    gap: spacing.xxs,
  },
  statusBookingTitle: { ...typography.caption, color: colors.white, fontWeight: '800' },
  statusBookingLink: { ...typography.caption, color: colors.gold, fontWeight: '700' },
  qrImage: {
    width: 78,
    height: 78,
    borderRadius: radii.sm,
    backgroundColor: colors.white,
  },
  qrPlaceholder: {
    width: 78,
    height: 78,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.gray700,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusNote: {
    borderRadius: radii.full,
    backgroundColor: colors.gold + '18',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  statusNoteText: { ...typography.caption, color: colors.gold, fontWeight: '700', textAlign: 'center' },
  statusUpdated: { ...typography.caption, color: colors.gray600 },
  actionMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: colors.success + '12',
    borderWidth: 1,
    borderColor: colors.success + '35',
    padding: spacing.md,
  },
  actionMessageText: { ...typography.caption, color: colors.gray300, flex: 1 },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  secondaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.gold + '55',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  secondaryActionText: { ...typography.buttonSmall, color: colors.gold },
  primaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderRadius: radii.md,
    backgroundColor: colors.gold,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  primaryActionText: { ...typography.buttonSmall, color: colors.black },
  actionDisabled: { opacity: 0.55 },
});
