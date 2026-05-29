import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Stack, router } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { useLevel } from '@/lib/levelContext';
import { buildSearchIndex, labelForType, searchIndex, snippet } from '@/lib/search';
import { addLexiconEntry, isSaved } from '@/lib/notebook';
import { radius, spacing, useTheme } from '@/lib/theme';
import type { SearchItem } from '@/lib/types';

type TypeFilter = 'all' | SearchItem['type'];

export default function SearchScreen() {
  const { level } = useLevel();
  const theme = useTheme();
  const [query, setQuery] = useState('');
  const [type, setType] = useState<TypeFilter>('all');
  const [index, setIndex] = useState<SearchItem[]>([]);
  const [results, setResults] = useState<SearchItem[]>([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const idx = await buildSearchIndex();
      setIndex(idx);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!index.length) return;
    const found = searchIndex(index, query, { type, level });
    setResults(found);
    // Check which results are saved
    (async () => {
      const checks = await Promise.all(
        found.map(async (r) => (r.save && (await isSaved(r.save.term)) ? r.save.term : null)),
      );
      setSavedIds(new Set(checks.filter(Boolean) as string[]));
    })();
  }, [index, query, type, level]);

  const onSave = async (item: SearchItem) => {
    if (!item.save) return;
    await addLexiconEntry(item.save);
    setSavedIds((prev) => new Set([...prev, item.save!.term]));
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Búsqueda' }} />
      <Screen>
        <Text variant="h1">Búsqueda global</Text>
        <Text muted style={{ marginBottom: spacing.lg }}>
          Encuentra vocabulario, colocaciones, lecturas, listening y puntos gramaticales desde un solo lugar.
        </Text>

        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Buscar: present perfect, take, breakfast…"
          placeholderTextColor={theme.muted}
          autoCorrect={false}
          autoCapitalize="none"
          style={[styles.input, { borderColor: theme.border, color: theme.fg, backgroundColor: theme.card }]}
        />

        <View style={styles.chipRow}>
          <Chip label="Todo" active={type === 'all'} onPress={() => setType('all')} />
          <Chip label="Vocab" active={type === 'vocab'} onPress={() => setType('vocab')} />
          <Chip label="Lectura" active={type === 'reading'} onPress={() => setType('reading')} />
          <Chip label="Listening" active={type === 'listening'} onPress={() => setType('listening')} />
          <Chip label="Gramática" active={type === 'grammar'} onPress={() => setType('grammar')} />
        </View>

        <Text variant="caption" muted style={{ marginVertical: spacing.sm }}>
          {loading ? 'Construyendo índice…' : `${results.length} resultados`}
          {query ? ` · "${query}"` : ' · Sugerencias para tu nivel'}
        </Text>

        {results.length === 0 && !loading ? (
          <Text muted style={{ marginTop: spacing.md }}>
            No encontré resultados. Prueba con una palabra más corta o cambia el filtro.
          </Text>
        ) : (
          results.map((item, i) => {
            const isSavedItem = item.save && savedIds.has(item.save.term);
            return (
              <Card key={`${item.type}-${item.title}-${i}`}>
                <View style={styles.tagRow}>
                  <View style={[styles.tag, { backgroundColor: theme.accentSoft }]}>
                    <Text variant="caption" style={{ color: theme.accent }}>
                      {labelForType(item.type)}
                    </Text>
                  </View>
                  <View style={[styles.tag, { backgroundColor: theme.accentSoft }]}>
                    <Text variant="caption" style={{ color: theme.accent }}>
                      {item.level.toUpperCase()}
                    </Text>
                  </View>
                  {isSavedItem && (
                    <View style={[styles.tag, { backgroundColor: theme.good + '22' }]}>
                      <Text variant="caption" style={{ color: theme.good }}>
                        En cuaderno
                      </Text>
                    </View>
                  )}
                </View>
                <Pressable onPress={() => router.push(item.href as any)}>
                  <Text variant="h3" accent style={{ marginTop: spacing.xs }}>
                    {item.title}
                  </Text>
                </Pressable>
                <Text variant="small" muted>
                  {item.subtitle}
                </Text>
                <Text variant="small" style={{ marginTop: spacing.xs }}>
                  {snippet(item.body)}
                </Text>
                <View style={[styles.btnRow, { marginTop: spacing.sm }]}>
                  <Button title="Abrir" variant="secondary" onPress={() => router.push(item.href as any)} style={{ flex: 1 }} />
                  {item.save && (
                    <Button
                      title={isSavedItem ? 'Actualizar' : 'Guardar'}
                      onPress={() => onSave(item)}
                      style={{ flex: 1 }}
                    />
                  )}
                </View>
              </Card>
            );
          })
        )}
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 15,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.sm,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  tag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  btnRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
});
