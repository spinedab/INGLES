import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { Button } from '@/components/Button';
import { QuestionBlock } from '@/components/QuestionBlock';
import { StatBlock } from '@/components/StatBlock';
import { loadReading } from '@/lib/content';
import { get, set } from '@/lib/storage';
import { logActivity } from '@/lib/insights';
import { radius, spacing, useTheme } from '@/lib/theme';
import type { ReadingText } from '@/lib/types';

type Segment = { text: string; tip?: string; collocation?: boolean };

function stripTags(html: string): string {
  return html
    .replace(/<\/?p[^>]*>/gi, '\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '');
}

function segmentText(plain: string, glosses: { word: string; tip: string }[], collocations: string[]): Segment[] {
  // Sustituye tanto glosas (case-insensitive, palabra completa) como colocaciones por marcadores.
  // Estrategia: ordena marcadores por longitud decreciente, escapa regex, sustituye, luego separa.
  const markers: { token: string; replacement: (m: string) => string }[] = [];
  glosses.forEach((g, i) => {
    const esc = g.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    markers.push({
      token: `\\b(${esc})\\b`,
      replacement: () => `[[G${i}]]${g.word}[[/G${i}]]`,
    });
  });
  collocations.forEach((c, i) => {
    const esc = c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    markers.push({
      token: `(${esc})`,
      replacement: () => `[[C${i}]]${c}[[/C${i}]]`,
    });
  });

  let text = plain;
  for (const m of markers) {
    const re = new RegExp(m.token, 'i');
    text = text.replace(re, m.replacement);
  }

  // Parser de marcadores → array de segmentos.
  const segments: Segment[] = [];
  const re = /\[\[(G|C)(\d+)\]\]([\s\S]*?)\[\[\/\1\2\]\]/g;
  let lastIdx = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text))) {
    if (match.index > lastIdx) segments.push({ text: text.slice(lastIdx, match.index) });
    const [, kind, idxStr, word] = match;
    if (kind === 'G') {
      const idx = parseInt(idxStr, 10);
      segments.push({ text: word, tip: glosses[idx].tip });
    } else {
      segments.push({ text: word, collocation: true });
    }
    lastIdx = match.index + match[0].length;
  }
  if (lastIdx < text.length) segments.push({ text: text.slice(lastIdx) });
  return segments;
}

export default function ReadingDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const [data, setData] = useState<ReadingText | null>(null);
  const [done, setDone] = useState(false);
  const [score, setScore] = useState<{ correct: number; total: number } | null>(null);
  const [answers, setAnswers] = useState<Record<number, boolean>>({});
  const [activeTip, setActiveTip] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const t = await loadReading(id);
      setData(t);
      const d = await get<boolean>(`reading:done:${id}`, false);
      setDone(d);
    })();
  }, [id]);

  const segments = useMemo<Segment[]>(() => {
    if (!data) return [];
    return segmentText(stripTags(data.text), data.glosses, data.collocations);
  }, [data]);

  const handleAnswer = (qi: number, correct: boolean) => {
    setAnswers((prev) => {
      const next = { ...prev, [qi]: correct };
      if (data && Object.keys(next).length === data.questions.length) {
        const c = Object.values(next).filter(Boolean).length;
        setScore({ correct: c, total: data.questions.length });
        void set(`reading:score:${id}`, { correct: c, total: data.questions.length, ts: Date.now() });
        void logActivity('reading_score', {
          skill: 'reading',
          id_: id,
          title: data.title,
          correct: c,
          total: data.questions.length,
          minutes: 6,
        });
      }
      return next;
    });
  };

  const markDone = async () => {
    const wasDone = await get<boolean>(`reading:done:${id}`, false);
    await set(`reading:done:${id}`, true);
    setDone(true);
    if (!wasDone && data) {
      const wordCount = data.text.replace(/<[^>]*>/g, '').split(/\s+/).filter(Boolean).length;
      await logActivity('reading_done', {
        skill: 'reading',
        id_: id,
        title: data.title,
        minutes: Math.max(8, Math.round(wordCount / 18)),
      });
    }
  };

  if (!data) {
    return (
      <Screen>
        <Text>Cargando…</Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <Text variant="h1">{data.title}</Text>
      <Text muted style={{ marginBottom: spacing.lg }}>
        {data.summary}
      </Text>

      <View
        style={[styles.textBlock, { backgroundColor: theme.card, borderColor: theme.border }]}
      >
        <Text style={styles.body}>
          {segments.map((s, i) => {
            if (s.tip) {
              return (
                <Text
                  key={i}
                  onPress={() => setActiveTip(s.tip!)}
                  style={[styles.gloss, { color: theme.fg, borderBottomColor: theme.accent }]}
                >
                  {s.text}
                </Text>
              );
            }
            if (s.collocation) {
              return (
                <Text key={i} style={[styles.collocation, { backgroundColor: theme.accentSoft, color: theme.fg }]}>
                  {s.text}
                </Text>
              );
            }
            return (
              <Text key={i} style={{ color: theme.fg }}>
                {s.text}
              </Text>
            );
          })}
        </Text>
      </View>

      {activeTip && (
        <View
          style={[
            styles.tipBox,
            { backgroundColor: theme.accentSoft, borderColor: theme.accent },
          ]}
        >
          <Text variant="caption" muted style={{ textTransform: 'uppercase' }}>
            Glosa
          </Text>
          <Text style={{ color: theme.accent, marginTop: spacing.xs }}>{activeTip}</Text>
        </View>
      )}

      <Text variant="h2" style={{ marginTop: spacing.lg }}>
        Comprensión
      </Text>
      {data.questions.map((q, i) => (
        <QuestionBlock key={i} question={q} number={i + 1} onAnswer={(c) => handleAnswer(i, c)} />
      ))}

      {score && (
        <View style={{ flexDirection: 'row', gap: spacing.sm, marginVertical: spacing.md }}>
          <StatBlock label="Tu puntuación" value={`${score.correct}/${score.total}`} />
        </View>
      )}

      <Text variant="h3" style={{ marginTop: spacing.lg }}>
        Colocaciones para anotar
      </Text>
      {data.collocations.map((c) => (
        <Text key={c} style={{ marginVertical: 2 }}>
          • <Text style={{ fontWeight: '600' }}>{c}</Text>
        </Text>
      ))}

      <View style={{ marginTop: spacing.xl }}>
        <Button
          title={done ? '✓ Marcada como leída' : 'Marcar como leída'}
          variant={done ? 'secondary' : 'primary'}
          onPress={markDone}
          disabled={done}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  textBlock: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    marginVertical: spacing.md,
  },
  body: {
    fontSize: 17,
    lineHeight: 28,
  },
  gloss: {
    borderBottomWidth: 1.5,
    borderStyle: 'dotted',
  },
  collocation: {
    paddingHorizontal: 2,
    borderRadius: 3,
  },
  tipBox: {
    padding: spacing.md,
    borderRadius: radius.md,
    borderLeftWidth: 4,
    marginBottom: spacing.md,
  },
});
