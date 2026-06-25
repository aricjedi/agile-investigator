export type Profile = {
  id: string
  email: string
  full_name: string | null
  role: 'student' | 'admin'
  created_at: string
}

export type Course = {
  id: string
  title: string
  slug: string
  description: string | null
  thumbnail_url: string | null
  published: boolean
  created_at: string
}

export type Module = {
  id: string
  course_id: string
  title: string
  description: string | null
  order_index: number
}

export type Lesson = {
  id: string
  module_id: string
  title: string
  content: string | null
  video_url: string | null
  duration_minutes: number | null
  order_index: number
  lesson_type: 'video' | 'text' | 'quiz'
}

export type Enrollment = {
  id: string
  user_id: string
  course_id: string
  enrolled_at: string
}

export type LessonProgress = {
  id: string
  user_id: string
  lesson_id: string
  completed: boolean
  completed_at: string | null
}
