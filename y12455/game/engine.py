import random
import time
import uuid
import json
import os

RECTILINEAR = "+"
DIAGONAL = "×"

BASIS_SYMBOLS = {RECTILINEAR: "+", DIAGONAL: "×"}
BIT_STATES = {0: "0", 1: "1"}

PHOTON_ENCODING = {
    (RECTILINEAR, 0): "|0⟩",
    (RECTILINEAR, 1): "|1⟩",
    (DIAGONAL, 0): "|+⟩",
    (DIAGONAL, 1): "|−⟩",
}


def random_bit():
    return random.randint(0, 1)


def random_basis():
    return random.choice([RECTILINEAR, DIAGONAL])


def measure_photon(alice_bit, alice_basis, measure_basis):
    if alice_basis == measure_basis:
        return alice_bit, False
    else:
        return random_bit(), True


class PhotonEvent:
    def __init__(self, index, alice_bit, alice_basis, photon_state):
        self.index = index
        self.alice_bit = alice_bit
        self.alice_basis = alice_basis
        self.photon_state = photon_state
        self.eve_active = False
        self.eve_basis = None
        self.eve_bit_before = None
        self.eve_bit_after = None
        self.eve_basis_mismatch = False
        self.bob_basis = None
        self.bob_bit = None
        self.bob_basis_mismatch = False
        self.sifted = False
        self.sifted_bit_alice = None
        self.sifted_bit_bob = None
        self.bit_error = False
        self.in_test_sample = False
        self.test_bit_match = None
        self.repeated = False
        self.repeat_of = None
        self.timestamp = time.time()

    def to_raw_dict(self):
        return {
            "index": self.index,
            "alice_bit": self.alice_bit,
            "alice_basis": self.alice_basis,
            "photon_state": self.photon_state,
            "eve_active": self.eve_active,
            "eve_basis": self.eve_basis,
            "eve_bit_before": self.eve_bit_before,
            "eve_bit_after": self.eve_bit_after,
            "eve_basis_mismatch": self.eve_basis_mismatch,
            "bob_basis": self.bob_basis,
            "bob_bit": self.bob_bit,
            "bob_basis_mismatch": self.bob_basis_mismatch,
            "sifted": self.sifted,
            "sifted_bit_alice": self.sifted_bit_alice,
            "sifted_bit_bob": self.sifted_bit_bob,
            "bit_error": self.bit_error,
            "in_test_sample": self.in_test_sample,
            "test_bit_match": self.test_bit_match,
            "repeated": self.repeated,
            "repeat_of": self.repeat_of,
            "timestamp": self.timestamp,
        }


class BB84Engine:
    def __init__(self, num_photons=16, ber_threshold=0.11, test_sample_ratio=0.5):
        self.num_photons = num_photons
        self.ber_threshold = ber_threshold
        self.test_sample_ratio = test_sample_ratio
        self.events = []
        self.session_id = uuid.uuid4().hex[:8]
        self.started_at = time.time()

    def alice_generate(self):
        self.events = []
        for i in range(self.num_photons):
            bit = random_bit()
            basis = random_basis()
            state = PHOTON_ENCODING[(basis, bit)]
            event = PhotonEvent(index=i, alice_bit=bit, alice_basis=basis, photon_state=state)
            self.events.append(event)
        return [e.to_raw_dict() for e in self.events]

    def eve_intercept(self, eve_choices):
        """
        eve_choices: list of dicts [{index, basis, active}, ...]
        active=True means Eve intercepts this photon.
        """
        choice_map = {c["index"]: c for c in eve_choices}
        for event in self.events:
            choice = choice_map.get(event.index)
            if choice and choice.get("active"):
                event.eve_active = True
                event.eve_basis = choice["basis"]
                event.eve_bit_before = event.alice_bit
                measured, mismatch = measure_photon(
                    event.alice_bit, event.alice_basis, event.eve_basis
                )
                event.eve_bit_after = measured
                event.eve_basis_mismatch = mismatch
        return [e.to_raw_dict() for e in self.events]

    def bob_measure(self, bob_bases=None):
        for event in self.events:
            if bob_bases and event.index in bob_bases:
                event.bob_basis = bob_bases[event.index]
            else:
                event.bob_basis = random_basis()

            effective_bit = event.alice_bit
            effective_basis = event.alice_basis

            if event.eve_active:
                effective_bit = event.eve_bit_after
                effective_basis = event.eve_basis

            measured, mismatch = measure_photon(
                effective_bit, effective_basis, event.bob_basis
            )
            event.bob_bit = measured
            event.bob_basis_mismatch = mismatch

        return [e.to_raw_dict() for e in self.events]

    def sift(self):
        for event in self.events:
            if event.alice_basis == event.bob_basis:
                event.sifted = True
                event.sifted_bit_alice = event.alice_bit
                event.sifted_bit_bob = event.bob_bit
                event.bit_error = (event.alice_bit != event.bob_bit)
            else:
                event.sifted = False
                event.sifted_bit_alice = None
                event.sifted_bit_bob = None
                event.bit_error = False
        return [e.to_raw_dict() for e in self.events]

    def mark_test_sample(self):
        sifted_indices = [e.index for e in self.events if e.sifted]
        sample_size = max(1, int(len(sifted_indices) * self.test_sample_ratio))
        test_indices = set(random.sample(sifted_indices, min(sample_size, len(sifted_indices))))
        for event in self.events:
            if event.index in test_indices:
                event.in_test_sample = True
                event.test_bit_match = (event.sifted_bit_alice == event.sifted_bit_bob)
            else:
                event.in_test_sample = False
                event.test_bit_match = None
        return [e.to_raw_dict() for e in self.events]

    def detect_repeats(self):
        seen = {}
        for event in self.events:
            key = (event.alice_bit, event.alice_basis, event.photon_state)
            if key in seen:
                event.repeated = True
                event.repeat_of = seen[key]
            else:
                seen[key] = event.index
        return [e.to_raw_dict() for e in self.events]

    def compute_results(self):
        sifted_events = [e for e in self.events if e.sifted]
        test_events = [e for e in sifted_events if e.in_test_sample]
        key_events = [e for e in sifted_events if not e.in_test_sample]

        test_errors = [e for e in test_events if not e.test_bit_match]
        ber = len(test_errors) / len(test_events) if test_events else 0.0

        basis_confusions = [e for e in self.events if e.eve_active and e.eve_basis_mismatch]
        bob_confusions = [e for e in self.events if e.bob_basis_mismatch]

        repeats = [e for e in self.events if e.repeated]

        final_key = "".join(str(e.sifted_bit_alice) for e in key_events)
        final_key_bob = "".join(str(e.sifted_bit_bob) for e in key_events)

        return {
            "session_id": self.session_id,
            "num_photons": self.num_photons,
            "ber_threshold": self.ber_threshold,
            "num_sifted": len(sifted_events),
            "num_test": len(test_events),
            "num_key_bits": len(key_events),
            "test_errors": len(test_errors),
            "ber": round(ber, 4),
            "ber_exceeded": ber > self.ber_threshold,
            "basis_confusion_count": len(basis_confusions),
            "bob_basis_confusion_count": len(bob_confusions),
            "repeat_count": len(repeats),
            "final_key_alice": final_key,
            "final_key_bob": final_key_bob,
            "key_match": final_key == final_key_bob,
            "started_at": self.started_at,
            "finished_at": time.time(),
        }

    def save_raw_events(self, data_dir="data"):
        os.makedirs(data_dir, exist_ok=True)
        filepath = os.path.join(data_dir, f"session_{self.session_id}.json")
        payload = {
            "session_id": self.session_id,
            "num_photons": self.num_photons,
            "ber_threshold": self.ber_threshold,
            "test_sample_ratio": self.test_sample_ratio,
            "started_at": self.started_at,
            "raw_events": [e.to_raw_dict() for e in self.events],
        }
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(payload, f, ensure_ascii=False, indent=2)
        return filepath
