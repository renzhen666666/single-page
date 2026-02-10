import { json } from '@cloudflare/itty-router-openapi';

// Route parser for parameter matching
class RouteParser {
    constructor(routes) {
        this.compiledRoutes = routes.map(route => this.compileRoute(route));
    }

    compileRoute(routeConfig) {
        const { path: routePath, template, function: funcConfig } = routeConfig;
        const paramDefs = [];
        const regexPattern = routePath.replace(
            /:(\w+)(?:<(\w+)>)*\/?/g,
            (match, paramName, paramType = 'string') => {
                paramDefs.push({ name: paramName, type: paramType });
                const typeRegex = this.getTypeRegex(paramType);
                return `(${typeRegex})`;
            }
        ).replace(/\//g, '\\/');

        const regex = new RegExp(`^${regexPattern}$`);

        return {
            regex,
            template,
            function: funcConfig,
            paramDefs,
            extractParams: (match) => {
                const params = {};
                for (let i = 0; i < paramDefs.length; i++) {
                    const { name, type } = paramDefs[i];
                    let value = match[i + 1];
                    params[name] = this.convertParam(value, type);
                }
                return params;
            }
        };
    }

    getTypeRegex(type) {
        switch (type) {
            case 'int':
                return '\\d+';
            case 'float':
                return '\\d+\\.\\d+';
            case 'string':
            default:
                return '[^\\/]+?';
        }
    }

    convertParam(value, type) {
        switch (type) {
            case 'int':
                return parseInt(value, 10);
            case 'float':
                return parseFloat(value);
            case 'string':
            default:
                return value;
        }
    }

    match(path) {
        for (const route of this.compiledRoutes) {
            const match = path.match(route.regex);
            if (match) {
                return {
                    template: route.template,
                    function: route.function,
                    params: route.extractParams(match)
                };
            }
        }
        return null;
    }
}

// Template rendering function
function renderTemplate(html, pageParamsMap) {
    const matches = [...html.matchAll(/\{(\w+)\}(.*?)\{\/\1\}/gs)];
    let result = html;
    
    matches.forEach(element => {
        const [_, paramName, paramValue] = element;
        if (paramName in pageParamsMap) {
            result = result.replace(element[0], pageParamsMap[paramName]);
        } else {
            result = result.replace(element[0], paramValue);
        }
    });
    
    return result;
}

// Load routes from data
async function loadRoutes(env) {
    try {
        const routesData = await env.ROUTES_KV.get('routes.json', 'json');
        return routesData || [];
    } catch (e) {
        console.error('Error loading routes:', e);
        return [];
    }
}

// Load page data
async function loadPageData(url, env) {
    try {
        const pagesData = await env.ROUTES_KV.get('pages.json', 'json');
        if (!pagesData) return null;
        
        const urlSafe = url.replace(/\//g, '_');
        return pagesData[urlSafe] || null;
    } catch (e) {
        console.error('Error loading page data:', e);
        return null;
    }
}

// Load error page
async function loadErrorPage(errorType, env) {
    try {
        const pagesData = await env.ROUTES_KV.get('pages.json', 'json');
        if (!pagesData) return `<h1>${errorType}</h1>`;
        
        const errorKey = `error/${errorType}/error_${errorType}`;
        const errorData = pagesData[errorKey];
        
        if (errorData) {
            return typeof errorData === 'object' ? errorData.html : errorData;
        }
        
        return `<h1>${errorType}</h1>`;
    } catch (e) {
        return `<h1>${errorType}</h1>`;
    }
}

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        const pathParts = url.pathname.split('/').filter(Boolean);
        
        // Extract the path after /api/pages/
        const apiIndex = pathParts.indexOf('api');
        const pagesIndex = pathParts.indexOf('pages');
        
        if (pagesIndex === -1 || apiIndex === -1) {
            return json({ success: false, error: 'Invalid request' }, { status: 400 });
        }
        
        let requestPath = pathParts.slice(pagesIndex + 1).join('/');
        
        try {
            // Load routes for parameter matching
            const routes = await loadRoutes(env);
            const router = new RouteParser(routes);
            
            const matchedRoute = router.match('/' + requestPath);
            let finalPath = requestPath;
            let pageParamsMap = {};
            
            if (matchedRoute) {
                finalPath = matchedRoute.template.path.substring(1);
                Object.entries(matchedRoute.template?.params || {})?.forEach(([key, value]) => {
                    pageParamsMap[key] = matchedRoute.params[value];
                });
            }
            
            // Load page data
            const pageData = await loadPageData(finalPath, env);
            
            if (!pageData) {
                const errorPage = await loadErrorPage('404', env);
                return json({
                    success: false,
                    error: 'Page not found',
                    data: { page: errorPage }
                }, { status: 404 });
            }
            
            const config = pageData.config || {};
            const pageHtml = typeof pageData === 'object' && pageData.html !== undefined 
                ? pageData.html 
                : pageData;
            
            const renderedHtml = renderTemplate(pageHtml, pageParamsMap);
            
            return json({
                success: true,
                data: { page: renderedHtml, config: config }
            });
            
        } catch (e) {
            console.error('Error in pages API:', e);
            const errorPage = await loadErrorPage('500', env);
            return json({
                success: false,
                error: 'Internal server error',
                data: { page: errorPage }
            }, { status: 500 });
        }
    }
};