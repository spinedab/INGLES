// ═══ Onboarding + Placement Test ═══
// Flujo: Welcome → Meta diaria → Test 8 preguntas → Resultado con nivel → Dashboard
// Se muestra solo la primera vez (flag en AsyncStorage).
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View, Dimensions } from 'react-native';
import { router } from 'expo-router';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOut,
  SlideInRight,
  SlideOutLeft,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/Text';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ProgressBar } from '@/components/ProgressBar';
import { useLevel } from '@/lib/levelContext';
import { set as storageSet, get as storageGet } from '@/lib/storage';
import { setDailyGoal } from '@/lib/insights';
import { spacing, radius, useTheme } from '@/lib/theme';
import type { CefrLevel } from '@/lib/types';

const { width: SCREEN_W } = Dimensions.get('window');

// ─── Placement questions (graduated difficulty) ──────────────────────

interface PlacementQ {
  q: string;
  options: string[];
  answer: number;
  level: CefrLevel;
}

const QUESTIONS: PlacementQ[] = [
  // A1
  { q: 'She _____ a teacher.', options: ['is', 'are', 'am'], answer: 0, level: 'a1' },
  { q: 'I _____ coffee every morning.', options: ['drink', 'drinks', 'drinking'], answer: 0, level: 'a1' },
  // A2
  { q: 'What _____ you do yesterday?', options: ['did', 'do', 'does'], answer: 0, level: 'a2' },
  { q: 'She is _____ than her sister.', options: ['more tall', 'taller', 'tallest'], answer: 1, level: 'a2' },
  // B1
  { q: 'I _____ in this city for 10 years.', options: ['lived', 'have lived', 'am living'], answer: 1, level: 'b1' },
  { q: 'If I _____ rich, I would travel the world.', options: ['am', 'were', 'will be'], answer: 1, level: 'b1' },
  // B2
  { q: 'If she had known, she _____ you.', options: ['would tell', 'would have told', 'will tell'], answer: 1, level: 'b2' },
  { q: 'Hardly _____ sat down when the lights went out.', options: ['we had', 'had we', 'we have'], answer: 1, level: 'b2' },
];

type Step = 'welcome' | 'goal' | 'test' | 'result';

export default function OnboardingScreen() {
  const theme = useTheme();
  const { setLevel } = useLevel();
  const [step, setStep] = useState<Step>('welcome');
  const [goalChoice, setGoalChoice] = useState(30);
  const [currentQ, setCurrentQ] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [answered, setAnswered] = useState<number | null>(null);
  const [resultLevel, setResultLevel] = useState<CefrLevel>('a1');

  // Check if already onboarded
  useEffect(() => {
    (async () => {
      const done = await storageGet<boolean>('onboarding:done', false);
      if (done) router.replace('/(tabs)');
    })();
  }, []);

  const handleAnswer = (idx: number) => {
    if (answered !== null) return;
    setAnswered(idx);
    const isCorrect = idx === QUESTIONS[currentQ].answer;
    if (isCorrect) setCorrect((c) => c + 1);
    setTimeout(() => {
      if (currentQ + 1 < QUESTIONS.length) {
        setCurrentQ((c) => c + 1);
        setAnswered(null);
      } else {
        // Calculate level
        const score = correct + (isCorrect ? 1 : 0);
        let lvl: CefrLevel = 'a1';
        if (score >= 7) lvl = 'b2';
        else if (score >= 5) lvl = 'b1';
        else if (score >= 3) lvl = 'a2';
        setResultLevel(lvl);
        setStep('result');
      }
    }, 800);
  };

  const finish = async () => {
    setLevel(resultLevel);
    await setDailyGoal(goalChoice);
    await storageSet('onboarding:done', true);
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]}>
      {/* ── Welcome ── */}
      {step === 'welcome' && (
        <Animated.View entering={FadeIn.duration(400)} style={styles.center}>
          <View style={[styles.logoBox, { backgroundColor: theme.accentSoft }]}>
            <Ionicons name="language" size={48} color={theme.accent} />
          </View>
          <Text variant="hero" style={[styles.textCenter, { marginTop: spacing.xxl }]}>
            INGLES
          </Text>
          <Text variant="body" muted style={[styles.textCenter, { marginTop: spacing.sm, maxWidth: 300 }]}>
            Aprende ingles basado en evidencia cientifica.
            Sin gamificacion toxica. Con pedagogia real.
          </Text>
          <View style={{ marginTop: spacing.xxxl, width: '100%', maxWidth: 320 }}>
            <Button title="Empezar" size="lg" fullWidth onPress={() => setStep('goal')} />
          </View>
          <Text variant="caption" muted style={{ marginTop: spacing.xxl }}>
            Krashen · Swain · Long · Schmidt · Vygotsky
          </Text>
        </Animated.View>
      )}

      {/* ── Daily goal ── */}
      {step === 'goal' && (
        <Animated.View entering={SlideInRight.duration(300)} exiting={SlideOutLeft.duration(200)} style={styles.center}>
          <Ionicons name="time-outline" size={48} color={theme.accent} />
          <Text variant="h1" style={[styles.textCenter, { marginTop: spacing.xl }]}>
            Cuanto tiempo al dia?
          </Text>
          <Text variant="body" muted style={[styles.textCenter, { marginTop: spacing.sm, maxWidth: 300 }]}>
            30 min diarios consistentes superan 3 horas el domingo.
            El cerebro consolida durante el sueno.
          </Text>

          <View style={styles.goalGrid}>
            {[15, 30, 45, 60].map((mins) => (
              <Pressable
                key={mins}
                onPress={() => setGoalChoice(mins)}
                style={[
                  styles.goalCard,
                  {
                    backgroundColor: goalChoice === mins ? theme.accent : theme.card,
                    borderColor: goalChoice === mins ? theme.accent : theme.cardBorder,
                  },
                ]}
              >
                <Text
                  variant="h2"
                  style={{ color: goalChoice === mins ? '#fff' : theme.fg }}
                >
                  {mins}
                </Text>
                <Text
                  variant="caption"
                  style={{ color: goalChoice === mins ? '#ffffffcc' : theme.muted }}
                >
                  min/dia
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={{ width: '100%', maxWidth: 320, marginTop: spacing.xxl }}>
            <Button title="Siguiente" size="lg" fullWidth onPress={() => setStep('test')} />
          </View>
        </Animated.View>
      )}

      {/* ── Placement test ── */}
      {step === 'test' && (
        <Animated.View
          key={`q-${currentQ}`}
          entering={FadeInDown.duration(250)}
          style={styles.testContainer}
        >
          <ProgressBar progress={(currentQ + 1) / QUESTIONS.length} />
          <Text variant="caption" muted style={{ textAlign: 'center', marginBottom: spacing.lg }}>
            Pregunta {currentQ + 1} de {QUESTIONS.length}
          </Text>

          <Card variant="elevated" style={{ padding: spacing.xl }}>
            <Text variant="h3" style={{ textAlign: 'center', marginBottom: spacing.xl }}>
              {QUESTIONS[currentQ].q}
            </Text>
            <View style={{ gap: spacing.sm }}>
              {QUESTIONS[currentQ].options.map((opt, i) => {
                const isAnswer = i === QUESTIONS[currentQ].answer;
                const isPicked = answered === i;
                const showCorrect = answered !== null && isAnswer;
                const showWrong = isPicked && !isAnswer;
                return (
                  <Pressable
                    key={i}
                    onPress={() => handleAnswer(i)}
                    style={[
                      styles.optBtn,
                      {
                        backgroundColor: showCorrect
                          ? theme.goodBg
                          : showWrong
                          ? theme.badBg
                          : theme.bg,
                        borderColor: showCorrect
                          ? theme.good
                          : showWrong
                          ? theme.bad
                          : theme.border,
                      },
                    ]}
                  >
                    <Text
                      variant="body"
                      style={{
                        color: showCorrect ? theme.good : showWrong ? theme.bad : theme.fg,
                        fontWeight: isPicked || showCorrect ? '600' : '400',
                        textAlign: 'center',
                      }}
                    >
                      {opt}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Card>
        </Animated.View>
      )}

      {/* ── Result ── */}
      {step === 'result' && (
        <Animated.View entering={FadeIn.duration(400)} style={styles.center}>
          <View style={[styles.resultBadge, { backgroundColor: theme.accentSoft }]}>
            <Text variant="hero" accent>
              {resultLevel.toUpperCase()}
            </Text>
          </View>
          <Text variant="h1" style={[styles.textCenter, { marginTop: spacing.xl }]}>
            Tu nivel estimado
          </Text>
          <Text variant="body" muted style={[styles.textCenter, { marginTop: spacing.sm, maxWidth: 320 }]}>
            {correct}/{QUESTIONS.length} respuestas correctas.
            {resultLevel === 'a1' && ' Empezaras desde los fundamentos. Sin prisa.'}
            {resultLevel === 'a2' && ' Tienes bases solidas. Hora de expandir.'}
            {resultLevel === 'b1' && ' Buen nivel intermedio. A pulir produccion.'}
            {resultLevel === 'b2' && ' Nivel avanzado. Foco en fluidez y precision.'}
          </Text>
          <View style={{ width: '100%', maxWidth: 320, marginTop: spacing.xxxl }}>
            <Button title="Empezar a aprender" size="lg" fullWidth onPress={finish} />
          </View>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  textCenter: { textAlign: 'center' },
  logoBox: {
    width: 96,
    height: 96,
    borderRadius: radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.xxl,
    maxWidth: 320,
  },
  goalCard: {
    flex: 1,
    minWidth: 130,
    paddingVertical: spacing.xl,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    gap: spacing.xxs,
  },
  testContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    maxWidth: 500,
    alignSelf: 'center',
    width: '100%',
  },
  optBtn: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1.5,
  },
  resultBadge: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
