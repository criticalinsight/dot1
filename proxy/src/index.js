export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);

        // Target the Pages deployment
        // Incoming: https://moecapital.com/1/assets/...
        // Target:   https://master.dot1-e8r-axc.pages.dev/1/assets/...

        url.hostname = 'master.dot1-e8r-axc.pages.dev';
        url.protocol = 'https:';

        // Do NOT remove /1 prefix because the Pages deployment now has the content at /1/
        // to match the public URL structure and asset paths.
        // if (url.pathname.startsWith('/1')) {
        //    url.pathname = url.pathname.replace('/1', '');
        // }

        const proxyRequest = new Request(url, {
            ...request,
            headers: {
                ...request.headers,
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache'
            }
        });

        const response = await fetch(proxyRequest);
        const newResponse = new Response(response.body, response);
        newResponse.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
        return newResponse;
    }
};
