const app = document.getElementById('app');

window.pageCleanup = null;
window.pageTimers = [];

class cache{
    constructor() {
        this.data = {};
    }

    len() {
        return Object.keys(this.data).length;
    }

    set(key, value) {
        this.data[key] = value;
    }

    get(key) {
        return this.data[key] || null;
    }

    remove(key) {
        delete this.data[key];
    }

    clear() {
        this.data = {};
    }
}


class RouteParser {
    constructor(routes) {
        // 预编译路由配置
        this.compiledRoutes = routes.map(route => this.compileRoute(route));
    }

    // 🔥 将 "/route/:q<int>" 转换为正则和提取函数
    compileRoute(routeConfig) {
        const { path: routePath, template, function: funcConfig } = routeConfig;
        // 1. 提取参数定义 (name, type)
        const paramDefs = [];
        const regexPattern = routePath.replace(
            /:(\w+)(?:<(\w+)>)*\/?/g, // 匹配 :name<type> 或 :name/
            (match, paramName, paramType = 'string') => {
                paramDefs.push({ name: paramName, type: paramType });
                // 根据类型生成不同的正则捕获组
                const typeRegex = this.getTypeRegex(paramType);
                return `(${typeRegex})`;
        }
        ).replace(/\//g, '\\/'); // 转义路径分隔符

        // 2. 创建正则表达式
        const regex = new RegExp(`^${regexPattern}$`);

        // 3. 返回编译后的路由对象
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
                // 4. 类型转换
                params[name] = this.convertParam(value, type);
                }
                return params;
            }
        };
    }

    getTypeRegex(type) {
        switch (type) {
        case 'int':
            return '\\d+'; // 只匹配数字
        case 'float':
            return '\\d+\\.\\d+'; // 简单的浮点数匹配
        case 'string':
            return '[^\\/]+?'; // 匹配非斜杠字符
        default:
            return '[^\\/]+?'; // 匹配非斜杠字符
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

    // 🔥 主匹配函数
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
        return null; // 未找到匹配
    }
}

function loadingElement() {
    /*
    <div class="loader-container d-flex justify-content-center align-items-center shadow-sm">
        <svg class="circular-loader" viewBox="25 25 50 50">
            <circle class="loader-path" cx="50" cy="50" r="20"></circle>
        </svg>
    </div>
    */


    const loadingElement = document.createElement('div');
    loadingElement.className = 'loader-container d-flex justify-content-center align-items-center shadow-sm';

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'circular-loader');
    svg.setAttribute('viewBox', '25 25 50 50');

    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('class', 'loader-path');
    circle.setAttribute('cx', '50');
    circle.setAttribute('cy', '50');
    circle.setAttribute('r', '20');

    svg.appendChild(circle);
    loadingElement.appendChild(svg);


    return loadingElement.outerHTML;
}


// 黑白主题切换
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    let newTheme;

    const themeToggle = document.getElementById('theme-toggle');
    const themeIcon = themeToggle?.querySelector('.theme-icon');
    
    if (currentTheme === 'light') {
        document.documentElement.setAttribute('data-theme', 'dark');
        newTheme = 'dark';
        if (themeIcon) themeIcon.textContent = '☀️';
    } else{
        document.documentElement.setAttribute('data-theme', 'light');
        newTheme = 'light';
        if (themeIcon) themeIcon.textContent = '🌙';
    }
    
    localStorage.setItem('theme', newTheme);
}


function initThemeToggle() {
    const themeToggle = document.getElementById('theme-toggle');
    const themeIcon = themeToggle?.querySelector('.theme-icon');

    if(!themeToggle) return;

    const currentTheme = localStorage.getItem('theme') || 'dark';
    if(document.documentElement.getAttribute('data-theme') === currentTheme) return; // 避免重复设置

    if (currentTheme === 'light') {
        document.documentElement.setAttribute('data-theme', 'light');
        if (themeIcon) themeIcon.textContent = '🌙';
    } else {
        document.documentElement.setAttribute('data-theme', 'dark');
        if (themeIcon) themeIcon.textContent = '☀️';
    }

    localStorage.setItem('theme', currentTheme);
}

function initTheme() {
    const currentTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', currentTheme);
}

// 侧边栏加载完成后初始化主题
//document.addEventListener('siderbarLoaded', initThemeToggle);  on loadNavigation
function jumpTo(url, loadContainerId = 'app') {
    if (url.startsWith('/')) {
        if (url === '/') url = '/home';
        loadPage(loadContainerId, url);
    } else {
        window.open(url, '_blank');
    }
}


function superDictFromTemplate(template, dict) {
    let result = dict;
    for (const key in template) {
        if (dict.hasOwnProperty(key)) {
            if(typeof template[key] === 'object' && !Array.isArray(template[key]) && template[key] !== null) {
                result[key] = superDictFromTemplate(template[key], dict[key]);
            }
            result[key] = dict[key];
        } else {
            result[key] = template[key];
        }
    }
    return result;
}


/////////////

const loading = loadingElement();
let navContent = {};
let siderbarContent = {};

templateCache = new cache();

const router = new RouteParser(window.config.routes);

const defaultMethods = {
    toggleTheme: toggleTheme,
}


document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname === '/') window.location.pathname = '/home';

    loadPage();

}, false);


window.addEventListener('popstate', function(event) {
    loadPage(); //点击返回时重新加载页面
});

async function loadScriptFromSrc(pageName){
    try {
        const pageModule = await import(`./js/${pageName}`);
        
        let initFuncLst = [];

        // 模块必须导出一个 init 函数！！！
        if (typeof pageModule.init === 'function') {
            initFuncLst.push(pageModule.init);
        } else {
            console.warn(`页面 ${pageName} 缺少 init 函数`);
        }
        return  {
            methods: pageModule.methods || {},
            initFuncLst: initFuncLst,
        };
    } catch (error) {
        console.error(`加载页面 ${pageName} 失败:`, error);
        return {};
    }
}

function loadScript(scriptContent) {
    return new Promise((resolve, reject) => {

        const script = document.createElement('script');
        script.innerText = scriptContent;
        script.async = true;

        script.setAttribute('data-loaded-from', window.location.pathname);
        
        script.onload = () => resolve(script);
        script.onerror = () => reject(new Error(`Failed to load script: ${scriptContent}`));
        
        document.head.appendChild(script);
    });
}


function loadStylesFromHref(href) { 
    return new Promise((resolve, reject) => {
        // 防止重复加载相同 CSS
        if (document.querySelector(`link[href="${href}"]`)) {
            resolve();
            return;
        }

        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;
        link.type = 'text/css';
        link.onload = () => {
            resolve(link);
        };

        link.setAttribute('data-loaded-from', window.location.pathname);
        link.onerror = () => reject(new Error(`Failed to load CSS: ${href}`));
        
        document.head.appendChild(link);
    });
}

function loadStyles(text) { 
    return new Promise((resolve, reject) => {
    
        const style = document.createElement('style');
        style.textContent = text;
        style.onload = () => {
            resolve(style);
        };

        style.setAttribute('data-loaded-from', window.location.pathname);
        style.onerror = () => reject(new Error(`Failed to load CSS: ${text}`))
    
    })
}


async function clearOldPage(){
    window.dispatchEvent(new Event('pageUnload'));

    window.__pageCleanup?.(); // 调用页面清理函数
    if (Array.isArray(window.pageTimers)) {
        window.pageTimers.forEach(timerId => {
            clearTimeout(timerId);
            clearInterval(timerId);
        });
    } else {
        clearTimeout(window.pageTimers);
        clearInterval(window.pageTimers);
    }


    window.pageCleanup = null;
    window.pageTimers = [];

    
    document.querySelectorAll('link').forEach(link => {
        if (link.getAttribute('data-loaded-from') && link.getAttribute('data-loaded-from') !== window.location.pathname) {
            link.remove();
        }
    });

    document.querySelectorAll('script').forEach(script => {
        if (script.getAttribute('data-loaded-from') && script.getAttribute('data-loaded-from') !== window.location.pathname) {
            script.remove();
        }
    });
    document.body.style.overflow = '';
    document.body.style.height = '';
    document.documentElement.style.height = '';
}

async function loadPage(loadContainerId = 'app', url=window.location.pathname) {
    const oldPath = window.location.pathname;
    console.log('oldPath:', oldPath);


    window.history.pushState({ path: url }, '', url);

    const container = document.getElementById(loadContainerId);

    if(!container) {
        console.error(`容器 ${loadContainerId} 不存在`);
        return;
    }


    const path = window.location.pathname.startsWith('/') ? window.location.pathname : `/${window.location.pathname}`;
    container.innerHTML = loading;


    //

    const matchedRoute = router.match(path); 

    let pageRenderMap={}, requestUrl=path;

    if(matchedRoute) {
        requestUrl = matchedRoute.template.path;
        Object.entries(matchedRoute.template?.params)?.forEach(([key, value]) => {
            pageRenderMap[key] = matchedRoute.params[value];
        });
    }
    const dataP = fetch(`/api/pages${requestUrl}`, { method: 'POST' }).then(async res =>  {
        return await processResponse(res);
    });



    const pageConfigP = import(`/api/pages${requestUrl}.js`).then((pageModule) => {
        return pageModule.default;
    }).then(pageConfig => {
        return {success: true, data: pageConfig};
    }).catch((error) => {
        console.error('加载页面配置失败:', error);
        return {sucess: false};
    });
    
    const [pageData, pageConfig] = await Promise.all([dataP, pageConfigP]).then(([data, pageConfig]) => {
        if(!data.success) {
            console.error('加载页面数据失败:', data);
            return [data.data, {}];
        }else if(!pageConfig.success) {
            console.error('加载页面配置失败:', pageConfig);
            return [data.data, {}];
        }
        return [data.data, pageConfig.data];
    });
    

    console.log(`${path} requestData:`, {
        data: pageData,
        pageConfig: pageConfig
    });
    


    switch (pageConfig?.loadData?.method) {
        case 'derive':
            const superU = pageConfig.loadData.super;
            if(oldPath.startsWith(superU) && oldPath !== path) {
                break;
            }/* else if(pageConfig.loadData.loadSuper) {
                await loadPage(loadContainerId, superU);
                break;
            } */else{
                await loadPage('app', superU);
                await loadPage(pageConfig.loadData.deriveContainer, path);
                return;
            }
        default:
            break;
    }



    var methodsMap = defaultMethods;
    
    
    let initFuncLst = [];

    if (pageConfig?.scripts) {
        // 等待所有异步加载完成 ！！！！！
        const methodsPromises = pageConfig.scripts.map(scriptSrc => loadScriptFromSrc(scriptSrc));

        const results = await Promise.all(methodsPromises);
        const methodsArray = results.map(r => r.methods);
        initFuncLst = results.flatMap(r => r.initFuncLst);

        methodsArray.forEach(_methods => {
            Object.assign(methodsMap, _methods);
        });
    }

    if(pageConfig?.styles) {
        const stylesPromises = pageConfig.styles.map(cssFilename => loadStylesFromHref(`/css/${cssFilename}`));
        await Promise.all(stylesPromises);
    }0

    const _data = renderHtml(pageData.page);

    let templateRenderMap = _data.templateRenderMap;
    templateRenderMap.navbar = pageConfig?.navbar || {};
    templateRenderMap.siderbar = pageConfig?.siderbar || {};

    console.log('htmlScript:', _data.scripts);
    console.log('templateRenderMap:', templateRenderMap);


    if(loadContainerId === 'app') await clearOldPage(); // 等待清理完成！！！！！！


    if(_data.scripts) {
        _data.scripts.forEach(script => loadScript(script));
    }

    if(_data.styles) {
        _data.styles.forEach(style => loadStyles(style));
    }



    //console.log('methodsMap:', methodsMap);


    //


    
    await loadNavigation(templateRenderMap);
    //

    renderPage(_data.html, pageConfig, pageRenderMap, methodsMap=methodsMap, loadContainerId);

    window.dispatchEvent(new Event('pageLoaded'));

    initFuncLst?.forEach(initFunc => initFunc());


}

function renderHtml(html) {


    let templateRenderMap = {};
    const scripts = [...html.matchAll(/<script>(.*?)<\/script>/gs)].map(scriptMatch => scriptMatch[1].replace(/\n/g, ''))

    const styles = [...html.matchAll(/<style>(.*?)<\/style>/gs)].map(styleMatch => styleMatch[1]);

    html = html.replace(/<script>(.*?)<\/script>/gs, '');

    const configs = html.matchAll(/\{(\w+)\}(.*?)\{\/\1\}/gs);
    html = html.replace(/\{(\w+)\}(.*?)\{\/\1\}/gs, '');

    configs.forEach(configMatch => {
        const configName = configMatch[1];
        const configContent = configMatch[2];
        templateRenderMap[configName] = configContent;
    });
    
    const _json = html.match(/\{json\}(.*?)\{\/json\}/s);
    html = html.replace(/\{json\}(.*?)\{\/json\}/s, '');

    _json?.forEach(jsonMatch => {
        try {
            const json = JSON.parse(jsonMatch[1]);
            Object.assign(templateRenderMap, json);
        } catch (error) {
            console.error('JSON 解析错误:', error);
        }
    });


    return {
        html: html,
        templateRenderMap: templateRenderMap,
        scripts: scripts,
        styles: styles
    };
}


//来自qianwen
function renderPage(pageHtml, config, pageRenderMap = {}, methodsMap = {}, container='app') {
    const containerElement = document.getElementById(container);
    if(!containerElement) {
        console.error(`容器 ${container} 不存在`);
        return;
    }

    const matches = [...pageHtml.matchAll(/{{(.*?)}}/gs)];
    matches.forEach(element => {
        const [_, paramName] = element;
        //if(paramName in pageRenderMap) 
        pageHtml = pageHtml.replace(element[0], pageRenderMap[paramName]);
        
    });


    containerElement.innerHTML = pageHtml;
    if (config?.title) document.title = config.title;


    

    document.querySelectorAll('*').forEach(element => {
        Array.from(element.attributes).forEach(attr => {
        // 检查 'data-on-' 开头
        if (attr.name.startsWith('data-on-')) {
            const fullEventType = attr.name.substring(8).toLowerCase(); // 例如 'click', 'input'
            const methodName = attr.value.trim().replace(/\([^)]*\)/g, '').replace(';', ''); // 例如 'handleClick'
            
            // 检查是否为标准事件类型
            if (!fullEventType || !methodName) return; // 如果属性名或值无效则跳过

            const handler = methodsMap[methodName];
            if (typeof handler === 'function') {
                //  构建参数列表
                const paramAttrName = `data-${fullEventType}-params`; // 例如 'data-click-params', 'data-input-params'
                let params = [];
                let hasEvent = false;

                const paramsStr = element.getAttribute(paramAttrName);
                if (paramsStr) {
                    try {
                        params = JSON.parse(paramsStr);



                    } catch (e) {
                        console.warn(`参数解析失败 for ${methodName} (${paramAttrName}):`, paramsStr, e);
                        params = [];
                    }
                }

                element.addEventListener(fullEventType, (e) => {
                    //  一个新的参数数组
                    const finalParams = [];

                    for (let i = 0; i < params.length; i++) {
                        let paramValue = params[i];

                        if(paramValue === 'event') hasEvent = true;

                        if (typeof paramValue === 'string' && paramValue.startsWith('this.')) {
                            // 🔥 处理 this. 访问
                            try {
                                const pathParts = paramValue.replace('this.', '').split('.');
                                let currentValue = e.target; // 从 event 对象开始

                                for (const part of pathParts) {
                                    if (currentValue == null) { // 检查 null 或 undefined
                                        console.warn(`无法解析路径 "${paramValue}", ${pathParts.slice(0, pathParts.indexOf(part)).join('.')} 为 null 或 undefined`);
                                        currentValue = undefined; // 设置为 undefined 并跳出
                                        break;
                                    }
                                    currentValue = currentValue[part];
                                }
                                finalParams.push(currentValue);
                            } catch (error) {
                                console.error(`解析路径 "${paramValue}" 时出错:`, error);
                                finalParams.push(undefined); // 推入 undefined 作为失败的值
                            }
                        } else {
                            // 如果不是 this. 开头的字符串，则直接推入原值
                            finalParams.push(paramValue);
                        }
                    }

                    if (hasEvent) handler(e, ...finalParams);
                    else handler(...finalParams);
                });
                element.removeAttribute(attr.name); // 移除 data-on-xxx 属性
            } else {
                console.warn(`找不到方法: ${methodName}`, methodsMap);
            }
        }
        });
    });

    const as = document.querySelectorAll('a:not([data-bound])');
    as.forEach(a => {

        a.setAttribute('data-bound', 'true'); // 标记为已绑定，避免重复绑定

        let loadContainerId = 'app'

        switch (a.getAttribute('data-load')) {
            case 'derive':
                loadContainerId = a.closest('[data-derive-container]')?.getAttribute('id') || 'app';
                break;

        }

        a.addEventListener('click', (e) => {
            e.preventDefault();
            window.load(a.getAttribute('href'), loadContainerId);
        });

    });
}

async function loadNavigation(config={}) {
    try {
        



        config.navbar = superDictFromTemplate({
                display: true,
                template: window.config.navbar.default,
                renderContent: true
        }, config.navbar || {});

        config.siderbar = superDictFromTemplate({
                display: true,
                template: window.config.siderbar.default,
                renderContent: false
        }, config.siderbar || {});
        

        if(document.getElementById('navbar').children.length === 0 || document.getElementById('siderbar').children.length === 0) {
            console.log('通过请求获取导航栏和侧边栏模板');
            const resources = [
                config.navbar?.display ? config.navbar?.template : null, 
                config.siderbar?.display ? config.siderbar?.template : null
            ].filter(item => item !== null && item !== undefined);

            const fetchProm = [];

            resources.forEach(template => {
                if(!templateCache.get(template)){
                    const p=fetch(`/api/template/${template}`, { method: 'POST' })
                        .then(response => response.json())
                        .then(data => {
                            if(data.success) {
                                templateCache.set(template, data.data);
                            } else {
                                console.error(`加载模板 ${template} 失败, 请检查资源是否存在:`, data.error);
                            }
                        })
                        .catch(error => {
                            console.error(`加载模板 ${template} 失败, 请检查资源是否存在:`, error);
                        });
                    fetchProm.push(p);
                }
            });

            await Promise.all(fetchProm);


            const { navbar, siderbar, ...renderMap } = config; // renderMap为config去除navbar和siderbar后的对象

            document.getElementById('navbar').innerHTML = config.navbar?.renderContent ? renderTemplate(templateCache.get(config.navbar?.template), renderMap) : templateCache.get(config.navbar?.template);
            document.getElementById('siderbar').innerHTML = config.siderbar?.renderContent ? renderTemplate(templateCache.get(config.siderbar?.template), renderMap) : templateCache.get(config.siderbar?.template);
        }



        //清除上一个active
        document.getElementById('navbar').querySelectorAll('[page]')?.forEach(ele => { 
            ele.classList.remove('active');
        })
        document.getElementById('siderbar').querySelectorAll('[page]')?.forEach(ele => { 
            ele.classList.remove('active');
        })

        document.getElementById('siderbar').querySelector(`[siderbar-toggle]`)?.click(); //如果存在siderbar-toggle，则点击它
        document.getElementById('navbar').querySelector(`[navbar-toggle]`)?.click(); 

        document.getElementById('navbar').querySelector(`[page=${config?.navbar?.page}]`)?.classList.add('active');
        document.getElementById('siderbar').querySelector(`[page=${config?.siderbar?.page}]`)?.classList.add('active');

        document.dispatchEvent(new Event('siderbarLoaded'));
    
    } catch (error) {
        console.error('加载导航栏失败:', error);
    }
}


function renderTemplate(content, data = {}) {
    // 处理条件占位符，如 {homeActive}...{/homeActive}
    content = content.replace(/\{([^}]+)\}([\s\S]*?)\{\/\1\}/g, (match, key, innerContent) => {
        // 如果数据中存在该键且值为真，则返回内部内容，否则返回空字符串
        return data[key] ? innerContent : '';
    });

    components = content.match(/<template\s+include="([^"]*)"[^>]*><\/template>/gs) || [];
    let comMap = {}, comPos=[];
    components.forEach(component => {
        const componentName = component[1];
        comPos.push(fetch(`/api/template/${componentName}`, {method: 'POST'}
            ).then(response => response.json()
            ).then(res => {
                if(res.success) {
                    comMap[componentName] = res.data;
                } else {
                    console.error(`加载组件 ${componentName} 失败, 请检查资源是否存在:`, json.error);
                }
            }).catch(error => {
                console.error(`加载组件 ${componentName} 失败, 请检查资源是否存在:`, error);
            })
        );
    });

    Promise.all(comPos).then(() => {
        comMap.forEach((component, componentName) => {
            content = content.replace(new RegExp(`<template\\s+include="${componentName}"[^>]*><\\/template>`, 'gs'), component);
        })

    })
    
    // 处理简单变量替换，如 {title}
    content = content.replace(/\{([^}]+)\}/g, (match, key) => {
        return data[key] !== undefined ? data[key] : '';
    });
    
    return content;
}

 async function processResponse(response) {
    const data = await response.json();
    if (!data.success) {
        console.warn('API返回错误:', data.error || '未知错误');
        if (data.data?.page) {
            return { success: false, error: data.error||response.status, data: { 'page': data.data.page } };
        } else {
            switch (response.status) {
                case 404:
                    return {
                        sucesss: false,
                        error: 404,
                        data:{ 
                            'page': `<div class="alert alert-danger" role="alert">404 页面不存在</div>`
                        }
                    }
                case 500:
                    return {
                        sucesss: false,
                        error: 500,
                        data:{ 
                            'page': `<div class="alert alert-danger" role="alert">500 服务器错误</div>`
                        }
                    }
                case 401:
                    return {
                        sucesss: false,
                        error: 401,
                        data:{ 
                            'page': `<div class="alert alert-danger" role="alert">401 未授权</div>`
                        }
                    }


                default:
                    return {
                        sucesss: false,
                        error: response.status,
                        data:{
                            'page': `<div class="alert alert-danger" role="alert">${data.error || '我们也不知道出了什么问题，你就先受着吧(doge)'}</div>`
                        }
                    };
                }
        }
    }
    return {success: true, data: data.data};
};


initTheme();

window.load = jumpTo;
window.loadPage = loadPage;