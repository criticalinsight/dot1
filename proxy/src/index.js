export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);

        // Target the Pages deployment
        // Incoming: https://moecapital.com/1/assets/...
        // Target:   https://dot1-e8r.pages.dev/assets/...  (NOTE: STRIP /1/)

        url.hostname = 'dot1-e8r.pages.dev';
        url.protocol = 'https:';

        // Do NOT remove /1 prefix because the Pages deployment now has the content at /1/
        // to match the public URL structure and asset paths.
        // if (url.pathname.startsWith('/1')) {
        //    url.pathname = url.pathname.replace('/1', '');
        // }

        const proxyRequest = new Request(url, request);

        // Fetch from Pages
        return fetch(proxyRequest);
    }
};
