import os
import yaml

DEFAULT_CONFIG = {
    'database': {
        'path': 'lighting_data.db'
    },
    'import': {
        'photo_extensions': ['.jpg', '.jpeg', '.png'],
        'photo_exif_required': False,
        'default_strategy': 'ignore'
    },
    'check': {
        'required_fields': ['location', 'issue_type'],
        'severity_levels': ['low', 'normal', 'high', 'critical'],
        'auto_retry_errors': ['network_error', 'timeout_error'],
        'manual_fix_errors': ['data_integrity_error', 'business_rule_error']
    },
    'report': {
        'output_dir': 'reports',
        'formats': ['txt', 'csv', 'xlsx']
    },
    'export': {
        'output_dir': 'exports'
    }
}


def load_config(config_path=None):
    if config_path is None:
        config_path = os.path.join(os.getcwd(), 'lighting_config.yaml')
    
    config = DEFAULT_CONFIG.copy()
    
    if os.path.exists(config_path):
        with open(config_path, 'r', encoding='utf-8') as f:
            user_config = yaml.safe_load(f)
            if user_config:
                config = deep_merge(config, user_config)
    
    return config


def save_config(config, config_path=None):
    if config_path is None:
        config_path = os.path.join(os.getcwd(), 'lighting_config.yaml')
    
    with open(config_path, 'w', encoding='utf-8') as f:
        yaml.dump(config, f, default_flow_style=False, allow_unicode=True)


def deep_merge(base, override):
    result = base.copy()
    for key, value in override.items():
        if key in result and isinstance(result[key], dict) and isinstance(value, dict):
            result[key] = deep_merge(result[key], value)
        else:
            result[key] = value
    return result
