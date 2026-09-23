import os
import zipfile
from PIL import Image

# 1. ใส่ชื่อไฟล์รูปภาพสำรับไพ่ของคุณ
image_path = "cards.jpg"

try:
  sprite_sheet = Image.open(image_path)
except Exception as e:
  print("ไม่พบไฟล์รูปภาพ! กรุณาตรวจสอบชื่อไฟล์ภาพใหม่อีกครั้ง")
  exit()

sheet_width, sheet_height = sprite_sheet.size

# 2. ตั้งค่าการตัด (13 คอลัมน์ x 4 แถว)
columns = 13
rows = 4

# คำนวณขนาดตามสัดส่วนพื้นที่จริงของรูปภาพ
card_width = sheet_width / columns
card_height = sheet_height / rows

output_dir = "card_images"
os.makedirs(output_dir, exist_ok=True)

saved_files = []

# 3. ตัดภาพทีละใบพร้อมหดขอบเข้าเล็กน้อย (Padding) เพื่อไม่ให้ติดขอบไพ่ใบข้างๆ
padding = 2  # ลดระยะพิกัดขอบเข้ามาเล็กน้อยเพื่อให้ตัดได้เนื้อไพ่เน้นๆ

for r in range(rows):
  for c in range(columns):
    left = int(c * card_width) + padding
    upper = int(r * card_height) + padding
    right = int((c + 1) * card_width) - padding
    lower = int((r + 1) * card_height) - padding

    # ป้องกันไม่ให้ค่าติดลบหรือเกินขนาดภาพ
    card_img = sprite_sheet.crop((max(0, left), max(0, upper), min(sheet_width, right), min(sheet_height, lower)))

    # กำหนดชื่อไฟล์
    if r == 3 and c == 12:
      filename = "card_back_dmit.png"
    else:
      filename = f"card_r{r+1}_c{c+1}.png"

    file_path = os.path.join(output_dir, filename)
    card_img.save(file_path)
    saved_files.append(file_path)

# 4. บีบอัดเป็นไฟล์ ZIP
zip_filename = "party_cards_deck.zip"
with zipfile.ZipFile(zip_filename, "w") as zipf:
  for file in saved_files:
    zipf.write(file, os.path.basename(file))

print(f"สำเร็จ! ตัดภาพลงตัวและสร้างไฟล์ ZIP แล้ว: {zip_filename}")