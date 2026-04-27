import { rateLimit } from 'express-rate-limit';

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  message: { error: 'Demasiados intentos. Intenta de nuevo en 15 minutos.' },
  standardHeaders: 'draft-8',
  legacyHeaders: false,
});

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  message: { error: 'Límite de solicitudes alcanzado. Intenta de nuevo en 15 minutos.' },
  standardHeaders: 'draft-8',
  legacyHeaders: false,
});
