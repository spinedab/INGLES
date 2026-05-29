import React, { useEffect, useState } from 'react';
import { Link } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { Card } from '@/components/Card';
import { useLevel } from '@/lib/levelContext';
import { LISTENING_INDEX, loadListening } from '@/lib/content';
import { spacing } from '@/lib/theme';
import type { ListeningItem } from '@/lib/types';

export default function ListeningIndex() {
  const { level } = useLevel();
  const [items, setItems] = useState<ListeningItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const ids = LISTENING_INDEX[level] || [];
      const loaded = await Promise.all(
        ids.map((id) => loadListening(id).catch(() => null)),
      );
      if (!cancelled) setItems(loaded.filter((x): x is ListeningItem => x != null));
    })();
    return () => {
      cancelled = true;
    };
  }, [level]);

  return (
    <Screen>
      <Text variant="h1">Listening</Text>
      <Text muted style={{ marginBottom: spacing.lg }}>
        Estrategia: (1) escucha sin script; (2) anota lo que captes; (3) revela el script; (4) escucha de nuevo con script; (5) escucha final sin script.
      </Text>

      {items.length === 0 ? (
        <Text muted>Sin ejercicios en {level.toUpperCase()} todavía.</Text>
      ) : (
        items.map((it, i) => (
          <Link key={LISTENING_INDEX[level][i]} href={`/listening/${LISTENING_INDEX[level][i]}`} asChild>
            <Card>
              <Text variant="caption" muted style={{ textTransform: 'uppercase' }}>
                {LISTENING_INDEX[level][i]}
              </Text>
              <Text variant="h3" style={{ marginTop: spacing.xs }}>
                {it.title}
              </Text>
              <Text muted style={{ marginTop: spacing.xs }}>
                {it.summary} · {it.duration}
              </Text>
            </Card>
          </Link>
        ))
      )}
    </Screen>
  );
}
