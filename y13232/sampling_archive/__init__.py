from .models.material import Material, MaterialStatus
from .core.storage import Storage
from .core.deduplicator import Deduplicator
from .core.version_detector import VersionDetector
from .core.annotation import AnnotationManager
from .report.markdown_generator import MarkdownGenerator

__all__ = [
    'Material',
    'MaterialStatus',
    'Storage',
    'Deduplicator',
    'VersionDetector',
    'AnnotationManager',
    'MarkdownGenerator',
]
