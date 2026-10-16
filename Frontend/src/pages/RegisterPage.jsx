import { Link } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { App as AntdApp, Form, Input, Button, Card, Typography, Upload, Avatar } from 'antd'
import { UserOutlined, CameraOutlined } from '@ant-design/icons'
import { useState } from 'react'
import { fetchRegister } from '../store/modules/userStore'

const { Title, Text } = Typography

function RegisterPage() {
  const dispatch = useDispatch()
  const { message: messageApi } = AntdApp.useApp()
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(null)

  // 头像只在前端预览，真正上传发生在注册提交时。
  const handleAvatarChange = (info) => {
    const file = info.file
    setAvatarFile(file)
    const reader = new FileReader()
    reader.onload = (e) => setAvatarPreview(e.target.result)
    reader.readAsDataURL(file)
  }

  // 注册使用 FormData，方便同时提交文字信息和头像文件。
  const onFinish = async (values) => {
    try {
      const formData = new FormData()
      formData.append('username', values.username)
      formData.append('email', values.email)
      formData.append('password', values.password)
      if (values.phoneNum) formData.append('phoneNum', values.phoneNum.replace(/\s+/g, ''))
      if (values.address) formData.append('address', values.address)
      if (avatarFile) formData.append('profilePicture', avatarFile)

      await dispatch(fetchRegister(formData))
      messageApi.success('Account created!')
    } catch (err) {
      messageApi.error(err.response?.data?.message || 'Registration failed')
    }
  }

  return (
    <div style={{
      minHeight: 'calc(100vh - 64px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#fafafa', padding: '2rem 1rem',
    }}>
      <Card style={{ width: '100%', maxWidth: 420, borderRadius: 12 }}>
        <Title level={3} style={{ color: '#2F3D37', marginBottom: 4 }}>Create an account</Title>
        <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
          Join Culinara and start cooking together
        </Text>

        <Form layout="vertical" onFinish={onFinish} size="large">
          <Form.Item label="Profile Picture (optional)" style={{ textAlign: 'center' }}>
            <Upload
              showUploadList={false}
              beforeUpload={() => false}
              accept=".jpg,.jpeg,.png"
              onChange={handleAvatarChange}
            >
              <div style={{ position: 'relative', display: 'inline-block', cursor: 'pointer' }}>
                <Avatar
                  size={80}
                  src={avatarPreview}
                  icon={!avatarPreview && <UserOutlined />}
                  style={{ background: avatarPreview ? 'transparent' : '#d9d9d9' }}
                />
                <div style={{
                  position: 'absolute', bottom: 0, right: 0,
                  background: '#50806B', borderRadius: '50%',
                  width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <CameraOutlined style={{ color: '#fff', fontSize: 12 }} />
                </div>
              </div>
              <div style={{ marginTop: 6, color: '#888', fontSize: '0.8rem' }}>Click to upload</div>
            </Upload>
          </Form.Item>

          <Form.Item
            label="Username" name="username"
            rules={[
              { required: true, message: 'Please enter a username' },
              { min: 3, message: 'Username must be at least 3 characters' },
            ]}
          >
            <Input placeholder="chefzhanghao" />
          </Form.Item>

          <Form.Item
            label="Email" name="email"
            rules={[{ required: true, type: 'email', message: 'Please enter a valid email' }]}
          >
            <Input placeholder="you@example.com" />
          </Form.Item>

          <Form.Item
            label="Password" name="password"
            rules={[
              { required: true, message: 'Please enter a password' },
              { min: 6, message: 'Password must be at least 6 characters' },
              { max: 20, message: 'Password must be at most 20 characters' },
            ]}
          >
            <Input.Password placeholder="6-20 characters" />
          </Form.Item>

          <Form.Item
            label="Confirm Password" name="confirmPassword"
            dependencies={['password']}
            rules={[
              { required: true, message: 'Please confirm your password' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) return Promise.resolve()
                  return Promise.reject(new Error('Passwords do not match'))
                },
              }),
            ]}
          >
            <Input.Password placeholder="Repeat password" />
          </Form.Item>

          <Form.Item
            label="Phone Number (optional)" name="phoneNum"
            rules={[{
              validator(_, value) {
                if (!value) return Promise.resolve()
                const stripped = value.replace(/\s+/g, '')
                if (!/^(\+49|0)[1-9]\d{9,12}$/.test(stripped)) {
                  return Promise.reject(new Error('Enter a valid German number (e.g. +49 151 12345678)'))
                }
                return Promise.resolve()
              }
            }]}
          >
            <Input placeholder="+49 151 12345678" />
          </Form.Item>

          <Form.Item label="Address (optional)" name="address">
            <Input placeholder="Notburgastr 19, Munich" maxLength={200} />
          </Form.Item>

          <Form.Item style={{ marginBottom: 12 }}>
            <Button type="primary" htmlType="submit" block style={{ height: 44, fontWeight: 700 }}>
              Sign Up
            </Button>
          </Form.Item>
        </Form>

        <div style={{ textAlign: 'center' }}>
          <Text type="secondary">Already have an account? </Text>
          <Link to="/login" style={{ fontWeight: 700 }}>Log in</Link>
        </div>
      </Card>
    </div>
  )
}

export default RegisterPage
