import { Link } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { App as AntdApp, Form, Input, Button, Card, Typography } from 'antd'
import { fetchLogin } from '../store/modules/userStore'

const { Title, Text } = Typography

function LoginPage() {
  const dispatch = useDispatch()
  const { message: messageApi } = AntdApp.useApp()

  // 登录成功后由 Redux 保存 token，并触发全局用户信息刷新。
  const onFinish = async (values) => {
    try {
      await dispatch(fetchLogin({ username: values.username, password: values.password }))
    } catch (err) {
      messageApi.error(err.response?.data?.message || 'Login failed')
    }
  }

  return (
    <div style={{
      minHeight: 'calc(100vh - 64px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#fafafa', padding: '2rem 1rem',
    }}>
      <Card style={{ width: '100%', maxWidth: 420, borderRadius: 12 }}>
        <Title level={3} style={{ color: '#2F3D37', marginBottom: 4 }}>Welcome back</Title>
        <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
          Log in to your Culinara account
        </Text>

        <Form layout="vertical" onFinish={onFinish} size="large">
          <Form.Item
            label="Username" name="username"
            rules={[{ required: true, message: 'Please enter your username' }]}
          >
            <Input placeholder="chefzhanghao" />
          </Form.Item>

          <Form.Item
            label="Password" name="password"
            rules={[{ required: true, message: 'Please enter your password' }]}
          >
            <Input.Password placeholder="••••••••" />
          </Form.Item>

          <Form.Item style={{ marginBottom: 12 }}>
            <Button type="primary" htmlType="submit" block style={{ height: 44, fontWeight: 700 }}>
              Log In
            </Button>
          </Form.Item>
        </Form>

        <div style={{ textAlign: 'center' }}>
          <Text type="secondary">Don't have an account? </Text>
          <Link to="/register" style={{ fontWeight: 700 }}>Sign up</Link>
        </div>
      </Card>
    </div>
  )
}

export default LoginPage
