// Pages Function for handling dynamic page requests
// Import page data from assets (pre-built during build process)
import pagesData from '../../../_data/pages.json';
import routesData from '../../../_data/routes.json';

// Route Parser class (adapted from original app.mjs)
class RouteParser {
  constructor(routes) {
    this.compiledRoutes = routes.map(route => this.compileRoute(route));
  }

  compileRoute(routeConfig) {
    const { path: routePath, template } = routeConfig;
    const paramDefs = [];
    const regexPattern = routePath.replace(
      /:(\w+)(?:<(\w+)>)*\/?/g,
      (match, paramName, paramType = 'string') => {
        paramDefs.push({ name: paramName, type: paramType });
        return `(${this.getTypeRegex(paramType)})`;
      }
    ).replace(/\//g, '\\/');

    const regex = new RegExp(`^${regexPattern}$`);

    return {
      regex,
      template,
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
          params: route.extractParams(match)
        };
      }
    }
    return null;
  }
}

// Template renderer
function renderTemplate(template, params) {
  if (!params || Object.keys(params).length === 0) {
    return template;
  }
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return params[key] !== undefined ? params[key] : match;
  });
}

// Initialize router
const router = new RouteParser(routesData);

export async function onRequestPost(context) {
  try {
    const { request } = context;
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/').filter(p => p);

    // Extract path after /api/pages/
    const apiPageIndex = pathParts.findIndex(p => p === 'api');
    if (apiPageIndex === -1 || pathParts[apiPageIndex + 1] !== 'pages') {
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid API path',
        data: { page: '400 Bad Request' }
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    let pagePath = pathParts.slice(apiPageIndex + 2).join('/');
    if (pagePath.endsWith('/')) {
      pagePath = pagePath.slice(0, -1);
    }

    // Route matching
    let actualPath = pagePath;
    let pageParamsMap = {};

    const matchedRoute = router.match('/' + pagePath);
    if (matchedRoute) {
      actualPath = matchedRoute.template.path.substring(1);
      Object.entries(matchedRoute.template?.params || {}).forEach(([key, value]) => {
        pageParamsMap[key] = matchedRoute.params[value];
      });
    }

    // Look up page in pre-built data
    const urlSafe = actualPath.replace(/\//g, '_');
    const pageKey = `${actualPath}/${urlSafe}`;

    const pageData = pagesData[pageKey];

    if (!pageData) {
      // Return 404 page
      const notFoundPage = pagesData['error/404/error_404'];
      return new Response(JSON.stringify({
        success: false,
        error: 'Page not found',
        data: { page: notFoundPage?.html || '<h1>404 Not Found</h1>' }
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    let pageHtml;
    if (typeof pageData === 'object' && pageData.html !== undefined) {
      pageHtml = pageData.html;
    } else {
      pageHtml = pageData;
    }

    // Render template with params
    pageHtml = renderTemplate(pageHtml, pageParamsMap);

    return new Response(JSON.stringify({
      success: true,
      data: {
        page: pageHtml,
        config: pageData.config || {}
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in pages function:', error);
    const errorPage = pagesData['error/500/error_500'];
    return new Response(JSON.stringify({
      success: false,
      error: 'Internal server error',
      data: { page: errorPage?.html || '<h1>500 Internal Server Error</h1>' }
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}