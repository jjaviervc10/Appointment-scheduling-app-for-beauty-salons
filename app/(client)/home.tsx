import React, { useState, useMemo, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Switch, Dimensions, Linking, ImageStyle, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radii, shadows } from '../../src/theme';
import { MOCK_SERVICES, MOCK_TIME_BLOCKS } from '../../src/services/mock-data';

const PHONE_NUMBER = 'tel:+525512345678';

const PROMO_SLIDES = [
  {
    id: '1',
    image: require('../../assets/LogoMejoradoJMiChipleras2.png'),
    title: '¡Nuevo look para este mes!',
    subtitle: 'Descuentos especiales en cortes y peinados',
    bg: colors.gold + '15',
  },
  {
    id: '2',
    image: require('../../assets/LogoJL.png'),
    title: 'Martes de barbería',
    subtitle: '20% de descuento en corte de barba',
    bg: colors.black + '08',
  },
  {
    id: '3',
    image: require('../../assets/icon.png'),
    title: 'Paquete completo',
    subtitle: 'Corte + barba + tinte desde $500',
    bg: colors.info + '10',
  },
];

const fmt = (d: Date) => d.toISOString().split('T')[0];
const DAYS_ES = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
const MONTHS_ES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

export default function ClientHomeScreen() {
  const router = useRouter();
  const [showPromo, setShowPromo] = useState(true);
  const [showEmergency, setShowEmergency] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);
  const sliderRef = useRef<ScrollView>(null);
  const slideWidth = Dimensions.get('window').width - spacing.xl * 2;

  // Auto-advance slider
  useEffect(() => {
    if (!showPromo) return;
    const timer = setInterval(() => {
      setActiveSlide((prev) => {
        const next = (prev + 1) % PROMO_SLIDES.length;
        sliderRef.current?.scrollTo({ x: next * slideWidth, animated: true });
        return next;
      });
    }, 4000);
    return () => clearInterval(timer);
  }, [showPromo, slideWidth]);

  // Next breaks for emergency section
  const nextBreaks = useMemo(() => {
    const todayStr = fmt(new Date());
    return MOCK_TIME_BLOCKS
      .filter((b) => b.date >= todayStr)
      .sort((a, b) => (a.date + a.start_time).localeCompare(b.date + b.start_time))
      .slice(0, 3);
  }, []);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Dark branded header */}
      <View style={styles.header}>
        <Image
          source={require('../../assets/LogoJL.png')}
          style={styles.headerLogo as ImageStyle}
          resizeMode="contain"
        />
        <View style={styles.headerTextBlock}>
          <Text style={styles.headerSubtitle}>Bienvenida a</Text>
          <Text style={styles.headerTitle}>Jaquelina López</Text>
          <Text style={styles.headerBadge}>BARBER STUDIO</Text>
        </View>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Promo toggle */}
        <View style={styles.promoToggleRow}>
          <Text style={styles.promoToggleLabel}>Promociones</Text>
          <Switch
            value={showPromo}
            onValueChange={setShowPromo}
            trackColor={{ false: colors.gray300, true: colors.gold + '55' }}
            thumbColor={showPromo ? colors.gold : colors.gray400}
          />
        </View>

        {/* ── Promo Slider ── */}
        {showPromo && (
          <View style={styles.sliderContainer}>
            <ScrollView
              ref={sliderRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) => {
                const idx = Math.round(e.nativeEvent.contentOffset.x / slideWidth);
                setActiveSlide(idx);
              }}
              style={styles.slider}
            >
              {PROMO_SLIDES.map((slide) => (
                <View key={slide.id} style={[styles.slide, { width: slideWidth, backgroundColor: slide.bg }]}>
                  <Image source={slide.image} style={styles.slideImage as ImageStyle} resizeMode="contain" />
                  <View style={styles.slideTextBlock}>
                    <Text style={styles.slideTitle}>{slide.title}</Text>
                    <Text style={styles.slideSubtitle}>{slide.subtitle}</Text>
                  </View>
                </View>
              ))}
            </ScrollView>
            {/* Dots */}
            <View style={styles.dotsRow}>
              {PROMO_SLIDES.map((_, i) => (
                <View key={i} style={[styles.dot, i === activeSlide && styles.dotActive]} />
              ))}
            </View>
          </View>
        )}

        {/* Quick booking CTA */}
        <TouchableOpacity
          style={styles.ctaCard}
          onPress={() => router.push('/(client)/booking')}
          activeOpacity={0.85}
        >
          <Text style={styles.ctaTitle}>Reservar cita</Text>
          <Text style={styles.ctaSubtitle}>Elige servicio, fecha y horario</Text>
        </TouchableOpacity>

        {/* Services preview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Nuestros servicios</Text>
          {MOCK_SERVICES.map((service) => (
            <View key={service.id} style={styles.serviceCard}>
              <View style={styles.serviceInfo}>
                <Text style={styles.serviceName}>{service.name}</Text>
                <Text style={styles.serviceDesc}>{service.description}</Text>
              </View>
              <Text style={styles.servicePrice}>
                ${service.price?.toLocaleString()}
              </Text>
            </View>
          ))}
        </View>

        {/* ── Emergency Teaser ── */}
        <TouchableOpacity
          style={styles.emergencyCard}
          onPress={() => setShowEmergency(true)}
          activeOpacity={0.8}
        >
          <View style={styles.emergencyHeader}>
            <View style={styles.emergencyIconCircle}>
              <Ionicons name="flash" size={18} color={colors.gold} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.emergencyTitle}>¿Cita de emergencia?</Text>
              <Text style={styles.emergencySubtitle}>Toca aquí para ver descansos disponibles</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.gray400} />
          </View>
        </TouchableOpacity>
      </ScrollView>

      {/* ── Emergency Modal ── */}
      <Modal visible={showEmergency} transparent animationType="slide" onRequestClose={() => setShowEmergency(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHandle} />

            {/* Header */}
            <View style={styles.modalHeader}>
              <View style={styles.emergencyIconCircle}>
                <Ionicons name="flash" size={20} color={colors.gold} />
              </View>
              <Text style={styles.modalTitle}>Cita de emergencia</Text>
              <TouchableOpacity onPress={() => setShowEmergency(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close" size={24} color={colors.gray500} />
              </TouchableOpacity>
            </View>

            {/* Message */}
            <View style={styles.modalMessage}>
              <Ionicons name="heart-outline" size={20} color={colors.gold} />
              <Text style={styles.modalMessageText}>
                Este espacio es para verdaderas emergencias. Estos son mis descansos personales y estoy dispuesta a atenderte, pero por favor usa esta opción con responsabilidad. Cuida mi tiempo y yo cuidaré el tuyo.
              </Text>
            </View>

            {/* Breaks list */}
            {nextBreaks.length > 0 && (
              <View style={styles.breaksList}>
                <Text style={styles.breaksLabel}>Mis próximos descansos</Text>
                {nextBreaks.map((block) => {
                  const d = new Date(block.date + 'T12:00:00');
                  const dayLabel = `${DAYS_ES[d.getDay()]} ${d.getDate()} ${MONTHS_ES[d.getMonth()]}`;
                  return (
                    <View key={block.id} style={styles.breakRow}>
                      <View style={styles.breakDot} />
                      <Text style={styles.breakDay}>{dayLabel}</Text>
                      <Text style={styles.breakTime}>{block.start_time} – {block.end_time}</Text>
                      <View style={styles.breakTypeBadge}>
                        <Text style={styles.breakTypeText}>{block.label}</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            {/* Call button */}
            <TouchableOpacity
              style={styles.callButton}
              onPress={() => Linking.openURL(PHONE_NUMBER)}
              activeOpacity={0.8}
            >
              <Ionicons name="call" size={18} color={colors.white} />
              <Text style={styles.callButtonText}>Llamar ahora</Text>
            </TouchableOpacity>

            <Text style={styles.modalDisclaimer}>Solo llamadas directas · No se agenda por la app</Text>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.black,
  },
  header: {
    backgroundColor: colors.black,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  headerLogo: { width: 56, height: 56 },
  headerTextBlock: { flex: 1 },
  headerSubtitle: {
    ...typography.bodySmall,
    color: colors.gray500,
    marginBottom: spacing.xxs,
  },
  headerTitle: {
    ...typography.h1,
    color: colors.white,
    letterSpacing: 0.5,
  },
  headerBadge: {
    ...typography.caption,
    color: colors.gold,
    letterSpacing: 3,
    marginTop: spacing.xs,
  },
  scrollView: {
    flex: 1,
    backgroundColor: colors.black,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
  },
  scrollContent: {
    padding: spacing.xl,
    paddingBottom: spacing.huge,
    gap: spacing.lg,
  },

  // Promo toggle
  promoToggleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  promoToggleLabel: { ...typography.caption, color: colors.gray500, fontWeight: '600', textTransform: 'uppercase' },

  // Promo slider
  sliderContainer: { gap: spacing.sm },
  slider: { borderRadius: radii.lg, overflow: 'hidden' },
  slide: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: radii.lg, padding: spacing.lg, gap: spacing.md,
    minHeight: 110,
  },
  slideImage: { width: 64, height: 64, borderRadius: radii.md },
  slideTextBlock: { flex: 1, gap: spacing.xxs },
  slideTitle: { ...typography.subtitle, color: colors.white, fontSize: 15 },
  slideSubtitle: { ...typography.bodySmall, color: colors.gray400 },
  dotsRow: { flexDirection: 'row', justifyContent: 'center', gap: spacing.xs },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.gray700 },
  dotActive: { backgroundColor: colors.gold, width: 18, borderRadius: 3 },
  ctaCard: {
    backgroundColor: colors.gold,
    borderRadius: radii.lg,
    padding: spacing.xxl,
    ...shadows.card,
  },
  ctaTitle: {
    ...typography.h2,
    color: colors.black,
    marginBottom: spacing.xs,
  },
  ctaSubtitle: {
    ...typography.body,
    color: colors.gray800,
  },
  section: {
    gap: spacing.md,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.white,
    marginBottom: spacing.sm,
  },
  serviceCard: {
    backgroundColor: colors.gray900,
    borderRadius: radii.md,
    padding: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.gray800,
  },
  serviceInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  serviceName: {
    ...typography.subtitle,
    color: colors.white,
  },
  serviceDesc: {
    ...typography.bodySmall,
    color: colors.gray400,
    marginTop: spacing.xxs,
  },
  servicePrice: {
    ...typography.subtitle,
    color: colors.gold,
  },

  // Emergency card
  emergencyCard: {
    backgroundColor: colors.gray900, borderRadius: radii.lg,
    padding: spacing.lg, borderWidth: 1, borderColor: colors.gray800, gap: spacing.md,
    borderLeftWidth: 3, borderLeftColor: colors.gold,
  },
  emergencyHeader: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  emergencyIconCircle: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.gold + '15',
    justifyContent: 'center', alignItems: 'center',
  },
  emergencyTitle: { ...typography.subtitle, color: colors.white, marginBottom: 2 },
  emergencySubtitle: { ...typography.bodySmall, color: colors.gray400, lineHeight: 18 },

  breaksList: { gap: spacing.xs },
  breaksLabel: { ...typography.caption, color: colors.gray400, fontWeight: '700', textTransform: 'uppercase', fontSize: 10 },
  breakRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  breakDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.gold },
  breakDay: { ...typography.bodySmall, color: colors.white, fontWeight: '600', flex: 1 },
  breakTime: { ...typography.caption, color: colors.gray500, fontWeight: '600' },
  breakTypeBadge: {
    backgroundColor: colors.gray800, paddingHorizontal: spacing.sm,
    paddingVertical: 2, borderRadius: radii.sm,
  },
  breakTypeText: { ...typography.caption, color: colors.gray400, fontSize: 10, fontWeight: '600' },

  callButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, backgroundColor: colors.statusConfirmed,
    borderRadius: radii.md, paddingVertical: spacing.md,
  },
  callButtonText: { ...typography.button, color: colors.white, fontSize: 14 },

  // Emergency modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: colors.gray900,
    borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl,
    paddingHorizontal: spacing.xl, paddingBottom: spacing.xl,
  },
  modalHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: colors.gray700, alignSelf: 'center',
    marginTop: spacing.sm, marginBottom: spacing.md,
  },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.gray100,
  },
  modalTitle: { ...typography.h3, color: colors.gray900, flex: 1 },
  modalMessage: {
    flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start',
    backgroundColor: colors.gold + '08', borderRadius: radii.md,
    padding: spacing.md, marginTop: spacing.md,
    borderLeftWidth: 3, borderLeftColor: colors.gold,
  },
  modalMessageText: { ...typography.bodySmall, color: colors.gray400, flex: 1, lineHeight: 20 },
  modalDisclaimer: { ...typography.caption, color: colors.gray400, textAlign: 'center', marginTop: spacing.sm },
});
