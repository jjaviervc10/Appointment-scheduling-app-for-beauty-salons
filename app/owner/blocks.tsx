import React from 'react';
import { View, StyleSheet } from 'react-native';
import { TopHeader } from '../../src/components/layout/TopHeader';
import { BlocksPanel } from '../../src/components/agenda/BlocksPanel';
import { colors } from '../../src/theme';

export default function OwnerBlocksScreen() {
  return (
    <View style={styles.container}>
      <TopHeader
        title="Bloqueos"
        subtitle="Bloqueos de horario e incidencias"
      />
      <BlocksPanel />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.black,
  },
});
