import { ProviderAdapter } from './providers/types';
import { recordServerSuccess, recordServerFailure, getBestAvailableProvider } from './serverHealth';

export type PlaybackState =
  | 'idle'
  | 'preparing'
  | 'mounting_iframe'
  | 'waiting_for_load'
  | 'ready'
  | 'switching_server'
  | 'error';

export interface PlaybackSession {
  state: PlaybackState;
  currentProvider: ProviderAdapter;
  failedProviderIds: string[];
  loadStartTime: number;
  message?: string;
}

export class PlaybackManager {
  private session: PlaybackSession;
  private timeoutHandle: any = null;
  private onStateChange: (session: PlaybackSession) => void;
  private providers: ProviderAdapter[];

  constructor(
    providers: ProviderAdapter[],
    initialProvider: ProviderAdapter,
    onStateChange: (session: PlaybackSession) => void
  ) {
    this.providers = providers;
    this.onStateChange = onStateChange;
    this.session = {
      state: 'idle',
      currentProvider: initialProvider,
      failedProviderIds: [],
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
    this.armTimeout();
  }

  public handleIframeLoad(): void {
    if (this.session.state === 'ready') return;

    this.clearTimeout();
    const loadDuration = Date.now() - (this.session.loadStartTime || Date.now());
    recordServerSuccess(this.session.currentProvider.id, loadDuration);

    this.session.state = 'ready';
    this.session.message = undefined;
    this.notify();
  }

  public triggerFailover(reason: string = 'Timeout'): void {
    this.clearTimeout();
    const failedId = this.session.currentProvider.id;
    recordServerFailure(failedId);

    if (!this.session.failedProviderIds.includes(failedId)) {
      this.session.failedProviderIds.push(failedId);
    }

    const nextProvider = getBestAvailableProvider(this.providers, undefined, this.session.failedProviderIds);

    // If all servers failed, reset failure list and show error
    if (nextProvider.id === failedId && this.session.failedProviderIds.length >= this.providers.length) {
      this.session.state = 'error';
      this.session.message = 'All streaming mirrors are currently unresponsive. Please try again in a few moments.';
      this.notify();
      return;
    }

    this.session.state = 'switching_server';
    this.session.currentProvider = nextProvider;
    this.session.message = `Mirror taking too long (${reason}) — switching to ${nextProvider.name}...`;
    this.session.loadStartTime = Date.now();
    this.notify();

    // Transition back to mounting after brief toast
    setTimeout(() => {
      this.session.state = 'mounting_iframe';
      this.notify();
      this.armTimeout();
    }, 600);
  }

  public selectServer(provider: ProviderAdapter): void {
    this.clearTimeout();
    this.session.currentProvider = provider;
    this.session.state = 'mounting_iframe';
    this.session.loadStartTime = Date.now();
    this.session.message = undefined;
    this.notify();
    this.armTimeout();
  }

  public destroy(): void {
    this.clearTimeout();
  }

  private armTimeout(): void {
    this.clearTimeout();
    const timeoutMs = this.session.currentProvider.getTimeoutMs();
    this.timeoutHandle = setTimeout(() => {
      if (this.session.state === 'mounting_iframe' || this.session.state === 'waiting_for_load') {
        console.warn(`[StreamNet PlaybackManager] Server ${this.session.currentProvider.name} timed out after ${timeoutMs}ms.`);
        this.triggerFailover('Timeout');
      }
    }, timeoutMs);
  }

  private clearTimeout(): void {
    if (this.timeoutHandle) {
      clearTimeout(this.timeoutHandle);
      this.timeoutHandle = null;
    }
  }

  private notify(): void {
    this.onStateChange({ ...this.session });
  }
}
