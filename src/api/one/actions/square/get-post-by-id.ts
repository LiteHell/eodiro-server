import { AuthRequired, OneApiError } from '../../types'

import { PostAttrs } from '@/database/models/post'

export interface GetPostById {
  action: 'getPostById'
  data: AuthRequired<{
    postId: number
    edit?: boolean
  }>
  payload: {
    err: OneApiError
    data: PostAttrs & {
      files?: {
        mimeType: string
        name: string
        fileId: number
        path: string
      }[]
    } & {
      likes: number
    }
  }
}
