import { TipAttrs, TipListResponse } from '@/database/models/tip'

import { Action } from './interface'
import { OneApiFunc } from '@/api/one/types'
import { TipRepository } from '@/database/repository/tip-repository'
import { oneApiResponse } from '@/api/one/utils'
import prisma from '@/modules/prisma'
import { prismaTimeMod } from '@/modules/time'

const func: OneApiFunc<Action> = async (data) => {
  const { topic, page } = data
  const pageSize = 10
  let tipList: TipAttrs[]

  let totalCount = 0

  if (!topic) {
    totalCount = await prisma.tip.count({ where: { isRemoved: false } })
    tipList = await TipRepository.findAll(pageSize, page)
  } else {
    totalCount = await prisma.tip.count({
      where: {
        isRemoved: false,
        topic,
      },
    })
    tipList = await TipRepository.findByTopic(topic, pageSize, page)
  }

  const tips = tipList.map((item) => {
    const response: TipListResponse = {
      ...item,
      tipLikes: item.tipLikes.length,
      isLiked: true,
    }
    return response
  })

  const totalPage =
    totalCount % 10 === 0 ? totalCount / 10 : Math.floor(totalCount / 10) + 1

  return oneApiResponse<Action>({
    tips: prismaTimeMod(tips),
    totalCount,
    totalPage,
    page,
  })
}

export default func
