import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radii, shadows } from '../../src/theme';
import { TopHeader } from '../../src/components/layout/TopHeader';
import { MOCK_CLIENTS } from '../../src/services/mock-data';

export default function ClientsScreen() {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return MOCK_CLIENTS;
    const q = search.toLowerCase();
    return MOCK_CLIENTS.filter(
      (c) => c.name.toLowerCase().includes(q) || c.phone.includes(q),
    );
  }, [search]);

  return (
    <View style={styles.container}>
      <TopHeader
        title="Clientes"
        subtitle={`${filtered.length} clientes${search ? ' encontrados' : ' registrados'}`}
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Search placeholder */}
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color={colors.gray500} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar cliente..."
            placeholderTextColor={colors.gray400}
            value={search}
            onChangeText={setSearch}
            autoCorrect={false}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={18} color={colors.gray400} />
            </TouchableOpacity>
          )}
        </View>

        {/* Client list */}
        {filtered.map((client) => (
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.black },
  scrollView: {
    flex: 1,
  },
  scrollContent: { padding: spacing.xxl, paddingBottom: spacing.huge, gap: spacing.sm },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.gray900,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.gray800,
  },
  searchInput: { ...typography.body, color: colors.white, flex: 1, padding: 0 },
  clientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gray900,
    borderRadius: radii.md,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.gray800,
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
  clientName: { ...typography.subtitle, color: colors.white },
  clientPhone: { ...typography.bodySmall, color: colors.gray400, marginTop: spacing.xxs },
  clientMeta: { ...typography.caption, color: colors.gray500, marginTop: spacing.xxs },
});
