from app import app

if __name__ == '__main__':
    print("=" * 60)
    print("📦 线性规划仓储分拨系统")
    print("=" * 60)
    print("启动服务中...")
    print("访问地址: http://localhost:5001")
    print("=" * 60)
    app.run(debug=True, host='0.0.0.0', port=5001)
