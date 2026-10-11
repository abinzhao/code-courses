# MP-15 图片校验与上传：临时路径不是已发布对象

## 任务卡

- 任务：选择后逐文件校验，上传支持取消，成功响应必须从字符串 JSON 解析。
- 产出：`src/upload.ts`、`src/upload-platform.ts`、`tests/upload.test.ts`。
- 运行：MP-24 项目 `npm test`、`npm run typecheck`。
- 证据：数量、大小、类型、尺寸、HTTP、parser、取消、服务器已校验状态。
- 边界：完整客户端控制器可接真实 HTTPS；本地测试注入 transport，不上传真实图片。

## 1. 任务背景

chooseImage compressed 是偏好，不是大小保证；扩展名 jpg 也不是可信 MIME。
客户端预检减少流量，服务器仍必须验证二进制、解码尺寸、用户归属与发布引用。
uploadFile success 表示收到响应，不代表 HTTP 2xx，更不代表图片已校验。

## 2. 学习目标

逐图验证元信息；处理上传 string 响应；区分预检、上传中、待校验和 verified；
提供取消与进度；防止旧账号回调安装 imageKey；定义服务端二次检查。

## 3. 预备知识

完成 [能力降级](../07-permissions/02-components-capability-fallback.md) 与 MP-24 基线。
本篇三文件增补到 Capstone 项目，但默认页面仍仅预览图片；
真实模式须由用户授权服务器与合法上传域名接线，不在课堂自动上传。

<a id="s4"></a>
## 4. 核心理论

### 4.1 客户端预算

本实验最多 3 张、每张 2 MiB、边长不超过 4096、总像素不超过 12M、仅 JPEG/PNG。
这是应用策略，不是平台限额。元信息来自 getFileInfo/getImageInfo，仍不可信安全保证。
相机失败、用户取消与隐私拒绝都不删除原草稿。

### 4.2 上传合同

POST `/api/v1/images` multipart 字段 `file`，Bearer Token。2xx body：
`{uploadId,imageKey,status:"verified"}`。`pending`、错误 HTML、缺字段均不能发布引用。
进度 100% 只是字节发送完成；直到 parser 得到 verified 才能加入 imageKeys。
取消先 reject 本地 promise，再 abort transport；服务器可能已收到文件，孤儿按 TTL 回收。

### 4.3 服务器二次校验

服务器必须限流、鉴权、流式大小限制、魔数判断、真实解码、像素/内存预算与元数据清除，
阻止伪 MIME、解压炸弹与 SVG 主动内容。对象名由服务器生成，不用客户端文件名作路径。
`imageKey` 绑定当前 user、校验状态与有效期；POST listing 引用时再次检查，
不能客户端说 verified 就接受。共享八字段 Listing 默认无图片，扩展 DTO 要契约评审。

## 5. 运行与所有权

controller 不导入 Taro，可 Node 测试。平台 adapter 收集信息与实际上传；
页面调用前捕获 epoch，完成后比较再保存。隐藏/销毁时 abort 本页任务，
上传失败保留草稿，已取消不宣称服务器完全撤销。

<a id="s6"></a>
## 6. 最小可运行案例

完整文件 `src/upload.ts`：

```ts
import { object, text, integer } from "./domain";
export interface ImageMeta { path: string; size: number; width: number; height: number; type: string }
export interface ImageObject { uploadId: string; imageKey: string; status: "verified" }
export function validateImages(images: ImageMeta[]) {
  if (images.length < 1 || images.length > 3) throw new Error("image count");
  for (const image of images) {
    text(image.path, "path");
    const bytes = integer(image.size, "size", 1);
    const width = integer(image.width, "width", 1), height = integer(image.height, "height", 1);
    if (bytes > 2 * 1024 * 1024 || width > 4096 || height > 4096 || width * height > 12000000)
      throw new Error("image budget");
    if (!["jpeg", "jpg", "png"].includes(image.type.toLowerCase())) throw new Error("image type");
  }
  return images;
}
export interface UploadIO {
  upload(options: {
    url: string; filePath: string; token: string;
    success(result: { statusCode: number; data: string }): void;
    fail(error: { errMsg: string }): void;
    progress(percent: number): void;
  }): { abort(): void };
}
export function uploadImage(io: UploadIO, url: string, image: ImageMeta, token: string,
  progress: (percent: number) => void = () => {}) {
  validateImages([image]); text(token, "token");
  let settled = false, task: { abort(): void } | undefined;
  let rejectPromise: (error: Error) => void = () => {};
  const promise = new Promise<ImageObject>((resolve, reject) => {
    rejectPromise = reject;
    const fail = (error: Error) => { if (!settled) { settled = true; reject(error); } };
    try {
      task = io.upload({
        url, filePath: image.path, token,
        progress: percent => {
          if (!settled && Number.isFinite(percent)) progress(Math.min(100, Math.max(0, percent)));
        },
        fail: error => fail(new Error(`upload network: ${error.errMsg}`)),
        success: result => {
          if (settled) return;
          if (result.statusCode < 200 || result.statusCode >= 300) {
            fail(new Error(`upload HTTP ${result.statusCode}`)); return;
          }
          try {
            const x = object(JSON.parse(result.data));
            if (x.status !== "verified") throw new Error("image not verified");
            const value: ImageObject = {
              uploadId: text(x.uploadId, "uploadId"), imageKey: text(x.imageKey, "imageKey"), status: "verified"
            };
            settled = true; resolve(value);
          } catch (error) { fail(new Error(`upload parser: ${error instanceof Error ? error.message : "invalid"}`)); }
        }
      });
    } catch (error) { fail(error instanceof Error ? error : new Error("upload start")); }
  });
  return { promise, abort() {
    if (settled) return;
    settled = true; rejectPromise(new Error("upload cancelled")); task?.abort();
  } };
}
```

完整文件 `src/upload-platform.ts`：

```ts
import Taro from "@tarojs/taro";
import { ImageMeta, UploadIO, validateImages } from "./upload";
export async function inspectImages(paths: string[]): Promise<ImageMeta[]> {
  if (paths.length < 1 || paths.length > 3) throw new Error("image count");
  const images: ImageMeta[] = [];
  for (const path of paths) {
    const file = await Taro.getFileInfo({ filePath: path });
    if (!("size" in file) || typeof file.size !== "number") throw new Error("file metadata unavailable");
    const image = await Taro.getImageInfo({ src: path });
    images.push({ path, size: file.size, width: image.width, height: image.height, type: image.type });
  }
  return validateImages(images);
}
export const uploadTransport: UploadIO = {
  upload(options) {
    const task = Taro.uploadFile({
      url: options.url, filePath: options.filePath, name: "file", timeout: 30000,
      header: { Authorization: `Bearer ${options.token}` },
      success: result => options.success({ statusCode: result.statusCode, data: result.data }),
      fail: result => options.fail({ errMsg: result.errMsg })
    });
    task.progress(result => options.progress(result.progress));
    return { abort: () => task.abort() };
  }
};
```

不手写 multipart content-type，否则缺 boundary。getFileInfo 与 progress 跨平台支持和基础库
须核对，未支持时明确降级，不用写死 size=1 绕过预检。
Taro 4.3.0 的 getFileInfo 返回成功/失败联合类型，必须先检验 size 存在，不能断言成功。

完整文件 `tests/upload.test.ts`：

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { validateImages, uploadImage, UploadIO, ImageMeta } from "../src/upload";
const image: ImageMeta = { path: "fictional-temp", size: 1024, width: 100, height: 100, type: "jpeg" };
test("image budget rejects count, oversized bytes, type and pixel bomb", () => {
  assert.equal(validateImages([image]).length, 1);
  for (const images of [[], [image,image,image,image], [{ ...image, size: 3000000 }],
    [{ ...image, type: "svg" }], [{ ...image, width: 4000, height: 4000 }]])
    assert.throws(() => validateImages(images));
});
test("upload parses string body and rejects HTTP/pending/malformed", async () => {
  for (const [statusCode, data, expected] of [
    [413, "{}", /HTTP/], [200, "<html>", /parser/],
    [200, JSON.stringify({ status: "pending" }), /not verified/]
  ] as const) {
    const io: UploadIO = { upload(o) { o.success({ statusCode, data }); return { abort() {} }; } };
    await assert.rejects(uploadImage(io, "https://api.example.invalid/images", image, "demo-token").promise, expected);
  }
  const io: UploadIO = { upload(o) {
    o.success({ statusCode: 201, data: JSON.stringify({ uploadId: "u1", imageKey: "i1", status: "verified" }) });
    return { abort() {} };
  } };
  assert.equal((await uploadImage(io, "https://api.example.invalid/images", image, "demo-token").promise).imageKey, "i1");
});
test("abort settles before late success and suppresses later progress", async () => {
  let callbacks: Parameters<UploadIO["upload"]>[0] | undefined, aborts = 0, events = 0;
  const io: UploadIO = { upload(o) { callbacks = o; return { abort() { aborts++; } }; } };
  const task = uploadImage(io, "https://api.example.invalid/images", image, "demo-token", () => events++);
  task.abort(); callbacks!.progress(100);
  callbacks!.success({ statusCode: 201, data: '{"uploadId":"u","imageKey":"i","status":"verified"}' });
  await assert.rejects(task.promise, /cancelled/);
  assert.equal(aborts, 1); assert.equal(events, 0);
});
```

```bash
npm test
npm run typecheck
```

预期新增 3 项通过；无图片上传，无常驻进程。平台实验只用自制测试图，
取消任务、回收本机已登记资源，服务器测试对象按约定删除或 TTL，不能删他人对象。

<a id="s7"></a>
## 7. 邻里集市集成案例

真实扩展页流程：chooseImages → inspectImages → 显示预检 → 用户确认上传 →
uploadImage → 检查 epoch → verified key 暂存 → POST listing 引用已校验 key。
每个阶段有独立状态；选择失败保留旧图片；上传失败保留草稿；提交失败保留已校验 key，
由服务器 TTL 防孤儿。默认 MP-24 明确“图片未上传”，不把本篇替身结果注入默认商品。

服务器验收至少四个请求：伪 jpg 内容拒绝；超字节流 413；他人 imageKey 403；
本人 verified key 允许引用。服务端使用实际解码库并限制资源，本卷客户端测试不代替这些证据。

<a id="s8"></a>
## 8. 常见错误与排查路径

故障实验：success 直接 JSON.parse 后 `as ImageObject`，pending 会混入发布；
删除 HTTP 检查会把 413 body 当正常数据。测试应分别失败。
把进度 100 当完成则服务校验尚未结束就宣告成功；修复为 parser verified 提交点。
真实上传 403 检查 upload 合法域名、Token 与对象归属，不关闭域名检查作正式修复。

## 9. 课后题

1. 压缩能代替大小检查吗？答案：不能，逐文件检查实际字节。
2. 客户端检测 JPEG 为何服务器还解码？答案：客户端与 MIME 可伪造，魔数也不足防炸弹。
3. abort 是否撤回上传？答案：仅停止本地等待/传输，服务器可能已写入，需要孤儿回收。

<a id="s10"></a>
## 10. 实践练习

- 基础：响应是 `"{}"`。参考答案：parser 缺 verified/ID 拒绝，不将 tempPath 当 imageKey。
- 进阶：A 上传期间登录 B。参考答案：epoch 不同则不写 B 草稿，A 的孤儿交服务器 TTL。
- 故障注入：伪造客户端 size 小值。参考答案：客户端测试不证明安全；
  服务器按实际流大小和解码像素拒绝，保留脱敏失败码与对象清理证据。

<a id="s11"></a>
## 11. 阶段验收

- [ ] 3 项测试与类型检查通过；非法响应与取消不会成功。
- [ ] 进度、上传、校验、发布是不同状态。
- [ ] 服务器二次校验、归属与 TTL 列入真实接线验收。
- [ ] 默认 demo 不宣称已上传，未测的 TLS/工具/服务器明确记录。
- [ ] 不保存真实照片、Token 或未知平台临时文件。

## 12. 常见问题

是否必须支持 SVG、GIF 和 HEIC？不。本实验主动缩小准入集合，
新增格式要同时评估平台预览、解码资源、服务器转码与隐私元数据，不只放宽 type 判断。

## 13. 扩展阅读

[Taro uploadFile](https://docs.taro.zone/docs/apis/network/upload/uploadFile)、
[微信 getImageInfo](https://developers.weixin.qq.com/miniprogram/dev/api/media/image/wx.getImageInfo.html)、
[服务端文件边界](../../08-backend/07-search-pagination-files/03-upload-streams-type-storage-cleanup.md)。
2026-10-12 官方核对：uploadFile 返回 data 为 string，支持任务取消和进度。

## 我现在能做到什么

我能构建可取消、可解析的上传控制器，并拒绝把临时路径或 pending 校验当发布成功。

## 单元导航

[上一单元](../07-permissions/02-components-capability-fallback.md) ·
[下一单元](02-location-subscription.md) · [本卷](../README.md)
