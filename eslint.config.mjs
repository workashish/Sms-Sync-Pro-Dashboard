import next from '@next/eslint-plugin-next'

export default [
  {
    plugins: {
      next
    },
    rules: {
      'next/no-html-link-for-pages': 'error',
    },
  },
]
