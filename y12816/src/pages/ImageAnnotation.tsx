import ImageCompare from '@/components/ImageCompare';

export default function ImageAnnotation() {
  return (
    <div className="space-y-5 animate-fade-in-up">
      <div>
        <h2 className="font-serif text-2xl font-semibold text-warm-900">图像标注对比</h2>
        <p className="text-warm-500 text-sm mt-1">
          显微照片标注改变判断时，人工修正里能看到前后差别
        </p>
      </div>
      <ImageCompare />
    </div>
  );
}
