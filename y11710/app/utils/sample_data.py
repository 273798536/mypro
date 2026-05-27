import numpy as np


def generate_sample_data(student_id='S001', with_anomalies=True, noise_level=0.02):
    t = np.linspace(0, 10, 200)
    
    A = 0.1
    gamma = 0.15
    omega = 2 * np.pi * 1.2
    phi = 0.0
    offset = 0.05
    
    x_clean = A * np.exp(-gamma * t) * np.cos(omega * t + phi) + offset
    noise = np.random.normal(0, noise_level, size=len(t))
    x = x_clean + noise
    
    if with_anomalies:
        anomaly_indices = np.random.choice(len(t), size=5, replace=False)
        for idx in anomaly_indices:
            x[idx] += np.random.choice([-1, 1]) * 0.1
        
        if len(t) > 50:
            t = np.delete(t, 50)
            x = np.delete(x, 50)
    
    return {
        'time': t.tolist(),
        'displacement': x.tolist(),
        'metadata': {
            'student_id': student_id,
            'mass': 0.5,
            'spring_constant': 25.0,
            'notes': '样例数据，包含5个异常点和1个采样漏点'
        },
        'source': f'sample_{student_id}',
        'unit_warnings': []
    }


def generate_sample_dataset():
    samples = []
    
    samples.append(generate_sample_data('S001', with_anomalies=True, noise_level=0.02))
    samples.append(generate_sample_data('S002', with_anomalies=False, noise_level=0.01))
    samples.append(generate_sample_data('S003', with_anomalies=True, noise_level=0.05))
    
    return samples
