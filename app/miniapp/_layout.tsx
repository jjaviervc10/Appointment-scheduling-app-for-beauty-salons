import { Stack } from 'expo-router';
import { colors } from '../../src/theme';

export default function MiniAppLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.black },
        animation: 'slide_from_right',
      }}
    />
  );
}
