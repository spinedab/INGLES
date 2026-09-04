import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from './Text';
import { useLevel } from '@/lib/levelContext';
import { useTheme } from '@/lib/theme';
import { LANGUAGES, type LangCode } from '@/lib/content';

/** Idioma que se estudia. Mismo aspecto que LevelPicker para que se lean
 *  como un par: idioma + nivel. */
export function LanguagePicker() {
  const { lang, setLang } = useLevel();
  const theme = useTheme();
  return (
    <View style={styles.row}>
      {LANGUAGES.map((l) => {
        const active = l.code === lang;
        return (
          <Pressable
            key={l.code}
            onPress={() => setLang(l.code as LangCode)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            style={[
              styles.btn,
              {
                backgroundColor: active ? theme.accent : theme.card,
                borderColor: active ? theme.accent : theme.border,
              },
            ]}
          >
            <Text style={{ color: active ? '#fff' : theme.fg, fontWeight: '600' }}>{l.name}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  btn: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1 },
});
