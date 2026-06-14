// Container responsive : centre le contenu et limite sa largeur sur desktop.
// Usage : <Container><MyContent /></Container>
// Variant : <Container narrow> pour formulaires (max 720px).
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useResponsive } from '../hooks/useResponsive';

export default function Container({ children, narrow, style, padded = true, ...rest }) {
  const r = useResponsive();
  const maxWidth = narrow ? r.formMaxWidth : r.contentMaxWidth;
  return (
    <View
      style={[
        styles.outer,
        padded && { paddingHorizontal: r.sidePadding },
        style,
      ]}
      {...rest}
    >
      <View style={[styles.inner, { maxWidth, width: '100%' }]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    width: '100%',
    alignItems: 'center',
  },
  inner: {
    alignSelf: 'center',
  },
});
