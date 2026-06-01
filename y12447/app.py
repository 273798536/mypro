from flask import Flask, render_template, request, jsonify, session
import numpy as np
import json
import uuid
from datetime import datetime
import copy

app = Flask(__name__)
app.secret_key = 'fourier-kitchen-secret-key-2024'

GAME_STATES = {}

FREQUENCY_INGREDIENTS = [
    {'id': 'f1', 'name': '低频洋葱', 'freq': 1, 'amplitude': 1.0, 'phase': 0, 'category': 'vegetable'},
    {'id': 'f2', 'name': '中频番茄', 'freq': 3, 'amplitude': 0.8, 'phase': 0, 'category': 'vegetable'},
    {'id': 'f3', 'name': '高频辣椒', 'freq': 5, 'amplitude': 0.5, 'phase': 0, 'category': 'spice'},
    {'id': 'f4', 'name': '倍频大蒜', 'freq': 2, 'amplitude': 0.7, 'phase': 0, 'category': 'spice'},
    {'id': 'f5', 'name': '谐波土豆', 'freq': 4, 'amplitude': 0.6, 'phase': 0, 'category': 'vegetable'},
    {'id': 'f6', 'name': '基频胡萝卜', 'freq': 1, 'amplitude': 1.2, 'phase': 0, 'category': 'vegetable'},
    {'id': 'f7', 'name': '反相生姜', 'freq': 3, 'amplitude': 0.8, 'phase': np.pi, 'category': 'spice'},
    {'id': 'f8', 'name': '噪音蘑菇', 'freq': 7, 'amplitude': 0.3, 'phase': 0, 'category': 'noise'},
]

WAVE_POTS = [
    {'id': 'pot1', 'name': '采样锅-8Hz', 'sample_rate': 8, 'filter_cutoff': None},
    {'id': 'pot2', 'name': '采样锅-16Hz', 'sample_rate': 16, 'filter_cutoff': None},
    {'id': 'pot3', 'name': '低通锅-4Hz', 'sample_rate': 16, 'filter_cutoff': 4},
    {'id': 'pot4', 'name': '低通锅-2Hz', 'sample_rate': 16, 'filter_cutoff': 2},
]

TARGET_RECIPES = [
    {
        'id': 'recipe1',
        'name': '基础正弦汤',
        'difficulty': 1,
        'target_wave': {'freq': 1, 'amplitude': 1.0, 'phase': 0},
        'required_ingredients': ['f1'],
        'description': '只用低频洋葱煮出纯净的1Hz正弦波'
    },
    {
        'id': 'recipe2',
        'name': '和谐双拼',
        'difficulty': 2,
        'target_wave': {'freq': 1, 'amplitude': 1.0, 'phase': 0, 'harmonic': 3},
        'required_ingredients': ['f1', 'f2'],
        'description': '低频洋葱配中频番茄，注意不要混叠'
    },
    {
        'id': 'recipe3',
        'name': '反相平衡',
        'difficulty': 3,
        'target_wave': {'freq': 3, 'amplitude': 0, 'phase': 0},
        'required_ingredients': ['f2', 'f7'],
        'description': '用反相生姜抵消中频番茄，输出零信号'
    },
    {
        'id': 'recipe4',
        'name': '奈奎斯特挑战',
        'difficulty': 4,
        'target_wave': {'freq': 5, 'amplitude': 0.5, 'phase': 0},
        'required_ingredients': ['f3'],
        'forbidden_pots': ['pot1'],
        'description': '高频辣椒必须用足够的采样率，否则会混叠'
    },
]

def create_new_game(recipe_id='recipe1'):
    recipe = next((r for r in TARGET_RECIPES if r['id'] == recipe_id), TARGET_RECIPES[0])
    return {
        'game_id': str(uuid.uuid4()),
        'created_at': datetime.now().isoformat(),
        'status': 'playing',
        'current_recipe': recipe,
        'selected_pot': None,
        'added_ingredients': [],
        'steps': [],
        'records': [],
        'score': 0,
        'aliasing_detected': False,
        'over_filtering': False,
        'phase_inverted': False,
        'is_paused': False
    }

def generate_wave(ingredients, sample_rate, duration=2.0):
    t = np.linspace(0, duration, int(sample_rate * duration), endpoint=False)
    wave = np.zeros_like(t)
    for ing in ingredients:
        wave += ing['amplitude'] * np.sin(2 * np.pi * ing['freq'] * t + ing['phase'])
    return t.tolist(), wave.tolist()

def check_aliasing(ingredients, sample_rate):
    nyquist = sample_rate / 2
    for ing in ingredients:
        if ing['freq'] > nyquist:
            return True, ing['freq'], nyquist
    return False, 0, nyquist

def apply_filter(wave, sample_rate, cutoff):
    if cutoff is None:
        return wave
    fft_wave = np.fft.fft(wave)
    freqs = np.fft.fftfreq(len(wave), 1/sample_rate)
    mask = np.abs(freqs) <= cutoff
    filtered_fft = fft_wave * mask
    return np.fft.ifft(filtered_fft).real.tolist()

def calculate_similarity(target, ingredients, pot):
    sample_rate = pot['sample_rate']
    t, output_wave = generate_wave(ingredients, sample_rate)
    
    aliasing, _, _ = check_aliasing(ingredients, sample_rate)
    
    if pot['filter_cutoff']:
        output_wave = apply_filter(output_wave, sample_rate, pot['filter_cutoff'])
    
    target_wave = target['amplitude'] * np.sin(2 * np.pi * target['freq'] * np.array(t) + target.get('phase', 0))
    if 'harmonic' in target:
        target_wave += 0.3 * target['amplitude'] * np.sin(2 * np.pi * target['harmonic'] * np.array(t))
    
    if len(output_wave) != len(target_wave):
        output_wave = np.array(output_wave[:len(target_wave)])
    
    correlation = np.corrcoef(output_wave, target_wave)[0, 1] if np.std(output_wave) > 0 and np.std(target_wave) > 0 else 0
    
    amplitude_diff = np.abs(np.max(output_wave) - np.max(target_wave)) if len(output_wave) > 0 else 999
    
    score = max(0, 100 * (0.6 * max(0, correlation) + 0.4 * max(0, 1 - amplitude_diff/2)))
    
    return score, output_wave.tolist(), target_wave.tolist(), t

@app.route('/')
def index():
    return render_template('index.html', 
                         ingredients=FREQUENCY_INGREDIENTS,
                         pots=WAVE_POTS,
                         recipes=TARGET_RECIPES)

@app.route('/api/new_game', methods=['POST'])
def new_game():
    data = request.json
    game = create_new_game(data.get('recipe_id', 'recipe1'))
    GAME_STATES[game['game_id']] = game
    return jsonify({'game_id': game['game_id'], 'game': game})

@app.route('/api/select_pot', methods=['POST'])
def select_pot():
    data = request.json
    game_id = data['game_id']
    pot_id = data['pot_id']
    
    if game_id not in GAME_STATES:
        return jsonify({'error': 'Game not found'}), 404
    
    game = GAME_STATES[game_id]
    pot = next((p for p in WAVE_POTS if p['id'] == pot_id), None)
    
    game['selected_pot'] = pot
    game['steps'].append({
        'type': 'select_pot',
        'pot_id': pot_id,
        'timestamp': datetime.now().isoformat(),
        'note': f'选择了{pot["name"]}'
    })
    
    return jsonify({'game': game})

@app.route('/api/add_ingredient', methods=['POST'])
def add_ingredient():
    data = request.json
    game_id = data['game_id']
    ingredient_id = data['ingredient_id']
    
    if game_id not in GAME_STATES:
        return jsonify({'error': 'Game not found'}), 404
    
    game = GAME_STATES[game_id]
    ingredient = next((i for i in FREQUENCY_INGREDIENTS if i['id'] == ingredient_id), None)
    
    if not ingredient:
        return jsonify({'error': 'Ingredient not found'}), 404
    
    ingredient_copy = copy.deepcopy(ingredient)
    game['added_ingredients'].append(ingredient_copy)
    game['steps'].append({
        'type': 'add_ingredient',
        'ingredient_id': ingredient_id,
        'ingredient_name': ingredient['name'],
        'timestamp': datetime.now().isoformat(),
        'phase': ingredient_copy['phase']
    })
    
    if ingredient_copy['phase'] != 0:
        game['phase_inverted'] = True
    
    return jsonify({'game': game})

@app.route('/api/remove_ingredient', methods=['POST'])
def remove_ingredient():
    data = request.json
    game_id = data['game_id']
    index = data['index']
    
    if game_id not in GAME_STATES:
        return jsonify({'error': 'Game not found'}), 404
    
    game = GAME_STATES[game_id]
    if 0 <= index < len(game['added_ingredients']):
        removed = game['added_ingredients'].pop(index)
        game['steps'].append({
            'type': 'remove_ingredient',
            'ingredient_name': removed['name'],
            'timestamp': datetime.now().isoformat()
        })
    
    return jsonify({'game': game})

@app.route('/api/cook', methods=['POST'])
def cook():
    data = request.json
    game_id = data['game_id']
    
    if game_id not in GAME_STATES:
        return jsonify({'error': 'Game not found'}), 404
    
    game = GAME_STATES[game_id]
    
    if not game['selected_pot']:
        return jsonify({'error': '请先选择一个波形锅'}), 400
    
    pot = game['selected_pot']
    ingredients = game['added_ingredients']
    target = game['current_recipe']['target_wave']
    
    aliasing, alias_freq, nyquist = check_aliasing(ingredients, pot['sample_rate'])
    game['aliasing_detected'] = aliasing
    
    score, output_wave, target_wave, t = calculate_similarity(target, ingredients, pot)
    game['score'] = score
    
    if pot['filter_cutoff']:
        filtered_output = apply_filter(output_wave, pot['sample_rate'], pot['filter_cutoff'])
        original_energy = np.sum(np.array(output_wave)**2)
        filtered_energy = np.sum(np.array(filtered_output)**2)
        if original_energy > 0 and (original_energy - filtered_energy) / original_energy > 0.5:
            game['over_filtering'] = True
        output_wave = filtered_output
    
    game['steps'].append({
        'type': 'cook',
        'timestamp': datetime.now().isoformat(),
        'score': score,
        'aliasing': aliasing,
        'alias_freq': alias_freq,
        'nyquist': nyquist
    })
    
    if score >= 80:
        game['status'] = 'won'
    elif len(game['steps']) > 20:
        game['status'] = 'lost'
    
    return jsonify({
        'game': game,
        'output_wave': output_wave,
        'target_wave': target_wave,
        'time': t.tolist(),
        'score': score,
        'aliasing': aliasing,
        'alias_freq': alias_freq,
        'nyquist': nyquist
    })

@app.route('/api/add_record', methods=['POST'])
def add_record():
    data = request.json
    game_id = data['game_id']
    record = data['record']
    
    if game_id not in GAME_STATES:
        return jsonify({'error': 'Game not found'}), 404
    
    game = GAME_STATES[game_id]
    
    record_entry = {
        'id': str(uuid.uuid4()),
        'timestamp': datetime.now().isoformat(),
        'type': record.get('type', 'observation'),
        'content': record.get('content', ''),
        'fields': record.get('fields', {}),
        'missing_fields': record.get('missing_fields', []),
        'is_late': record.get('is_late', False),
        'note_modified': record.get('note_modified', False),
        'original_note': record.get('original_note', ''),
        'phase_info': record.get('phase_info', '')
    }
    
    game['records'].append(record_entry)
    return jsonify({'record': record_entry, 'game': game})

@app.route('/api/pause_game', methods=['POST'])
def pause_game():
    data = request.json
    game_id = data['game_id']
    
    if game_id not in GAME_STATES:
        return jsonify({'error': 'Game not found'}), 404
    
    game = GAME_STATES[game_id]
    game['is_paused'] = True
    return jsonify({'game': game})

@app.route('/api/resume_game', methods=['POST'])
def resume_game():
    data = request.json
    game_id = data['game_id']
    clean_state = data.get('clean_state', True)
    
    if game_id not in GAME_STATES:
        return jsonify({'error': 'Game not found'}), 404
    
    game = GAME_STATES[game_id]
    game['is_paused'] = False
    
    if clean_state:
        game['added_ingredients'] = []
        game['steps'] = []
        game['records'] = []
        game['aliasing_detected'] = False
        game['over_filtering'] = False
        game['phase_inverted'] = False
        game['score'] = 0
    
    return jsonify({'game': game})

@app.route('/api/export_game', methods=['POST'])
def export_game():
    data = request.json
    game_id = data['game_id']
    
    if game_id not in GAME_STATES:
        return jsonify({'error': 'Game not found'}), 404
    
    game = GAME_STATES[game_id]
    
    export_data = {
        'game_id': game['game_id'],
        'recipe': game['current_recipe']['name'],
        'final_score': game['score'],
        'status': game['status'],
        'phase_inverted': game['phase_inverted'],
        'aliasing_detected': game['aliasing_detected'],
        'over_filtering': game['over_filtering'],
        'steps': game['steps'],
        'records': game['records'],
        'exported_at': datetime.now().isoformat()
    }
    
    return jsonify(export_data)

@app.route('/api/get_game', methods=['GET'])
def get_game():
    game_id = request.args.get('game_id')
    
    if game_id not in GAME_STATES:
        return jsonify({'error': 'Game not found'}), 404
    
    return jsonify({'game': GAME_STATES[game_id]})

if __name__ == '__main__':
    app.run(debug=True, port=5000)
