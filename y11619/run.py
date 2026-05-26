from app import create_app, db

app = create_app()

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
        from app.sample_data import init_sample_data
        init_sample_data()
    print("\n" + "="*60)
    print("  会员积分负债预测 API 启动成功")
    print("="*60)
    print("  健康检查: http://localhost:5001/health")
    print("  API文档: http://localhost:5001/api/help")
    print("="*60 + "\n")
    app.run(debug=True, host='0.0.0.0', port=5001)
