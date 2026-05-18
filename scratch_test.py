import urllib.request
import re

url = 'https://agent-6a0aac735f02e4d7b929b795--atomberg1111.netlify.app'
try:
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
    html = urllib.request.urlopen(req).read().decode('utf-8')
    js_files = re.findall(r'href="(/assets/.*?\.js)"', html)
    print("Found JS files:", js_files)
    
    for f in js_files:
        js_url = url + f
        # print(f"Checking {js_url}")
        req = urllib.request.Request(js_url, headers={'User-Agent': 'Mozilla/5.0'})
        js_content = urllib.request.urlopen(req).read().decode('utf-8')
        
        urls = re.findall(r'https?://[^\s"\'`\}]+', js_content)
        api_urls = set([u for u in urls if 'localhost' in u or '127.0.0.1' in u or 'render' in u or 'heroku' in u or 'pythonanywhere' in u])
        if api_urls:
            print(f"API URLs found in {f}:", api_urls)
except Exception as e:
    print("Error:", e)
