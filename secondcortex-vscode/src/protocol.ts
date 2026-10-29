// The sidebar's message protocol. sidebar.ts imports it; media/sidebar.js imports it through JSDoc and
// `tsc -p media` checks that file against it, so the two sides cannot drift.
import type { Snapshot } from './snapshot';

/** What the sidebar shows for a cited snapshot. */
export type Source = Pick<Snapshot, 'workspace' | 'file' | 'branch' | 'symbol' | 'timestamp'>;

/** Webview to extension. */
export type FromWebview =
    | { readonly type: 'ask'; readonly id: number; readonly question: string }
    | { readonly type: 'open'; readonly workspace: string; readonly file: string };

/** Extension to webview. Each message answers exactly one `ask`, matched by `id`. `sources[n - 1]` is citation [n]. */
export type ToWebview =
    | { readonly type: 'answer'; readonly id: number; readonly answer: string; readonly sources: readonly Source[] }
    | { readonly type: 'error'; readonly id: number; readonly message: string };
