import React from 'react';
import { ReservasScreen, ReservasScreenProps } from './ReservasScreen';

export type DocumentosScreenProps = ReservasScreenProps & { readOnlyMode?: boolean };

export function DocumentosScreen(props: DocumentosScreenProps) {
  return <ReservasScreen {...props} />;
}
