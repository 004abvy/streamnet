import asyncio
import os
import re
from pathlib import Path
from playwright.async_api import async_playwright

source_dir = Path("C:/Users/abdul/OneDrive/Desktop/rive/rive")
output_dir = Path("C:/Users/abdul/OneDrive/Desktop/rive/ExtractedOutput")

all_iframes = set()
all_embeds = set()
all_hls = set()

# Regular expressions
iframe_pattern = re.compile(r'<iframe[^>]+src=["\'](.*?)["\']', re.IGNORECASE)
embed_pattern = re.compile(r'<embed[^>]+src=["\'](.*?)["\']', re.IGNORECASE)
object_pattern = re.compile(r'<object[^>]+data=["\'](.*?)["\']', re.IGNORECASE)
hls_pattern = re.compile(r'(https?://[^\s"\'<>]+\.(?:m3u8|ts|mp4)[^\s"\'<>]*)', re.IGNORECASE)

async def extract_from_file(page, file_path):
    file_url = f"file:///{file_path.resolve()}".replace("\\", "/")
    print(f"Processing: {file_url}")
    try:
        # Load the file locally
        await page.goto(file_url, wait_until='networkidle', timeout=10000)

        # Wait a bit for any dynamic scripts to load
        await page.wait_for_timeout(2000)

        # Get fully rendered HTML
        content = await page.content()

        # Extract using Regex
        iframes = iframe_pattern.findall(content)
        embeds = embed_pattern.findall(content)
        objects = object_pattern.findall(content)
        hls_urls = hls_pattern.findall(content)

        all_iframes.update([i for i in iframes if i and not i.startswith('#')])
        all_embeds.update([e for e in (embeds + objects) if e and not e.startswith('#')])
        all_hls.update([h for h in hls_urls if h])

        # Also extract any video tags
        video_sources = await page.evaluate('''() => {
            const sources = Array.from(document.querySelectorAll('video source')).map(s => s.src);
            const videos = Array.from(document.querySelectorAll('video')).map(v => v.src);
            return [...sources, ...videos].filter(s => s && s.trim() !== '');
        }''')

        for src in video_sources:
            if src.endswith(('.m3u8', '.ts', '.mp4')):
                all_hls.add(src)

    except Exception as e:
        print(f"Error processing {file_path.name}: {e}")

async def main():
    async with async_playwright() as p:
        # Launch browser
        browser = await p.chromium.launch(headless=True)

        # Intercept network requests to catch API responses with streams
        async def handle_response(response):
            if response.url.endswith(('.m3u8', '.ts', '.mp4')):
                all_hls.add(response.url)

        context = await browser.new_context()
        page = await context.new_page()
        page.on("response", handle_response)

        # Process files
        for root, _, files in os.walk(source_dir):
            for file in files:
                if file.lower().endswith(('.html', '.htm')):
                    file_path = Path(root) / file
                    # We might skip Next.js skeleton pages if they don't load locally well,
                    # but let's try opening all of them.
                    await extract_from_file(page, file_path)

        await browser.close()

        # Write to files
        def write_set(filename, data_set):
            file_path = output_dir / filename
            with open(file_path, 'w', encoding='utf-8') as f:
                for item in sorted(data_set):
                    if item.strip():
                        f.write(item + '\n')

        write_set('separated_iframes.txt', all_iframes)
        write_set('separated_embeds_and_objects.txt', all_embeds)
        write_set('separated_video_streams.txt', all_hls)

        print(f"Extraction complete.")
        print(f"Found {len(all_iframes)} iframes, {len(all_embeds)} embeds, and {len(all_hls)} video streams.")

if __name__ == "__main__":
    asyncio.run(main())
