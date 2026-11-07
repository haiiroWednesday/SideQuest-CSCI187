// The hero alone: the church and the fountain, without the pergola and the wisteria.
import { draw as full } from './missionink.mjs';
export const size = [1400, 700];
export const draw = (A) => full(A, { hero: true });
