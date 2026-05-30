import numpy as np
import soundfile as sf
from pathlib import Path


def generate_test_audio(output_dir):
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    
    sample_rates = [44100, 48000, 22050, 8000]
    durations = [2.0, 3.0, 1.5]
    
    for i, sr in enumerate(sample_rates):
        duration = durations[i % len(durations)]
        t = np.linspace(0, duration, int(sr * duration), endpoint=False)
        
        signal = 0.5 * np.sin(2 * np.pi * 440 * t)
        signal += 0.3 * np.sin(2 * np.pi * 880 * t)
        signal += 0.2 * np.sin(2 * np.pi * 1760 * t)
        
        noise = 0.1 * np.random.randn(len(t))
        audio = signal + noise
        
        audio = audio / np.max(np.abs(audio)) * 0.9
        
        filename = f'test_{sr}hz_{int(duration)}s.wav'
        sf.write(str(output_dir / filename), audio, sr)
        print(f"生成: {filename} (采样率: {sr} Hz)")
    
    print("\n测试音频生成完成!")


if __name__ == '__main__':
    generate_test_audio('../test_audio')
