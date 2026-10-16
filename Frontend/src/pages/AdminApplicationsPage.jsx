import { useState, useEffect } from 'react'
import {
  Input, Button, Avatar, Card, Typography, Space,
  Descriptions, App as AntdApp, Empty, Spin
} from 'antd'
import { getAllApplicationsAPI, approveApplicationAPI, rejectApplicationAPI } from '../apis/application'

const { Title, Text } = Typography
const { TextArea } = Input

function AdminApplicationsPage() {
  const { message: messageApi } = AntdApp.useApp()
  const [applications, setApplications] = useState([])
  const [selected, setSelected] = useState(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

  // Admin 页面只加载待审核的 creator 申请。
  useEffect(() => {
    getAllApplicationsAPI()
      .then((res) => {
        setApplications(res.data)
        if (res.data.length > 0) setSelected(res.data[0])
      })
      .catch(() => messageApi.error('Failed to load applications'))
      .finally(() => setLoading(false))
  }, [])

  // 审核完成后从左侧列表移除，并自动选中下一条申请。
  const removeFromList = (id) => {
    const nextApplications = applications.filter((a) => a._id !== id)
    setApplications(nextApplications)
    setSelected((prev) => (prev?._id === id ? nextApplications[0] || null : prev))
  }

  // 批准后后端会把申请人角色升级为 creator。
  const handleApprove = async () => {
    if (!selected) return
    setActionLoading(true)
    try {
      await approveApplicationAPI(selected._id)
      removeFromList(selected._id)
      messageApi.success('Application approved')
    } catch (err) {
      messageApi.error(err.response?.data?.message || 'Failed')
    } finally {
      setActionLoading(false)
    }
  }

  // 拒绝时保存原因，用户可以在 Profile 的申请状态里看到。
  const handleReject = async () => {
    if (!selected) return
    setActionLoading(true)
    try {
      await rejectApplicationAPI(selected._id, rejectionReason)
      removeFromList(selected._id)
      setRejectionReason('')
      messageApi.success('Application rejected')
    } catch (err) {
      messageApi.error(err.response?.data?.message || 'Failed')
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 1260, margin: '2rem auto 5rem', padding: '0 1.25rem' }}>
      <Title level={2} style={{ color: '#2F3D37', marginBottom: 4 }}>Creator Applications</Title>
      <Text type="secondary" style={{ display: 'block', marginBottom: 20 }}>
        Review users who applied to publish recipes as Culinara creators.
      </Text>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 0.9fr) minmax(420px, 1.1fr)', gap: 16, alignItems: 'start' }}>

        <div style={{ display: 'grid', gap: 8 }}>
          {loading ? <Spin /> : applications.length === 0 ? <Empty description="No pending applications" /> : (
            applications.map((app) => (
              <Card
                key={app._id}
                size="small"
                hoverable
                onClick={() => {
                  setSelected(app)
                  setRejectionReason('')
                }}
                style={{
                  cursor: 'pointer',
                  borderColor: selected?._id === app._id ? '#50806B' : undefined,
                  boxShadow: selected?._id === app._id ? '0 0 0 1px rgba(80,128,107,0.2)' : undefined,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Avatar style={{ background: 'linear-gradient(135deg, #f9b8c8, #e879a0)', flexShrink: 0 }}>
                    {app.user?.username?.[0]?.toUpperCase()}
                  </Avatar>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{app.user?.username}</div>
                    <div style={{ color: '#626b66', fontSize: '0.78rem' }}>{app.user?.email}</div>
                    <div style={{ color: '#626b66', fontSize: '0.78rem' }}>
                      Applied {new Date(app.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
        {selected ? (
          <Card style={{ position: 'sticky', top: 80 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingBottom: 16, borderBottom: '1px solid #e3e7e4', marginBottom: 16 }}>
              <Avatar size={44} style={{ background: 'linear-gradient(135deg, #f9b8c8, #e879a0)', border: '2px solid #50806B' }}>
                {selected.user?.username?.[0]?.toUpperCase()}
              </Avatar>
              <div>
                <div style={{ fontWeight: 800, fontSize: '1.05rem' }}>{selected.user?.username}</div>
                <Text type="secondary" style={{ fontSize: '0.85rem' }}>Normal User applying for Creator</Text>
              </div>
            </div>
            <Descriptions column={2} size="small" bordered style={{ marginBottom: 16 }}>
              <Descriptions.Item label="Email">{selected.user?.email}</Descriptions.Item>
              <Descriptions.Item label="Applied On">
                {new Date(selected.createdAt).toLocaleDateString()}
              </Descriptions.Item>
            </Descriptions>

            <div style={{ marginBottom: 12 }}>
              <Text strong style={{ display: 'block', marginBottom: 6 }}>Why do you want to become a creator?</Text>
              <Card size="small" style={{ background: '#fcfcfc' }}>
                <Text>{selected.motivation}</Text>
              </Card>
            </div>

            <div style={{ marginBottom: 12 }}>
              <Text strong style={{ display: 'block', marginBottom: 6 }}>Relevant cooking or catering experience</Text>
              <Card size="small" style={{ background: '#fcfcfc' }}>
                <Text>{selected.experience}</Text>
              </Card>
            </div>
            <div style={{ marginBottom: 12 }}>
              <Text strong style={{ display: 'block', marginBottom: 6 }}>Short Bio</Text>
              <Card size="small" style={{ background: '#fcfcfc' }}>
                {selected.bio
                  ? <Text>{selected.bio}</Text>
                  : <Text type="secondary" italic>Not provided</Text>}
              </Card>
            </div>
            <div style={{ marginBottom: 16 }}>
              <Text strong style={{ display: 'block', marginBottom: 6 }}>Uploaded Documents</Text>
              <Space direction="vertical" style={{ width: '100%' }}>
                <a href={selected.idDocumentUrl} target="_blank" rel="noreferrer">
                  <Card size="small" hoverable style={{ background: '#fcfcfc' }}>Personal ID Document</Card>
                </a>
                <a href={selected.workProofUrl} target="_blank" rel="noreferrer">
                  <Card size="small" hoverable style={{ background: '#fcfcfc' }}>Food Service Work Proof</Card>
                </a>
              </Space>
            </div>
            <div style={{ marginBottom: 12 }}>
              <Text strong style={{ display: 'block', marginBottom: 6 }}>Rejection Reason</Text>
              <TextArea
                rows={3}
                placeholder="Write a reason if this application is rejected."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Button danger loading={actionLoading} onClick={handleReject}>Reject</Button>
              <Button type="primary" loading={actionLoading} onClick={handleApprove}>Approve</Button>
            </div>
          </Card>
        ) : (
          <Card><Empty description="No pending applications" /></Card>
        )}
      </div>
    </div>
  )
}

export default AdminApplicationsPage
