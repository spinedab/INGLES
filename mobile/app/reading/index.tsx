import React, { useEffect, useState } from 'react';
import { Link } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { Card } from '@/components/Card';
import { useLevel } from '@/lib/levelContext';
import { READING_INDEX, loadReading } from '@/lib/content';
import { spacing } from '@/lib/theme';
import type { ReadingText } from '@/lib/types';

export default function ReadingIndex() {
  const { level } = useLevel();
  const [items, setItems] = useState<ReadingText[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const ids = READING_INDEX[level] || [];
      const loaded = await Promise.all(
        ids.map((id) => loadReading(id).catch(() => null)),
      );
      if (!cancelled) setItems(loaded.filter((x): x is ReadingText => x != null));
    })();
    return () => {
      cancelled = true;
    };
  }, [level]);

  return (
    <Screen>
      <Text variant="h1">Lectura graduada</Text>
      <Text muted style={{ marginBottom: spacing.lg }}>
        Textos i+1 (Krashen 1985). Las palabras con borde inferior tienen glosa; las colocaciones aparecen resaltadas — anótalas.
      </Text>

      {items.length === 0 ? (
        <Text muted>Sin lecturas en {level.toUpperCase()} todavía.</Text>
      ) : (
        items.map((t, i) => (
          <Link key={t.id ?? READING_INDEX[level][i]} href={`/reading/${READING_INDEX[level][i]}`} asChild>
            <Card>
              <Text variant="caption" muted style={{ textTransform: 'uppercase' }}>
                {READING_INDEX[level][i]}
              </Text>
              <Text variant="h3" style={{ marginTop: spacing.xs }}>
                {t.title}
              </Text>
              <Text muted style={{ marginTop: spacing.xs }}>
                {t.summary}
              </Text>
            </Card>
          </Link>
        ))
      )}
    </Screen>
  );
}
