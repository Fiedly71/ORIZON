// ErrorBoundary global ORIZON. Capture les exceptions React + remonte a Sentry.
import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { captureException } from '../services/errorService';

export default class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    captureException(error, { componentStack: info?.componentStack || '' });
  }

  reset = () => this.setState({ hasError: false, error: null });

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.wrap}>
          <Text style={styles.title}>Une erreur est survenue</Text>
          <Text style={styles.sub}>L'equipe ORIZON a ete notifiee.</Text>
          <ScrollView style={styles.box}>
            <Text style={styles.msg}>
              {this.state.error?.message || String(this.state.error)}
            </Text>
          </ScrollView>
          <Pressable style={styles.btn} onPress={this.reset}>
            <Text style={styles.btnTxt}>Reessayer</Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#fff', padding: 24, justifyContent: 'center', gap: 12 },
  title: { fontSize: 20, fontWeight: '800', color: '#0F172A' },
  sub: { fontSize: 13, color: '#64748B' },
  box: { maxHeight: 160, backgroundColor: '#F8FAFB', borderRadius: 10, padding: 12, marginVertical: 12 },
  msg: { fontSize: 12, color: '#475569', fontFamily: 'System' },
  btn: { backgroundColor: '#00A38D', padding: 14, borderRadius: 12, alignItems: 'center' },
  btnTxt: { color: '#fff', fontWeight: '700' },
});
