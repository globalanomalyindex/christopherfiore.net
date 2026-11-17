/** Types for JellyBox's own renderer, as far as the site calls it. Source: optics.js (globalanomalyindex/jellybox @ 92538fd). */
export interface OpticalBubble {
  x: number;
  y: number;
  width: number;
  height: number;
  cornerRadius?: number;
  id?: string;
  kind?: string;
  attached?: boolean;
  layer?: number;
  clip?: { x: number; y: number; width: number; height: number };
  hover?: number;
  pressed?: number;
  feedback?: number;
  assistX?: number;
  assistY?: number;
  assistStrength?: number;
  grouped?: boolean;
  selected?: boolean;
  flow?: null;
  color?: readonly [number, number, number];
  colorSampled?: boolean;
  opacity?: number;
}

export interface OpticalScene {
  width: number;
  height: number;
  dpr?: number;
  reducedMotion?: boolean;
  params?: { motion?: number; transmission?: number; light?: number };
  pointer?: { x: number; y: number; visible: boolean };
  buttons?: readonly unknown[];
  contrastTargets?: readonly unknown[];
  panel?: null;
  bubbles?: readonly OpticalBubble[];
}

export interface OpticsController {
  renderOnce(timestamp?: number): void;
  destroy(): void;
}

export function createOptics(
  canvas: HTMLCanvasElement,
  options: { getScene: () => OpticalScene | null; onError?: (message: string) => void; onAfterRender?: () => void },
): OpticsController;
