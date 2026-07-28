/**
 * Build Anthropic-style content blocks for vibe image uploads.
 * 主图先由 CC Entry 上传 COS，再要求主 Agent 调用 GenerateLayoutHtml
 * 加载 URL 并交给视觉 Agent；仅素材图只传文件名和 COS URL。
 */

function sanitizeName(name, fallback) {
  const n = String(name || '')
    .replace(/[^\w.\u4e00-\u9fff-]+/g, '_')
    .replace(/^\.+/, '')
  return n || fallback
}

function mergeUserText(userText, imageLabel) {
  const u = String(userText || '').trim()
  const label = String(imageLabel || '').trim()
  if (u && label) return `${u}\n\n${label}`
  return u || label
}

/** 主图 + 可选切图素材 */
export function buildLayoutImageContent({
  userText,
  design_image,
  assets = [],
}) {
  if (!design_image || typeof design_image !== 'object' || !design_image.url) {
    throw new Error('需要一张主图（设计稿截图）')
  }
  const list = Array.isArray(assets) ? assets : []
  if (list.length > 40) throw new Error('素材图最多 40 张')

  const assetItems = list.map((asset, index) => {
    const name = sanitizeName(asset?.name, `asset-${index + 1}.png`)
    const url = String(asset?.url || '').trim()
    if (!/^https:\/\//i.test(url)) {
      throw new Error(`素材图 ${name} 缺少有效的 COS URL`)
    }
    return { name, url }
  })

  const label =
    assetItems.length > 0
      ? [
          `主图（设计稿，COS URL）：${design_image.url}`,
          `素材图×${assetItems.length}（均已上传腾讯云 COS）：`,
          ...assetItems.map((asset, index) => `${index + 1}. ${asset.name}: ${asset.url}`),
          '必须调用 GenerateLayoutHtml：把主图 URL 作为 design_image，并把上述素材名称和 URL 作为 assets_urls。让视觉 Agent 实际加载主图和素材图并识别内容；不得仅凭文件名或 URL 猜测。',
        ].join('\n')
      : [
          `主图（设计稿，COS URL）：${design_image.url}`,
          '必须调用 GenerateLayoutHtml，并把上述主图 URL 作为 design_image，让视觉 Agent 加载并识别图片内容；不得仅凭文件名或 URL 猜测设计。',
        ].join('\n')

  return {
    content: [{ type: 'text', text: mergeUserText(userText, label) }],
    assetNames: assetItems.map((asset) => asset.name),
  }
}

/** 仅素材图（无主图） */
export function buildAssetReplaceContent({
  userText,
  assets = [],
}) {
  const list = Array.isArray(assets) ? assets : []
  if (!list.length) throw new Error('至少需要一张素材图')
  if (list.length > 40) throw new Error('素材图最多 40 张')

  const materialLines = list.map((asset, index) => {
    const name = sanitizeName(asset?.name, `material-${index + 1}`)
    const url = String(asset?.url || '').trim()
    if (!/^https:\/\//i.test(url)) {
      throw new Error(`素材图 ${name} 缺少有效的 COS URL`)
    }
    return `${index + 1}. ${name}: ${url}`
  })
  const label = [
    `素材图×${materialLines.length}（无主图，已上传腾讯云 COS）`,
    ...materialLines,
    '',
    '请根据用户说明、文件名和当前页面上下文理解每张素材的用途，直接把对应 COS URL 应用到代码或数据中。',
    '这些是网页素材，不是设计稿；不要调用视觉 Agent，也不要把图片重新写入 public 目录。',
  ].join('\n')

  return {
    content: [{ type: 'text', text: mergeUserText(userText, label) }],
    assetNames: list.map((asset, index) =>
      sanitizeName(asset?.name, `material-${index + 1}`),
    ),
  }
}
