import React, { useEffect, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { Stack } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { StatBlock } from '@/components/StatBlock';
import { Chip } from '@/components/Chip';
import { useLevel } from '@/lib/levelContext';
import {
  addLexiconEntry,
  buildCloze,
  deleteEntry,
  filterEntries,
  lexiconEntries,
  toggleMastered,
} from '@/lib/notebook';
import { logActivity } from '@/lib/insights';
import { radius, spacing, useTheme } from '@/lib/theme';
import type { LexiconEntry } from '@/lib/types';

type StatusFilter = 'active' | 'all' | 'mastered';

export default function NotebookScreen() {
  const { level } = useLevel();
  const theme = useTheme();
  const [all, setAll] = useState<LexiconEntry[]>([]);
  const [visible, setVisible] = useState<LexiconEntry[]>([]);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<StatusFilter>('active');

  // Form
  const [term, setTerm] = useState('');
  const [meaning, setMeaning] = useState('');
  const [example, setExample] = useState('');
  const [notes, setNotes] = useState('');
  const [savedMsg, setSavedMsg] = useState('');

  // Quiz
  const [quizEntry, setQuizEntry] = useState<LexiconEntry | null>(null);
  const [quizRevealed, setQuizRevealed] = useState(false);

  const refresh = async () => {
    const entries = await lexiconEntries();
    setAll(entries);
    const filtered = await filterEntries({ status, query });
    setVisible(filtered);
    pickQuiz(entries.filter((e) => !e.mastered));
  };

  const pickQuiz = (pool: LexiconEntry[]) => {
    if (!pool.length) {
      setQuizEntry(null);
      return;
    }
    const next = pool[Math.floor(Math.random() * pool.length)];
    setQuizEntry(next);
    setQuizRevealed(false);
  };

  useEffect(() => {
    void refresh();
  }, []);

  useEffect(() => {
    (async () => {
      const filtered = await filterEntries({ status, query });
      setVisible(filtered);
    })();
  }, [query, status, all]);

  const submit = async () => {
    if (!term.trim()) {
      setSavedMsg('Escribe una entrada primero.');
      return;
    }
    const saved = await addLexiconEntry({
      term,
      meaning,
      example,
      notes,
      source: 'manual',
      level,
    });
    setSavedMsg(saved ? `Guardado: ${saved.term}` : 'Error guardando.');
    setTerm('');
    setMeaning('');
    setExample('');
    setNotes('');
    await refresh();
  };

  const active = all.filter((e) => !e.mastered);
  const mastered = all.filter((e) => e.mastered);
  const inLevel = all.filter((e) => e.level === level);

  const cloze = quizEntry ? buildCloze(quizEntry) : null;

  return (
    <>
      <Stack.Screen options={{ title: 'Cuaderno' }} />
      <Screen>
        <Text variant="h1">Cuaderno léxico</Text>
        <Text muted style={{ marginBottom: spacing.lg }}>
          Guarda palabras, colocaciones y ejemplos para convertir el input en output reutilizable.
        </Text>

        <View style={styles.statsRow}>
          <StatBlock label="Activas" value={active.length} />
          <StatBlock label="Dominadas" value={mastered.length} />
          <StatBlock label="Nivel" value={inLevel.length} />
          <StatBlock label="Total" value={all.length} />
        </View>

        <Text variant="h2" style={{ marginTop: spacing.xl }}>
          Añadir entrada
        </Text>
        <Text muted style={{ marginBottom: spacing.sm }}>
          Ideal para chunks: verb + preposition, colocaciones, frases útiles.
        </Text>
        <TextInput
          value={term}
          onChangeText={setTerm}
          placeholder="Entrada (take a photo)"
          placeholderTextColor={theme.muted}
          style={[styles.input, { borderColor: theme.border, color: theme.fg, backgroundColor: theme.card }]}
        />
        <TextInput
          value={meaning}
          onChangeText={setMeaning}
          placeholder="Significado (hacer/tomar una foto)"
          placeholderTextColor={theme.muted}
          style={[styles.input, { borderColor: theme.border, color: theme.fg, backgroundColor: theme.card }]}
        />
        <TextInput
          value={example}
          onChangeText={setExample}
          placeholder="Ejemplo (I want to take a photo of this page.)"
          placeholderTextColor={theme.muted}
          multiline
          style={[styles.input, styles.textarea, { borderColor: theme.border, color: theme.fg, backgroundColor: theme.card }]}
        />
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder="Notas (make a photo no suena natural)"
          placeholderTextColor={theme.muted}
          multiline
          style={[styles.input, styles.textarea, { borderColor: theme.border, color: theme.fg, backgroundColor: theme.card }]}
        />
        <Button title="Guardar entrada" onPress={submit} />
        {savedMsg ? (
          <Text variant="small" muted style={{ marginTop: spacing.sm }}>
            {savedMsg}
          </Text>
        ) : null}

        <Text variant="h2" style={{ marginTop: spacing.xl }}>
          Quiz rápido
        </Text>
        <Text muted style={{ marginBottom: spacing.sm }}>
          Recuperación activa con tus propias entradas activas.
        </Text>
        {cloze ? (
          <Card>
            <Text variant="caption" muted style={{ textTransform: 'uppercase' }}>
              Recuperación activa
            </Text>
            <Text style={{ marginVertical: spacing.sm, lineHeight: 24 }}>{cloze.prompt}</Text>
            {!quizRevealed ? (
              <Button
                title="Revelar"
                onPress={() => {
                  setQuizRevealed(true);
                  void logActivity('lexicon_quiz', { skill: 'writing', minutes: 3 });
                }}
              />
            ) : (
              <>
                <Text variant="h3" style={{ marginTop: spacing.sm }}>
                  {quizEntry!.term}
                </Text>
                {quizEntry!.meaning ? <Text>{quizEntry!.meaning}</Text> : null}
                {quizEntry!.example ? (
                  <Text style={{ fontStyle: 'italic', marginTop: spacing.xs }} muted>
                    "{quizEntry!.example}"
                  </Text>
                ) : null}
              </>
            )}
            <Button
              title="Otra entrada"
              variant="secondary"
              onPress={() => pickQuiz(active)}
              style={{ marginTop: spacing.sm }}
            />
          </Card>
        ) : (
          <Card>
            <Text muted>Guarda algunas entradas para activar el quiz.</Text>
          </Card>
        )}

        <Text variant="h2" style={{ marginTop: spacing.xl }}>
          Entradas guardadas
        </Text>

        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Filtrar cuaderno…"
          placeholderTextColor={theme.muted}
          style={[styles.input, { borderColor: theme.border, color: theme.fg, backgroundColor: theme.card }]}
        />
        <View style={{ flexDirection: 'row', marginBottom: spacing.sm }}>
          <Chip label="Activas" active={status === 'active'} onPress={() => setStatus('active')} />
          <Chip label="Todas" active={status === 'all'} onPress={() => setStatus('all')} />
          <Chip label="Dominadas" active={status === 'mastered'} onPress={() => setStatus('mastered')} />
        </View>

        {visible.length === 0 ? (
          <Text muted style={{ marginTop: spacing.md }}>
            Aún no hay entradas en este filtro.
          </Text>
        ) : (
          visible.map((entry) => (
            <Card key={entry.id}>
              <Text style={{ fontWeight: '700', fontSize: 17 }}>{entry.term}</Text>
              <Text>{entry.meaning || 'Sin significado todavía.'}</Text>
              {entry.example ? (
                <Text style={{ fontStyle: 'italic', marginTop: spacing.xs }} muted>
                  "{entry.example}"
                </Text>
              ) : null}
              {entry.notes ? (
                <Text variant="small" muted style={{ marginTop: spacing.xs }}>
                  {entry.notes}
                </Text>
              ) : null}
              <View style={styles.tagRow}>
                {entry.level ? (
                  <View style={[styles.tag, { backgroundColor: theme.accentSoft }]}>
                    <Text variant="caption" style={{ color: theme.accent }}>
                      {entry.level.toUpperCase()}
                    </Text>
                  </View>
                ) : null}
                <View style={[styles.tag, { backgroundColor: theme.accentSoft }]}>
                  <Text variant="caption" style={{ color: theme.accent }}>
                    {entry.source}
                  </Text>
                </View>
                <View
                  style={[
                    styles.tag,
                    {
                      backgroundColor: entry.mastered ? theme.good + '22' : theme.accentSoft,
                    },
                  ]}
                >
                  <Text
                    variant="caption"
                    style={{ color: entry.mastered ? theme.good : theme.accent }}
                  >
                    {entry.mastered ? 'Dominada' : 'Activa'}
                  </Text>
                </View>
              </View>
              <View style={[styles.btnRow, { marginTop: spacing.sm }]}>
                <Button
                  title={entry.mastered ? 'Reactivar' : 'Domino'}
                  variant="secondary"
                  onPress={async () => {
                    await toggleMastered(entry.id);
                    await refresh();
                  }}
                  style={{ flex: 1 }}
                />
                <Button
                  title="Eliminar"
                  variant="danger"
                  onPress={async () => {
                    await deleteEntry(entry.id);
                    await refresh();
                  }}
                  style={{ flex: 1 }}
                />
              </View>
            </Card>
          ))
        )}
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 15,
    marginBottom: spacing.sm,
  },
  textarea: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.sm,
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
