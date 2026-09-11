if ('scrollRestoration' in history) { history.scrollRestoration = 'manual'; }
window.scrollTo(0, 0);
if (document.body) document.body.scrollTop = 0;
if (document.documentElement) document.documentElement.scrollTop = 0;
window.addEventListener('beforeunload', function() { window.scrollTo(0, 0); });
window.addEventListener('pagehide', function() { window.scrollTo(0, 0); });
