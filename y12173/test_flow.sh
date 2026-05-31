#!/bin/bash
echo "=== 歌词押韵辅助CLI 流程测试 ==="

echo ""
echo "1. 初始化项目..."
python3 lyric_rhyme_cli.py init

echo ""
echo "2. 导入第一版歌词..."
python3 lyric_rhyme_cli.py import examples/sample_lyrics.txt --name 第一版

echo ""
echo "3. 检查押韵..."
python3 lyric_rhyme_cli.py check

echo ""
echo "4. 查看版本历史..."
python3 lyric_rhyme_cli.py history

echo ""
echo "5. 生成报告..."
python3 lyric_rhyme_cli.py report

echo ""
echo "=== 测试完成 ==="
