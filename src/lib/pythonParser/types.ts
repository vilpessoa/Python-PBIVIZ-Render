export interface SourceLoc {
  start: number;
  end: number;
}

export type Contributor =
  | { kind: 'html'; text: string; loc: SourceLoc; line: number }
  | { kind: 'text'; text: string; loc: SourceLoc; line: number }
  | { kind: 'var'; name: string; refLoc: SourceLoc; declLoc: SourceLoc; line: number; snippet: string };

export interface ContributorsEntry {
  rootLoc: SourceLoc;
  rootLine: number;
  items: Contributor[];
}

export type ContributorIndex = Record<string, ContributorsEntry>;

export interface ParseResult {
  html: string;
  warnings: string[];
  error?: string;
  errorPos?: number;
  errorEndPos?: number;
  errorLine?: number;
  errorCol?: number;
  isPurePython?: boolean;
  rawValue?: string;
  measureName?: string;
  contributors?: ContributorIndex;
  isPbiviz?: boolean;
}

export class ParseError extends Error {
  readonly pos: number;
  readonly endPos: number;
  constructor(msg: string, pos: number, endPos: number) {
    super(msg);
    this.name = 'ParseError';
    this.pos = pos;
    this.endPos = endPos;
  }
}
