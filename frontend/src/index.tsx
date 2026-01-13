import { render } from 'solid-js/web';
import { onMount } from 'solid-js';
import App from './App';
import './index.css';
import { initDb } from './db/client';

onMount(async () => {
    await initDb();

    // Register Service Worker for PWA (Phase 4)
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js');
    }

    render(() => <App />, document.getElementById('root')!);
});
