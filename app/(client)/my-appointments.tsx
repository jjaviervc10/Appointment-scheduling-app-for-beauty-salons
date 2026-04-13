import React from 'react';
import { View, Text, StyleSheet, FlatList, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, typography, radii } from '../../src/theme';
import { AppointmentCard } from '../../src/components/appointments/AppointmentCard';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { LoadingState } from '../../src/components/ui/LoadingState';
import { useUpcomingAppointments } from '../../src/hooks/useAppointments';

export default function MyAppointmentsScreen() {
  const { data: appointments, loading } = useUpcomingAppointments();

  const nextAppointment = appointments[0];
  const restAppointments = appointments.slice(1);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <Image
          source={require('../../assets/LogoJL.png')}
          style={styles.headerLogo}
          resizeMode="contain"
        />
        <View style={styles.headerTextBlock}>
          <Text style={styles.headerTitle}>Mis citas</Text>
          <Text style={styles.headerSubtitle}>Seguimiento y estado</Text>
        </View>
      </View>

      <View style={styles.body}>
        {loading ? (
          <LoadingState />
        ) : appointments.length === 0 ? (
          <EmptyState
            title="Sin citas"
            message="No tienes citas programadas. ¡Reserva una ahora!"
          />
        ) : (
          <FlatList
            data={appointments}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            ListHeaderComponent={
              nextAppointment ? (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Próxima cita</Text>
                  <AppointmentCard appointment={nextAppointment} variant="featured" />
                </View>
              ) : null
            }
            renderItem={({ item, index }) => {
              if (index === 0) return null;
              return (
                <View style={index === 1 ? styles.section : undefined}>
                  {index === 1 && (
                    <Text style={styles.sectionTitle}>Anteriores / Próximas</Text>
                  )}
                  <AppointmentCard appointment={item} />
                </View>
              );
            }}
          />
        )}
      </View>
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
    paddingBottom: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  headerLogo: { width: 40, height: 40 },
  headerTextBlock: { flex: 1 },
  headerTitle: {
    ...typography.h2,
    color: colors.white,
  },
  headerSubtitle: {
    ...typography.bodySmall,
    color: colors.gray500,
    marginTop: spacing.xxs,
  },
  body: {
    flex: 1,
    backgroundColor: colors.gray50,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
  },
  listContent: {
    padding: spacing.xl,
    paddingBottom: spacing.huge,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.gray900,
    marginBottom: spacing.md,
  },
});
