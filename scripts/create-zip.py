#!/usr/bin/env python3
import os
import zipfile
import sys

def create_dist_zip():
    dist_dir = 'dist'
    if not os.path.exists(dist_dir):
        print(f"Error: '{dist_dir}' directory not found. Please run 'npm run build' first.")
        sys.exit(1)

    zip_filename = 'cloudflare-pages-dist.zip'
    fallback_zip = 'dist.zip'

    for output_zip in [zip_filename, fallback_zip]:
        if os.path.exists(output_zip):
            os.remove(output_zip)

        with zipfile.ZipFile(output_zip, 'w', zipfile.ZIP_DEFLATED) as zipf:
            file_count = 0
            for root, dirs, files in os.walk(dist_dir):
                for file in files:
                    file_path = os.path.join(root, file)
                    # Archive name relative to dist, so index.html is at root of zip!
                    arcname = os.path.relpath(file_path, dist_dir)
                    zipf.write(file_path, arcname)
                    file_count += 1

        size_kb = os.path.getsize(output_zip) / 1024
        print(f"Successfully generated '{output_zip}' ({file_count} files, {size_kb:.1f} KB)")

if __name__ == '__main__':
    create_dist_zip()
