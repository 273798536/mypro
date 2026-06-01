import math

SPEED_OF_SOUND_AT_20C = 343.0
TEMP_COEFFICIENT = 0.6


def speed_of_sound(temperature_c: float) -> float:
    return SPEED_OF_SOUND_AT_20C + TEMP_COEFFICIENT * (temperature_c - 20.0)


def wavelength(frequency_hz: float, temperature_c: float = 20.0) -> float:
    v = speed_of_sound(temperature_c)
    return v / frequency_hz


def theoretical_node_positions(pipe_length_m: float, harmonic_n: int, open_open: bool = True) -> list[float]:
    if open_open:
        positions = []
        for k in range(1, harmonic_n + 1):
            pos = pipe_length_m * k / (harmonic_n + 1)
            positions.append(round(pos, 6))
        return positions
    else:
        positions = []
        for k in range(harmonic_n + 1):
            pos = pipe_length_m * k / harmonic_n if harmonic_n > 0 else 0.0
            positions.append(round(pos, 6))
        return positions


def detect_harmonic(frequency_hz: float, pipe_length_m: float, temperature_c: float = 20.0) -> int:
    v = speed_of_sound(temperature_c)
    fundamental = v / (2.0 * pipe_length_m)
    if fundamental == 0:
        return 1
    n = round(frequency_hz / fundamental)
    return max(1, n)


def temperature_correction_delta(old_temp_c: float, new_temp_c: float) -> float:
    return TEMP_COEFFICIENT * (new_temp_c - old_temp_c)
