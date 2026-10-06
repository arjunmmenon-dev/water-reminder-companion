export type AnimationState =
  | 'arriving'
  | 'reminder'
  | 'remindLater'
  | 'yesHappy'

export const ANIMATION_CLIPS = {
  arrive: '/animations/clip1_arrive.webm',
  remindLaterSad: '/animations/clip2_remind_later_sad.webm',
  yesHappy: '/animations/clip3_yes_happy.webm',
} as const
