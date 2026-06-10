import os
from typing import Dict, List, Optional, Tuple
from datetime import datetime
from PIL import Image, ImageDraw, ImageFont
from .models import ImageAnnotation, ReagentBatch, Sample
from .database import db
from .utils import clean_filename, is_image_file

class ImageAnnotator:
    def __init__(self, db_session=None, upload_dir: str = None):
        self.db = db_session or db.session
        self.upload_dir = upload_dir
        self.color_map = {
            'pass': '#22c55e',
            'fail': '#ef4444',
            'review': '#f59e0b',
            'warning': '#f59e0b',
            'error': '#ef4444',
            'info': '#3b82f6',
            'critical': '#dc2626',
            'marked': '#8b5cf6'
        }

    def add_annotation(self, batch_id: int, image_file: str,
                       annotation_type: str, x: float, y: float,
                       width: float, height: float, label: str = None,
                       notes: str = None, color: str = None,
                       sample_id: int = None, created_by: str = None) -> Dict:
        if not color:
            color = self.color_map.get(annotation_type, '#3b82f6')

        annotation = ImageAnnotation(
            batch_id=batch_id,
            sample_id=sample_id,
            image_file=image_file,
            annotation_type=annotation_type,
            x=x,
            y=y,
            width=width,
            height=height,
            label=label,
            notes=notes,
            color=color,
            created_by=created_by
        )
        self.db.add(annotation)
        self.db.commit()

        return {
            'success': True,
            'annotation_id': annotation.id,
            'message': '标注已添加'
        }

    def get_annotations(self, batch_id: int = None, image_file: str = None,
                        sample_id: int = None) -> List[ImageAnnotation]:
        query = ImageAnnotation.query.order_by(ImageAnnotation.created_at.desc())
        if batch_id:
            query = query.filter_by(batch_id=batch_id)
        if image_file:
            query = query.filter_by(image_file=image_file)
        if sample_id:
            query = query.filter_by(sample_id=sample_id)
        return query.all()

    def get_annotated_images(self, batch_id: int = None) -> List[Dict]:
        query = ImageAnnotation.query
        if batch_id:
            query = query.filter_by(batch_id=batch_id)
        
        annotations = query.all()
        image_groups = {}
        
        for ann in annotations:
            if ann.image_file not in image_groups:
                image_groups[ann.image_file] = {
                    'image_file': ann.image_file,
                    'batch_id': ann.batch_id,
                    'annotations': [],
                    'annotation_count': 0
                }
            image_groups[ann.image_file]['annotations'].append({
                'id': ann.id,
                'type': ann.annotation_type,
                'label': ann.label,
                'color': ann.color,
                'created_at': ann.created_at.isoformat()
            })
            image_groups[ann.image_file]['annotation_count'] += 1

        return list(image_groups.values())

    def update_annotation(self, annotation_id: int, **kwargs) -> Dict:
        annotation = ImageAnnotation.query.get(annotation_id)
        if not annotation:
            return {'success': False, 'error': '标注不存在'}

        for key, value in kwargs.items():
            if hasattr(annotation, key) and value is not None:
                setattr(annotation, key, value)

        annotation.updated_at = datetime.utcnow()
        self.db.commit()
        return {'success': True, 'message': '标注已更新'}

    def delete_annotation(self, annotation_id: int) -> Dict:
        annotation = ImageAnnotation.query.get(annotation_id)
        if not annotation:
            return {'success': False, 'error': '标注不存在'}

        self.db.delete(annotation)
        self.db.commit()
        return {'success': True, 'message': '标注已删除'}

    def render_annotated_image(self, image_path: str,
                               output_path: str = None) -> Optional[str]:
        if not os.path.exists(image_path):
            return None

        if not output_path:
            base, ext = os.path.splitext(image_path)
            output_path = f"{base}_annotated{ext}"

        annotations = self.get_annotations(image_file=os.path.basename(image_path))
        if not annotations:
            return image_path

        try:
            img = Image.open(image_path).convert('RGBA')
            overlay = Image.new('RGBA', img.size, (255, 255, 255, 0))
            draw = ImageDraw.Draw(overlay)

            for ann in annotations:
                if ann.x and ann.y and ann.width and ann.height:
                    x1 = int(ann.x)
                    y1 = int(ann.y)
                    x2 = int(ann.x + ann.width)
                    y2 = int(ann.y + ann.height)

                    color_rgb = self._hex_to_rgb(ann.color)
                    draw.rectangle([x1, y1, x2, y2],
                                   outline=color_rgb + (255,), width=3)
                    draw.rectangle([x1, y1, x2, y2],
                                   fill=color_rgb + (40,))

                    if ann.label:
                        try:
                            font = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf', 14)
                        except:
                            font = ImageFont.load_default()

                        text_bbox = draw.textbbox((x1, y1 - 20), ann.label, font=font)
                        draw.rectangle(text_bbox, fill=color_rgb + (200,))
                        draw.text((x1, y1 - 20), ann.label, fill='white', font=font)

            combined = Image.alpha_composite(img, overlay)
            if output_path.lower().endswith('.jpg') or output_path.lower().endswith('.jpeg'):
                combined = combined.convert('RGB')
            combined.save(output_path)
            return output_path

        except Exception as e:
            print(f"渲染标注图片失败: {e}")
            return None

    def _hex_to_rgb(self, hex_color: str) -> Tuple[int, int, int]:
        hex_color = hex_color.lstrip('#')
        if len(hex_color) == 3:
            hex_color = ''.join(c * 2 for c in hex_color)
        return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))

    def create_pedigree_visualization(self, batch_id: int,
                                      output_path: str = None) -> Optional[str]:
        batch = ReagentBatch.query.get(batch_id)
        if not batch:
            return None

        if not output_path and self.upload_dir:
            output_path = os.path.join(
                self.upload_dir,
                f'pedigree_{batch.batch_number}_{datetime.now().strftime("%Y%m%d%H%M%S")}.png'
            )

        from .models import PedigreeMember
        members = PedigreeMember.query.all()

        sample_ids = {s.id for s in Sample.query.filter_by(batch_id=batch_id).all()}
        batch_members = [m for m in members if m.sample_id in sample_ids]

        if not batch_members:
            return None

        family_groups = {}
        for m in batch_members:
            fid = m.family_id or 'unknown'
            if fid not in family_groups:
                family_groups[fid] = []
            family_groups[fid].append(m)

        max_gen = max((m.generation or 0) for m in batch_members) + 1
        max_members_per_gen = max(
            max(sum(1 for m in members if m.generation == g) for g in range(max_gen)),
            len(family_groups)
        )

        img_width = max(800, max_members_per_gen * 120 + 100)
        img_height = max(600, max_gen * 150 + 100)

        img = Image.new('RGB', (img_width, img_height), 'white')
        draw = ImageDraw.Draw(img)

        try:
            title_font = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial Bold.ttf', 16)
            normal_font = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf', 12)
        except:
            title_font = ImageFont.load_default()
            normal_font = ImageFont.load_default()

        draw.text((20, 20), f"家系图 - {batch.batch_number}",
                  fill='black', font=title_font)

        member_positions = {}
        for family_idx, (family_id, members) in enumerate(family_groups.items()):
            gen_groups = {}
            for m in members:
                g = m.generation or 0
                if g not in gen_groups:
                    gen_groups[g] = []
                gen_groups[g].append(m)

            for gen, gen_members in gen_groups.items():
                y = 80 + gen * 150
                total_width = len(gen_members) * 100
                start_x = (img_width - total_width) / 2

                for i, m in enumerate(gen_members):
                    x = start_x + i * 100 + 50
                    member_positions[m.individual_id] = (x, y, m)

                    color = self.color_map.get('info', '#3b82f6')
                    if m.affection_status == 'Affected':
                        fill_color = self._hex_to_rgb(color)
                        outline_color = fill_color
                    elif m.affection_status == 'Unaffected':
                        fill_color = (255, 255, 255)
                        outline_color = self._hex_to_rgb(color)
                    else:
                        fill_color = (200, 200, 200)
                        outline_color = (100, 100, 100)

                    if m.gender == 'Male':
                        draw.rectangle([x - 25, y - 25, x + 25, y + 25],
                                       fill=fill_color, outline=outline_color, width=2)
                    elif m.gender == 'Female':
                        draw.ellipse([x - 25, y - 25, x + 25, y + 25],
                                     fill=fill_color, outline=outline_color, width=2)
                    else:
                        draw.polygon([(x, y - 25), (x + 25, y + 25), (x - 25, y + 25)],
                                     fill=fill_color, outline=outline_color, width=2)

                    label = m.individual_id
                    draw.text((x - len(label) * 3, y + 35), label,
                              fill='black', font=normal_font)

        for individual_id, (x, y, member) in member_positions.items():
            if member.father_id and member.father_id in member_positions:
                fx, fy, _ = member_positions[member.father_id]
                draw.line([(fx, fy + 25), (x, y - 25)], fill='gray', width=1)
            if member.mother_id and member.mother_id in member_positions:
                mx, my, _ = member_positions[member.mother_id]
                draw.line([(mx, my + 25), (x, y - 25)], fill='gray', width=1)

        legend_y = img_height - 60
        draw.text((20, legend_y), '图例:', fill='black', font=normal_font)
        draw.rectangle([70, legend_y, 90, legend_y + 20],
                       fill=(255, 255, 255), outline='black')
        draw.text((100, legend_y), '男性', fill='black', font=normal_font)
        draw.ellipse([160, legend_y, 180, legend_y + 20],
                     fill=(255, 255, 255), outline='black')
        draw.text((190, legend_y), '女性', fill='black', font=normal_font)
        draw.rectangle([240, legend_y, 260, legend_y + 20],
                       fill=self._hex_to_rgb('#3b82f6'))
        draw.text((270, legend_y), '患病', fill='black', font=normal_font)

        img.save(output_path)

        self.add_annotation(
            batch_id=batch_id,
            image_file=os.path.basename(output_path),
            annotation_type='info',
            x=0, y=0, width=img_width, height=img_height,
            label='家系图',
            notes=f"自动生成的家系图，包含 {len(batch_members)} 个成员",
            created_by='system'
        )

        return output_path

    def annotate_from_validation(self, validation_results: List,
                                 batch_id: int, image_file: str) -> Dict:
        added = 0
        for i, vr in enumerate(validation_results[:10]):
            y_offset = 50 + i * 60
            self.add_annotation(
                batch_id=batch_id,
                image_file=image_file,
                annotation_type=vr.severity,
                x=20, y=y_offset, width=300, height=50,
                label=f"{vr.validation_type}: {vr.status}",
                notes=vr.message,
                sample_id=vr.sample_id,
                created_by='validation'
            )
            added += 1
        return {'success': True, 'annotations_added': added}
