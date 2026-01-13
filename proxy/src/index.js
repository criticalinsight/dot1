export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);

        // Target the Pages + Subpath deployment
        // Incoming: https://moecapital.com/1/assets/...
        // Target:   https://dot1-e8r.pages.dev/1/assets/...

        // We only need to switch the hostname. 
        // The path already includes /1/ because the route matches /1/*
        url.hostname = 'dot1-e8r.pages.dev';
        url.protocol = 'https:';

        const proxyRequest = new Request(url, request);

        // Fetch from Pages
        return fetch(proxyRequest);
    }
};
