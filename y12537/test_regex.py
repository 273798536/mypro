import re

CLASS_NAME_PATTERNS = [
    r'(?:class|班级|课堂|批次|batch)\s*[:=]\s*(?P<name>.+?)(?:\s*\[|\s*--.*|\s*$)',
    r'^\s*(?P<name>.+?)\s*(?:班|课堂|batch)\s*$',
]

LEARNING_RATE_PATTERNS = [
    r'(?:learning[_ ]?rate|lr)\s*[:=]\s*(?P<lr>\d+\.?\d*[eE]?[+-]?\d*)',
    r'(?:学习率|学习速率)\s*[:=]\s*(?P<lr>\d+\.?\d*[eE]?[+-]?\d*)',
    r'^\s*(?P<lr>\d+\.?\d*[eE]?[+-]?\d*)\s*$',
]

test_lines = [
    '班级：高三5班',
    '班级：高三6班--临时改名测试',
    '班级：高三7班',
    'class: Test Class',
    '学习率：0.01',
    'learning_rate: 0.01',
    '学习率：',
]

for line in test_lines:
    print(f'测试: {line!r}')

    for pattern in CLASS_NAME_PATTERNS:
        match = re.search(pattern, line, re.IGNORECASE)
        if match:
            print(f'  班级匹配: {match.group("name")!r}')
            break

    for pattern in LEARNING_RATE_PATTERNS:
        match = re.search(pattern, line, re.IGNORECASE)
        if match:
            print(f'  学习率匹配: {match.group("lr")!r}')
            break

    print()
