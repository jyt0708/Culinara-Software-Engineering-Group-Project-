import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useSelector } from 'react-redux'
import {
  Form, Input, Button, Select, InputNumber, Upload, App as AntdApp, Card, Typography, Space, Divider, Spin,
} from 'antd'
import { UploadOutlined, PlusOutlined, DeleteOutlined, MinusCircleOutlined } from '@ant-design/icons'
import { uploadToCloudinary } from '../../utils/cloudinary'
import { CATEGORIES } from '../../constants/productCategories'
import { createProductAPI, getProductAPI, updateProductAPI } from '../../apis/product'

const { Title, Text } = Typography
const { TextArea } = Input

const GREEN = '#50806B'
const RED = '#c25450'

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_IMAGE_MB = 5

const makeImageValidator = (messageApi) => (file) => {
  const isValidType = ALLOWED_IMAGE_TYPES.includes(file.type)
  if (!isValidType) {
    messageApi.error('Only JPG, PNG, WebP images are allowed')
    return Upload.LIST_IGNORE
  }

  const isValidSize = file.size / 1024 / 1024 <= MAX_IMAGE_MB
  if (!isValidSize) {
    messageApi.error(`Image must be smaller than ${MAX_IMAGE_MB}MB`)
    return Upload.LIST_IGNORE
  }

  // prevent auto-upload
  return false
}

const ensureUrl = async (item, folder) => {
  // a URL is passed, returns it immediately.
  if (typeof item === 'string') return item

  // check if the object already contains URL and no underlying local file object attached
  // if true then we assume the file has already been uploaded somewhere and 
  // return the existing URL instead of uploading again
  if (item?.url && !item?.originFileObj) return item.url

  // newly uploaded image has a originFileObj
  const file = item?.originFileObj || item
  return await uploadToCloudinary(file, folder)
}


function CreateEditProductPage() {
  const navigate = useNavigate()
  const { id } = useParams() 
  const isEdit = Boolean(id)
  const { userInfo, userInfoLoaded } = useSelector((state) => state.user)
  const [form] = Form.useForm()
  const { message: messageApi } = AntdApp.useApp()

  const [coverFileList, setCoverFileList] = useState([])
  const [imagesFileList, setImagesFileList] = useState([]) 
  const [category, setCurrentCategory] = useState([''])

  const [submitting, setSubmitting] = useState(false)
  const [loadingDetail, setLoadingDetail] = useState(isEdit)

  // edit mode
  // Fetch existing product details and populate the form.
  // Existing images are converted into Ant Design Upload file objects with `url`
  // but without `originFileObj`, to distinguish them from newly selected
  // files during submission and avoid re-uploading unchanged images.
  useEffect(() => {
    if (!isEdit || !userInfoLoaded) return

    setLoadingDetail(true)

    getProductAPI(id)
      .then((res) => {
        const product = res.data
        if (String(product.createdBy?._id || product.creator) !== String(userInfo?._id)) {
          messageApi.error('You can only edit your own products')
          navigate('/', { replace: true })
          return
        }

        // populate the form
        form.setFieldsValue({
          name: product.name,
          price: product.price,
          weight: product.weight,
          origin:  product.origin,
          stock: product.stock,
          description: product.description,
          imageTitle: product.imageTitle || '',
          imageDescription: product.imageDescription || '',
          category: product.category,
          specifications: product.specifications || [],
        })
        

        // this is a "mock file object" so Upload component can display existing image
        if (product.coverImage) {
          setCoverFileList([
            {
              uid: '-1',
              name: 'coverImage',
              status: 'done',
              url: product.coverImage,
            },
          ])
        }

        if (product.images?.length) {
          setImagesFileList(
            product.images.map((url, idx) => ({
              uid: String(idx),
              name: `image-${idx}`,
              status: 'done',
              url,
            }))
          )
        } else {
          setImagesFileList([])
        }        
    })
    .catch((err) => {
      messageApi.error(err.response?.data?.message || 'Failed to load recipe')
      navigate('/', { replace: true })
    })
    .finally(() => setLoadingDetail(false))
    }, [id, isEdit, userInfoLoaded, userInfo?._id, form, navigate, messageApi])


  const onFinish = async (values) => {
    if (coverFileList.length === 0) {
      return messageApi.error('Please upload a cover image')
    }
    setSubmitting(true)
  
    try {
      // upload coverimage
      const coverImage = await ensureUrl(coverFileList[0], 'culinara/products/coverImage')
      
      // other images
      const images = await Promise.all(
        (imagesFileList || []).map((img) =>
          ensureUrl(img, 'culinara/products/images')
        )
      )

      // remove blank contents
      const validSpecs = values.specifications.filter(
        spec => spec && (spec.name?.trim() || spec.value?.trim())
      )

      const payload = {
        name: values.name,
        price: values.price,
        weight: values.weight,
        origin:  values.origin,
        stock: values.stock,
        description: values.description,
        coverImage,
        images,
        imageTitle: values.imageTitle || '',
        imageDescription: values.imageDescription || '',
        category: values.category,
        specifications: validSpecs
      }

      const res = isEdit 
        ? await updateProductAPI(id, payload) 
        : await createProductAPI(payload)

      messageApi.success(isEdit ? 'Product updated!' : 'Product published!')
      setTimeout(() => {
        navigate(`/products/${res.data._id}`, {
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
    <div style={{ maxWidth:1100, margin:'2rem auto 5rem', padding: '0 1.5rem' }}>
      <Title level={2} style={{ color: RED, marginBottom: 4 }}>
        {isEdit ? 'Edit Product' : 'Publish a New Marketplace Product'}
      </Title>
      <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
        Add cookware, ingredients, or kitchen essentials to your shop for the Culinaria marketplace.
      </Text>

      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        initialValues={{ specifications: [{name: '', value: ''}] }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
          
          {/* left column: image */}
          <Card size="small" style={{ borderRadius: 10 }}>
            <Form.Item label="Cover Image" name="coverImage" required style={{ marginBottom: 12 }}>
              <Upload
                listType="picture-card"
                maxCount={1}
                beforeUpload={makeImageValidator(messageApi)} 
                fileList={coverFileList}
                onChange={({ fileList }) => setCoverFileList(fileList)}
                accept="image/*"
              >
                {coverFileList.length === 0 && (
                  <div><PlusOutlined /><div style={{ marginTop: 8 }}>Upload</div></div>
                )}
              </Upload>
            </Form.Item>

            <Form.Item label="Other Images" name="images" style={{ marginBottom: 12 }}>
              <Upload
                listType="picture-card"
                maxCount={3}
                beforeUpload={makeImageValidator(messageApi)} 
                fileList={imagesFileList}
                onChange={({ fileList }) => setImagesFileList(fileList)}
                accept="image/*"
              >
                {imagesFileList.length < 3 && (
                  <div><PlusOutlined /><div style={{ marginTop: 8 }}>Upload</div></div>
                )}
              </Upload>
            </Form.Item>
            <Form.Item label="Product Description Title" name="imageTitle" rules={[{ max: 50}]}>
              <Input maxLength={50} showCount placeholder="e.g. Handcrafted ceramic pot" />
            </Form.Item>
            <Form.Item label="Picture Description Paragraph" name="imageDescription" rules={[{ max: 300}]}>
              <TextArea rows={4} maxLength={300} showCount placeholder="Describe what's in the photo..." />
            </Form.Item>
          </Card>

          {/* right column: main body of the form */}
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <Form.Item label="Product Category" name="category" rules={[{ required: true }]}>
                <Select
                  placeholder="Select"
                  options={CATEGORIES.map((c) => ({ value: c.value, label: c.label }))}
                  onChange={(v) => {
                    setCurrentCategory(v)
                  }}
                />
              </Form.Item>
              <Form.Item label="Stock Quantity" name="stock" rules={[{ required: true }]}>
                <InputNumber min={1} max={1440} style={{ width: '100%' }} />
              </Form.Item>
            </div>
            
            <Form.Item label="Product Name" name="name" rules={[{ required: true, max: 50 }]}>
              <Input maxLength={50} showCount placeholder="e.g. Artisan Ceramic Pot" />
            </Form.Item>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
              <Form.Item label="Price" name="price" rules={[{ required: true }] } tooltip="A 5% service fee will be deducted from every order.">
                <InputNumber 
                  min={0.001} 
                  precision={2}       
                  prefix="€"        
                  style={{ width: '100%' }} 
                  placeholder="0.00"
                />
              </Form.Item>
              <Form.Item label="Weight" name="weight" rules={[{ required: true }]}>
                <InputNumber 
                  min={0.001} 
                  suffix="kg"     
                  style={{ width: '100%' }} 
                />
              </Form.Item>
              <Form.Item label="Origin" name="origin" rules={[{ required: true }]}>
                <Input placeholder="e.g. Kyoto, Japan" />
              </Form.Item>
            </div>

            <Form.Item label="Product Description" name="description" rules={[{ required: true, max: 1000 }]}>
              <TextArea 
                rows={5} 
                maxLength={1000} 
                showCount
                style={{ whiteSpace: 'pre-wrap' }}/>
            </Form.Item>

            {/* Specifications */}
            <Divider orientation="left" style={{ color: GREEN }}>
              <span style={{ fontWeight: 600 }}>Product Specifications</span>
              <span
                style={{
                  marginLeft: 8,
                  color: '#999',
                  fontSize: 12,
                  fontWeight: 400,
                }}
              >
                Material, Capacity, Compatibility, etc.
              </span>
            </Divider>
            <Form.List name="specifications">
              {(fields, { add, remove }) => (
                <>
                  {fields.map((field, idx) => (
                    <div
                      key={field.key}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '40px 1fr',
                        gap: '1rem',
                        alignItems: 'start',
                      }}
                    >
                      <div
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: '50%',
                          background: '#e8f3da',
                          color: '#2f5e10',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                        }}
                      >
                        {idx + 1}
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '1rem', alignItems: 'start' }}>
                        <Form.Item
                          name={[field.name, 'name']}
                          rules={[{ required: true, message: 'Please enter a specification name' }]}
                        >
                          <Input placeholder="Material" />
                        </Form.Item>

                        <Form.Item
                          name={[field.name, 'value']}
                          rules={[{ required: true, message: 'Please enter a specification value' }]}
                        >
                          <Input placeholder="e.g. Glazed ceramic" />
                        </Form.Item>

                        <MinusCircleOutlined
                          onClick={() => remove(field.name)}
                          style={{
                            fontSize: 18,
                            color: '#ff4d4f',
                            cursor: 'pointer',
                            marginTop: 6,
                          }}
                        />
                      </div>
                    </div>
                  ))}

                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <Button
                      onClick={() => add({ name: '', value: '' })}
                      icon={<PlusOutlined />}
                    >
                      Add Field
                    </Button>
                  </div>
                </>
              )}
            </Form.List>  

            {/* ========== Actions ========== */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 32 }}>
              <Button onClick={() => navigate(-1)}>Cancel</Button>
              <Button
                type="primary" 
                htmlType="submit"
                loading={submitting}
                // onClick={() => navigate(`/products`)}
                style={{ background: GREEN, borderColor: GREEN }
              }
              >
                {isEdit ? 'Update Product' : 'Publish Product'}
              </Button>
            </div>   
  
          </div>
        </div>

      </Form>
      
    </div>
  )
}

export default CreateEditProductPage
