import React from 'react';
import { ReservasScreen, ReservasScreenProps } from './ReservasScreen';

export type DocumentosScreenProps = ReservasScreenProps;

export function DocumentosScreen(props: DocumentosScreenProps) {
  return <ReservasScreen {...props} />;
}
