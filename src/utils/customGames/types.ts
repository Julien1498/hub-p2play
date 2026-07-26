/** Metadata for a live GitHub game added to the Hub at runtime. */
export interface CustomGameMeta {
  /** Stable key: `custom--{owner}--{repo}` (safe for CSS ids / DOM). */
  key: string;
  name: string;
  repo: string;
  version?: string;
  desc?: string;
  emoji?: string;
  hasPreConfig: boolean;
  /** Explicit window mount fn from hub-manifest.json when present. */
  mountFn?: string;
  shellBackground?: string;
  avatars?: string[];
  downloadUrl?: string;
  addedAt: number;
  isCustom: true;
}

export interface ExtractedBundle {
  jsCode: string;
  cssCode?: string | null;
  jsBlobUrl: string;
  cssBlobUrl?: string | null;
}

export interface ParsedGithubRef {
  owner: string;
  repo: string;
  version?: string;
}
