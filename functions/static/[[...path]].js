export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        const pathParts = url.pathname.split('/').filter(Boolean);
        
        // Handle static resources: /js/, /css/, /img/, /frame.js, /config.js
        const firstPart = pathParts[0];
        
        if (firstPart === 'js' || firstPart === 'css' || firstPart === 'img') {
            const fileName = pathParts.slice(1).join('/');
            const storageKey = `static/${firstPart}/${fileName}`;
            
            try {
                const file = await env.ASSETS.fetch(new URL(storageKey, env.ASSETS_URL));
                
                if (file) {
                    const headers = new Headers();
                    file.headers.forEach((value, key) => headers.set(key, value));
                    headers.set('Cache-Control', 'public, max-age=31536000');
                    
                    return new Response(file.body, {
                        status: file.status,
                        headers
                    });
                }
            } catch (e) {
                console.error('Error serving static file:', e);
            }
            
            return new Response('File not found', { status: 404 });
        }
        
        if (firstPart === 'frame.js' || firstPart === 'config.js') {
            const storageKey = `static/${firstPart}`;
            
            try {
                const file = await env.ASSETS.fetch(new URL(storageKey, env.ASSETS_URL));
                
                if (file) {
                    const headers = new Headers();
                    file.headers.forEach((value, key) => headers.set(key, value));
                    headers.set('Content-Type', 'application/javascript');
                    headers.set('Cache-Control', 'public, max-age=31536000');
                    
                    return new Response(file.body, {
                        status: file.status,
                        headers
                    });
                }
            } catch (e) {
                console.error('Error serving file:', e);
            }
            
            return new Response('File not found', { status: 404 });
        }
        
        if (firstPart === 'favicon.ico') {
            const storageKey = `static/img/favicon.ico`;
            
            try {
                const file = await env.ASSETS.fetch(new URL(storageKey, env.ASSETS_URL));
                
                if (file) {
                    const headers = new Headers();
                    file.headers.forEach((value, key) => headers.set(key, value));
                    headers.set('Cache-Control', 'public, max-age=31536000');
                    
                    return new Response(file.body, {
                        status: file.status,
                        headers
                    });
                }
            } catch (e) {
                console.error('Error serving favicon:', e);
            }
            
            return new Response('', { status: 404 });
        }
        
        return new Response('Not found', { status: 404 });
    }
};