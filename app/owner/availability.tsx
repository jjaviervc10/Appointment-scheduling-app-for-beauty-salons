import React from 'react';
import { View, StyleSheet } from 'react-native';
import { TopHeader } from '../../src/components/layout/TopHeader';
import { AvailabilityPanel } from '../../src/components/agenda/AvailabilityPanel';
import { colors } from '../../src/theme';

export default function OwnerAvailabilityScreen() {
  return (
    <View style={styles.container}>
      <TopHeader
        title="Disponibilidad"
        subtitle="Configura los horarios disponibles"
      />
      <AvailabilityPanel />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.black,
  },
});
