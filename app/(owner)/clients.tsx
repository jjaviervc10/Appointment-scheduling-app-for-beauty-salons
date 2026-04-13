import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radii, shadows } from '../../src/theme';

const MOCK_CLIENTS = [
  { id: 'c1', name: 'Ana López', phone: '+52 1 555 1234', totalAppts: 12, lastVisit: '2026-04-05' },
  { id: 'c2', name: 'Carlos Méndez', phone: '+52 1 555 5678', totalAppts: 8, lastVisit: '2026-04-12' },
  { id: 'c3', name: 'Lucía Ramírez', phone: '+52 1 555 9012', totalAppts: 5, lastVisit: '2026-04-10' },
  { id: 'c4', name: 'Martha Ruiz', phone: '+52 1 555 3456', totalAppts: 15, lastVisit: '2026-04-11' },
  { id: 'c5', name: 'María García', phone: '+52 1 555 7890', totalAppts: 3, lastVisit: '2026-03-28' },
];

export default function ClientsScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={colors.white} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Clientes</Text>
          <Text style={styles.headerSubtitle}>{MOCK_CLIENTS.length} clientes registrados</Text>
        </View>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Search placeholder */}
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color={colors.gray500} />
          <Text style={styles.searchPlaceholder}>Buscar cliente...</Text>
        </View>

        {/* Client list */}
        {MOCK_CLIENTS.map((client) => (
          <TouchableOpacity key={client.id} style={styles.clientCard} activeOpacity={0.7}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {client.name.split(' ').map((n) => n[0]).join('')}
              </Text>
            </View>
            <View style={styles.clientInfo}>
              <Text style={styles.clientName}>{client.name}</Text>
              <Text style={styles.clientPhone}>{client.phone}</Text>
              <Text style={styles.clientMeta}>
                {client.totalAppts} citas · Última: {client.lastVisit}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.gray400} />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.black },
  header: {
    backgroundColor: colors.black,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: { marginRight: spacing.md, padding: spacing.xs },
  headerContent: { flex: 1 },
  headerTitle: { ...typography.h2, color: colors.white },
  headerSubtitle: { ...typography.bodySmall, color: colors.gray500, marginTop: spacing.xxs },
  scrollView: {
    flex: 1,
    backgroundColor: colors.gray50,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
  },
  scrollContent: { padding: spacing.xl, paddingBottom: spacing.huge, gap: spacing.sm },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.card,
  },
  searchPlaceholder: { ...typography.body, color: colors.gray400 },
  clientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radii.md,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadows.card,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.black,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { ...typography.buttonSmall, color: colors.gold, fontSize: 14 },
  clientInfo: { flex: 1 },
  clientName: { ...typography.subtitle, color: colors.gray900 },
  clientPhone: { ...typography.bodySmall, color: colors.gray600, marginTop: spacing.xxs },
  clientMeta: { ...typography.caption, color: colors.gray500, marginTop: spacing.xxs },
});
