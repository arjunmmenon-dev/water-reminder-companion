export type AnimationState =
  | 'arriving'
  | 'reminder'
  | 'remindLater'
  | 'yesHappy'

function animationClipUrl(fileName: string): string {
  const base = import.meta.env.BASE_URL
  const slash = base.endsWith('/') ? '' : '/'
  return `${base}${slash}animations/${fileName}`
}

export const ANIMATION_CLIPS = {
  arrive: animationClipUrl('clip1_arrive.webm'),
  remindLaterSad: animationClipUrl('clip2_remind_later_sad.webm'),
  yesHappy: animationClipUrl('clip3_yes_happy.webm'),
} as const
