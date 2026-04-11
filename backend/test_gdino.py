import os
import torch
import urllib.request
from transformers import BertModel
from autodistill_grounding_dino import GroundingDINO
from autodistill.detection import CaptionOntology
import numpy as np

config_dir = os.path.expanduser("~/.cache/autodistill/groundingdino")
config_path = os.path.join(config_dir, "GroundingDINO_SwinT_OGC.py")
os.makedirs(config_dir, exist_ok=True)

if not os.path.exists(config_path):
    print("Downloading missing GroundingDINO config...")
    url = "https://raw.githubusercontent.com/IDEA-Research/GroundingDINO/main/groundingdino/config/GroundingDINO_SwinT_OGC.py"
    urllib.request.urlretrieve(url, config_path)

def patch_bert():
    # Force patch because existing method might have incompatible signature
    def get_head_mask(self, head_mask, num_hidden_layers, is_attention_chunked=False):
        return [None] * num_hidden_layers
    BertModel.get_head_mask = get_head_mask

    def get_extended_attention_mask(self, attention_mask, input_shape, device=None, dtype=None):
        if device is None: device = torch.device("cpu")
        if attention_mask.dim() == 3:
            extended_attention_mask = attention_mask[:, None, :, :]
        elif attention_mask.dim() == 2:
            extended_attention_mask = attention_mask[:, None, None, :]
        else:
            extended_attention_mask = attention_mask
        return extended_attention_mask
    BertModel.get_extended_attention_mask = get_extended_attention_mask

patch_bert()

ontology = CaptionOntology({
    "Product": "Individual SKU Unit: bottles, boxes, cans",
    "Stockout": "Empty Shelf Gap: visible shelf liners or back-panels where product is missing",
    "Label_Price": "Standard Shelf Edge Label: white or standard price sticker",
    "Label_Promo": "Promotional/Discount Tag: bright-colored tags (Yellow, Red, or Fluorescent)",
    "Obstruction": "Visual Interference: shopping cart, customer hand, or person blocking shelf",
    "Shelf_Rail": "Planogram Anchor: horizontal metal rail or edge of shelf"
})

print("Instantiating model...")
model = GroundingDINO(
    ontology=ontology,
    box_threshold=0.19,
    text_threshold=0.30
)

# Test predict with dummy image
print("Testing predict...")
dummy_image = np.zeros((640, 640, 3), dtype=np.uint8)
try:
    res = model.predict(dummy_image)
    print("Predict with numpy successful:", type(res))
    print(dir(res))
    if hasattr(res, "xyxy"):
        print("has xyxy")
    if hasattr(res, "class_id"):
        print("has class_id")
except Exception as e:
    import traceback
    traceback.print_exc()

# Let's save a dummy image and predict
import cv2
cv2.imwrite("dummy_test.png", dummy_image)
try:
    res2 = model.predict("dummy_test.png")
    print("Predict with file successful")
    print(res2)
except Exception as e:
    import traceback
    traceback.print_exc()
