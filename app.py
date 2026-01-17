from flask import Flask, jsonify, render_template, request, send_from_directory, redirect
import os
import json
from datetime import datetime
from pathlib import Path


app = Flask(__name__, template_folder='templates', static_folder='static')

app.config['pagesDataPath'] = os.path.join(app.root_path, 'pages')


import logging
from logging.handlers import RotatingFileHandler

class InfoFilter(logging.Filter):
    def filter(self, record):
        return record.levelno == logging.INFO

class WarningFilter(logging.Filter):
    def filter(self, record):
        return record.levelno == logging.WARNING

class ErrorFilter(logging.Filter):
    def filter(self, record):
        return record.levelno >= logging.ERROR

def setup_logging():
    if not os.path.exists('logs'):
        os.makedirs('logs')
    
    # 清除现有处理器
    for handler in app.logger.handlers[:]:
        app.logger.removeHandler(handler)
    
    # info.log 处理器
    info_handler = RotatingFileHandler('logs/info.log', maxBytes=1024*1024*15, backupCount=10)
    info_handler.setLevel(logging.INFO)
    info_handler.addFilter(InfoFilter())
    info_formatter = logging.Formatter('[%(asctime)s] INFO: %(message)s')
    info_handler.setFormatter(info_formatter)
    
    # wrong.log 处理器
    wrong_handler = RotatingFileHandler('logs/wrong.log', maxBytes=1024*1024*15, backupCount=10)
    wrong_handler.setLevel(logging.WARNING)
    wrong_handler.addFilter(WarningFilter())
    wrong_formatter = logging.Formatter('[%(asctime)s] %(levelname)s: %(message)s [%(pathname)s:%(lineno)d]')
    wrong_handler.setFormatter(wrong_formatter)
    
    # error.log 处理器
    error_handler = RotatingFileHandler('logs/error.log', maxBytes=1024*1024*15, backupCount=10)
    error_handler.setLevel(logging.ERROR)
    error_handler.addFilter(ErrorFilter())
    error_formatter = logging.Formatter('[%(asctime)s] %(levelname)s: %(message)s [%(pathname)s:%(lineno)d]')
    error_handler.setFormatter(error_formatter)
    
    app.logger.addHandler(info_handler)
    app.logger.addHandler(wrong_handler)
    app.logger.addHandler(error_handler)
    app.logger.setLevel(logging.INFO)



from tool import *



pages = contextCache(logger=app.logger.warning, debug=True)

@app.route('/js/<filename>', methods=['GET'])
def js(filename):
    return send_from_directory('static/js', filename)

@app.route('/css/<filename>', methods=['GET'])
def css(filename):
    return send_from_directory('static/css', filename)

@app.route('/img/<filename>', methods=['GET'])
def img(filename):
    return send_from_directory('data/img', filename)
@app.route('/favicon.ico', methods=['GET'])
def favicon():
    return send_from_directory('data/img', 'favicon.ico')

@app.route('/config.js', methods=['GET'])
def config():
    return send_from_directory('.', "config.js")

@app.route('/frame.js', methods=['GET'])
def framejs():
    return send_from_directory('static', 'frame.js')

@app.route('/', defaults={'url': ''}, methods=['GET'])
@app.route('/<path:url>', methods=['GET'])
def main(url):
    return send_from_directory('.', "index.html")

@app.route('/api/pages/<path:url>', methods=['POST'])
def pagesapi(url):
    try:
        if url[0] == '/': url = url[1:]

        pages_path = Path(app.config['pagesDataPath'])
        requested_path = (pages_path / url).resolve()

        if not str(requested_path).startswith(str(pages_path)):
            return jsonify({'success': False, 'error': 'Invalid path', "data":{'page':'400 Bad Request'}}), 400
            
        html_file_path = requested_path / f'{url.replace("/", "_")}.html'
        json_file_path = requested_path / f'{url.replace("/", "_")}.json'


        _htmlFile = pages.read(html_file_path)
        _config = pages.read(json_file_path)
        
        if not _htmlFile['success']:
            _404page = pages.read(os.path.join(app.config['pagesDataPath'], 'error', '404', 'error_404.html'))["data"]

            return jsonify({'success': False, 'error': _htmlFile['error'], "data":{'page': _404page}}), 404

        if _config['success']:
            config = _config['data']
        else:
            config = {}

        # 检查是否返回了包含脚本的数据结构
        page_data = _htmlFile['data']
        if isinstance(page_data, dict) and 'html' in page_data:
            # 包含脚本的数据结构
            page_html = page_data['html']

            #html_script = page_data['scripts'] #废弃

        else:
            # 传统数据结构
            page_html = page_data


        return jsonify({'success': True, 'data':{'page': page_html, 'config': config}})
    
    except Exception as e:
        logging.error(f"Error: {e}")
        _500data = pages.read(os.path.join(app.config['pagesDataPath'], 'error', '500', 'error_500.html'))["data"]

        return jsonify({'success': False, 'error': '500', "data":{'page': _500data}}), 500





@app.route('/api/navigation', methods=['POST'])
def navigation():
    return jsonify({
        'success': True,
        'data':{
            'nav': pages.read(os.path.join('templates', 'nav.html'))['data'],
            'menu': pages.read(os.path.join('templates', 'menu.html'))['data']
        }
    })


@app.after_request
def after_request(response):
    if response.status_code >= 500:
        app.logger.error(f"{request.method} {request.url} {response.status_code}")
    elif response.status_code >= 400:
        app.logger.warning(f"{request.method} {request.url} {response.status_code}")
    else:
        app.logger.info(f"{request.method} {request.url} {response.status_code}")
    return response

if __name__ == '__main__':
    app.logger.handlers.clear()
    setup_logging()

    app.run(debug=False, host='0.0.0.0')
