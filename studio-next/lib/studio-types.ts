export type Mode = 'diseno' | 'vista' | 'codigo';
export type Device = 'escritorio' | 'tableta' | 'movil';
export type InspectorTab = 'diseno' | 'contenido' | 'interacciones';
export type ElementKind = 'titulo' | 'subtitulo' | 'parrafo' | 'boton' | 'contenedor';

export type ElementStyle = {
  x: number;
  y: number;
  fontSize: number;
  fontWeight: number;
  fontFamily: string;
  shadow: string;
  color: string;
  background: string;
  border?: string;
  radius: number;
  paddingX: number;
  paddingY: number;
  width: number | 'auto';
};

export type StudioElement = {
  id: string;
  label: string;
  kind: ElementKind;
  sectionId: string;
  text: string;
  href?: string;
  style: ElementStyle;
};

export type ProjectDoc = {
  id: string;
  name: string;
  slug: string;
  version: number;
  lastEdited: string;
  sections: { id: string; label: string; children: string[] }[];
  elements: Record<string, StudioElement>;
};

export type HistoryState = {
  past: ProjectDoc[];
  present: ProjectDoc;
  future: ProjectDoc[];
};

export type EditorAction =
  | { type: 'modificar'; elementId: string; patch: Partial<StudioElement>; description?: string }
  | { type: 'estilo'; elementId: string; patch: Partial<ElementStyle> }
  | { type: 'restaurar'; doc: ProjectDoc }
  | { type: 'deshacer' }
  | { type: 'rehacer' };

export type ButtonPreset = { id: string; title: string; group: string; background: string; color: string; radius: number; border?: string; shadow?: string };