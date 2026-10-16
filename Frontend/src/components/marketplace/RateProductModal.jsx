import { useState } from 'react'
import { Modal, Rate, Button, Typography, App as AntdApp } from 'antd'
import { submitRatingAPI } from '../../apis/product'

const { Text } = Typography
const GREEN = '#50806B'

// 复用的商品评分弹窗：0–5 星（提交 1–5）。
// 仅在「买家有该商品 completed 且未评价订单」时由调用方决定是否展示入口。
// props: { open, productId, orderId, productName, onClose, onRated }
export default function RateProductModal({ open, productId, orderId, productName, onClose, onRated }) {
  const { message } = AntdApp.useApp()
  const [rating, setRating] = useState(0)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (rating < 1) {
      message.warning('Please pick a star rating first')
      return
    }
    setSubmitting(true)
    try {
      await submitRatingAPI(productId, { rating, orderId })
      message.success('Thanks for your rating!')
      setRating(0)
      onRated?.()
      onClose?.()
    } catch (err) {
      message.error(err.response?.data?.message || 'Failed to submit rating')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      title="Rate this product"
      onCancel={() => { setRating(0); onClose?.() }}
      footer={[
        <Button key="cancel" onClick={() => { setRating(0); onClose?.() }}>Cancel</Button>,
        <Button
          key="submit"
          type="primary"
          loading={submitting}
          style={{ background: GREEN, borderColor: GREEN }}
          onClick={handleSubmit}
        >
          Submit Rating
        </Button>,
      ]}
    >
      {productName && (
        <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>{productName}</Text>
      )}
      <Rate value={rating} onChange={setRating} style={{ fontSize: 32 }} />
    </Modal>
  )
}
