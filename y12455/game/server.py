import uuid
from flask import Flask, jsonify, request, send_from_directory, render_template
from game.state import get_game_state, reset_game_state
from game.report import generate_report


def create_app():
    app = Flask(
        __name__,
        template_folder="../templates",
        static_folder="../static",
    )

    @app.route("/")
    def index():
        return render_template("index.html")

    @app.route("/api/session", methods=["POST"])
    def new_session():
        sid = uuid.uuid4().hex[:8]
        state = get_game_state(sid)
        snap = state.get_snapshot()
        return jsonify({"session_id": sid, "snapshot": snap})

    @app.route("/api/<sid>/start", methods=["POST"])
    def start_game(sid):
        data = request.get_json(force=True) or {}
        num_photons = data.get("num_photons", 16)
        ber_threshold = data.get("ber_threshold", 0.11)
        state = get_game_state(sid)
        snap = state.start_new(num_photons=num_photons, ber_threshold=ber_threshold)
        return jsonify(snap)

    @app.route("/api/<sid>/eve", methods=["POST"])
    def eve_intercept(sid):
        data = request.get_json(force=True) or {}
        choices = data.get("choices", [])
        state = get_game_state(sid)
        snap = state.set_eve_choices(choices)
        return jsonify(snap)

    @app.route("/api/<sid>/bob", methods=["POST"])
    def bob_measure(sid):
        data = request.get_json(force=True) or {}
        bases = data.get("bases")
        state = get_game_state(sid)
        snap = state.set_bob_bases(bases)
        return jsonify(snap)

    @app.route("/api/<sid>/sift", methods=["POST"])
    def do_sift(sid):
        state = get_game_state(sid)
        snap = state.do_sift()
        return jsonify(snap)

    @app.route("/api/<sid>/analyze", methods=["POST"])
    def do_analysis(sid):
        state = get_game_state(sid)
        snap = state.do_analysis()
        return jsonify(snap)

    @app.route("/api/<sid>/pause", methods=["POST"])
    def pause_game(sid):
        state = get_game_state(sid)
        snap = state.pause()
        return jsonify(snap)

    @app.route("/api/<sid>/resume", methods=["POST"])
    def resume_game(sid):
        state = get_game_state(sid)
        snap = state.resume()
        return jsonify(snap)

    @app.route("/api/<sid>/restart", methods=["POST"])
    def restart_game(sid):
        state = reset_game_state(sid)
        snap = state.get_snapshot()
        return jsonify(snap)

    @app.route("/api/<sid>/snapshot", methods=["GET"])
    def get_snapshot(sid):
        state = get_game_state(sid)
        snap = state.get_snapshot()
        return jsonify(snap)

    @app.route("/api/<sid>/export", methods=["POST"])
    def export_report(sid):
        state = get_game_state(sid)
        snap = state.get_snapshot()
        report_path, raw_path = generate_report(snap)
        report_name = report_path.split("/")[-1]
        return jsonify({
            "report_file": report_name,
            "report_path": report_path,
            "raw_data_path": raw_path,
        })

    @app.route("/api/<sid>/run-auto", methods=["POST"])
    def run_auto(sid):
        data = request.get_json(force=True) or {}
        num_photons = data.get("num_photons", 16)
        ber_threshold = data.get("ber_threshold", 0.11)
        eve_choices = data.get("eve_choices", [])

        state = get_game_state(sid)
        state.start_new(num_photons=num_photons, ber_threshold=ber_threshold)
        if eve_choices:
            state.set_eve_choices(eve_choices)
        state.set_bob_bases()
        state.do_sift()
        snap = state.do_analysis()
        return jsonify(snap)

    @app.route("/exports/<path:filename>")
    def download_report(filename):
        return send_from_directory("../exports", filename)

    return app
