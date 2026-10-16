import request from '../utils/request'

// get all products with filter: GET /api/products?q=beef&category=proteins&sort=price_asc
export const getProductsAPI = (params) => request.get('/api/products', { params })

// create product: POST /api/products
// JSON body
export const createProductAPI = (data) => request.post('/api/products', data)

// GET /api/products/:id
export const getProductAPI = (id) => request.get(`/api/products/${id}`)

// edit product: PUT /api/products/:id
export const updateProductAPI = (id, data) => request.put(`/api/products/${id}`, data)

// delete product: DELETE /api/products/:id
export const deleteProductAPI = (id) => request.delete(`/api/products/${id}`)

// get all products of the current creator: GET /api/products/me/list
export const getMyProductsAPI = () => request.get('/api/products/me/list')

// increment product view count: POST /api/products/:id/view
export const incrementProductViewAPI = (id) =>  request.post(`/api/products/${id}/view`)

// submit a product rating: POST /api/products/:id/rating
// body: { rating(1-5) } — only allowed for buyers with a completed, unrated order
export const submitRatingAPI = (id, data) => request.post(`/api/products/${id}/rating`, data)

