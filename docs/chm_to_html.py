#!/usr/bin/env python3
"""
CHM to HTML Converter

Extracts a CHM (Compiled HTML Help) file into a clean folder structure
with HTML documents organized by the original hierarchy.

Usage:
    python chm_to_html.py input.chm [output_folder]

Requirements:
    - 7-zip (7z command) for extraction
"""

import argparse
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path
from urllib.parse import unquote

try:
    from bs4 import BeautifulSoup
except ImportError:
    print("Installing required packages...")
    subprocess.run([sys.executable, "-m", "pip", "install", 
                    "beautifulsoup4", "--break-system-packages", "-q"])
    from bs4 import BeautifulSoup


class CHMToHTMLConverter:
    """Extracts and cleans CHM files to HTML folder structure."""
    
    def __init__(self, chm_path: str, output_dir: str = None,
                 clean_html: bool = True, verbose: bool = True):
        self.chm_path = Path(chm_path).resolve()
        self.output_dir = Path(output_dir) if output_dir else self.chm_path.with_suffix('')
        self.clean_html = clean_html
        self.verbose = verbose
        self.stats = {"extracted": 0, "cleaned": 0, "skipped": 0, "errors": 0}
    
    def log(self, message: str):
        """Print message if verbose mode is enabled."""
        if self.verbose:
            print(message)
    
    def extract_chm(self) -> bool:
        """Extract CHM file using 7-zip."""
        if not self.chm_path.exists():
            print(f"Error: CHM file not found: {self.chm_path}")
            return False
        
        self.log(f"Extracting: {self.chm_path}")
        self.output_dir.mkdir(parents=True, exist_ok=True)
        
        # Try 7z first, then 7za, then 7zr
        for cmd in ['7z', '7za', '7zr']:
            try:
                result = subprocess.run(
                    [cmd, 'x', '-y', f'-o{self.output_dir}', str(self.chm_path)],
                    capture_output=True, text=True
                )
                if result.returncode == 0:
                    self.log(f"Extracted to: {self.output_dir}")
                    return True
            except FileNotFoundError:
                continue
        
        print("Error: 7-zip not found. Please install p7zip-full:")
        print("  Ubuntu/Debian: apt-get install p7zip-full")
        print("  macOS: brew install p7zip")
        print("  Windows: Download from https://www.7-zip.org/")
        return False
    
    def clean_html_file(self, html_path: Path) -> bool:
        """Clean up an HTML file - remove scripts, fix encoding, etc."""
        try:
            # Try different encodings
            content = None
            detected_encoding = 'utf-8'
            for encoding in ['utf-8', 'cp1252', 'iso-8859-1', 'gbk']:
                try:
                    content = html_path.read_text(encoding=encoding)
                    detected_encoding = encoding
                    break
                except UnicodeDecodeError:
                    continue
            
            if content is None:
                content = html_path.read_bytes().decode('utf-8', errors='replace')
            
            # Parse HTML
            soup = BeautifulSoup(content, 'html.parser')
            
            # Remove CHM-specific elements that won't work outside CHM
            for element in soup.find_all(['script', 'object']):
                # Keep regular scripts, remove CHM-specific objects
                if element.name == 'object':
                    obj_type = element.get('type', '').lower()
                    if 'hhctrl' in obj_type or 'sitemap' in obj_type:
                        element.decompose()
            
            # Fix or remove CHM-specific links
            for link in soup.find_all('a'):
                href = link.get('href', '')
                # Remove ms-its: protocol links (CHM internal)
                if href.startswith('ms-its:') or href.startswith('mk:@'):
                    # Try to extract the actual file path
                    match = re.search(r'::/?(.+?)(?:#|$)', href)
                    if match:
                        link['href'] = match.group(1)
                    else:
                        link['href'] = '#'
            
            # Ensure proper DOCTYPE and encoding
            if not soup.find('meta', charset=True) and not soup.find('meta', {'http-equiv': 'Content-Type'}):
                if soup.head:
                    meta = soup.new_tag('meta', charset='utf-8')
                    soup.head.insert(0, meta)
            
            # Write cleaned HTML
            html_path.write_text(str(soup), encoding='utf-8')
            return True
            
        except Exception as e:
            self.log(f"  Warning: Could not clean {html_path.name}: {e}")
            return False
    
    def remove_chm_internal_files(self):
        """Remove CHM internal/metadata files that aren't needed."""
        patterns_to_remove = [
            '#*', '$*',  # CHM internal files
            '*.hhc',     # Help contents (TOC data)
            '*.hhk',     # Help index
            '*.hhp',     # Help project
        ]
        
        removed = 0
        for pattern in patterns_to_remove:
            for f in self.output_dir.rglob(pattern):
                try:
                    if f.is_file():
                        f.unlink()
                        removed += 1
                    elif f.is_dir():
                        shutil.rmtree(f)
                        removed += 1
                except Exception as e:
                    self.log(f"  Warning: Could not remove {f}: {e}")
        
        if removed:
            self.log(f"Removed {removed} CHM internal files")
    
    def process_html_files(self):
        """Process all HTML files in the output directory."""
        html_extensions = {'.htm', '.html', '.xhtml'}
        
        html_files = []
        for ext in html_extensions:
            html_files.extend(self.output_dir.rglob(f'*{ext}'))
        
        self.log(f"Found {len(html_files)} HTML files")
        
        for html_path in html_files:
            # Skip files in # or $ directories (CHM internal)
            if any(part.startswith(('#', '$')) for part in html_path.parts):
                self.stats["skipped"] += 1
                continue
            
            self.stats["extracted"] += 1
            
            if self.clean_html:
                if self.clean_html_file(html_path):
                    self.stats["cleaned"] += 1
                    self.log(f"  ✓ Cleaned: {html_path.relative_to(self.output_dir)}")
                else:
                    self.stats["errors"] += 1
    
    def parse_toc(self) -> list:
        """Parse the table of contents (HHC file) if available."""
        hhc_files = list(self.output_dir.rglob('*.hhc'))
        if not hhc_files:
            return []
        
        toc = []
        try:
            content = hhc_files[0].read_text(encoding='utf-8', errors='replace')
            soup = BeautifulSoup(content, 'html.parser')
            
            for obj in soup.find_all('object', type='text/sitemap'):
                name = ''
                local = ''
                for param in obj.find_all('param'):
                    param_name = param.get('name', '').lower()
                    if param_name == 'name':
                        name = param.get('value', '')
                    elif param_name == 'local':
                        local = param.get('value', '')
                
                if name and local:
                    toc.append({'title': name, 'path': local})
        except Exception as e:
            self.log(f"Warning: Could not parse TOC: {e}")
        
        return toc
    
    def create_index_html(self, toc: list):
        """Create an index.html file with table of contents."""
        title = self.chm_path.stem
        
        html_content = f'''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{title}</title>
    <style>
        body {{
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            line-height: 1.6;
            max-width: 900px;
            margin: 0 auto;
            padding: 20px;
            color: #333;
        }}
        h1 {{
            border-bottom: 2px solid #007acc;
            padding-bottom: 10px;
        }}
        h2 {{
            color: #007acc;
            margin-top: 30px;
        }}
        ul {{
            list-style-type: none;
            padding-left: 0;
        }}
        li {{
            margin: 8px 0;
            padding: 8px 12px;
            background: #f5f5f5;
            border-radius: 4px;
            transition: background 0.2s;
        }}
        li:hover {{
            background: #e8e8e8;
        }}
        a {{
            color: #007acc;
            text-decoration: none;
        }}
        a:hover {{
            text-decoration: underline;
        }}
        .file-list {{
            column-count: 2;
            column-gap: 20px;
        }}
        @media (max-width: 600px) {{
            .file-list {{
                column-count: 1;
            }}
        }}
    </style>
</head>
<body>
    <h1>{title}</h1>
'''
        
        if toc:
            html_content += "    <h2>Table of Contents</h2>\n    <ul>\n"
            for item in toc:
                html_content += f'        <li><a href="{item["path"]}">{item["title"]}</a></li>\n'
            html_content += "    </ul>\n"
        else:
            # List all HTML files if no TOC available
            html_content += '    <h2>Documents</h2>\n    <ul class="file-list">\n'
            html_files = sorted(self.output_dir.rglob('*.htm*'))
            for html_file in html_files:
                if html_file.name == 'index.html':
                    continue
                rel_path = html_file.relative_to(self.output_dir)
                # Try to extract title from file
                try:
                    soup = BeautifulSoup(html_file.read_text(encoding='utf-8', errors='replace'), 'html.parser')
                    title_tag = soup.find('title')
                    title = title_tag.string.strip() if title_tag and title_tag.string else html_file.stem
                except:
                    title = html_file.stem
                html_content += f'        <li><a href="{rel_path}">{title}</a></li>\n'
            html_content += "    </ul>\n"
        
        html_content += '''</body>
</html>
'''
        
        index_path = self.output_dir / 'index.html'
        index_path.write_text(html_content, encoding='utf-8')
        self.log(f"Created index: {index_path}")
    
    def convert(self) -> bool:
        """Run the full extraction process."""
        print(f"\n{'='*60}")
        print(f"CHM to HTML Extractor")
        print(f"{'='*60}")
        print(f"Input:  {self.chm_path}")
        print(f"Output: {self.output_dir}")
        print(f"Clean:  {'Yes' if self.clean_html else 'No'}")
        print(f"{'='*60}\n")
        
        # Step 1: Extract CHM
        if not self.extract_chm():
            return False
        
        # Step 2: Parse TOC before removing internal files
        self.log("\nParsing table of contents...")
        toc = self.parse_toc()
        if toc:
            self.log(f"Found {len(toc)} TOC entries")
        
        # Step 3: Process/clean HTML files
        if self.clean_html:
            self.log("\nCleaning HTML files...")
        else:
            self.log("\nCounting HTML files...")
        self.process_html_files()
        
        # Step 4: Create index
        self.log("\nCreating index file...")
        self.create_index_html(toc)
        
        # Step 5: Remove CHM internal files
        self.log("\nRemoving CHM internal files...")
        self.remove_chm_internal_files()
        
        # Print summary
        print(f"\n{'='*60}")
        print("Extraction Complete!")
        print(f"{'='*60}")
        print(f"  ✓ Extracted: {self.stats['extracted']} HTML files")
        if self.clean_html:
            print(f"  ✓ Cleaned:   {self.stats['cleaned']} files")
        print(f"  ⊘ Skipped:   {self.stats['skipped']} internal files")
        if self.stats['errors']:
            print(f"  ✗ Errors:    {self.stats['errors']} files")
        print(f"\nOutput directory: {self.output_dir}")
        print(f"Open {self.output_dir / 'index.html'} in a browser to view")
        print(f"{'='*60}\n")
        
        return True


def main():
    parser = argparse.ArgumentParser(
        description='Extract CHM (Compiled HTML Help) files to HTML',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
    %(prog)s help.chm
    %(prog)s help.chm ./output_docs
    %(prog)s help.chm --no-clean
    %(prog)s help.chm -q
        """
    )
    
    parser.add_argument('chm_file', help='Path to the CHM file to extract')
    parser.add_argument('output_dir', nargs='?', help='Output directory (default: same name as CHM)')
    parser.add_argument('--no-clean', '-n', action='store_true',
                        help='Skip HTML cleanup (extract raw files)')
    parser.add_argument('--quiet', '-q', action='store_true',
                        help='Suppress progress messages')
    
    args = parser.parse_args()
    
    converter = CHMToHTMLConverter(
        chm_path=args.chm_file,
        output_dir=args.output_dir,
        clean_html=not args.no_clean,
        verbose=not args.quiet
    )
    
    success = converter.convert()
    sys.exit(0 if success else 1)


if __name__ == '__main__':
    main()
