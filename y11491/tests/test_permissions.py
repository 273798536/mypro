import pytest

from bid_inspect.core import PermissionChecker, PermissionDeniedError, UserRole


class TestPermissions:
    def test_admin_has_all_permissions(self):
        for action in ["init", "import", "check", "fix", "report", "history", "export"]:
            assert PermissionChecker.check_permission("admin", action)

    def test_operator_permissions(self):
        assert PermissionChecker.check_permission("operator", "import")
        assert PermissionChecker.check_permission("operator", "check")
        assert PermissionChecker.check_permission("operator", "fix")
        assert PermissionChecker.check_permission("operator", "report")
        assert PermissionChecker.check_permission("operator", "history")
        assert PermissionChecker.check_permission("operator", "export")
        assert not PermissionChecker.check_permission("operator", "init")

    def test_viewer_permissions(self):
        assert PermissionChecker.check_permission("viewer", "report")
        assert PermissionChecker.check_permission("viewer", "history")
        assert PermissionChecker.check_permission("viewer", "export")
        assert not PermissionChecker.check_permission("viewer", "init")
        assert not PermissionChecker.check_permission("viewer", "import")
        assert not PermissionChecker.check_permission("viewer", "check")
        assert not PermissionChecker.check_permission("viewer", "fix")

    def test_require_permission_raises(self):
        with pytest.raises(PermissionDeniedError):
            PermissionChecker.require_permission("viewer", "import")

    def test_invalid_role(self):
        assert not PermissionChecker.check_permission("invalid_role", "report")

    def test_require_permission_passes(self):
        PermissionChecker.require_permission("admin", "init")
