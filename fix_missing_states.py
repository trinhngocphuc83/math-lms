import sys

filepath = r'D:\APP LMS\math-lms\src\app\student\lessons\[id]\AzotaExamUI.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

crop_code = '''
  const [crop, setCrop] = useState<Crop>({ unit: '%', width: 90, height: 90, x: 5, y: 5 });
  const [cropImageSrc, setCropImageSrc] = useState<string>('');
  const [activeCropQIndex, setActiveCropQIndex] = useState<number | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  function getCroppedImg(image: HTMLImageElement, crop: Crop): Promise<string> {
      const canvas = document.createElement('canvas');
      const scaleX = image.naturalWidth / image.width;
      const scaleY = image.naturalHeight / image.height;
      canvas.width = crop.width;
      canvas.height = crop.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return Promise.reject("No 2d context");
      
      ctx.drawImage(
          image,
          crop.x * scaleX,
          crop.y * scaleY,
          crop.width * scaleX,
          crop.height * scaleY,
          0,
          0,
          crop.width,
          crop.height
      );
      return new Promise((resolve) => {
          resolve(canvas.toDataURL('image/jpeg', 0.9));
      });
  }

  const handleConfirmCrop = async () => {
      if (!imgRef.current || !crop || crop.width === 0 || crop.height === 0) return alert("Bạn chưa chọn vùng để cắt!");
      if (activeCropQIndex === null) return;
      try {
          const base64Image = await getCroppedImg(imgRef.current, crop);
          const currentAns = answers[activeCropQIndex.toString()];
          const ansObj = typeof currentAns === 'object' ? currentAns : {};
          handleAnswerChange(activeCropQIndex, 'essay', { ...ansObj, image: base64Image });
          setCropImageSrc('');
          setActiveCropQIndex(null);
      } catch (err) {
          alert("Lỗi khi cắt ảnh!");
      }
  };
'''

target = "export default function AzotaExamUI({ content, title, lessonId, moduleId }: { content: string, title: string, lessonId?: string, moduleId?: string }) {"

if "const [cropImageSrc" not in content:
    content = content.replace(target, target + "\n" + crop_code)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed Missing States Successfully!")
