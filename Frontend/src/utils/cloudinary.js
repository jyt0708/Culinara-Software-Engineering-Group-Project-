// 前端直传 Cloudinary（参考 GreenThumbs 主项目的 useCloudinaryUpload）
// 这种方式不经过自己后端，浏览器直接 POST 到 Cloudinary，拿到 secure_url 后只把字符串存进 MongoDB
// 优点：后端不用处理文件流，零内存压力，速度更快
// 配置要求：Cloudinary 后台必须有一个 unsigned upload preset，名字写在下面
//
// group19 自己的 cloud_name（在 config.js 里：dwagxty5q）
// Cloudinary 后台已建好一个 Unsigned upload preset：culinara
//   位置：Cloudinary Dashboard → Settings → Upload → Upload presets
//   Signing Mode = Unsigned

const CLOUD_NAME = 'dwagxty5q'
const UPLOAD_PRESET = 'culinara'

/**
 * 上传单张图片到 Cloudinary，返回 secure_url
 * @param {File} file 浏览器的 File 对象
 * @param {string} folder 可选，Cloudinary 文件夹（如 'recipes/covers'）
 */
export const uploadToCloudinary = async (file, folder = '') => {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('upload_preset', UPLOAD_PRESET)
  if (folder) formData.append('folder', folder)

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
    method: 'POST',
    body: formData,
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data?.error?.message || 'Cloudinary upload failed')
  return data.secure_url
}
