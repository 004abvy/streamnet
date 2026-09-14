import os
import re
from pathlib import Path

source_dir = Path("C:/Users/abdul/OneDrive/Desktop/rive/rive")
output_dir = Path("C:/Users/abdul/OneDrive/Desktop/rive/ExtractedOutput")

all_hls = set()
all_iframes = set()

hls_pattern = re.compile(r'(https?://[^\s"\'<>]+\.(?:m3u8|ts|mp4)[^\s"\'<>]*)', re.IGNORECASE)
iframe_pattern = re.compile(r'<iframe[^>]+src=["\'](.*?)["\']', re.IGNORECASE)

# Additional pattern for escaped JSON strings often found in JS/Next.js
json_hls_pattern = re.compile(r'(https?:\/\/[^\s"\'<>]+\.(?:m3u8|ts|mp4)[^\s"\'<>]*)', re.IGNORECASE)
escaped_hls_pattern = re.compile(r'(https?:\\/\\/[^\s"\'<>]+\.(?:m3u8|ts|mp4)[^\s"\'<>]*)', re.IGNORECASE)

for root, _, files in os.walk(source_dir):
    for file in files:
        if file.endswith('.js') or file.endswith('.json') or file.endswith('.html'):
            file_path = Path(root) / file
            try:
                with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()

                    # Direct match
                    hls_urls = hls_pattern.findall(content)
                    json_urls = json_hls_pattern.findall(content)
                    escaped_urls = escaped_hls_pattern.findall(content)

                    iframes = iframe_pattern.findall(content)

                    all_hls.update(hls_urls)
                    all_hls.update(json_urls)

                    # Unescape escaped URLs (https:\/\/ -> https://)
                    for url in escaped_urls:
                        all_hls.add(url.replace('\\/', '/'))

                    all_iframes.update(iframes)
            except:
                pass

def write_set(filename, data_set):
    file_path = output_dir / filename
    with open(file_path, 'w', encoding='utf-8') as f:
        for item in sorted(data_set):
            if item.strip() and not item.startswith('#'):
                f.write(item + '\n')

write_set('separated_video_streams_from_js.txt', all_hls)
write_set('separated_iframes_from_js.txt', all_iframes)

print(f"Extraction from JS complete. Found {len(all_hls)} media streams and {len(all_iframes)} iframes.")
