const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');
const fs = require('fs');
const winston = require('winston');
require('winston-daily-rotate-file');
const tool = require('./tool');

const app = express();
app.use(express.json());

const pagesDataPath = path.join(__dirname, 'pages');

// Winston logging setup
const logDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

const serverConfig = require('./server-config');



const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message }) => {
            // 使用内置 Intl 转换为北京时间
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
            return `[SH ${shTime} UTC ${timestamp}] ${level}: ${message}`;
        })
    ),
    transports: [
        new winston.transports.DailyRotateFile({
            filename: path.join(logDir, 'info-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            maxSize: '15m',
            maxFiles: '10d',
            level: 'info'
        }),
        new winston.transports.DailyRotateFile({
            filename: path.join(logDir, 'wrong-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            maxSize: '15m',
            maxFiles: '10d',
            level: 'warning'
        }),
        new winston.transports.DailyRotateFile({
            filename: path.join(logDir, 'error-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            maxSize: '15m',
            maxFiles: '10d',
            level: 'error'
        })
    ]
});

logger.info(`---------------------------------------------------`)
logger.info(`Server started at ${new Date().toLocaleString()}`);


const pages = new tool.contextCache((msg) => logger.warning(msg), true);

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

// Main route - serve index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// API: Get page content
app.post('/api/pages/*', (req, res) => {
    try {
        let url = req.params[0];
        if (url.startsWith('/')) url = url.substring(1);

        const pagesPath = path.resolve(pagesDataPath);
        const requestedPath = path.resolve(pagesPath, url);

        // Security check
        if (!requestedPath.startsWith(pagesPath)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid path',
                data: { page: '400 Bad Request' }
            });
        }

        const urlSafe = url.replace(/\//g, '_');
        const htmlFilePath = path.join(requestedPath, `${urlSafe}.html`);
        const jsonFilePath = path.join(requestedPath, `${urlSafe}.json`);

        const _htmlFile = pages.read(htmlFilePath);
        const _config = pages.read(jsonFilePath);

        if (!_htmlFile.success) {
            const _404page = pages.read(path.join(__dirname, 'pages', 'error', '404', 'error_404.html')).data;
            return res.status(404).json({
                success: false,
                error: _htmlFile.error,
                data: { page: _404page }
            });
        }

        const config = _config.success ? _config.data : {};
        const page_data = _htmlFile.data;
        let page_html;

        if (typeof page_data === 'object' && page_data.html !== undefined) {
            page_html = page_data.html;
        } else {
            page_html = page_data;
        }

        res.json({
            success: true,
            data: { page: page_html, config: config }
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

// API: Get navigation
app.post('/api/navigation', (req, res) => {
    res.json({
        success: true,
        data: {
            nav: pages.read(path.join(__dirname, 'templates', 'nav.html')).data,
            menu: pages.read(path.join(__dirname, 'templates', 'menu.html')).data
        }
    });
});

app.use('/api', (req, res, next) => {
    // 检查是否是需要特殊处理的路径
    if (req.path.startsWith('/api/pages') || req.path === '/api/navigation') {
        // 如果是已有的 API 路径，跳过代理，继续执行后续路由
        next();
    } else {
        // 否则代理到指定域
        const proxy = createProxyMiddleware({
            target: process.env.BACKEND_URL || 'http://localhost:3000', // 替换为目标域名
            changeOrigin: true,
            pathRewrite: {
                '^/api': '', // 移除 /api 前缀
            },
            onProxyReq: (proxyReq, req, res) => {
                console.log(`Proxying ${req.method} ${req.url} to ${proxyReq.path}`);
            },
            onError: (err, req, res) => {
                console.error(`Proxy error for ${req.url}:`, err);
                res.status(500).json({
                    success: false,
                    error: 'Proxy error',
                    data: { page: '500 Proxy Error' }
                });
            }
        });
        
        proxy(req, res, next);
    }
});

// Request logging middleware
app.use((req, res, next) => {
    const originalSend = res.send;
    res.send = function(data) {
        if (res.statusCode >= 500) {
            logger.error(`${req.method} ${req.url} ${res.statusCode}`);
        } else if (res.statusCode >= 400) {
            logger.warning(`${req.method} ${req.url} ${res.statusCode}`);
        } else {
            logger.info(`${req.method} ${req.url} ${res.statusCode}`);
        }
        originalSend.call(this, data);
    };
    next();
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
});