export interface AvatarOption {
  id: string;
  name: string;
  /** GPU face2face 目录内预置参考视频文件名 */
  referenceVideo: string;
  preview?: string;
}

/** 已取得产品使用授权的系统预设数字人。 */
export const AVATAR_OPTIONS: AvatarOption[] = [
  {
    id: 'avatar-001',
    name: '默认数字人 1',
    referenceVideo: 'defaults/avatar-001.mp4',
  },
  {
    id: 'avatar-002',
    name: '默认数字人 2',
    referenceVideo: 'defaults/avatar-002.mp4',
  },
  {
    id: 'avatar-003',
    name: '默认数字人 3',
    referenceVideo: 'defaults/avatar-003.mp4',
  },
];

export function resolveAvatarReferenceVideo(
  avatarId: string,
  customReferenceVideo?: string,
) {
  if (customReferenceVideo?.trim()) return customReferenceVideo.trim();
  const avatar = AVATAR_OPTIONS.find((a) => a.id === avatarId);
  if (!avatar) {
    throw new Error(`未知数字人形象: ${avatarId}`);
  }
  return avatar.referenceVideo;
}

export function isBuiltinAvatar(avatarId: string) {
  return AVATAR_OPTIONS.some((a) => a.id === avatarId);
}
