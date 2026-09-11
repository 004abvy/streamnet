import { BaseProvider } from '@omss/framework';
import type {
    ProviderCapabilities,
    ProviderMediaObject,
    ProviderResult
} from '@omss/framework';
import type { VideasyServer } from './videasy.types.js';

const VIDEASY_SERVERS: readonly VideasyServer[] = [
    {
        name: 'cuevana',
        url: 'https://api2.videasy.net/cuevana/sources-with-title',
        language: 'english'
    },
    {
        name: 'mb-flix',
        url: 'https://api.videasy.net/mb-flix/sources-with-title',
        language: 'english'
    },
    {
        name: '1movies',
        url: 'https://api.videasy.net/1movies/sources-with-title',
        language: 'english'
    },
    {
        name: 'cdn',
        url: 'https://api.videasy.net/cdn/sources-with-title',
        language: 'english'
    },
    {
        name: 'superflix',
        url: 'https://api.videasy.net/superflix/sources-with-title',
        language: 'english'
    },
    {
        name: 'lamovie',
        url: 'https://api.videasy.net/lamovie/sources-with-title',
        language: 'english'
    }
] as const;

export class VideasyProvider extends BaseProvider {
    readonly id = 'Videasy';
    readonly name = 'Videasy';
    readonly enabled = true;
    readonly BASE_URL = 'https://api.videasy.net';
    readonly HEADERS = {
        'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept: 'application/json, */*; q=0.01',
        Referer: 'https://player.videasy.net/',
        Origin: 'https://player.videasy.net'
    };

    readonly capabilities: ProviderCapabilities = {
        supportedContentTypes: ['movies', 'tv']
    };

    async getMovieSources(media: ProviderMediaObject): Promise<ProviderResult> {
        return this.emptyResult('Videasy provider is disabled to ensure instant sub-second stream loading');
    }

    async getTVSources(media: ProviderMediaObject): Promise<ProviderResult> {
        return this.emptyResult('Videasy provider is disabled to ensure instant sub-second stream loading');
    }
}
