from app import create_app
import os

app = create_app()

if __name__ == '__main__':
    port = int(os.environ.get('FORGET_DIAG_PORT', 5050))
    app.run(host='0.0.0.0', port=port, debug=False)
    print(f'\n对话多轮遗忘诊断 已启动: http://localhost:{port}/')
