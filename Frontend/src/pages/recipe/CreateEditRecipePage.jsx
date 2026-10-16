import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useSelector } from 'react-redux'
import {
  Form, Input, Button, Select, InputNumber, Upload, App as AntdApp, Card, Typography, Space, Divider, Spin,
} from 'antd'
import { UploadOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons'
import { uploadToCloudinary } from '../../utils/cloudinary'
import { CATEGORIES, DIFFICULTIES } from '../../constants/categories'
import { createRecipeAPI, getRecipeAPI, updateRecipeAPI } from '../../apis/recipe'
import { getMyProductsAPI } from '../../apis/product'

const { Title, Text } = Typography
const { TextArea } = Input

const GREEN = '#50806B'
const RED = '#c25450'

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_IMAGE_MB = 5

const makeImageValidator = (messageApi) => (file) => {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    messageApi.error('Only JPG, PNG, WebP images are allowed')
    return false
  }
  if (file.size / 1024 / 1024 > MAX_IMAGE_MB) {
    messageApi.error(`Image must be smaller than ${MAX_IMAGE_MB}MB`)
    return false
  }
  return false
}

// 编辑模式复用旧图片 URL，只上传新选的文件。
const ensureUrl = async (item, folder) => {
  if (typeof item === 'string') return item
  if (item?.url && !item?.originFileObj) return item.url
  const file = item?.originFileObj || item
  return await uploadToCloudinary(file, folder)
}

function CreateEditRecipePage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = Boolean(id)
  const { userInfo, userInfoLoaded } = useSelector((state) => state.user)
  const [form] = Form.useForm()
  const { message: messageApi } = AntdApp.useApp()

  const [currentCategory, setCurrentCategory] = useState(null)
  const subcategories = CATEGORIES.find((c) => c.value === currentCategory)?.subcategories || []

  const [coverFileList, setCoverFileList] = useState([])
  const [myProducts, setMyProducts] = useState([])

  const [submitting, setSubmitting] = useState(false)
  const [loadingDetail, setLoadingDetail] = useState(isEdit)

  // 创建/编辑菜谱时加载自己的商品，供关联商品选择。
  useEffect(() => {
    let cancelled = false

    getMyProductsAPI()
      .then((res) => {
        if (!cancelled) setMyProducts(res.data || [])
      })
      .catch((err) => {
        if (!cancelled) messageApi.warning(err.response?.data?.message || 'Failed to load related products')
      })

    return () => {
      cancelled = true
    }
  }, [messageApi])

  // 编辑模式先加载原菜谱，并校验只能编辑自己的菜谱。
  useEffect(() => {
    if (!isEdit || !userInfoLoaded) return
    getRecipeAPI(id)
      .then((res) => {
        const r = res.data
        if (String(r.creator?._id || r.creator) !== String(userInfo?._id)) {
          messageApi.error('You can only edit your own recipes')
          navigate('/', { replace: true })
          return
        }
        form.setFieldsValue({
          title: r.title,
          coverCaptionTitle: r.coverCaptionTitle,
          coverCaptionText:  r.coverCaptionText,
          summary: r.summary,
          linkedProducts: (r.linkedProducts || []).map((p) => (typeof p === 'string' ? p : p?._id)).filter(Boolean),
          category: r.category,
          subcategory: r.subcategory,
          difficulty: r.difficulty,
          cookTime: r.cookTime,
          ingredients: r.ingredients.map((ing) => ({
            name: typeof ing === 'string' ? ing : (ing.name || ''),
            image: (typeof ing === 'object' && ing.image)
              ? [{ uid: `old-ing-${Math.random()}`, name: 'image', status: 'done', url: ing.image }]
              : [],
          })),
          steps: r.steps.map((s, i) => ({
            title: s.title,
            description: s.description,
            images: (s.images || []).map((u, j) => ({
              uid: `old-${i}-${j}`, name: 'image', status: 'done', url: u,
            })),
          })),
          tips: r.tips,
        })
        setCurrentCategory(r.category)
        setCoverFileList([{ uid: 'old-cover', name: 'cover', status: 'done', url: r.coverImage }])
      })
      .catch((err) => {
        messageApi.error(err.response?.data?.message || 'Failed to load recipe')
        navigate('/', { replace: true })
      })
      .finally(() => setLoadingDetail(false))
  }, [id, isEdit, userInfoLoaded, userInfo?._id, form, navigate, messageApi])

  // 提交前统一上传封面、食材图和步骤图，再保存菜谱数据。
  const onFinish = async (values) => {
    if (coverFileList.length === 0) {
      return messageApi.error('Please upload a cover image')
    }
    setSubmitting(true)
    try {
      const coverImage = await ensureUrl(coverFileList[0], 'culinara/recipes/covers')

      const stepsWithUrls = await Promise.all(
        (values.steps || []).map(async (s) => ({
          title: s.title || '',
          description: s.description,
          images: await Promise.all(
            (s.images || []).map((img) => ensureUrl(img, 'culinara/recipes/steps'))
          ),
        }))
      )

      const ingredientsWithUrls = await Promise.all(
        (values.ingredients || [])
          .filter((ing) => ing?.name?.trim())
          .map(async (ing) => ({
            name: ing.name.trim(),
            image: ing.image?.length > 0
              ? await ensureUrl(ing.image[0], 'culinara/recipes/ingredients')
              : '',
          }))
      )

      const payload = {
        title: values.title,
        coverImage,
        coverCaptionTitle: values.coverCaptionTitle || '',
        coverCaptionText:  values.coverCaptionText  || '',
        summary: values.summary || '',
        category: values.category,
        subcategory: values.subcategory,
        difficulty: values.difficulty,
        cookTime: values.cookTime,
        ingredients: ingredientsWithUrls,
        steps: stepsWithUrls,
        tips: (values.tips || []).filter(Boolean),
        linkedProducts: values.linkedProducts || [],
      }

      const res = isEdit ? await updateRecipeAPI(id, payload) : await createRecipeAPI(payload)
      messageApi.success(isEdit ? 'Recipe updated!' : 'Recipe published!')
      setTimeout(() =>{
        navigate(`/recipes/${res.data._id}`,{
          replace: true,
          state: { fromSubmit: true },
        })
      }, 800)
    } catch (err) {
      messageApi.error(err.response?.data?.message || err.message || 'Submission failed')
    } finally {
      setSubmitting(false)
    }
  }

  if (loadingDetail) {
    return <div style={{ textAlign: 'center', padding: '4rem' }}><Spin size="large" /></div>
  }

  return (
    <div style={{ maxWidth: 1100, margin: '2rem auto 5rem', padding: '0 1.5rem' }}>
      <Title level={2} style={{ color: RED, marginBottom: 4 }}>
        {isEdit ? 'Edit Recipe' : 'Create a New Recipe'}
      </Title>
      <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
        Share your favorite dish with the Culinara community by writing a step-by-step recipe.
      </Text>

      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        initialValues={{ ingredients: [{ name: '', image: [] }], steps: [{ title: '', description: '', images: [] }], tips: [], linkedProducts: [] }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>

          <Card size="small" style={{ borderRadius: 10 }}>
            <Form.Item label="Cover Image" required style={{ marginBottom: 12 }}>
              <Upload
                listType="picture-card"
                maxCount={1}
                beforeUpload={() => false}
                fileList={coverFileList}
                onChange={({ fileList }) => setCoverFileList(fileList)}
                accept="image/*"
              >
                {coverFileList.length === 0 && (
                  <div><PlusOutlined /><div style={{ marginTop: 8 }}>Upload</div></div>
                )}
              </Upload>
            </Form.Item>
            <Form.Item label="Picture Description Title" name="coverCaptionTitle">
              <Input maxLength={80} showCount placeholder="e.g. Steaming bowl of miso ramen" />
            </Form.Item>
            <Form.Item label="Picture Description Paragraph" name="coverCaptionText">
              <TextArea rows={5} maxLength={300} showCount placeholder="Describe what's in the photo..." />
            </Form.Item>
          </Card>

          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '1rem' }}>
              <Form.Item label="Cuisine Category" name="category" rules={[{ required: true }]}>
                <Select
                  placeholder="Select"
                  options={CATEGORIES.map((c) => ({ value: c.value, label: c.label }))}
                  onChange={(v) => {
                    setCurrentCategory(v)
                    form.setFieldValue('subcategory', undefined)
                  }}
                />
              </Form.Item>
              <Form.Item label="Specific Cuisine" name="subcategory" rules={[{ required: true }]}>
                <Select
                  placeholder="Select"
                  disabled={!currentCategory}
                  options={subcategories.map((s) => ({ value: s.value, label: s.label }))}
                />
              </Form.Item>
              <Form.Item label="Difficulty" name="difficulty" rules={[{ required: true }]}>
                <Select placeholder="Select" options={DIFFICULTIES} />
              </Form.Item>
              <Form.Item label="Cook Time (min)" name="cookTime" rules={[{ required: true }]}>
                <InputNumber min={1} max={1440} style={{ width: '100%' }} />
              </Form.Item>
            </div>

            <Form.Item label="Recipe Title" name="title" rules={[{ required: true, max: 100 }]}>
              <Input maxLength={100} showCount placeholder="e.g. Hakata-style Miso Ramen" />
            </Form.Item>

            <Form.Item label="Summary" name="summary">
              <TextArea rows={3} maxLength={500} showCount placeholder="A short paragraph above the ingredients..." />
            </Form.Item>

            <Form.Item label="Related Products (optional)" name="linkedProducts">
              <Select
                mode="multiple"
                placeholder="Select your related marketplace products"
                options={myProducts.map((product) => ({
                  value: product._id,
                  label: product.name,
                }))}
              />
            </Form.Item>

            <Divider orientation="left" style={{ color: GREEN }}>Ingredients</Divider>
            <Form.List name="ingredients">
              {(fields, { add, remove }) => (
                <>
                  {fields.map((field, idx) => (
                    <div key={field.key} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 12 }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: '50%', background: '#e8f3da',
                        color: '#2f5e10', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 700, flexShrink: 0, marginTop: 6,
                      }}>{idx + 1}</div>
                      <div style={{ flex: 1 }}>
                        <Form.Item
                          name={[field.name, 'name']}
                          rules={[{ required: true, message: 'Required' }]}
                          style={{ marginBottom: 6 }}
                        >
                          <Input maxLength={200} placeholder='e.g. "200g fresh ramen noodles"' />
                        </Form.Item>
                        <Form.Item
                          name={[field.name, 'image']}
                          valuePropName="fileList"
                          getValueFromEvent={(e) => (Array.isArray(e) ? e : e?.fileList)}
                          style={{ marginBottom: 0 }}
                        >
                          <Upload
                            listType="picture"
                            maxCount={1}
                            beforeUpload={makeImageValidator(messageApi)}
                            accept="image/jpeg,image/png,image/webp"
                          >
                            <Button size="small" icon={<UploadOutlined />}>Add Photo (optional, max 5MB)</Button>
                          </Upload>
                        </Form.Item>
                      </div>
                      <Button
                        icon={<DeleteOutlined />}
                        onClick={() => remove(field.name)}
                        disabled={fields.length === 1}
                        style={{ marginTop: 4 }}
                      />
                    </div>
                  ))}
                  <Button onClick={() => add({ name: '', image: [] })} icon={<PlusOutlined />} block style={{ marginTop: 8 }}>
                    Add Ingredient
                  </Button>
                </>
              )}
            </Form.List>

            <Divider orientation="left" style={{ color: GREEN }}>Instruction Steps</Divider>
            <Form.List name="steps">
              {(fields, { add, remove }) => (
                <>
                  {fields.map((field, idx) => (
                    <Card
                      key={field.key}
                      size="small"
                      style={{ marginBottom: 16, background: '#fafafa' }}
                      title={<span style={{ color: RED, fontWeight: 800 }}>Step {idx + 1}</span>}
                      extra={
                        <Button
                          danger size="small"
                          onClick={() => remove(field.name)}
                          disabled={fields.length === 1}
                        >Remove Step</Button>
                      }
                    >
                      <Form.Item label="Step Title (optional)" name={[field.name, 'title']}>
                        <Input maxLength={100} placeholder="e.g. Prepare the Broth" />
                      </Form.Item>
                      <Form.Item
                        label="Step Description"
                        name={[field.name, 'description']}
                        rules={[{ required: true, max: 2000 }]}
                      >
                        <TextArea rows={4} maxLength={2000} showCount placeholder="Describe this step in detail..." />
                      </Form.Item>
                      <Form.Item
                        label="Step Images (up to 3, optional)"
                        name={[field.name, 'images']}
                        valuePropName="fileList"
                        getValueFromEvent={(e) => (Array.isArray(e) ? e : e?.fileList)}
                      >
                        <Upload
                          listType="picture-card"
                          maxCount={3}
                          beforeUpload={() => false}
                          accept="image/*"
                          multiple
                        >
                          <div><PlusOutlined /><div style={{ marginTop: 8 }}>Add</div></div>
                        </Upload>
                      </Form.Item>
                    </Card>
                  ))}
                  <Button
                    onClick={() => add({ title: '', description: '', images: [] })}
                    icon={<PlusOutlined />} block
                  >Add Step</Button>
                </>
              )}
            </Form.List>

            <Divider orientation="left" style={{ color: GREEN }}>Quick Tips (optional)</Divider>
            <Form.List name="tips">
              {(fields, { add, remove }) => (
                <>
                  {fields.map((field, idx) => (
                    <div key={field.key} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                      <Form.Item {...field} style={{ flex: 1, marginBottom: 0 }}>
                        <Input maxLength={300} placeholder={`Tip ${idx + 1}`} />
                      </Form.Item>
                      <Button icon={<DeleteOutlined />} onClick={() => remove(field.name)} />
                    </div>
                  ))}
                  <Button onClick={() => add('')} icon={<PlusOutlined />} block style={{ marginTop: 8 }}>
                    Add Tip
                  </Button>
                </>
              )}
            </Form.List>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 32 }}>
              <Button onClick={() => navigate(-1)}>Cancel</Button>
              <Button
                type="primary" htmlType="submit"
                loading={submitting}
                style={{ background: GREEN, borderColor: GREEN }}
              >
                {isEdit ? 'Update Recipe' : 'Publish Recipe'}
              </Button>
            </div>
          </div>
        </div>
      </Form>
    </div>
  )
}

export default CreateEditRecipePage
