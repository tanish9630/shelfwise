import os
import cv2
import yt_dlp
import numpy as np
from pathlib import Path
import argparse
import hashlib

def variance_of_laplacian(image):
    return cv2.Laplacian(image, cv2.CV_64F).var()

def dhash(image, hash_size=8):
    resized = cv2.resize(image, (hash_size + 1, hash_size))
    diff = resized[:, 1:] > resized[:, :-1]
    return sum([2 ** i for (i, v) in enumerate(diff.flatten()) if v])

def extract_frames(youtube_url, output_dir, interval_sec=2.0, blur_threshold=100.0, dhash_threshold=10):
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    
    ydl_opts = {
        'format': 'bestvideo[height<=720]+bestaudio/best[height<=720]',
        'outtmpl': '/tmp/temp_video.%(ext)s',
        'noplaylist': True,
    }
    
    print(f"Downloading {youtube_url}...")
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(youtube_url, download=True)
        video_path = ydl.prepare_filename(info)
        video_id = info['id']
        
    print(f"Extracting frames from {video_path}...")
    cap = cv2.VideoCapture(video_path)
    fps = cap.get(cv2.CAP_PROP_FPS)
    frame_interval = int(fps * interval_sec)
    
    frame_count = 0
    saved_count = 0
    last_hash = None
    
    while True:
        ret, frame = cap.read()
        if not ret:
            break
            
        if frame_count % frame_interval == 0:
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            
            # Blur detection
            blur_val = variance_of_laplacian(gray)
            if blur_val < blur_threshold:
                frame_count += 1
                continue
                
            # Duplicate detection
            current_hash = dhash(gray)
            if last_hash is not None and bin(current_hash ^ last_hash).count('1') < dhash_threshold:
                frame_count += 1
                continue
                
            last_hash = current_hash
            out_file = output_dir / f"vid_{video_id}_frame_{frame_count}.jpg"
            cv2.imwrite(str(out_file), frame)
            saved_count += 1
            
        frame_count += 1
        
    cap.release()
    try:
        os.remove(video_path)
    except FileNotFoundError:
        pass
        
    print(f"Extraction complete for {video_id}. Processed {frame_count} frames, saved {saved_count}.")

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description="Extract diverse frames from YouTube retail videos")
    parser.add_argument("url", help="YouTube video URL")
    parser.add_argument("--out", default="../datasets/shelfwise/shelf_raw/images", help="Output directory")
    parser.add_argument("--interval", type=float, default=2.0, help="Seconds between extracted frames")
    args = parser.parse_args()
    
    extract_frames(args.url, args.out, interval_sec=args.interval)
