import React from 'react';
import { Form, Input, Button, Card, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function LoginPage() {
  const [form] = Form.useForm();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = React.useState(false);

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      await login(values.username, values.password);
      message.success('登录成功');
      navigate('/dashboard');
    } catch (error: any) {
      message.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    }}>
      <Card 
        style={{ width: 400, boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}
        title={
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ marginBottom: 0 }}>企业培训签到补偿系统</h2>
            <p style={{ color: '#8c8c8c', fontSize: 14, marginTop: 8 }}>请登录以继续</p>
          </div>
        }
      >
        <Form
          form={form}
          name="login"
          onFinish={onFinish}
          size="large"
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input 
              prefix={<UserOutlined />} 
              placeholder="用户名" 
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="密码"
            />
          </Form.Item>

          <Form.Item>
            <Button 
              type="primary" 
              htmlType="submit" 
              loading={loading}
              block
            >
              登录
            </Button>
          </Form.Item>
        </Form>

        <div style={{ 
          marginTop: 24, 
          paddingTop: 16, 
          borderTop: '1px solid #f0f0f0',
          fontSize: 12,
          color: '#8c8c8c'
        }}>
          <p style={{ marginBottom: 4 }}>测试账号:</p>
          <p style={{ marginBottom: 4 }}>• admin / 123456 (主管权限)</p>
          <p style={{ marginBottom: 4 }}>• reviewer / 123456 (复核权限)</p>
          <p style={{ marginBottom: 4 }}>• entry / 123456 (录入权限)</p>
          <p>• viewer / 123456 (只读权限)</p>
        </div>
      </Card>
    </div>
  );
}

export default LoginPage;
