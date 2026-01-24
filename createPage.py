import argparse
import os
import json
from datetime import datetime
from pathlib import Path



parser = argparse.ArgumentParser(description='创建页面')

parser.add_argument('u', help='URL目录')
parser.add_argument('n', help='标题')


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
    

args = parser.parse_args()

createPage(args.u, args.n)
