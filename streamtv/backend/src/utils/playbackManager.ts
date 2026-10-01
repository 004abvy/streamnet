import { ProviderAdapter } from './providers/types';
import { recordServerSuccess } from './serverHealth';

export type PlaybackState =
  | 'idle'
  | 'mounting_iframe'
  | 'ready'
  | 'error';

export interface PlaybackSession {
  state: PlaybackState;
  currentProvider: ProviderAdapter;
  loadStartTime: number;
  message?: string;
}

export class PlaybackManager {
  private session: PlaybackSession;
  private onStateChange: (session: PlaybackSession) => void;

  constructor(
    _providers: ProviderAdapter[],
    initialProvider: ProviderAdapter,
    onStateChange: (session: PlaybackSession) => void
  ) {
    this.onStateChange = onStateChange;
    this.session = {
      state: 'idle',
      currentProvider: initialProvider,
      loadStartTime: 0,
    };
  }

  public getSession(): PlaybackSession {
    return { ...this.session };
  }

  public startPlayback(): void {
    this.session.state = 'mounting_iframe';
    this.session.loadStartTime = Date.now();
    this.notify();
  }

  public handleIframeLoad(): void {
    const loadDuration = Date.now() - (this.session.loadStartTime || Date.now());
    recordServerSuccess(this.session.currentProvider.id, loadDuration);

    this.session.state = 'ready';
    this.session.message = undefined;
    this.notify();
  }

  public selectServer(provider: ProviderAdapter): void {
    this.session.currentProvider = provider;
    this.session.state = 'mounting_iframe';
    this.session.loadStartTime = Date.now();
    this.session.message = undefined;
    this.notify();
  }

  public destroy(): void {
    // No background timers to clean up
  }

  private notify(): void {
    this.onStateChange({ ...this.session });
  }
}
