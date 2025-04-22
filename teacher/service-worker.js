// This file will handle caching for offline use.(The implementation of service worker)
const CACHE_NAME = 'pwa-cache-v1';                         //defines the cache name
const urlsToCache = [                                      //paths to the content that will be stored in the cache
    '/',
    '/index.html',
    '/style.css',
    '/app.js'
];

self.addEventListener('install', event => {               //runs when servive worker starts running
    event.waitUntil(                                      
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Opened cache');
                return cache.addAll(urlsToCache);
            })
    );
});

self.addEventListener('fetch', event => {                 //runs when the app requests a resource((e.g., when the user navigates to a new page)
    event.respondWith(                                   // with respondWith() the serviveworker intercepts the request before it reaches network,to check t it is acahe, if it is not tere the normal internet acces will occur
        caches.match(event.request)
            .then(response => {
                if (response) {
                    return response;
                }
                return fetch(event.request);
            })
    );
});


