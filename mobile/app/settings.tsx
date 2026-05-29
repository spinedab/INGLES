import React, { useEffect, useState } from 'react';
import { Alert, Platform, StyleSheet, TextInput, View } from 'react-native';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { Button } from '@/components/Button';
import { LevelPicker } from '@/components/LevelPicker';
import { apiClient } from '@/lib/api';
import { clear, exportAll, importAll } from '@/lib/storage';
import { radius, spacing, useTheme } from '@/lib/theme';

export default function Settings() {
  const theme = useTheme();
  const [apiUrl, setApiUrl] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authed, setAuthed] = useState(false);
  const [exportData, setExportData] = useState<string | null>(null);
  const [importText, setImportText] = useState('');

  useEffect(() => {
    setApiUrl(apiClient.getBaseUrl());
    setAuthed(apiClient.isAuthenticated());
  }, []);

  const saveApi = async () => {
    await apiClient.setBaseUrl(apiUrl.trim());
    alertCross('URL del backend guardada.');
  };

  const doLogin = async () => {
    try {
      await apiClient.login(email.trim(), password);
      setAuthed(true);
      alertCross('Sesión iniciada.');
    } catch (e) {
      alertCross(`Error: ${(e as Error).message}`);
    }
  };

  const doRegister = async () => {
    try {
      await apiClient.register(email.trim(), password);
      setAuthed(true);
      alertCross('Cuenta creada.');
    } catch (e) {
      alertCross(`Error: ${(e as Error).message}`);
    }
  };

  const doLogout = async () => {
    await apiClient.logout();
    setAuthed(false);
  };

  const doExport = async () => {
    const data = await exportAll();
    setExportData(JSON.stringify(data, null, 2));
  };

  const doImport = async () => {
    try {
      const obj = JSON.parse(importText);
      await importAll(obj);
      alertCross('Importado. Reinicia la app para ver los cambios.');
    } catch (e) {
      alertCross(`Error: ${(e as Error).message}`);
    }
  };

  const doReset = async () => {
    if (Platform.OS === 'web') {
      if (!confirm('¿Borrar TODO el progreso? Irreversible.')) return;
      await clear();
      alertCross('Todo borrado.');
      return;
    }
    Alert.alert('¿Borrar todo?', 'Esta acción es irreversible.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Borrar',
        style: 'destructive',
        onPress: async () => {
          await clear();
          alertCross('Todo borrado.');
        },
      },
    ]);
  };

  return (
    <Screen>
      <Text variant="h1">Ajustes</Text>

      <Text variant="h2" style={{ marginTop: spacing.lg }}>
        Nivel
      </Text>
      <LevelPicker />

      <Text variant="h2" style={{ marginTop: spacing.xl }}>
        Backend
      </Text>
      <Text muted style={{ marginBottom: spacing.sm }}>
        Si no configuras backend, todo funciona offline-only. Ver{' '}
        <Text style={{ color: theme.accent }}>BACKEND_API.md</Text> para el contrato REST.
      </Text>

      <TextInput
        value={apiUrl}
        onChangeText={setApiUrl}
        placeholder="https://tu-hosting.com/api"
        autoCapitalize="none"
        autoCorrect={false}
        placeholderTextColor={theme.muted}
        style={[styles.input, { borderColor: theme.border, color: theme.fg, backgroundColor: theme.card }]}
      />
      <Button title="Guardar URL" variant="secondary" onPress={saveApi} />

      <View style={{ height: spacing.lg }} />

      {!authed ? (
        <>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="email"
            keyboardType="email-address"
            autoCapitalize="none"
            placeholderTextColor={theme.muted}
            style={[styles.input, { borderColor: theme.border, color: theme.fg, backgroundColor: theme.card }]}
          />
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="contraseña"
            secureTextEntry
            placeholderTextColor={theme.muted}
            style={[styles.input, { borderColor: theme.border, color: theme.fg, backgroundColor: theme.card }]}
          />
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <Button title="Iniciar sesión" onPress={doLogin} style={{ flex: 1 }} />
            <Button title="Registrarse" variant="secondary" onPress={doRegister} style={{ flex: 1 }} />
          </View>
        </>
      ) : (
        <Button title="Cerrar sesión" variant="secondary" onPress={doLogout} />
      )}

      <Text variant="h2" style={{ marginTop: spacing.xl }}>
        Tus datos
      </Text>
      <Text muted style={{ marginBottom: spacing.sm }}>
        Todo el progreso vive en este dispositivo (AsyncStorage). Exporta/importa para mover entre dispositivos.
      </Text>
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <Button title="Exportar" variant="secondary" onPress={doExport} style={{ flex: 1 }} />
        <Button title="Borrar todo" variant="danger" onPress={doReset} style={{ flex: 1 }} />
      </View>

      {exportData && (
        <View style={[styles.codeBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text variant="small" style={{ fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }}>
            {exportData}
          </Text>
        </View>
      )}

      <Text variant="h3" style={{ marginTop: spacing.lg }}>
        Importar
      </Text>
      <TextInput
        value={importText}
        onChangeText={setImportText}
        placeholder='{"settings:level":"a1", ...}'
        multiline
        placeholderTextColor={theme.muted}
        style={[
          styles.input,
          styles.textarea,
          { borderColor: theme.border, color: theme.fg, backgroundColor: theme.card },
        ]}
      />
      <Button title="Importar" variant="secondary" onPress={doImport} />
    </Screen>
  );
}

function alertCross(msg: string) {
  if (Platform.OS === 'web') {
    // eslint-disable-next-line no-alert
    window.alert(msg);
  } else {
    Alert.alert(msg);
  }
}

const styles = StyleSheet.create({
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 15,
    marginBottom: spacing.sm,
  },
  textarea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  codeBox: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    maxHeight: 250,
  },
});
