from app.routes.inspection import bp as inspection_bp
from app.routes.calibration import bp as calibration_bp
from app.routes.repair import bp as repair_bp
from app.routes.supplementary import bp as supplementary_bp
from app.routes.audit import bp as audit_bp
from app.routes.import_routes import bp as import_bp
from app.routes.export_routes import bp as export_bp
from app.routes.user import bp as user_bp

__all__ = [
    "inspection_bp",
    "calibration_bp",
    "repair_bp",
    "supplementary_bp",
    "audit_bp",
    "import_bp",
    "export_bp",
    "user_bp",
]
