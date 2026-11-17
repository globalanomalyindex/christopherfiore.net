/** Types for JellyBox's color.js, as far as the site calls it. */
export function createJellyPalette(from: string, to: string, samples?: number): { sample(k: number): string; sampleRGB(k: number): [number, number, number] };
