import request from '../utils/request'

export const submitApplicationAPI = (formData) =>
  request.post('/api/applications', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })

export const getMyApplicationAPI = () => request.get('/api/applications/me')

export const getAllApplicationsAPI = () => request.get('/api/applications')

export const approveApplicationAPI = (id) => request.put(`/api/applications/${id}/approve`)

export const rejectApplicationAPI = (id, rejectionReason) =>
  request.put(`/api/applications/${id}/reject`, { rejectionReason })
