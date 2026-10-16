import { useState, useEffect } from 'react'
import { useNavigate , useParams} from 'react-router-dom'
import { useSelector } from 'react-redux'
import {App as AntdApp,Button,Upload,Card,Form,Input,Select,Typography,Spin} from 'antd'
import { uploadToCloudinary } from '../../utils/cloudinary'
import { PlusOutlined } from '@ant-design/icons'
import { createForumPostAPI, getForumPostAPI, updateForumPostAPI} from '../../apis/forum'
import { searchUsersAPI } from '../../apis/user'
import { FORUM_CATEGORIES } from '../../constants/forumCategories'

const { Title, Text } = Typography
const { TextArea } = Input

const GREEN = '#50806B'
const RED = '#c25450'

const CATEGORY_EMOJIS = {
  'Newbie Corner': '🥘',
  Sharing: '📖',
  Shopping: '🛒',
  'General Discussion': '💬',
}

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

//判断图片需不需要上传
const ensureUrl = async (item, folder) => {
  if (typeof item === 'string') return item
  if (item?.url && !item?.originFileObj) return item.url
  const file = item?.originFileObj || item
  return await uploadToCloudinary(file, folder)
}



function CreateEditForumPage() {
    const navigate = useNavigate()
    const { id } = useParams() 
    const isEdit = Boolean(id)
    const { userInfo, userInfoLoaded } = useSelector((state) => state.user)
    const [form] = Form.useForm()
    const { message: messageApi } = AntdApp.useApp()

    const [userOptions, setUserOptions] = useState([])
    const [userSearching, setUserSearching] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [imageFileList, setImageFileList] = useState([])
    const [loadingDetail, setLoadingDetail] = useState(isEdit)
    const [selectedCategory, setSelectedCategory] = useState('')

    //搜索用户函数，用于处理@某人
    const handleSearchUsers = async (value) => {
        if (!value.trim()) {
            setUserOptions([])
            return
        }

        setUserSearching(true)

        try {
            const res = await searchUsersAPI(value)
            setUserOptions((res.data || []).map((user) => ({
            value: user._id,
            label: user.username,
            })))
        } catch (err) {
            messageApi.error(err.response?.data?.message || 'Failed to search users')
        } finally {
            setUserSearching(false)
        }
        }

    //编辑模式下，把旧数据拉回表格
    useEffect(() => {
        if (!isEdit) return

        getForumPostAPI(id)
            .then((res) => {
            const post = res.data

            form.setFieldsValue({
                title: post.title,
                content: post.content,
            })

            setSelectedCategory(post.category)

            if (post.imageUrl) {
                setImageFileList([
                {
                    uid: 'old-forum-image',
                    name: 'forum-image',
                    status: 'done',
                    url: post.imageUrl,
                },
                ])
            }
            })
            .catch((err) => {
            messageApi.error(err.response?.data?.message || 'Failed to load forum post')
            navigate('/forum', { replace: true })
            })
            .finally(() => {
            setLoadingDetail(false)
            })
        }, [id, isEdit, form, navigate, messageApi])

    const onFinish = async (values) => {
        if (!selectedCategory) {
            return messageApi.error('Please select a category')
        }
        setSubmitting(true)

        try {
        const imageUrl = imageFileList.length > 0 ? await ensureUrl(imageFileList[0], 'culinara/forum/posts') : ''

        const payload = {
            title: values.title,
            content: values.content,
            category: selectedCategory,
            imageUrl,
            mentionUser: values.mentionUser || null,
        }

        const res = isEdit ? await updateForumPostAPI(id, payload) : await createForumPostAPI(payload)

        messageApi.success(isEdit ? 'Post updated!' : 'Post published!')
        setTimeout(() => { 
            navigate(`/forum/${res.data._id}`,{
            replace: true, 
            state: { fromSubmit: true },
            })
        }, 800)
        } catch (err) {
        messageApi.error(err.response?.data?.message || 'Failed to create forum post')
        } finally {
        setSubmitting(false)
        }
    }

    if (loadingDetail) {
        return (
            <div style={{ textAlign: 'center', padding: '4rem' }}>
            <Spin size="large" />
            </div>
        )
    }

  return (
    <div style={{ maxWidth: 1100, margin: '2rem auto 5rem', padding: '0 1.5rem' }}>
        <Title level={2} style={{ color: RED, marginBottom: 4 }}>
            {isEdit ? 'Edit Post' : 'Publish a New Forum Post'}
        </Title>

        <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
            Ask a question, share your cooking experience, or start a discussion with the Culinara community.
        </Text>

        <Form
            form={form}
            layout="vertical"
            onFinish={onFinish}
            initialValues={{ title: '', content: '', }}
        >
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
                {/* 左侧 */}
                <Card size="small" style={{ borderRadius: 10 }}>
                    <Form.Item label="Post Image (optional)" style={{ marginBottom: 12 }}>
                    <Upload
                        listType="picture-card"
                        maxCount={1}
                        beforeUpload={() => false} // 阻止 Upload 自动上传，等表单提交时手动传
                        fileList={imageFileList}
                        onChange={({ fileList }) => setImageFileList(fileList)}
                        accept="image/jpeg,image/png,image/webp"
                    >
                        {imageFileList.length  === 0 && (
                        <div>
                            <PlusOutlined />
                            <div style={{ marginTop: 8 }}>Upload</div>
                        </div>
                        )}
                    </Upload>
                    </Form.Item>

                    <div style={{ marginTop: 12, marginBottom: 8, fontWeight: 700 }}>
                        Select a category 
                        <span style={{ color: '#c25450' }}>*</span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {FORUM_CATEGORIES.map((item) => (
                        <Button
                            key={item.value}
                            disabled={isEdit}
                            block
                            onClick={() => setSelectedCategory(item.value)}
                            style={{
                            display: 'flex',
                            justifyContent: 'flex-start',
                            alignItems: 'center',
                            height: 38,
                            background: selectedCategory === item.value ? '#d7ffd0' : '#fff',
                            borderColor: selectedCategory === item.value ? '#9ee58f' : '#d9d9d9',
                            color: '#39423d',
                            fontWeight: selectedCategory === item.value ? 700 : 500,
                            }}
                        >
                            <span style={{ marginRight: 8 }}>
                            {CATEGORY_EMOJIS[item.value]}
                            </span>
                            {item.label}
                        </Button>
                        ))}
                    </div>
                </Card>

                {/* 右侧 */}
                <div>
                    <Form.Item
                        label="Post Title"
                        name="title"
                        rules={[
                        { required: true, message: 'Please enter a title' },
                        { max: 100, message: 'Title cannot exceed 100 characters' },
                        ]}
                    >
                        <Input
                        maxLength={100}
                        showCount
                        placeholder="Post Title"
                        />
                    </Form.Item>

                    <Form.Item
                        label="@ Mention user"
                        name="mentionUser"
                        >
                        <Select
                            showSearch
                            allowClear
                            filterOption={false}
                            onSearch={handleSearchUsers}
                            options={userOptions}
                            loading={userSearching}
                            placeholder="Search user to mention"
                        />
                    </Form.Item>

                    <Form.Item
                        label="Content"
                        name="content"
                        rules={[
                        { required: true, message: 'Please write your post content' },
                        { max: 1000, message: 'Content cannot exceed 1000 characters' },
                        ]}
                    >
                        <TextArea
                        rows={12}
                        maxLength={1000}
                        showCount
                        placeholder="Describe your question, problem, or cooking experience in detail..."
                        />
                    </Form.Item>

                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
                        <Button onClick={() => navigate(-1)}>
                        Cancel
                        </Button>

                        <Button
                            type="primary"
                            htmlType="submit"
                            loading={submitting}
                            style={{ background: GREEN, borderColor: GREEN }}
                            >
                            {isEdit ? 'Update Post' : 'Publish Post'}
                        </Button>
                    </div>
                </div>                             
            </div>
        </Form>
    </div>
  )
}

export default CreateEditForumPage