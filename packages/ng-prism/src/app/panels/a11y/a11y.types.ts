export interface A11yCoreConfig {
  rules?: Record<string, { enabled: boolean }>;
  disable?: boolean;
}

export interface A11yScoreResult {
  score: number;
  violations: number;
  critical: number;
  serious: number;
  moderate: number;
  minor: number;
  passes: number;
  incomplete: number;
}

export interface FocusableElement {
  element: Element;
  index: number;
  role: string;
  name: string;
  nameSource: string;
  states: string[];
  tabindex: number | null;
}

export interface A11yNode {
  role: string;
  name: string | null;
  nameSource: string | null;
  description: string | null;
  states: Record<string, string | boolean>;
  children: A11yNode[];
  hidden: boolean;
  element: Element;
}

export interface SrAnnouncement {
  index: number;
  text: string;
  name: string;
  role: string;
  states: string[];
  element: Element;
}
