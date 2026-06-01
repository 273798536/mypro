import copy
from game.engine import BB84Engine
from game.analyzer import CategorizedAnalysis


class GameState:
    PHASE_SETUP = "setup"
    PHASE_ALICE = "alice"
    PHASE_EVE = "eve"
    PHASE_BOB = "bob"
    PHASE_SIFT = "sift"
    PHASE_ANALYSIS = "analysis"
    PHASE_DONE = "done"

    def __init__(self):
        self._reset_fields()

    def _reset_fields(self):
        self.engine = None
        self.phase = self.PHASE_SETUP
        self.num_photons = 16
        self.ber_threshold = 0.11
        self.raw_events = []
        self.results = None
        self.analysis = None
        self.eve_choices = []
        self.bob_bases = {}
        self.paused = False
        self.paused_phase = None
        self.history = []

    def start_new(self, num_photons=16, ber_threshold=0.11):
        self._reset_fields()
        self.num_photons = num_photons
        self.ber_threshold = ber_threshold
        self.engine = BB84Engine(
            num_photons=num_photons,
            ber_threshold=ber_threshold,
        )
        self.phase = self.PHASE_ALICE
        self.raw_events = self.engine.alice_generate()
        return self._snapshot()

    def set_eve_choices(self, choices):
        self.eve_choices = choices
        self.raw_events = self.engine.eve_intercept(choices)
        return self._snapshot()

    def set_bob_bases(self, bases=None):
        self.bob_bases = bases or {}
        self.raw_events = self.engine.bob_measure(bases)
        return self._snapshot()

    def do_sift(self):
        self.raw_events = self.engine.sift()
        self.raw_events = self.engine.mark_test_sample()
        self.raw_events = self.engine.detect_repeats()
        self.results = self.engine.compute_results()
        self.phase = self.PHASE_ANALYSIS
        return self._snapshot()

    def do_analysis(self):
        if not self.results:
            self.do_sift()
        analyzer = CategorizedAnalysis(self.engine.events, self.results)
        self.analysis = analyzer.analyze()
        self.phase = self.PHASE_DONE
        self.engine.save_raw_events()
        return self._snapshot()

    def pause(self):
        if self.phase in (self.PHASE_SETUP, self.PHASE_DONE):
            return self._snapshot()
        self.paused = True
        self.paused_phase = self.phase
        return self._snapshot()

    def resume(self):
        if not self.paused:
            return self._snapshot()
        self.paused = False
        self.paused_phase = None
        return self._snapshot()

    def restart(self):
        old_params = {
            "num_photons": self.num_photons,
            "ber_threshold": self.ber_threshold,
        }
        self._reset_fields()
        self.num_photons = old_params["num_photons"]
        self.ber_threshold = old_params["ber_threshold"]
        self.phase = self.PHASE_SETUP
        return self._snapshot()

    def get_snapshot(self):
        return self._snapshot()

    def _snapshot(self):
        snap = {
            "phase": self.phase,
            "paused": self.paused,
            "paused_phase": self.paused_phase,
            "num_photons": self.num_photons,
            "ber_threshold": self.ber_threshold,
            "raw_events": [e if isinstance(e, dict) else e.to_raw_dict() for e in self.raw_events],
            "results": self.results,
            "analysis": self.analysis,
            "eve_choices": self.eve_choices,
        }
        return copy.deepcopy(snap)


_game_states = {}


def get_game_state(session_id):
    if session_id not in _game_states:
        _game_states[session_id] = GameState()
    return _game_states[session_id]


def reset_game_state(session_id):
    _game_states[session_id] = GameState()
    return _game_states[session_id]
