import json
import os
import re
from pathlib import Path


class ObservableDict(dict):
    def __init__(self, data, callback):
        super().__init__(data)
        self.callback = callback

    def __setitem__(self, key, value):
        super().__setitem__(key, value)
        self.callback()

    def __delitem__(self, key):
        super().__delitem__(key)
        self.callback()

class FileLoaderDict:
    def __init__(self, path, logger=None):
        self.path = path
        self.logger = logger
        try:
            with open(self.path, 'r', encoding='utf-8') as f:
                loaded_data = json.loads(f)
                self.data = ObservableDict(loaded_data, self.save)

        except (FileNotFoundError, json.JSONDecodeError):
            self.data = ObservableDict(dict(), self.save)
            if self.logger:
                self.logger(f"File {self.path} not found. Creating new file with default data.")

        except Exception as e:
            if self.logger:
                self.logger(f"Error loading data from {self.path}: {e}")

    def save(self):
        try:
            with open(self.path, 'w', encoding='utf-8') as f:
                json.dump(dict(self.data), f, ensure_ascii=False, indent=4)
        except Exception as e:
            if self.logger:
                self.logger(f"Error saving data to {self.path}: {e}")


class FileLoader:
    def __init__(self, path, default_setup_data=str, logger=None):
        self.path = path
        self._data = None
        self.logger = logger
        try:
            with open(self.path, 'r', encoding='utf-8') as f:
                self._data = f.read()
        
        except (FileNotFoundError):
            self._data = default_setup_data()
            if self.logger:
                self.logger(f"File {self.path} not found. Creating new file with default data.")

        except Exception as e:
            if self.logger:
                self.logger(f"Error loading data from {self.path}: {e}")

    @property
    def data(self):
        return self._data
    
    @data.setter
    def data(self, value):
        self._data = value
        self.save()

    def save(self):
        with open(self.path, 'w', encoding='utf-8') as f:
            json.dump(self._data, f, ensure_ascii=False, indent=4)

    

class renderTemplateError(Exception):
    def __init__(self, e:str):
        match e:

            case "2script":
                super().__init__("页面只能包含一个 <script> 标签!!!!!")
        
            case _:
                super().__init__(f"{e}? 哪个傻逼在这乱传参数?!!")


######     ↓已废弃
def extract_scripts_from_html(html_content):
    """
    从HTML内容中提取特定类型的script标签内容
    支持提取 <script> 标签的内容以及注释标记的内容
    """
    scripts = str()
    
    # 正则表达式匹配 <script type="text/page-script"> 标签
    script_pattern = r'<script>(.*?)</script>'
    type_script_matches = re.findall(script_pattern, html_content, re.DOTALL | re.IGNORECASE)
    
    if(type_script_matches):
        if(len(type_script_matches)>1):
            raise renderTemplateError("2script")
        scripts = type_script_matches[0]


    """
    # 同时匹配在 <!-- PAGE_SCRIPT:START --> 和 <!-- PAGE_SCRIPT:END --> 之间的内容（可能包含script标签）
    comment_pattern = r'<!--\s*PAGE_SCRIPT:START\s*-->(.*?)<!--\s*PAGE_SCRIPT:END\s*-->'
    comment_matches = re.findall(comment_pattern, html_content, re.DOTALL)
    
    # 对于注释标记的内容，如果包含script标签，需要提取script内部的内容
    for match in comment_matches:
        # 检查匹配的内容是否包含script标签
        if '<script' in match and '</script>' in match:
            # 提取script标签内的内容
            inner_script_pattern = r'<script[^>]*>(.*?)</script>'
            inner_matches = re.findall(inner_script_pattern, match, re.DOTALL | re.IGNORECASE)
            scripts.extend(inner_matches)
        else:
            # 如果没有script标签，直接添加内容
            scripts.extend([match])

    html_without_scripts = re.sub(comment_pattern, '', html_without_scripts, flags=re.DOTALL)
    
    """
    # 从HTML中移除这些script标签和注释标记
    html_without_scripts = re.sub(script_pattern, '', html_content, flags=re.DOTALL | re.IGNORECASE)
    
    return html_without_scripts, scripts
#########



class contextCache:
    def __init__(self, logger=None, debug=False):
        self.logger = logger
        self.cache = dict()
        self.debug = debug

    def read(self, path):
        if(not self.debug) and (path in self.cache):
            return {'success':True, 'data':self.cache[path]}
        
        try:
            if(str(path).endswith('.json')):
                with open(path, 'r', encoding='utf-8') as f:
                    self.cache[path] = json.loads(f.read())
                    return {'success':True, 'data':self.cache[path]}
            else:
                with open(path, 'r', encoding='utf-8') as f:
                    html_content = f.read()
                    
                    """
                    # 如果是页面HTML文件，提取其中的脚本内容
                    if self._is_page_html_file(path):
                        html_without_scripts, scripts = extract_scripts_from_html(html_content)

                        result_data = {
                            'html': html_without_scripts,
                            'scripts': scripts
                        }
                        
                        self.cache[path] = result_data
                        return {'success':True, 'data':self.cache[path]}
                    else:
                        self.cache[path] = html_content
                        return {'success':True, 'data':self.cache[path]}
                    
                    """

                    self.cache[path] = html_content
                    return {'success':True, 'data':self.cache[path]}



        except (FileNotFoundError):
            self.logger(f"File {path} not found. 没有找到{path}")
            return {'success':False, 'error':'File not found', 'data': "<h1>404 not found</h1>"}

        except json.JSONDecodeError:
            self.logger(f"Invalid JSON in file {path}. JSON 格式错误")
            return {'success':False, 'error':'Invalid JSON', 'data': {}}

    def _is_page_html_file(self, path):
        """判断是否是页面HTML文件（而非模板文件）"""
        # 检查路径是否在pages目录下，且不是在templates目录下
        path_str = str(path)
        return 'pages' in path_str and 'templates' not in path_str and path_str.endswith('.html')


def createPage(url, title="New Page") -> None:
    if url[0] == '/': url = url[1:]

    pages_path = Path("pages")
    path = (pages_path / url).resolve()



    html_file_path = path / f'{url.replace("/", "_")}.html'
    json_file_path = path / f'{url.replace("/", "_")}.json'


    os.makedirs(path, exist_ok=True)

    with open(html_file_path, 'w', encoding='utf-8') as f:
        f.write(f'''
    <div class="text-center">
    <h1>{title}</h1>
    <a href="/home">home</a>
    <a href="/p1">p1</a>
    <a href="/p2">p2</a>
    <a href="/p3">p3</a>
    <!-- PAGE_SCRIPT:START -->
        <script>
            console.log("页面 {title} 已加载");
        </script>
    <!-- PAGE_SCRIPT:END -->
    </div>'''
    )

    with open(json_file_path, 'w', encoding='utf-8') as f:
        json.dump({"title": title}, f, ensure_ascii=False, indent=4)

    print(f"创建成功，目录：{path}")
    