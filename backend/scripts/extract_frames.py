"""
ShelfWise Frame Extraction Pipeline
====================================
Extracts diverse, high-quality frames from YouTube videos OR local video files
for retail shelf dataset creation.

Usage:
  # From a YouTube URL:
  python extract_frames.py --url "https://youtube.com/watch?v=..."

  # From a local video file:
  python extract_frames.py --file "/path/to/video.mp4"

  # From a folder of local videos (e.g., downloaded YouTube videos):
  python extract_frames.py --folder "/path/to/videos_folder"

  # Batch from a text file of YouTube URLs:
  python extract_frames.py --url-list urls.txt

  # Custom interval (1 frame per second):
  python extract_frames.py --file video.mp4 --interval 1.0

Output goes to: datasets/shelfwise/shelf_raw/images/
"""

import os
import sys
import cv2
import glob
import numpy as np
from pathlib import Path
import argparse
import time

# ──────────────────────────────────────────────
# Quality Filters
# ──────────────────────────────────────────────

def variance_of_laplacian(image):
    """Measure image sharpness. Higher = sharper."""
    return cv2.Laplacian(image, cv2.CV_64F).var()


def dhash(image, hash_size=8):
    """Compute difference hash for duplicate detection."""
    resized = cv2.resize(image, (hash_size + 1, hash_size))
    diff = resized[:, 1:] > resized[:, :-1]
    return sum([2 ** i for (i, v) in enumerate(diff.flatten()) if v])


def is_mostly_black_or_white(image, threshold=0.85):
    """Reject frames that are mostly black (intro/outro) or white (transitions)."""
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY) if len(image.shape) == 3 else image
    black_ratio = np.sum(gray < 30) / gray.size
    white_ratio = np.sum(gray > 225) / gray.size
    return black_ratio > threshold or white_ratio > threshold


# ──────────────────────────────────────────────
# Core Extraction
# ──────────────────────────────────────────────

def extract_frames_from_video(
    video_path,
    output_dir,
    video_label="vid",
    interval_sec=2.0,
    blur_threshold=80.0,
    dhash_threshold=10,
    target_size=None,
):
    """
    Extract frames from a single video file with quality filtering.

    Args:
        video_path: Path to the video file
        output_dir: Where to save frames
        video_label: Prefix for output filenames
        interval_sec: Extract one frame every N seconds
        blur_threshold: Laplacian variance below this = blurry (skip)
        dhash_threshold: Hamming distance below this = duplicate (skip)
        target_size: Optional (w, h) to resize frames. None = keep original.

    Returns:
        dict with extraction stats
    """
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    cap = cv2.VideoCapture(str(video_path))
    if not cap.isOpened():
        print(f"  ❌ Cannot open video: {video_path}")
        return {"processed": 0, "saved": 0, "skipped_blur": 0, "skipped_dup": 0, "skipped_bw": 0}

    fps = cap.get(cv2.CAP_PROP_FPS)
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    duration = total_frames / fps if fps > 0 else 0
    frame_interval = max(1, int(fps * interval_sec))

    print(f"  📹 {Path(video_path).name}: {total_frames} frames, {duration:.1f}s, {fps:.1f} FPS")
    print(f"     Extracting 1 frame every {interval_sec}s (every {frame_interval} frames)")

    frame_count = 0
    saved_count = 0
    skipped_blur = 0
    skipped_dup = 0
    skipped_bw = 0
    last_hash = None

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        if frame_count % frame_interval == 0:
            # Filter 1: Black/white frames (intros, transitions)
            if is_mostly_black_or_white(frame):
                skipped_bw += 1
                frame_count += 1
                continue

            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

            # Filter 2: Blur detection
            blur_val = variance_of_laplacian(gray)
            if blur_val < blur_threshold:
                skipped_blur += 1
                frame_count += 1
                continue

            # Filter 3: Near-duplicate detection via perceptual hash
            current_hash = dhash(gray)
            if last_hash is not None and bin(current_hash ^ last_hash).count('1') < dhash_threshold:
                skipped_dup += 1
                frame_count += 1
                continue

            last_hash = current_hash

            # Optionally resize
            if target_size:
                frame = cv2.resize(frame, target_size, interpolation=cv2.INTER_AREA)

            out_file = output_dir / f"{video_label}_frame_{saved_count:05d}.jpg"
            cv2.imwrite(str(out_file), frame, [cv2.IMWRITE_JPEG_QUALITY, 95])
            saved_count += 1

        frame_count += 1

    cap.release()

    stats = {
        "processed": frame_count,
        "saved": saved_count,
        "skipped_blur": skipped_blur,
        "skipped_dup": skipped_dup,
        "skipped_bw": skipped_bw,
    }

    print(f"  ✅ Saved {saved_count} frames (skipped: {skipped_blur} blurry, {skipped_dup} duplicate, {skipped_bw} b/w)")
    return stats


def download_youtube_video(url, download_dir="/tmp/shelfwise_downloads"):
    """Download a YouTube video and return the local file path."""
    try:
        import yt_dlp
    except ImportError:
        print("❌ yt-dlp not installed. Run: pip install yt-dlp")
        sys.exit(1)

    Path(download_dir).mkdir(parents=True, exist_ok=True)

    ydl_opts = {
        'format': 'bestvideo[height<=720][ext=mp4]+bestaudio[ext=m4a]/best[height<=720][ext=mp4]/best',
        'outtmpl': f'{download_dir}/%(id)s.%(ext)s',
        'noplaylist': True,
        'quiet': False,
        'no_warnings': True,
    }

    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=True)
        video_path = ydl.prepare_filename(info)
        video_id = info.get('id', 'unknown')
        title = info.get('title', 'unknown')

    print(f"  📥 Downloaded: \"{title}\" -> {video_path}")
    return video_path, video_id


# ──────────────────────────────────────────────
# Main CLI
# ──────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="ShelfWise Frame Extraction — YouTube or local videos → shelf frames",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python extract_frames.py --url "https://youtube.com/watch?v=abc123"
  python extract_frames.py --file ~/Downloads/shelf_video.mp4
  python extract_frames.py --folder ~/Downloads/retail_videos/
  python extract_frames.py --url-list youtube_urls.txt --interval 1.5
        """
    )

    source = parser.add_mutually_exclusive_group(required=True)
    source.add_argument("--url", help="Single YouTube URL to download and extract")
    source.add_argument("--url-list", help="Text file with one YouTube URL per line")
    source.add_argument("--file", help="Path to a local video file")
    source.add_argument("--folder", help="Path to a folder of local video files")

    parser.add_argument("--out", default="datasets/shelfwise/shelf_raw/images",
                        help="Output directory for extracted frames (default: datasets/shelfwise/shelf_raw/images)")
    parser.add_argument("--interval", type=float, default=2.0,
                        help="Seconds between extracted frames (default: 2.0)")
    parser.add_argument("--blur-thresh", type=float, default=80.0,
                        help="Laplacian variance threshold for blur rejection (default: 80.0)")
    parser.add_argument("--resize", type=int, nargs=2, default=None, metavar=('W', 'H'),
                        help="Resize frames to WxH (default: keep original)")

    args = parser.parse_args()

    # Resolve output dir relative to the yolov10 project root
    script_dir = Path(__file__).resolve().parent
    project_root = script_dir.parent
    output_dir = project_root / args.out

    target_size = tuple(args.resize) if args.resize else None

    print("=" * 60)
    print("🛒 ShelfWise Frame Extraction Pipeline")
    print("=" * 60)
    print(f"Output directory: {output_dir}")
    print(f"Interval: {args.interval}s | Blur threshold: {args.blur_thresh}")
    print()

    all_stats = {"total_processed": 0, "total_saved": 0}
    video_count = 0

    if args.url:
        # Single YouTube URL
        video_path, video_id = download_youtube_video(args.url)
        stats = extract_frames_from_video(
            video_path, output_dir, video_label=f"yt_{video_id}",
            interval_sec=args.interval, blur_threshold=args.blur_thresh,
            target_size=target_size
        )
        all_stats["total_processed"] += stats["processed"]
        all_stats["total_saved"] += stats["saved"]
        video_count = 1

    elif args.url_list:
        # Batch YouTube URLs from file
        url_file = Path(args.url_list)
        if not url_file.exists():
            print(f"❌ URL list file not found: {url_file}")
            sys.exit(1)
        urls = [line.strip() for line in url_file.read_text().splitlines() if line.strip() and not line.startswith('#')]
        print(f"Found {len(urls)} URLs in {url_file}")
        for i, url in enumerate(urls):
            print(f"\n--- Video {i+1}/{len(urls)} ---")
            try:
                video_path, video_id = download_youtube_video(url)
                stats = extract_frames_from_video(
                    video_path, output_dir, video_label=f"yt_{video_id}",
                    interval_sec=args.interval, blur_threshold=args.blur_thresh,
                    target_size=target_size
                )
                all_stats["total_processed"] += stats["processed"]
                all_stats["total_saved"] += stats["saved"]
                video_count += 1
            except Exception as e:
                print(f"  ❌ Failed: {e}")

    elif args.file:
        # Single local video file
        video_path = Path(args.file)
        if not video_path.exists():
            print(f"❌ File not found: {video_path}")
            sys.exit(1)
        stats = extract_frames_from_video(
            video_path, output_dir, video_label=video_path.stem,
            interval_sec=args.interval, blur_threshold=args.blur_thresh,
            target_size=target_size
        )
        all_stats["total_processed"] += stats["processed"]
        all_stats["total_saved"] += stats["saved"]
        video_count = 1

    elif args.folder:
        # All videos in a folder
        video_folder = Path(args.folder)
        if not video_folder.is_dir():
            print(f"❌ Folder not found: {video_folder}")
            sys.exit(1)
        video_extensions = {'.mp4', '.avi', '.mkv', '.mov', '.webm', '.flv', '.wmv'}
        video_files = sorted([f for f in video_folder.iterdir() if f.suffix.lower() in video_extensions])
        if not video_files:
            print(f"❌ No video files found in {video_folder}")
            sys.exit(1)
        print(f"Found {len(video_files)} video files in {video_folder}")
        for i, vf in enumerate(video_files):
            print(f"\n--- Video {i+1}/{len(video_files)}: {vf.name} ---")
            stats = extract_frames_from_video(
                vf, output_dir, video_label=vf.stem,
                interval_sec=args.interval, blur_threshold=args.blur_thresh,
                target_size=target_size
            )
            all_stats["total_processed"] += stats["processed"]
            all_stats["total_saved"] += stats["saved"]
            video_count += 1

    # Summary
    print("\n" + "=" * 60)
    print("📊 EXTRACTION SUMMARY")
    print("=" * 60)
    print(f"Videos processed:  {video_count}")
    print(f"Total frames read: {all_stats['total_processed']}")
    print(f"Frames saved:      {all_stats['total_saved']}")
    print(f"Output directory:  {output_dir}")
    print()
    print("Next steps:")
    print("  1. Review frames in the output directory")
    print("  2. Upload to Roboflow for auto-labeling")
    print("     → Use 'Auto-Label' with prompts: 'product', 'empty shelf space', 'price tag'")
    print("  3. Export from Roboflow in YOLOv8 format")
    print("=" * 60)


if __name__ == '__main__':
    main()
