"""材料管理层 - 处理名称不一致、口径变更追踪、人工修正保护"""
from typing import Dict, Optional, Tuple, List
from .models import Material
from . import errors


def _normalize_name(name: str) -> str:
    return name.strip().lower().replace(" ", "").replace("\t", "")


def find_material_by_name(materials: Dict[str, Material], name: str) -> Optional[Material]:
    """通过名称或别名查找材料 - 处理名称不一致的情况"""
    if not name:
        return None
    norm_target = _normalize_name(name)
    for mat in materials.values():
        if _normalize_name(mat.material_name) == norm_target:
            return mat
        for alias in mat.aliases:
            if _normalize_name(alias) == norm_target:
                return mat
    return None


def register_material(
    materials: Dict[str, Material],
    material_name: str,
    material_content: str = "",
    source_type: str = "model",
    aliases: Optional[List[str]] = None,
    change_note: str = "",
    is_manual_override: bool = False,
    override_note: str = "",
    existing_material_id: Optional[str] = None,
) -> Tuple[Optional[Material], Optional[str], Optional[str]]:
    """
    注册/更新材料，自动检测口径变更。

    返回: (material对象, 错误码, 错误消息)
    """
    aliases = aliases or []
    err_code, err_msg = None, None

    target_id = existing_material_id
    existing = None

    if target_id and target_id in materials:
        existing = materials[target_id]
    else:
        existing = find_material_by_name(materials, material_name)
        if existing:
            target_id = existing.material_id

    if existing is None:
        mat = Material(
            material_name=material_name,
            material_content=material_content,
            source_type=source_type,
            aliases=aliases,
            change_note=change_note,
            is_manual_override=is_manual_override,
            override_note=override_note,
        )
        materials[mat.material_id] = mat
        return mat, err_code, err_msg

    content_changed = (
        _normalize_name(existing.material_content) != _normalize_name(material_content)
        and material_content
    )
    name_changed = (
        _normalize_name(existing.material_name) != _normalize_name(material_name)
        and material_name
    )

    if content_changed or name_changed:
        if existing.is_manual_override and not is_manual_override:
            err_code = errors.ERR_MANUAL_OVERRIDE_EXISTS
            err_msg = errors.ERR_MANUAL_OVERRIDE_EXISTS_MSG
            return existing, err_code, err_msg

        existing.material_name = material_name or existing.material_name
        existing.material_content = material_content or existing.material_content
        existing.version += 1
        existing.updated_at = __import__("datetime").datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        existing.change_note = change_note or f"v{existing.version} 口径变更"
        if is_manual_override:
            existing.is_manual_override = True
            existing.override_note = override_note

        for a in aliases:
            if a not in existing.aliases:
                existing.aliases.append(a)

        return existing, errors.ERR_VERSION_CONFLICT, errors.ERR_VERSION_CONFLICT_MSG.format(
            material_name=existing.material_name
        )

    for a in aliases:
        if a not in existing.aliases:
            existing.aliases.append(a)
    if is_manual_override:
        existing.is_manual_override = True
        existing.override_note = override_note or existing.override_note

    return existing, err_code, err_msg
