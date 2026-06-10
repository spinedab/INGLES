// ═══ Profile / Settings tab ═══
// Combina ajustes + resumen del perfil + level picker + analytics overview.
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Alert, Platform, TextInput } from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { StatBlock } from '@/components/StatBlock';
import { LevelPicker } from '@/components/LevelPicker';
import { ProgressRing } from '@/components/ProgressRing';
import { WeekBars } from '@/components/WeekBars';
import { SectionHeader } from '@/components/SectionHeader';
import { useLevel } from '@/lib/levelContext';
import { summarizeActivity, skillLabel, getDailyGoal, setDailyGoal } from '@/lib/insights';
import { apiClient } from '@/lib/api';
import { clear, exportAll, importAll } from '@/lib/storage';
import { spacing, radius, skillColors, useTheme } from '@/lib/theme';
import type { ActivitySummary, Skill } from '@/lib/types';

export default function ProfileScreen() {
  const { level } = useLevel();
  const theme = useTheme();
  const [summary, setSummary] = useState<ActivitySummary | null>(null);
  const [apiUrl, setApiUrl] = useState('');
  const [goalDraft, setGoalDraft] = useState('30');

  useEffect(() => {
    (async () => {
      const sum = await summarizeActivity();
      setSummary(sum);
      setApiUrl(apiClient.getBaseUrl());
      const g = await getDailyGoal();
      setGoalDraft(String(g));
    })();
  }, []);

  const alertCross = (msg: string) => {
    if (Platform.OS === 'web') window.alert(msg);
    else Alert.alert(msg);
  };

  const onGoalSave = async () => {
    await setDailyGoal(Number(goalDraft) || 30);
    const g = await getDailyGoal();
    setGoalDraft(String(g));
    const sum = await summarizeActivity();
    setSummary(sum);
    alertCross(`Meta diaria: ${g} minutos.`);
  };

  const doExport = async () => {
    const data = await exportAll();
    const json = JSON.stringify(data);
    if (Platform.OS === 'web') {
      const blob = new Blob([json], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'ingles-data.json';
      a.click();
      alertCross('Exportado.');
    } else {
      alertCross('JSON copiado (implementa Share sheet para tu plataforma).\n' + json.slice(0, 200) + '...');
    }
  };

  const doReset = () => {
    const exec = async () => {
      await clear();
      alertCross('Progreso borrado. Reinicia la app.');
    };
    if (Platform.OS === 'web') {
      if (confirm('Borrar TODO? Irreversible.')) void exec();
    } else {
      Alert.alert('Borrar todo?', 'Irreversible.', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Borrar', style: 'destructive', onPress: exec },
      ]);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Perfil' }} />
      <Screen>
        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.avatar, { backgroundColor: theme.accentSoft }]}>
            <Ionicons name="person" size={32} color={theme.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="h2">Estudiante</Text>
            <Text variant="small" muted>Nivel {level.toUpperCase()} · INGLES App</Text>
          </View>
        </View>

        {/* Analytics overview */}
        {summary && (
          <>
            <SectionHeader title="Tu semana" />
            <Card variant="elevated">
              <View style={styles.analyticsRow}>
                <ProgressRing
                  progress={summary.completion}
                  size={90}
                  strokeWidth={8}
                  sublabel={`${Math.round(summary.totals.todayMinutes)}/${summary.goal}m`}
                />
                <View style={{ flex: 1, gap: spacing.sm }}>
                  <StatBlock label="Racha" value={`${summary.streak}d`} />
                  <StatBlock label="Semana" value={`${Math.round(summary.totals.weekMinutes)}m`} />
                </View>
              </View>
            </Card>

            <WeekBars week={summary.week} goal={summary.goal} />

            <Text variant="h3" style={{ marginTop: spacing.lg, marginBottom: spacing.sm }}>
              Balance de destrezas
            </Text>
            <View style={styles.skillsGrid}>
              {(Object.entries(summary.totals.skills) as [Skill, number][])
                .filter(([, m]) => m > 0)
                .map(([skill, mins]) => (
                  <View
                    key={skill}
                    style={[styles.skillChip, { backgroundColor: (skillColors[skill] || theme.accent) + '15' }]}
                  >
                    <Text variant="bodyBold" style={{ color: skillColors[skill] || theme.accent }}>
                      {Math.round(mins)}m
                    </Text>
                    <Text variant="caption" muted>{skillLabel(skill)}</Text>
                  </View>
                ))}
            </View>
          </>
        )}

        {/* Settings */}
        <SectionHeader title="Ajustes" />

        <Text variant="smallBold" style={{ marginBottom: spacing.xs }}>Nivel CEFR</Text>
        <LevelPicker />

        <View style={[styles.settingRow, { marginTop: spacing.lg }]}>
          <Text variant="body" style={{ flex: 1 }}>Meta diaria (min)</Text>
          <TextInput
            value={goalDraft}
            onChangeText={setGoalDraft}
            keyboardType="number-pad"
            onBlur={onGoalSave}
            style={[styles.input, { borderColor: theme.inputBorder, color: theme.fg, backgroundColor: theme.inputBg }]}
          />
        </View>

        <View style={[styles.settingRow, { marginTop: spacing.lg }]}>
          <Text variant="body" style={{ flex: 1 }}>Backend URL</Text>
          <TextInput
            value={apiUrl}
            onChangeText={setApiUrl}
            placeholder="https://..."
            placeholderTextColor={theme.placeholder}
            autoCapitalize="none"
            autoCorrect={false}
            onBlur={async () => { await apiClient.setBaseUrl(apiUrl.trim()); }}
            style={[styles.input, styles.inputWide, { borderColor: theme.inputBorder, color: theme.fg, backgroundColor: theme.inputBg }]}
          />
        </View>

        <SectionHeader title="Datos" subtitle="Tu progreso vive en este dispositivo" />
        <View style={styles.btnRow}>
          <Button title="Exportar JSON" variant="secondary" onPress={doExport} style={{ flex: 1 }} />
          <Button title="Borrar todo" variant="danger" onPress={doReset} style={{ flex: 1 }} />
        </View>

        <Text variant="caption" muted style={{ marginTop: spacing.xxl, textAlign: 'center' }}>
          INGLES v1.0 · Basado en evidencia{'\n'}
          Krashen · Swain · Long · Schmidt · Vygotsky
        </Text>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    marginBottom: spacing.xl,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  analyticsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xl,
  },
  skillsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  skillChip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    width: 70,
    textAlign: 'center',
    fontSize: 15,
  },
  inputWide: {
    width: 180,
    textAlign: 'left',
  },
  btnRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
});
