import json
import uuid
from datetime import datetime
from typing import Dict, Any, Optional
from models import (
    TherapySession,
    SessionEmotion,
    PlayedTrack,
    EmotionLevel,
    Client,
    MusicTrack,
    SessionPlan,
)


class SessionImporter:
    def __init__(self):
        self.clients: Dict[str, Client] = {}
        self.tracks: Dict[str, MusicTrack] = {}
        self.plans: Dict[str, SessionPlan] = {}
        self.sessions: Dict[str, TherapySession] = {}

    def import_client(self, data: Dict[str, Any], source: str = "") -> Client:
        client = Client(
            client_id=data.get("client_id", f"cli_{uuid.uuid4().hex[:8]}"),
            name=data["name"],
            age=data.get("age"),
            notes=data.get("notes", ""),
        )
        self.clients[client.client_id] = client
        return client

    def import_track(self, data: Dict[str, Any], source: str = "") -> MusicTrack:
        track = MusicTrack(
            track_id=data.get("track_id", f"trk_{uuid.uuid4().hex[:8]}"),
            title=data["title"],
            artist=data["artist"],
            duration=data["duration"],
            genre=data.get("genre", ""),
            tags=data.get("tags", []),
        )
        self.tracks[track.track_id] = track
        return track

    def import_plan(self, data: Dict[str, Any], source: str = "") -> SessionPlan:
        plan = SessionPlan(
            plan_id=data.get("plan_id", f"pln_{uuid.uuid4().hex[:8]}"),
            client_id=data["client_id"],
            title=data["title"],
            planned_tracks=data["planned_tracks"],
            goals=data.get("goals", []),
        )
        self.plans[plan.plan_id] = plan
        return plan

    def import_session(
        self, data: Dict[str, Any], sources: Optional[Dict[str, str]] = None
    ) -> TherapySession:
        emotion_data = data.get("emotion", {})
        emotion = SessionEmotion(
            before=EmotionLevel(emotion_data["before"]) if "before" in emotion_data else None,
            during=EmotionLevel(emotion_data["during"]) if "during" in emotion_data else None,
            after=EmotionLevel(emotion_data["after"]) if "after" in emotion_data else None,
        )

        played_tracks = []
        for track_data in data.get("played_tracks", []):
            played_track = PlayedTrack(
                track_id=track_data["track_id"],
                start_time=datetime.fromisoformat(track_data["start_time"]),
                end_time=datetime.fromisoformat(track_data["end_time"])
                if "end_time" in track_data
                else None,
                notes=track_data.get("notes", ""),
            )
            played_tracks.append(played_track)

        session = TherapySession(
            session_id=data.get("session_id", f"sess_{uuid.uuid4().hex[:8]}"),
            client_id=data["client_id"],
            plan_id=data.get("plan_id"),
            start_time=datetime.fromisoformat(data["start_time"]),
            end_time=datetime.fromisoformat(data["end_time"])
            if "end_time" in data
            else None,
            emotion=emotion,
            played_tracks=played_tracks,
            private_notes=data.get("private_notes", ""),
            public_notes=data.get("public_notes", ""),
            source_references=sources or {},
        )

        if sources:
            session.source_references = sources

        self.sessions[session.session_id] = session
        return session

    def import_from_json(self, file_path: str, source: str = "") -> Dict[str, Any]:
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        sources = {
            "import_file": file_path,
            "import_time": datetime.now().isoformat(),
            "original_source": source,
        }

        results = {"clients": [], "tracks": [], "plans": [], "sessions": []}

        for client_data in data.get("clients", []):
            client = self.import_client(client_data, source)
            results["clients"].append(client)

        for track_data in data.get("tracks", []):
            track = self.import_track(track_data, source)
            results["tracks"].append(track)

        for plan_data in data.get("plans", []):
            plan = self.import_plan(plan_data, source)
            results["plans"].append(plan)

        for session_data in data.get("sessions", []):
            session = self.import_session(session_data, sources)
            results["sessions"].append(session)

        return results

    def get_source_reference(self, session_id: str, ref_type: str) -> Optional[str]:
        session = self.sessions.get(session_id)
        if session:
            return session.source_references.get(ref_type)
        return None

    def trace_sources(self, session_id: str) -> Dict[str, Any]:
        session = self.sessions.get(session_id)
        if not session:
            return {}

        sources = {
            "session": session.source_references,
            "client": None,
            "plan": None,
            "tracks": [],
        }

        client = self.clients.get(session.client_id)
        if client:
            sources["client"] = {"client_id": client.client_id, "name": client.name}

        if session.plan_id:
            plan = self.plans.get(session.plan_id)
            if plan:
                sources["plan"] = {
                    "plan_id": plan.plan_id,
                    "title": plan.title,
                }

        for played in session.played_tracks:
            track = self.tracks.get(played.track_id)
            if track:
                sources["tracks"].append(
                    {
                        "track_id": track.track_id,
                        "title": track.title,
                        "artist": track.artist,
                    }
                )

        return sources
