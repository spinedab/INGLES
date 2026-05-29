import React, { useEffect, useState } from 'react';
import { Linking, Platform, StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Audio } from 'expo-av';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { Button } from '@/components/Button';
import { QuestionBlock } from '@/components/QuestionBlock';
import { StatBlock } from '@/components/StatBlock';
import { loadListening } from '@/lib/content';
import { set } from '@/lib/storage';
import { logActivity } from '@/lib/insights';
import { radius, spacing, useTheme } from '@/lib/theme';
import type { ListeningItem } from '@/lib/types';

export default function ListeningDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const [data, setData] = useState<ListeningItem | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [score, setScore] = useState<{ correct: number; total: number } | null>(null);
  const [answers, setAnswers] = useState<Record<number, boolean>>({});
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const it = await loadListening(id);
      setData(it);
    })();
  }, [id]);

  useEffect(() => {
    return () => {
      if (sound) sound.unloadAsync().catch(() => {});
    };
  }, [sound]);

  const playAudio = async () => {
    if (!data?.audio) return;
    if (Platform.OS === 'web') {
      const el = document.createElement('audio');
      el.src = data.audio;
      el.controls = true;
      void el.play();
      return;
    }
    if (sound) {
      if (playing) {
        await sound.pauseAsync();
        setPlaying(false);
      } else {
        await sound.playAsync();
        setPlaying(true);
      }
      return;
    }
    const { sound: s } = await Audio.Sound.createAsync({ uri: data.audio });
    setSound(s);
    setPlaying(true);
    await s.playAsync();
  };

  const handleAnswer = (qi: number, correct: boolean) => {
    setAnswers((prev) => {
      const next = { ...prev, [qi]: correct };
      if (data && Object.keys(next).length === data.questions.length) {
        const c = Object.values(next).filter(Boolean).length;
        setScore({ correct: c, total: data.questions.length });
        void logActivity('listening_score', {
          skill: 'listening',
          id_: id,
          title: data.title,
          correct: c,
          total: data.questions.length,
        });
      }
      return next;
    });
  };

  const reveal = async () => {
    setRevealed(true);
    await set(`listening:revealed:${id}`, Date.now());
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
        {data.summary} · {data.duration}
      </Text>

      {data.audio ? (
        <Button title={playing ? 'Pausar' : 'Reproducir audio'} onPress={playAudio} />
      ) : (
        <View
          style={[
            styles.note,
            { backgroundColor: theme.accentSoft, borderColor: theme.accent },
          ]}
        >
          <Text muted>
            Audio externo. Toca para abrir en el navegador:
          </Text>
          <Button
            title={data.externalUrl ?? 'Abrir'}
            variant="secondary"
            onPress={() => data.externalUrl && Linking.openURL(data.externalUrl)}
            style={{ marginTop: spacing.sm }}
          />
        </View>
      )}

      <View style={{ marginTop: spacing.lg }}>
        {!revealed ? (
          <Button
            title="Revelar script (tras la primera escucha)"
            variant="secondary"
            onPress={reveal}
          />
        ) : (
          <View style={[styles.script, { backgroundColor: theme.card, borderColor: theme.border }]}>
            {data.script.split('\n').map((line, i) => (
              <Text key={i} style={{ marginBottom: spacing.xs, lineHeight: 26 }}>
                {line}
              </Text>
            ))}
          </View>
        )}
      </View>

      <Text variant="h2" style={{ marginTop: spacing.lg }}>
        Comprensión
      </Text>
      {data.questions.map((q, i) => (
        <QuestionBlock key={i} question={q} number={i + 1} onAnswer={(c) => handleAnswer(i, c)} />
      ))}

      {score && (
        <View style={{ flexDirection: 'row', marginVertical: spacing.md }}>
          <StatBlock label="Tu puntuación" value={`${score.correct}/${score.total}`} />
        </View>
      )}

      <Text variant="h3" style={{ marginTop: spacing.lg }}>
        Vocabulario clave
      </Text>
      {data.vocabulary.map((v) => (
        <Text key={v.word} style={{ marginVertical: 2 }}>
          • <Text style={{ fontWeight: '600' }}>{v.word}</Text> — {v.meaning}
        </Text>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  note: {
    padding: spacing.md,
    borderRadius: radius.md,
    borderLeftWidth: 4,
  },
  script: {
    padding: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
  },
});
