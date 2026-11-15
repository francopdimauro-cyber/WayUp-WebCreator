import type { EditorAction, HistoryState, ProjectDoc } from './studio-types';

const HISTORY_LIMIT = 40;
const isSame = (a: ProjectDoc, b: ProjectDoc) => JSON.stringify(a) === JSON.stringify(b);

export function historyReducer(state: HistoryState, action: EditorAction): HistoryState {
  if (action.type === 'deshacer') {
    if (!state.past.length) return state;
    const previous = state.past.at(-1)!;
    return { past: state.past.slice(0, -1), present: previous, future: [state.present, ...state.future] };
  }
  if (action.type === 'rehacer') {
    if (!state.future.length) return state;
    const [next, ...future] = state.future;
    return { past: [...state.past, state.present].slice(-HISTORY_LIMIT), present: next, future };
  }
  if (action.type === 'restaurar') {
    return { past: [], present: action.doc, future: [] };
  }

  const element = state.present.elements[action.elementId];
  if (!element) return state;
  const nextElement = action.type === 'estilo'
    ? { ...element, style: { ...element.style, ...action.patch } }
    : { ...element, ...action.patch };
  const next: ProjectDoc = { ...state.present, elements: { ...state.present.elements, [action.elementId]: nextElement } };
  if (isSame(next, state.present)) return state;
  return { past: [...state.past, state.present].slice(-HISTORY_LIMIT), present: next, future: [] };
}