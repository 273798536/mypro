from app import app

if __name__ == '__main__':
    print("=" * 60)
    print("  排队窗口图表解释 - 数据处理链系统")
    print("=" * 60)
    print("  服务地址: http://localhost:5003")
    print("  按 Ctrl+C 停止服务")
    print("=" * 60)
    app.run(debug=False, host='0.0.0.0', port=5003)
