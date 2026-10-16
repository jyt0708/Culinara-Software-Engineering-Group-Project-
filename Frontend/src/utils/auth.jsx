import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { useLocation, useNavigate } from 'react-router-dom'
import { Modal } from 'antd'

export function useRequireLogin() {
  const { hasToken } = useSelector((state) => state.user)
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    setOpen(false)
  }, [pathname, hasToken])

  const requireLogin = (action) => {
    if (!hasToken) {
      setOpen(true)
      return
    }
    action?.()
  }

  const modal = (
    <Modal
      open={open}
      title="Login Required"
      okText="Login"
      cancelText="Cancel"
      onOk={() => {
        setOpen(false)
        navigate('/login')
      }}
      onCancel={() => setOpen(false)}
      destroyOnHidden
      transitionName=""
      maskTransitionName=""
    >
      Please log in to continue.
    </Modal>
  )

  return { requireLogin, modal }
}
