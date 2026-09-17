import { StateId, StateMachineAction, StateMachineCondition, StateMachineTransition, StateMachineState } from '../types';

import { StateMachine } from '../types';
export type StateMachineModel = StateMachine;

export interface EvaluationContext {
  inputs: Record<string, string | number | boolean>;
  nowMs: number;
  stateEnteredAtMs: number;
}

export function evaluateCondition(
  condition: StateMachineCondition,
  ctx: EvaluationContext
): boolean {
  switch (condition.kind) {
    case 'always':
      return true;

    case 'timeout': {
      const elapsed = ctx.nowMs - ctx.stateEnteredAtMs;
      return elapsed >= (condition.timeoutMs ?? 0);
    }

    case 'comparison': {
      const actual = condition.left ? ctx.inputs[condition.left] : undefined;
      const expected = condition.right;
      switch (condition.operator) {
        case '==': return actual == expected; // loose comparison for boolean logic mapped to 1/0
        case '!=': return actual != expected;
        case '>':  return Number(actual) > Number(expected);
        case '<':  return Number(actual) < Number(expected);
        case '>=': return Number(actual) >= Number(expected);
        case '<=': return Number(actual) <= Number(expected);
        default:   return false;
      }
    }

    case 'and':
      return (condition.children ?? []).every(c => evaluateCondition(c, ctx));

    case 'or':
      return (condition.children ?? []).some(c => evaluateCondition(c, ctx));

    case 'not':
      return !evaluateCondition(condition.children?.[0]!, ctx);

    default:
      return false;
  }
}

export function findTakenTransition(
  model: StateMachineModel,
  currentState: StateId,
  ctx: EvaluationContext
): StateMachineTransition | null {
  const candidates = model.transitions
    .filter(t => t.fromStateId === currentState)
    .sort((a, b) => a.priority - b.priority);

  for (const transition of candidates) {
    if (evaluateCondition(transition.condition, ctx)) {
      return transition;
    }
  }
  return null;
}

export interface StepResult {
  previousState: StateId;
  newState: StateId;
  transitionTaken: StateMachineTransition | null;
  actionsRun: StateMachineAction[];
  atMs: number;
}

export function step(
  model: StateMachineModel,
  currentState: StateId,
  ctx: EvaluationContext
): StepResult {
  const transition = findTakenTransition(model, currentState, ctx);

  if (!transition) {
    return {
      previousState: currentState,
      newState: currentState,
      transitionTaken: null,
      actionsRun: [],
      atMs: ctx.nowMs,
    };
  }

  const fromState = model.states.find(s => s.id === currentState);
  const toState = model.states.find(s => s.id === transition.toStateId);

  const actionsRun: StateMachineAction[] = [
    ...(fromState?.exitActions ?? []),
    ...(transition.actions ?? []),
    ...(toState?.entryActions ?? []),
  ];

  return {
    previousState: currentState,
    newState: transition.toStateId,
    transitionTaken: transition,
    actionsRun,
    atMs: ctx.nowMs,
  };
}

export interface SimulatorTick {
  ctx: EvaluationContext;
  result: StepResult;
}

export function advanceTime(
  model: StateMachineModel,
  currentState: StateId,
  ctx: EvaluationContext,
  deltaMs: number
): SimulatorTick {
  const newCtx: EvaluationContext = { ...ctx, nowMs: ctx.nowMs + deltaMs };
  const result = step(model, currentState, newCtx);
  return { ctx: newCtx, result };
}
