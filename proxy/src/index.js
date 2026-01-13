export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);

        // Target the Pages deployment
        // Incoming: https://moecapital.com/1/assets/...
        // Target:   https://dot1-e8r.pages.dev/assets/...  (NOTE: STRIP /1/)

        url.hostname = 'dot1-e8r.pages.dev';
        url.protocol = 'https:';

        // Remove the /1 prefix from the pathname for the origin fetch
        // because Pages hosts the content at the root.
        if (url.pathname.startsWith('/1')) {
            url.pathname = url.pathname.replace('/1', '');
        }

        const proxyRequest = new Request(url, request);

        // Fetch from Pages
        return fetch(proxyRequest);
    }
};
