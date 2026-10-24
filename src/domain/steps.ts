import type { Item } from './types';
export const STEPS = ['todo', 'in-progress', 'done'] as const;
export type Step = typeof STEPS[number];
export const stepLabel = (step: Step): string => `step-${step}`;
export function stepOf(item: Pick<Item, 'labels'>): Step {
  return STEPS.find((step) => item.labels.some((label) => label.toLowerCase() === stepLabel(step))) ?? 'todo';
}
export function withStep(labels: string[], step: Step): string[] {
  return [...labels.filter((label) => !STEPS.some((value) => label.toLowerCase() === stepLabel(value))), stepLabel(step)];
}
