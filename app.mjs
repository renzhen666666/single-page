import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import path from 'path';
import fs from 'fs';
import winston from 'winston';
import 'winston-daily-rotate-file';
import tool from './tool.mjs';
import dotenv from 'dotenv';


import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(express.json());


dotenv.config({ path: './.env' });

const pagesDataPath = path.join(__dirname, 'pages');

const logDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}


const infoTransport = new winston.transports.DailyRotateFile({
    filename: path.join(logDir, 'info-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxSize: '15m',
    maxFiles: '10d',
    level: 'info'
});

const warnTransport = new winston.transports.DailyRotateFile({
    filename: path.join(logDir, 'wrong-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxSize: '15m',
    maxFiles: '10d',
    level: 'warn'  // 关键：设置为最低级别 'warn'
});

const errorTransport = new winston.transports.DailyRotateFile({
    filename: path.join(logDir, 'error-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxSize: '15m',
    maxFiles: '10d',
    level: 'error'
});

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message }) => {
            const date = new Date(timestamp);
            const shTime = date.toLocaleString('zh-CN', { 
                timeZone: 'Asia/Shanghai',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
            });
            return `[SH ${shTime} UTC ${timestamp}] ${message}`;
        })
    ),
    transports: [
        infoTransport,
        warnTransport,
        errorTransport
    ]
});


logger.info(`-----------Server starting-----------`)
logger.warn(`-----------Server starting-----------`)
logger.error(`-----------Server starting-----------`)


const pages = new tool.contextCache((msg) => logger.warn(msg), true);


app.all('*', (req, res, next) => {
    logger.info(`${req.method} ${req.url}`);
    next();
});

// Static file routes
app.get('/js/:filename', (req, res) => {
    res.sendFile(path.join(__dirname, 'static', 'js', req.params.filename));
});

app.get('/css/:filename', (req, res) => {
    res.sendFile(path.join(__dirname, 'static', 'css', req.params.filename));
});

app.get('/img/:filename', (req, res) => {
    res.sendFile(path.join(__dirname, 'data', 'img', req.params.filename));
});

app.get('/favicon.ico', (req, res) => {
    res.sendFile(path.join(__dirname, 'data', 'img', 'favicon.ico'));
});

app.get('/config.js', (req, res) => {
    res.sendFile(path.join(__dirname, 'config.js'));
});

app.get('/frame.js', (req, res) => {
    res.sendFile(path.join(__dirname, 'static', 'frame.js'));
});


// API: Get page content
app.post('/api/pages/*', (req, res) => {
    try {
        let url = req.params[0];
        if (url.startsWith('/')) url = url.substring(1);

        

        let requestedPath;
        
        requestedPath = path.resolve(pagesDataPath, url);
        

        // Security check
        if (!requestedPath.startsWith(pagesDataPath)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid path',
                data: { page: '400 Bad Request' }
            });
        }

        const urlSafe = url.replace(/\//g, '_');
        const htmlFilePath = path.join(requestedPath, `${urlSafe}.html`);

        const _htmlFile = pages.read(htmlFilePath);

        if (!_htmlFile.success) {
            const _404page = pages.read(path.join(__dirname, 'pages', 'error', '404', 'error_404.html')).data;
            return res.status(404).json({
                success: false,
                error: _htmlFile.error,
                data: { page: _404page }
            });
        }

        const page_data = _htmlFile.data;
        let page_html;

        if (typeof page_data === 'object' && page_data.html !== undefined) {
            page_html = page_data.html;
        } else {
            page_html = page_data;
        }


        res.json({
            success: true,
            data: { page: page_html}
        });
    } catch (e) {
        logger.error(`Error: ${e}`);
        const _500data = pages.read(path.join(__dirname, 'pages', 'error', '500', 'error_500.html')).data;
        res.status(500).json({
            success: false,
            error: '500',
            data: { page: _500data }
        });
    }
});

app.get('/api/pages/*', (req, res) => {
    let url = req.params[0];
    if (url.endsWith('.js')) {
        url = url.substring(0, url.length - 3);

        const requestPath = path.resolve(pagesDataPath, url);
        const jsFilePath = path.join(requestPath, `${url.replace(/\//g, '_')}.js`);
        

        if(jsFilePath.startsWith(pagesDataPath)) {
            if(fs.existsSync(jsFilePath)) {
                res.sendFile(jsFilePath);
            } else {
                res.status(404).json({
                    success: false,
                    error: 'JS file not found',
                    data: { page: '404 Not Found' }
                });
            }
        } else {
            res.status(400).json({
                success: false,
                error: 'Invalid path',
                data: { page: '400 Bad Request' }
            });
        }
    } else {
        res.status(404).json({
            success: false,
            error: '404 Not Found',
            data: { page: '404 Not Found' }
        });
    }

});

app.post('/api/template/*', (req, res) => {
    let template = req.params[0];
    const dataPath = path.join(__dirname, 'templates', template);
    if(dataPath.startsWith(path.join(__dirname, 'templates'))) {
        const data = pages.read(dataPath);

        if(data.success) {
            res.json({ success: true, data: data.data });
        } else {
            res.status(404).json({ success: false, error: 'Template not found' });
        }
    } else {
        res.status(400).json({ success: false, error: 'Invalid path' });
    }
    
});


app.use('/api', (req, res, next) => {
    /*
    // 检查是否是需要特殊处理的路径
    if (req.path.startsWith('/api/pages') || req.path === '/api/navigation') {
        // 如果是已有的 API 路径，跳过代理，继续执行后续路由
        next();
    } else {
        // 否则代理到指定域
    */
    const proxy = createProxyMiddleware({
        target: process.env.BACKEND_URL || 'http://localhost:3000', // 替换为目标域名
        changeOrigin: true,
        pathRewrite: {
            '^/api': '', // 移除 /api 前缀
        },
        onProxyReq: (proxyReq, req, res) => {
            logger.info(`Proxying ${req.method} ${req.url} to ${proxyReq.path}`);
        },
        onError: (err, req, res) => {
            logger.error(`Proxy error for ${req.url}:`, err);
            res.status(500).json({
                success: false,
                error: 'Proxy error',
                data: { page: '500 Proxy Error' }
            });
        }
    });
    
    proxy(req, res, next);
    // }
});

// Request logging middleware
app.use((req, res, next) => {
    const originalSend = res.send;
    res.send = function(data) {
        if (res.statusCode >= 500) {
            logger.error(`${req.method} ${req.url} ${res.statusCode}`);
        } else if (res.statusCode >= 400) {
            logger.warn(`${req.method} ${req.url} ${res.statusCode}`);
        } else {
            logger.info(`${req.method} ${req.url} ${res.statusCode}`);
        }
        originalSend.call(this, data);
    };
    next();
});

// Main route - serve index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, '127.0.0.1', () => {
    console.log(`Server running on http://localhost:${PORT}`);
});