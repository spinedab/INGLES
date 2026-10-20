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

const LETTER = 'A-Za-z\u00C0-\u024F';
const CJK = /[\u3400-\u9FFF]/;
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// «离…很近» marca un hueco: en el texto aparece como «离公司很近».
function gapPattern(word: string): string {
  const gap = CJK.test(word) ? '[^。！？\\n]{0,12}?' : '[^.!?\\n]{0,40}?';
  return word.split('…').map((p) => escapeRe(p.trim())).join(gap);
}

// La glosa trae a veces la pronunciación entre paréntesis («起床 (qǐchuáng)»),
// que no está en el texto. Y \b es ASCII: no casa ante «à» o «é», ni entre
// hanzi, que no llevan espacios. Por eso el límite de palabra se hace a mano y
// solo en escrituras con espacios. Grupo 1: lo que precede; grupo 2: la palabra.
function glossPattern(word: string): RegExp {
  const base = word.replace(/\s*\([^)]*\)\s*$/, '');
  const body = gapPattern(base);
  return CJK.test(base)
    ? new RegExp(`()(${body})`)
    : new RegExp(`(^|[^${LETTER}])(${body})(?![${LETTER}])`, 'i');
}

function glossTip(g: { word: string; tip: string }): string {
  const pron = g.word.match(/\(([^)]*)\)\s*$/);
  return pron ? `${pron[1]} · ${g.tip}` : g.tip;
}

function stripTags(html: string): string {
  return html
    .replace(/<\/?p[^>]*>/gi, '\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '');
}

// Marca rangos sobre el texto original en vez de reescribirlo: el texto que lee
// el aprendiz sale tal cual (sin reinyectar la forma del diccionario, que
// convertía «On closer inspection» en «on closer inspection»), y una glosa
// dentro de una colocación conserva las dos marcas. Antes, la glosa insertaba
// marcadores que impedían casar la colocación que la contenía.
function segmentText(plain: string, glosses: { word: string; tip: string }[], collocations: string[]): Segment[] {
  const n = plain.length;
  const tipAt: (string | undefined)[] = new Array(n).fill(undefined);
  const collAt: boolean[] = new Array(n).fill(false);

  glosses.forEach((g) => {
    const m = glossPattern(g.word).exec(plain);
    if (!m) return;
    const start = m.index + m[1].length;
    const end = start + m[2].length;
    if (tipAt.slice(start, end).some(Boolean)) return; // la primera glosa manda
    const tip = glossTip(g);
    for (let k = start; k < end; k++) tipAt[k] = tip;
  });
  collocations.forEach((c) => {
    const m = new RegExp(gapPattern(c), 'i').exec(plain);
    if (!m) return;
    for (let k = m.index; k < m.index + m[0].length; k++) collAt[k] = true;
  });

  const segments: Segment[] = [];
  let start = 0;
  for (let k = 1; k <= n; k++) {
    if (k === n || tipAt[k] !== tipAt[start] || collAt[k] !== collAt[start]) {
      segments.push({ text: plain.slice(start, k), tip: tipAt[start], collocation: collAt[start] || undefined });
      start = k;
    }
  }
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
                  style={[
                    styles.gloss,
                    { color: theme.fg, borderBottomColor: theme.accent },
                    s.collocation && { backgroundColor: theme.accentSoft },
                  ]}
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
