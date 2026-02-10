import { json } from '@cloudflare/itty-router-openapi';

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        const pathParts = url.pathname.split('/').filter(Boolean);
        
        // Extract the path after /api/template/
        const apiIndex = pathParts.indexOf('api');
        const templateIndex = pathParts.indexOf('template');
        
        if (templateIndex === -1 || apiIndex === -1) {
            return json({ success: false, error: 'Invalid request' }, { status: 400 });
        }
        
        const templateName = pathParts.slice(templateIndex + 1).join('/');
        
        try {
            const navData = await env.ROUTES_KV.get('navigation.json', 'json');
            
            if (!navData) {
                return json({ success: false, error: 'Template data not found' }, { status: 404 });
            }
            
            if (navData[templateName]) {
                return json({ success: true, data: navData[templateName] });
            } else {
                return json({ success: false, error: 'Template not found' }, { status: 404 });
            }
            
        } catch (e) {
            console.error('Error in template API:', e);
            return json({ success: false, error: 'Internal server error' }, { status: 500 });
        }
    }
};