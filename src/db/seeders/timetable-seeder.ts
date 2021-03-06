import { CoverageMajorLectureType } from '@/database/models/coverage_major_lecture'
import { LectureModelAttr } from '@/database/models/lecture'
import { PeriodModelAttr } from '@/database/models/period'
import { TableNames } from '@/database/table-names'
import Db from '@/db'
import { Q } from '@/modules/sqlb'
import { RefinedLectures } from '@payw/cau-timetable-scraper/build/types'
import { v4 as uuidv4 } from 'uuid'

export default async function (lectures: RefinedLectures): Promise<void> {
  console.log('🌱 Seeding lectures')

  const firstLecture = lectures[0]

  if (!firstLecture) {
    console.log(`🌱 Stop seeding, first lecture doesn't exist`)
    return
  }

  // Update college coverage data
  const dbLectures: LectureModelAttr[] = []
  const dbPeriods: PeriodModelAttr[] = []
  const dbCoverageMajorLectures: CoverageMajorLectureType[] = []

  for (let i = 0; i < lectures.length; i += 1) {
    const lecture = lectures[i]
    const lectureId = uuidv4()

    dbLectures.push({
      id: lectureId,
      year: lecture.year,
      semester: lecture.semester,
      campus: lecture.campus,
      college: lecture.college,
      major: lecture.major || null,
      grade: lecture.grade,
      credit: lecture.credit,
      course: lecture.course,
      section: lecture.section,
      code: lecture.code,
      name: lecture.name,
      professor: lecture.professor,
      schedule: lecture.schedule,
      building: parseInt(lecture.building) || null,
      room: lecture.room || null,
      note: lecture.note,
    })

    for (let j = 0; j < lecture.periods.length; j += 1) {
      const period = lecture.periods[j]

      dbPeriods.push({
        day: period.day,
        lecture_id: lectureId,
        start_h: period.startH,
        start_m: period.startM,
        end_h: period.endH,
        end_m: period.endM,
      })
    }

    for (let j = 0; j < lecture.coverages.length; j += 1) {
      const coverage = lecture.coverages[j]

      if (!coverage.majorCode) {
        continue
      }

      dbCoverageMajorLectures.push({
        lecture_id: lectureId,
        major_code: coverage.majorCode,
      })
    }
  }

  // Delete all lectures before rewrite
  const year = firstLecture.year
  const semester = firstLecture.semester

  console.log('Clearing data...')
  const [clearErr] = await Db.query(
    `DELETE FROM lecture WHERE year=${year} AND semester='${semester}'`
  )
  if (clearErr) {
    console.error('Failed to clearing data')
    console.error(clearErr)
    return
  }

  console.log('Inserting lectures...')
  const [insertLecturesErr] = await Db.query(
    Q().bulkInsert(TableNames.lecture, dbLectures).build()
  )
  if (insertLecturesErr) {
    console.error('Failed to insert lectures')
    console.error(insertLecturesErr)
    return
  }

  console.log('Inserting periods...')
  const [insertPeriodsErr] = await Db.query(
    Q().bulkInsert(TableNames.period, dbPeriods).build()
  )
  if (insertPeriodsErr) {
    console.error('Failed to insert periods')
    console.error(insertPeriodsErr)
    return
  }

  console.log('Inserting coverage major lecture relations...')
  const [insertRelationsErr] = await Db.query(
    Q()
      .bulkInsert(TableNames.coverage_major_lecture, dbCoverageMajorLectures)
      .build()
  )
  if (insertRelationsErr) {
    console.log('Failed to insert relations')
    console.log(insertRelationsErr)
    return
  }

  console.log('🌱 Done Seeding lectures')
}
