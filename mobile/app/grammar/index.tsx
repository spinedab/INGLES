import React from 'react';
import { Link } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { Card } from '@/components/Card';
import { GRAMMAR_TOPICS } from '@/lib/content';
import { spacing } from '@/lib/theme';

export default function GrammarIndex() {
  return (
    <Screen>
      <Text variant="h1">Gramática focalizada</Text>
      <Text muted style={{ marginBottom: spacing.lg }}>
        Puntos críticos para hispanohablantes. Instrucción explícita (Norris &amp; Ortega 2000, d=0.96) + práctica con feedback inmediato.
      </Text>

      {GRAMMAR_TOPICS.map((t) => (
        <Link key={t.id} href={`/grammar/${t.id}`} asChild>
          <Card>
            <Text variant="caption" accent style={{ textTransform: 'uppercase' }}>
              Nivel {t.level.toUpperCase()}
            </Text>
            <Text variant="h3" style={{ marginTop: spacing.xs }}>
              {t.title}
            </Text>
            <Text muted style={{ marginTop: spacing.xs }}>
              {t.why.slice(0, 130)}…
            </Text>
          </Card>
        </Link>
      ))}
    </Screen>
  );
}
