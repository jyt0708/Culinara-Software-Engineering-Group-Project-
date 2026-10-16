import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import {
  Form, Input, Button, Upload, Checkbox, App as AntdApp, Card, Typography
} from 'antd'
import { UploadOutlined } from '@ant-design/icons'
import { submitApplicationAPI, getMyApplicationAPI } from '../apis/application'

const { Title, Text } = Typography
const { TextArea } = Input

function CreatorApplyPage() {
  const navigate = useNavigate()
  const { userInfo } = useSelector((state) => state.user)
  const { message: messageApi } = AntdApp.useApp()
  const [loading, setLoading] = useState(false)
  const [checkingStatus, setCheckingStatus] = useState(true) // 检查申请状态期间显示空白，避免表单闪现

  useEffect(() => {
    // creator 和 admin 不需要申请，直接跳首页
    if (userInfo?.role === 'creator' || userInfo?.role === 'admin') {
      navigate('/', { replace: true })
      return
    }

    // 检查是否已有 pending 或 approved 的申请
    // 有的话跳到 /profile 的 My Application tab 去查看状态
    // rejected 的不跳转，允许重新填写表单
    getMyApplicationAPI()
      .then((res) => {
        if (res.data && (res.data.status === 'pending' || res.data.status === 'approved')) {
          navigate('/profile?tab=My+Application', { replace: true })
        }
      })
      .catch(() => {})
      .finally(() => setCheckingStatus(false))
  }, [userInfo, navigate])

  const onFinish = async (values) => {
    if (!values.idDocument?.[0] || !values.workProof?.[0]) {
      return messageApi.error('Please upload both required documents')
    }

    // 用 FormData 打包文本字段和文件（multipart/form-data）
    const formData = new FormData()
    formData.append('motivation', values.motivation)
    formData.append('experience', values.experience)
    formData.append('bio', values.bio || '') // bio 选填，没填就传空串
    // originFileObj 是 Ant Design Upload 包装后的原始 File 对象
    formData.append('idDocument', values.idDocument[0].originFileObj)
    formData.append('workProof', values.workProof[0].originFileObj)

    setLoading(true)
    try {
      await submitApplicationAPI(formData)
      messageApi.success('Application submitted!')
      // 1.5秒后跳转，让用户看到成功提示
      setTimeout(() => navigate('/profile'), 1500)
    } catch (err) {
      messageApi.error(err.response?.data?.message || 'Submission failed')
    } finally {
      setLoading(false)
    }
  }

  // 状态检查期间不渲染任何内容，防止表单闪现后又消失
  if (checkingStatus) return null

  return (
    <div style={{ maxWidth: 700, margin: '2.5rem auto 5rem', padding: '0 1.25rem' }}>
      <Title level={2} style={{ color: '#c25450', marginBottom: 4 }}>Apply to Become a Creator</Title>
      <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
        Submit a short application so Culinara can verify your cooking background before allowing recipe publishing.
      </Text>

      <Card>
        <Form layout="vertical" onFinish={onFinish} size="large">
          <Form.Item
            label="Why do you want to become a creator?"
            name="motivation"
            rules={[{ required: true, message: 'Please fill in this field' }]}
          >
            <TextArea rows={4} maxLength={700} showCount placeholder="Tell us your motivation..." />
          </Form.Item>

          <Form.Item
            label="Relevant cooking or catering experience"
            name="experience"
            rules={[{ required: true, message: 'Please fill in this field' }]}
          >
            <TextArea rows={4} maxLength={1000} showCount placeholder="Describe your experience..." />
          </Form.Item>

          {/* Bio 选填，以后做 creator 主页时会显示 */}
          <Form.Item
            label="Short Bio (optional)"
            name="bio"
          >
            <TextArea rows={3} maxLength={300} showCount placeholder="e.g. Home cook from Munich, specialising in Bavarian classics..." />
          </Form.Item>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            {/* valuePropName="fileList" 让 Form 管理文件列表状态 */}
            {/* getValueFromEvent 统一处理 Upload 的 onChange 返回值 */}
            {/* beforeUpload={() => false} 阻止自动上传，由表单提交时手动处理 */}
            <Form.Item
              label="Personal ID Document"
              name="idDocument"
              valuePropName="fileList"
              getValueFromEvent={(e) => (Array.isArray(e) ? e : e?.fileList)}
              rules={[{ required: true, message: 'Please upload your ID' }]}
            >
              <Upload beforeUpload={() => false} maxCount={1} accept=".jpg,.jpeg,.png,.pdf">
                <Button icon={<UploadOutlined />}>Choose File</Button>
              </Upload>
            </Form.Item>

            <Form.Item
              label="Food Service Work Proof"
              name="workProof"
              valuePropName="fileList"
              getValueFromEvent={(e) => (Array.isArray(e) ? e : e?.fileList)}
              rules={[{ required: true, message: 'Please upload work proof' }]}
            >
              <Upload beforeUpload={() => false} maxCount={1} accept=".jpg,.jpeg,.png,.pdf">
                <Button icon={<UploadOutlined />}>Choose File</Button>
              </Upload>
            </Form.Item>
          </div>

          {/* 自定义 validator：勾选才通过，不勾选报错 */}
          <Form.Item
            name="confirmed"
            valuePropName="checked"
            rules={[{ validator: (_, v) => v ? Promise.resolve() : Promise.reject('Please confirm') }]}
          >
            <Checkbox>
              I confirm that the information and uploaded documents are accurate and may be reviewed by Culinara admins.
            </Checkbox>
          </Form.Item>

          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
            <Button onClick={() => navigate('/')}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={loading}>
              Submit Application
            </Button>
          </div>
        </Form>
      </Card>
    </div>
  )
}

export default CreatorApplyPage
