from ultralytics import YOLO

# 1. Load your brand new fine-tuned model
# (Make sure to use the 'best.pt' from your train9 run)
model_path = r"C:\Users\Arjun Suthar\OneDrive\Desktop\shelfwise\runs\detect\train9\weights\best.pt"
model = YOLO(model_path)

# 1.5 Manually override the class names the model learned earlier
model.model.names = {
    0: "Product",
    1: "Stockout",
    2: "Label_Price",
    3: "Label_Promo",
    4: "Obstruction",
    5: "Shelf_Rail"
}

# 2. Pick a random, unseen image from your 'test' folder
image_path = r"C:\Users\Arjun Suthar\OneDrive\Desktop\shelfwise\backend\yolov8_dataset_export (1)\test\images\[4k] Final Walkthrough This Walmart is Closing Forever with 75% All Sales Final until Oct. 31, 2025! - Copy_frame_00998.jpg"

print("Running YOLO inference on your RTX 3050...")

# 3. Predict! 
# save=True tells YOLO to draw the colored bounding boxes and save a copy of the image.
# show=True tells YOLO to pop up a window displaying the image right now!
results = model.predict(
    source=image_path, 
    save=True, 
    show=True,
    conf=0.25 # Only show boxes it is at least 25% confident about
)

print("\nSuccess! The image with the bounding boxes drawn on it has been saved to:")
print(results[0].save_dir)
