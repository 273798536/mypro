"""
分形生成器 Flask Web 服务
"""
import os
import io
import json
from flask import Flask, render_template, request, jsonify, send_file, send_from_directory, abort

from fractal_service import FractalService, FractalGenerationError


app = Flask(__name__, template_folder="templates", static_folder="static")
app.config["MAX_CONTENT_LENGTH"] = 16 * 1024 * 1024

service = FractalService(data_dir="data")


@app.route("/")
def index():
    """主页"""
    info = service.get_fractal_info()
    presets = service.list_presets()
    stats = service.get_statistics()
    return render_template(
        "index.html",
        fractal_types=info["fractal_types"],
        color_schemes=info["color_scheme_names"],
        presets=presets,
        stats=stats,
    )


@app.route("/api/generate", methods=["POST"])
def api_generate():
    """API: 生成分形"""
    try:
        data = request.get_json() or {}

        fractal_type = data.get("fractal_type", "mandelbrot")
        params = data.get("params", {})
        color_scheme = data.get("color_scheme", "rainbow")
        width = int(data.get("width", 800))
        height = int(data.get("height", 600))
        student_note = data.get("note", "")
        parent_id = data.get("parent_id")
        auto_safe = data.get("auto_safe", True)

        result = service.generate_fractal(
            fractal_type=fractal_type,
            params=params,
            color_scheme=color_scheme,
            width=width,
            height=height,
            student_note=student_note,
            save=True,
            parent_id=parent_id,
            source="web",
            auto_safe=auto_safe,
        )

        img_buffer = io.BytesIO()
        result["image"].save(img_buffer, format="PNG")
        img_buffer.seek(0)

        response = {
            "success": True,
            "record_id": result["record"].id,
            "render_time_ms": result["render_time_ms"],
            "validation_messages": result["validation_messages"],
            "params_used": result["params_used"],
            "image_url": f"/api/image/{result['record'].id}",
        }

        return jsonify(response)

    except FractalGenerationError as e:
        return jsonify({
            "success": False,
            "error": str(e),
            "code": e.code,
            "details": e.details,
        }), 400
    except Exception as e:
        return jsonify({
            "success": False,
            "error": f"服务器错误: {str(e)}",
            "code": "INTERNAL_ERROR",
        }), 500


@app.route("/api/estimate", methods=["POST"])
def api_estimate():
    """API: 获取渲染预估"""
    try:
        data = request.get_json() or {}
        fractal_type = data.get("fractal_type", "mandelbrot")
        params = data.get("params", {})
        width = int(data.get("width", 800))
        height = int(data.get("height", 600))

        estimate = service.get_estimate(fractal_type, params, width, height)
        return jsonify(estimate)
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@app.route("/api/presets")
def api_presets():
    """API: 列出预设"""
    difficulty = request.args.get("difficulty")
    presets = service.list_presets(difficulty)
    return jsonify(presets)


@app.route("/api/records")
def api_records():
    """API: 列出记录"""
    limit = int(request.args.get("limit", 20))
    offset = int(request.args.get("offset", 0))
    fractal_type = request.args.get("fractal_type")

    records = service.storage.list_records(limit=limit, offset=offset, fractal_type=fractal_type)
    result = []
    for r in records:
        record_dict = r.to_dict()
        record_dict["image_url"] = f"/api/image/{r.id}" if r.image_path else None
        result.append(record_dict)

    return jsonify({
        "records": result,
        "total": len(result),
    })


@app.route("/api/record/<record_id>")
def api_record_detail(record_id):
    """API: 获取记录详情"""
    record = service.storage.get_record(record_id)
    if not record:
        return jsonify({"error": "记录不存在"}), 404

    record_dict = record.to_dict()
    record_dict["image_url"] = f"/api/image/{record_id}" if record.image_path else None

    history = service.storage.get_record_history(record_id)
    record_dict["history"] = [
        {
            "id": h.id,
            "created_at": h.created_at,
            "revision": h.revision,
            "note": h.student_note,
            "image_url": f"/api/image/{h.id}" if h.image_path else None,
        }
        for h in history
    ]

    return jsonify(record_dict)


@app.route("/api/image/<record_id>")
def api_image(record_id):
    """API: 获取记录图像"""
    record = service.storage.get_record(record_id)
    if not record or not record.image_path:
        abort(404)

    if not os.path.exists(record.image_path):
        abort(404)

    return send_file(record.image_path, mimetype="image/png")


@app.route("/api/export/<record_id>")
def api_export(record_id):
    """API: 导出图像"""
    record = service.storage.get_record(record_id)
    if not record or not record.image_path:
        abort(404)

    scale = float(request.args.get("scale", 1.0))
    format = request.args.get("format", "PNG").upper()

    from PIL import Image
    image = Image.open(record.image_path)
    if scale != 1.0:
        new_size = (int(image.width * scale), int(image.height * scale))
        image = image.resize(new_size, Image.LANCZOS)

    img_buffer = io.BytesIO()
    image.save(img_buffer, format=format)
    img_buffer.seek(0)

    filename = f"fractal_{record_id}.{format.lower()}"
    return send_file(
        img_buffer,
        mimetype=f"image/{format.lower()}",
        as_attachment=True,
        download_name=filename,
    )


@app.route("/api/revise/<record_id>", methods=["POST"])
def api_revise(record_id):
    """API: 创建修订版本"""
    try:
        data = request.get_json() or {}
        new_params = data.get("params", {})
        new_color_scheme = data.get("color_scheme")
        new_note = data.get("note", "")

        result = service.revise_record(
            record_id=record_id,
            new_params=new_params,
            new_color_scheme=new_color_scheme,
            new_note=new_note,
        )

        return jsonify({
            "success": True,
            "new_record_id": result["record"].id,
            "revision": result["record"].revision,
            "image_url": f"/api/image/{result['record'].id}",
        })

    except FractalGenerationError as e:
        return jsonify({
            "success": False,
            "error": str(e),
            "code": e.code,
        }), 400


@app.route("/api/stats")
def api_stats():
    """API: 获取统计信息"""
    return jsonify(service.get_statistics())


@app.route("/api/info")
def api_info():
    """API: 获取系统信息"""
    return jsonify(service.get_fractal_info())


@app.route("/gallery")
def gallery():
    """作品展示页"""
    return render_template("gallery.html")


@app.route("/record/<record_id>")
def record_page(record_id):
    """记录详情页"""
    record = service.storage.get_record(record_id)
    if not record:
        return "记录不存在", 404
    return render_template("record.html", record=record)


if __name__ == "__main__":
    os.makedirs("data/images", exist_ok=True)
    os.makedirs("data/records", exist_ok=True)
    os.makedirs("data/portfolios", exist_ok=True)
    app.run(host="0.0.0.0", port=5000, debug=True)
