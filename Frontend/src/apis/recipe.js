import request from '../utils/request'

export const getRecipesAPI = (params) => request.get('/api/recipes', { params })

export const createRecipeAPI = (data) => request.post('/api/recipes', data)

export const getRecipeAPI = (id) => request.get(`/api/recipes/${id}`)

export const incrementRecipeViewAPI = (id) => request.post(`/api/recipes/${id}/view`)

export const updateRecipeAPI = (id, data) => request.put(`/api/recipes/${id}`, data)

export const deleteRecipeAPI = (id) => request.delete(`/api/recipes/${id}`)

export const getMyRecipesAPI = () => request.get('/api/recipes/me/list')

export const toggleLikeAPI = (id) => request.post(`/api/recipes/${id}/like`)

export const toggleDislikeAPI = (id) => request.post(`/api/recipes/${id}/dislike`)

export const getRecipeByCreatorAPI = (creatorId) => request.get(`/api/recipes/creator/${creatorId}`)
