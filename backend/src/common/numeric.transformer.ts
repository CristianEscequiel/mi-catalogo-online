import { ValueTransformer } from 'typeorm';

// Postgres devuelve las columnas numeric como string; la API siempre expuso números.
export const numericTransformer: ValueTransformer = {
  to: (value?: number | null) => value,
  from: (value?: string | null) => (value == null ? value : Number(value)),
};
