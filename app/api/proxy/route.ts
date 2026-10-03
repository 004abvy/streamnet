import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');
  const referer = req.nextUrl.searchParams.get('referer') || '';
  const origin = req.nextUrl.searchParams.get('origin') || '';

  if (!url) return new NextResponse('Missing URL', { status: 400 });

  try {
    const headers: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'X-Requested-With': 'XMLHttpRequest'
    };
    if (referer) headers['Referer'] = referer;
    if (origin) headers['Origin'] = origin;

    const response = await fetch(url, { headers });
    
    if (!response.ok) {
      return new NextResponse(`Proxy failed: ${response.statusText}`, { status: response.status });
    }

    const contentType = response.headers.get('content-type') || '';
    
    // If it's an HLS playlist, rewrite the URLs to route through this proxy
    if (contentType.includes('mpegurl') || url.includes('.m3u8')) {
      let text = await response.text();
      
      const lines = text.split('\n');
      const rewrittenLines = lines.map(line => {
        const trimmed = line.trim();
        // Ignore directives and empty lines
        if (trimmed.startsWith('#') || !trimmed) {
          // Special case: some tags have URIs inside them like #EXT-X-KEY:METHOD=AES-128,URI="key.bin"
          if (trimmed.startsWith('#EXT-X-KEY') && trimmed.includes('URI=')) {
             return trimmed.replace(/URI="(.*?)"/, (match, p1) => {
                let absoluteKeyUrl = p1;
                if (!p1.startsWith('http')) {
                  const baseUrl = new URL(url);
                  if (p1.startsWith('/')) {
                    absoluteKeyUrl = `${baseUrl.origin}${p1}`;
                  } else {
                    const pathParts = baseUrl.pathname.split('/');
                    pathParts.pop();
                    absoluteKeyUrl = `${baseUrl.origin}${pathParts.join('/')}/${p1}`;
                  }
                }
                return `URI="/api/proxy?url=${encodeURIComponent(absoluteKeyUrl)}&referer=${encodeURIComponent(referer)}"`;
             });
          }
          return line; 
        }
        
        // It's a URI line
        let absoluteUrl = trimmed;
        if (!trimmed.startsWith('http')) {
           const baseUrl = new URL(url);
           if (trimmed.startsWith('/')) {
             absoluteUrl = `${baseUrl.origin}${trimmed}`;
           } else {
             const pathParts = baseUrl.pathname.split('/');
             pathParts.pop(); // remove filename
             absoluteUrl = `${baseUrl.origin}${pathParts.join('/')}/${trimmed}`;
             // Re-append query string of the base URL if the chunk doesn't have one
             if (baseUrl.search && !absoluteUrl.includes('?')) {
               absoluteUrl += baseUrl.search;
             }
           }
        }
        
        // Proxy this absolute URL
        return `/api/proxy?url=${encodeURIComponent(absoluteUrl)}&referer=${encodeURIComponent(referer)}`;
      });
      
      return new NextResponse(rewrittenLines.join('\n'), {
        headers: {
          'Content-Type': 'application/vnd.apple.mpegurl',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'no-store'
        }
      });
    }

    // If it's HTML, we might need to inject adblock scripts for providers like MegaPlay
    if (contentType.includes('text/html')) {
      let html = await response.text();
      
      // Inject base tag so relative URLs work, and an adblock script to disable popups
      const baseUrl = new URL(url).origin + '/';
      const adblockScript = `
        <base href="${baseUrl}">
        <script>
          // Override window.open to block popups but return a dummy object to fool anti-adblock/sandbox detectors
          window.open = function() { 
             console.log('Popup blocked by StreamNet Proxy'); 
             return { close: function(){}, focus: function(){}, blur: function(){}, location: { href: '', replace: function(){}, assign: function(){} }, postMessage: function(){} }; 
          };
          
          // Defuse all target="_blank" links
          document.addEventListener('click', function(e) {
            let t = e.target;
            while(t && t !== document.body) {
              if (t.tagName === 'A' && t.target === '_blank') {
                t.removeAttribute('target');
              }
              t = t.parentElement;
            }
          }, true);

          // Intercept Event Listeners to neutralize ad network click-redirects
          if (typeof EventTarget !== 'undefined' && EventTarget.prototype.addEventListener) {
            const origAddEvt = EventTarget.prototype.addEventListener;
            const AD_REGEX = /window\\.open|popunder|onclickads|adsterra|propeller|exoclick|adcash|top\\.location|location\\.replace/i;

            EventTarget.prototype.addEventListener = function(type, listener, options) {
              if (['click', 'mousedown', 'pointerdown', 'mouseup', 'touchend'].includes(type)) {
                let fnStr = '';
                try {
                  if (typeof listener === 'function') fnStr = Function.prototype.toString.call(listener);
                  else if (listener && typeof listener.handleEvent === 'function') fnStr = Function.prototype.toString.call(listener.handleEvent);
                } catch(e) {}

                if (fnStr && AD_REGEX.test(fnStr)) {
                  console.warn('Neutralized malicious ' + type + ' listener');
                  return;
                }
              }
              return origAddEvt.call(this, type, listener, options);
            };
          }

          // Intercept dynamic ad script injections
          const origCreateElement = document.createElement;
          document.createElement = function(tagName, options) {
            const el = origCreateElement.call(document, tagName, options);
            if (!el || typeof el.setAttribute !== 'function') {
              return el;
            }
            if (String(tagName).toLowerCase() === 'script') {
              const origSetAttribute = el.setAttribute;
              el.setAttribute = function(name, val) {
                if (String(name).toLowerCase() === 'src') {
                  if (/popads|popcash|adsterra|propellerads|exoclick|monetag|hilltopads|clickadu|adcash|yllix|onclickads|tsyndicate/i.test(val)) {
                    console.warn('Blocked dynamic ad script:', val);
                    return origSetAttribute ? origSetAttribute.call(el, 'src', 'data:text/javascript,;') : undefined;
                  }
                }
                return origSetAttribute ? origSetAttribute.call(el, name, val) : undefined;
              };
              
              // Also trap direct src assignment
              Object.defineProperty(el, 'src', {
                set: function(val) {
                  if (/popads|popcash|adsterra|propellerads|exoclick|monetag|hilltopads|clickadu|adcash|yllix|onclickads|tsyndicate/i.test(val)) {
                    console.warn('Blocked dynamic ad script assignment:', val);
                    val = 'data:text/javascript,;';
                  }
                  if (typeof this.setAttribute === 'function') {
                    this.setAttribute('src', val);
                  }
                },
                get: function() { return typeof this.getAttribute === 'function' ? this.getAttribute('src') : ''; }
              });
            }
            return el;
          };

          // Proxy all fetch requests to bypass CORS and preserve X-Requested-With
          const origFetch = window.fetch;
          window.fetch = async function() {
            let input = arguments[0];
            if (typeof input === 'string') {
               if (input.startsWith('/')) input = '${baseUrl}' + input.substring(1);
               if (input.includes('megaplay.buzz')) {
                  arguments[0] = '/api/proxy?url=' + encodeURIComponent(input) + '&referer=https://megaplay.buzz/';
               }
            } else if (input && input.url) {
               let u = input.url;
               if (u.startsWith('/')) u = '${baseUrl}' + u.substring(1);
               if (u.includes('megaplay.buzz')) {
                  arguments[0] = new Request('/api/proxy?url=' + encodeURIComponent(u) + '&referer=https://megaplay.buzz/', input);
               }
            }
            return origFetch.apply(this, arguments);
          };

          // Proxy all XHR requests
          const origOpen = XMLHttpRequest.prototype.open;
          XMLHttpRequest.prototype.open = function(method, url) {
             let targetUrl = url;
             if (typeof targetUrl === 'string') {
               if (targetUrl.startsWith('/')) targetUrl = '${baseUrl}' + targetUrl.substring(1);
               if (targetUrl.includes('megaplay.buzz')) {
                  targetUrl = '/api/proxy?url=' + encodeURIComponent(targetUrl) + '&referer=https://megaplay.buzz/';
               }
             }
             return origOpen.apply(this, [method, targetUrl].concat(Array.prototype.slice.call(arguments, 2)));
          };
        </script>
      `;
      
      html = html.replace('<head>', '<head>' + adblockScript);
      
      // Remove known ad scripts (specifically statlytic for megaplay)
      html = html.replace(/<script[^>]+statlytic\.net[^>]+><\/script>/gi, '');
      html = html.replace(/<script[^>]+data-domain="megaplay[^>]+><\/script>/gi, '');
      
      return new NextResponse(html, {
        headers: {
          'Content-Type': 'text/html',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'no-store'
        }
      });
    }

    // Ensure correct content-type for subtitles
    let finalContentType = contentType || 'video/MP2T';
    if (url.includes('.vtt')) {
      finalContentType = 'text/vtt';
    } else if (url.includes('.srt')) {
      finalContentType = 'text/plain';
    }

    // For raw .ts chunks or anything else, just stream the binary data
    return new NextResponse(response.body, {
      headers: {
        'Content-Type': finalContentType,
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=86400'
      }
    });

  } catch (error: any) {
    console.error("Proxy error:", error);
    return new NextResponse(error.message, { status: 500 });
  }
}
