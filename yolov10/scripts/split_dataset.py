import os
import shutil
import random
from pathlib import Path
import argparse

def split_dataset(data_dir, split_ratio=0.8):
    data_dir = Path(data_dir)
    images_dir = data_dir / "images" / "all" # Assuming annotated images are placed here
    labels_dir = data_dir / "labels" / "all"
    
    if not images_dir.exists() or not labels_dir.exists():
        print(f"Error: Could not find {images_dir} or {labels_dir}")
        print("Please place your annotated images in datasets/shelfwise/images/all")
        print("and your YOLO labels in datasets/shelfwise/labels/all")
        return
        
    train_img_dir = data_dir / "images" / "train"
    val_img_dir = data_dir / "images" / "val"
    train_lbl_dir = data_dir / "labels" / "train"
    val_lbl_dir = data_dir / "labels" / "val"
    
    for d in [train_img_dir, val_img_dir, train_lbl_dir, val_lbl_dir]:
        d.mkdir(parents=True, exist_ok=True)
        
    images = list(images_dir.glob("*.jpg"))
    random.shuffle(images)
    
    split_idx = int(len(images) * split_ratio)
    train_images = images[:split_idx]
    val_images = images[split_idx:]
    
    print(f"Splitting {len(images)} files -> {len(train_images)} train, {len(val_images)} val")
    
    for img in train_images:
        lbl = labels_dir / (img.stem + ".txt")
        if lbl.exists():
            shutil.copy(img, train_img_dir / img.name)
            shutil.copy(lbl, train_lbl_dir / lbl.name)
            
    for img in val_images:
        lbl = labels_dir / (img.stem + ".txt")
        if lbl.exists():
            shutil.copy(img, val_img_dir / img.name)
            shutil.copy(lbl, val_lbl_dir / lbl.name)
            
    print("Done!")

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument("--dir", default="../datasets/shelfwise", help="Dataset root directory")
    parser.add_argument("--ratio", type=float, default=0.8, help="Train split ratio")
    args = parser.parse_args()
    
    split_dataset(args.dir, args.ratio)
