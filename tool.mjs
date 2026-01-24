import path from 'path';
import fs from 'fs';

class ObservableDict extends Object {
    constructor(data, callback) {
        super();
        const self = this;
        this._data = data;
        this._callback = callback;

        return new Proxy(this, {
            set(target, property, value) {
                target._data[property] = value;
                target._callback();
                return true;
            },
            deleteProperty(target, property) {
                delete target._data[property];
                target._callback();
                return true;
            },
            get(target, property) {
                if (property === 'data') {
                    return target._data;
                }
                return target._data[property];
            },
            has(target, property) {
                return property in target._data;
            },
            ownKeys(target) {
                return Reflect.ownKeys(target._data);
            },
            getOwnPropertyDescriptor(target, prop) {
                return Object.getOwnPropertyDescriptor(target._data, prop);
            }
        });
    }

    toJSON() {
        return this._data;
    }
}

class FileLoaderDict {
    constructor(filePath, logger = null) {
        this.path = filePath;
        this.logger = logger;

        try {
            if (fs.existsSync(this.path)) {
                const content = fs.readFileSync(this.path, 'utf-8');
                const loadedData = JSON.parse(content);
                this.data = new ObservableDict(loadedData, () => this.save());
            } else {
                this.data = new ObservableDict({}, () => this.save());
                if (this.logger) {
                    this.logger(`File ${this.path} not found. Creating new file with default data.`);
                }
            }
        } catch (e) {
            this.data = new ObservableDict({}, () => this.save());
            if (this.logger) {
                this.logger(`Error loading data from ${this.path}: ${e.message}`);
            }
        }
    }

    save() {
        try {
            const dataToSave = this.data instanceof ObservableDict ? this.data.toJSON() : this.data;
            fs.writeFileSync(this.path, JSON.stringify(dataToSave, null, 4), 'utf-8');
        } catch (e) {
            if (this.logger) {
                this.logger(`Error saving data to ${this.path}: ${e.message}`);
            }
        }
    }
}

class FileLoader {
    constructor(filePath, defaultSetupData = () => '', logger = null) {
        this.path = filePath;
        this._data = null;
        this.logger = logger;

        try {
            if (fs.existsSync(this.path)) {
                this._data = fs.readFileSync(this.path, 'utf-8');
            } else {
                this._data = defaultSetupData();
                if (this.logger) {
                    this.logger(`File ${this.path} not found. Creating new file with default data.`);
                }
            }
        } catch (e) {
            if (this.logger) {
                this.logger(`Error loading data from ${this.path}: ${e.message}`);
            }
        }
    }

    get data() {
        return this._data;
    }

    set data(value) {
        this._data = value;
        this.save();
    }

    save() {
        fs.writeFileSync(this.path, JSON.stringify(this._data, null, 4), 'utf-8');
    }
}

class renderTemplateError extends Error {
    constructor(e) {
        switch (e) {
            case "2script":
                super("页面只能包含一个 <script> 标签!!!!!");
                break;
            case "routeError":
                super("路由参数设置错误!!!!!");
                break;
            default:
                super(`${e}? 哪个傻逼在这乱传参数?!!`);
                break;
        }
        this.name = 'renderTemplateError';
    }
}

// Extract scripts from HTML (deprecated functionality)
function extract_scripts_from_html(html_content) {
    let scripts = '';

    const scriptPattern = /<script>(.*?)<\/script>/gis;
    const matches = [...html_content.matchAll(scriptPattern)];

    if (matches.length > 0) {
        if (matches.length > 1) {
            throw new renderTemplateError("2script");
        }
        scripts = matches[0][1];
    }

    const htmlWithoutScripts = html_content.replace(scriptPattern, '');

    return { html: htmlWithoutScripts, scripts: scripts };
}

class contextCache {
    constructor(logger = null, debug = false) {
        this.logger = logger;
        this.cache = {};
        this.debug = debug;
    }

    read(filePath) {
        const pathStr = String(filePath);

        if (!this.debug && pathStr in this.cache) {
            return { success: true, data: this.cache[pathStr] };
        }

        try {
            if (pathStr.endsWith('.json')) {
                const content = fs.readFileSync(filePath, 'utf-8');
                const data = JSON.parse(content);
                this.cache[pathStr] = data;
                return { success: true, data: data };
            }/*else if(_is_page_html_file(filePath)) {
                const htmlContent = fs.readFileSync(filePath, 'utf-8');
                this.cache[pathStr] = htmlContent;
                return { success: true, data: htmlContent };
            }*/else {
                const htmlContent = fs.readFileSync(filePath, 'utf-8');
                this.cache[pathStr] = htmlContent;
                return { success: true, data: htmlContent };
            }
        } catch (e) {
            if (e.code === 'ENOENT') {
                if (this.logger) {
                    this.logger(`File ${filePath} not found. 没有找到${filePath}`);
                }
                return { success: false, error: 'File not found', data: '<h1>404 not found</h1>' };
            } else if (e instanceof SyntaxError) {
                if (this.logger) {
                    this.logger(`Invalid JSON in file ${filePath}. JSON 格式错误`);
                }
                return { success: false, error: 'Invalid JSON', data: {} };
            } else {
                if (this.logger) {
                    this.logger(`Error reading file ${filePath}: ${e.message}`);
                }
                return { success: false, error: e.message, data: '' };
            }
        }
    }

    _is_page_html_file(filePath) {
        const pathStr = String(filePath);
        return pathStr.includes('pages') && !pathStr.includes('templates') && pathStr.endsWith('.html');
    }
}

function countOccurrences(str, substring) {
    return str.split(substring).length - 1;
}

function renderTemplate(html, pageParamsMap, logger = null) { 
    const matches = [...html.matchAll(/\{(\w+)\}(.*?)\{\/\1\}/gs)];
    matches.forEach(element => {
        const [_, paramName, paramValue] = element;
        if(paramName in pageParamsMap) {
            if(countOccurrences(html, element[0]) > 1) {
                if(logger) logger(`页面参数 ${paramName} 重复`);
                return html;
            }
            html = html.replace(element[0], pageParamsMap[paramName]);
        } else {
            html = html.replace(element[0], paramValue);
        }
    });
    return html;
}

function createPage(url, title = 'New Page') {
    if (url.startsWith('/')) url = url.substring(1);

    const pagesPath = path.join('pages');
    const dirPath = path.resolve(pagesPath, url);
    const urlSafe = url.replace(/\//g, '_');

    const htmlFilePath = path.join(dirPath, `${urlSafe}.html`);
    const jsonFilePath = path.join(dirPath, `${urlSafe}.json`);

    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }

    const htmlContent = `
    <div class="text-center">
    <h1>${title}</h1>
    <a href="/home">home</a>

    <script>
        console.log("页面 ${title} 已加载");
    </script>

    </div>`;

    fs.writeFileSync(htmlFilePath, htmlContent, 'utf-8');

    const jsonContent = { title: title };
    fs.writeFileSync(jsonFilePath, JSON.stringify(jsonContent, null, 4), 'utf-8');

    console.log(`创建成功，目录：${dirPath}`);
}

export default {
    ObservableDict,
    FileLoaderDict,
    FileLoader,
    renderTemplateError,
    extract_scripts_from_html,
    contextCache,
    createPage,
    renderTemplate
};