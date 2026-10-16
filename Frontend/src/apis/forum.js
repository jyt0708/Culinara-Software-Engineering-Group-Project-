import request from '../utils/request'

export const getForumPostsAPI = (params) => request.get('/api/forumPosts', { params })

export const getForumPostAPI = (id) => request.get(`/api/forumPosts/${id}`)

export const createForumPostAPI = (data) => request.post('/api/forumPosts', data)

export const updateForumPostAPI = (id, data) => request.put(`/api/forumPosts/${id}`, data)

export const deleteForumPostAPI = (id) => request.delete(`/api/forumPosts/${id}`)

export const toggleLikeForumPostAPI = (id) => request.post(`/api/forumPosts/${id}/like`)

export const getMyForumPostsAPI = () =>  request.get('/api/forumPosts/me/list')

export const getForumCommentsAPI = (postId) => request.get(`/api/forumPostComments/post/${postId}`)

export const createForumCommentAPI = (data) => request.post('/api/forumPostComments', data)

export const getMyForumCommentsAPI = () => request.get('/api/forumPostComments/me/list')

export const toggleLikeForumCommentAPI = (id) =>request.post(`/api/forumPostComments/${id}/like`)

export const deleteForumCommentAPI = (id) => request.delete(`/api/forumPostComments/${id}`)