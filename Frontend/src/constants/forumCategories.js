export const FORUM_CATEGORIES = [
  {
    value: 'Newbie Corner',
    label: 'Newbie Corner',
  },
  {
    value: 'Sharing',
    label: 'Sharing',
  },
  {
    value: 'Shopping',
    label: 'Shopping',
  },
  {
    value: 'General Discussion',
    label: 'General Discussion',
  },
]

export const getForumCategoryLabel = (value) => {
  return FORUM_CATEGORIES.find((c) => c.value === value)?.label || value
}