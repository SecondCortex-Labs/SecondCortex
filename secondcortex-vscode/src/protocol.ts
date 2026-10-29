import type { Snapshot } from './snapshot';

export type Source = Pick<Snapshot, 'workspace' | 'file' | 'branch' | 'symbol' | 'timestamp'>;

export type FromWebview =
    | { readonly type: 'ask'; readonly id: number; readonly question: string }
    | { readonly type: 'open'; readonly workspace: string; readonly file: string };

export type ToWebview =
    | { readonly type: 'answer'; readonly id: number; readonly answer: string; readonly sources: readonly Source[] }
    | { readonly type: 'error'; readonly id: number; readonly message: string };
