# MP-13 权限与隐私：按用途触发、拒绝可继续

## 任务卡

- 任务：把隐私协议同意与系统权限授权分成两个独立门。
- 产出：微信原生独立页四文件；用户拒绝仍可手工填写区域。
- 运行：微信工具导入实验目录，逐项点击并记录真实基础库。
- 证据：首次同意、拒绝、已同意、API 不存在、返回页面与监听注销。
- 边界：代码不是法律合规证明；后台声明必须与真实数据处理一致。

## 1. 任务背景

启动立刻请求相机、位置和手机号会让用户不知道用途。自制勾选框也不等于平台隐私授权。
隐私协议处理是否被接受，与 `scope.userLocation` 是否允许是不同事实；
位置失败不能封锁浏览商品与手工输入。

## 2. 学习目标

按使用时触发能力；处理平台隐私事件与用户按钮；注销监听；区分未询问、
拒绝、永久拒绝、能力不可用与配置失败；建立最小数据声明。

## 3. 预备知识

完成 [资源所有权](../01-runtime/02-page-component-ownership.md)。
下面是原生独立项目，不与 Taro app.json 混合。需要微信基础库支持隐私 API；
实际账号、后台隐私声明和工具/真机分别记录，不能用游客结果宣称合规通过。

<a id="s4"></a>
## 4. 核心理论

### 4.1 两个门、三个用途

隐私门解释收集什么、为何、存多久、谁处理、如何删除；系统权限门允许具体设备能力。
协议同意不授予位置权限，位置授权也不允许额外用途。只为当前区域输入使用粗粒度位置，
不保存精确坐标，不后台连续定位。不需要手机号就不调用相关能力。

### 4.2 用户操作与事件所有权

`requirePrivacyAuthorize` 是辅助 API，不是必须在所有页面启动调用。
注册 onNeedPrivacyAuthorization 后，由 `agreePrivacyAuthorization` 平台按钮表达同意，
resolve 对应本次等待者。拒绝用 disagree，页面销毁要释放等待者并 off 同一函数。
示例限制同时一个操作，避免覆盖 resolver。多页面实际应用要 App 级统一协调，
不能把每页监听复制成多个会同时弹出的弹窗。

### 4.3 拒绝、设置与能力缺失

拒绝时显示手工输入，而非循环再次请求。系统权限被拒后，可在用户明确点击按钮时
打开设置，再读取最新授权；不能页面 show 自动跳设置。低基础库 API 不存在
不视为用户同意；降级为手工输入。

## 5. 实验目录

四文件：app.js、app.json、pages/privacy/index.js、index.wxml。
为简化实验不加样式。正式配置还需平台后台隐私用途、服务类目与实际能力准入，
不能仅靠 app.json permission 文案完成审核。

<a id="s6"></a>
## 6. 最小可运行案例

完整文件 `app.js`：

```js
App({});
```

完整文件 `app.json`：

```json
{
  "pages": ["pages/privacy/index"],
  "window": { "navigationBarTitleText": "隐私与区域实验" },
  "permission": { "scope.userLocation": { "desc": "仅本次填写粗粒度附近区域，可手工输入" } },
  "requiredPrivateInfos": ["getLocation"]
}
```

完整文件 `pages/privacy/index.js`：

```js
Page({
  data: { region: "", message: "", showPrivacy: false, busy: false },
  onLoad() {
    this.alive = true;
    this.privacyListener = resolve => {
      if (!this.alive || this.resolvePrivacy) { resolve({ event: "disagree" }); return; }
      this.resolvePrivacy = resolve;
      this.setData({ showPrivacy: true });
    };
    if (typeof wx.onNeedPrivacyAuthorization === "function")
      wx.onNeedPrivacyAuthorization(this.privacyListener);
  },
  onUnload() {
    this.alive = false;
    this.resolvePrivacy?.({ event: "disagree" });
    this.resolvePrivacy = undefined;
    if (typeof wx.offNeedPrivacyAuthorization === "function")
      wx.offNeedPrivacyAuthorization(this.privacyListener);
  },
  input(event) { this.setData({ region: event.detail.value }); },
  openContract() {
    if (typeof wx.openPrivacyContract !== "function") {
      this.setData({ message: "当前客户端不支持协议能力，请手工输入" }); return;
    }
    wx.openPrivacyContract({ fail: () => this.setData({ message: "协议打开失败，请稍后再试" }) });
  },
  agree() {
    const resolve = this.resolvePrivacy; this.resolvePrivacy = undefined;
    this.setData({ showPrivacy: false });
    resolve?.({ event: "agree", buttonId: "agree-region" });
  },
  disagree() {
    const resolve = this.resolvePrivacy; this.resolvePrivacy = undefined;
    this.setData({ showPrivacy: false, message: "未同意，可继续手工输入区域" });
    resolve?.({ event: "disagree" });
  },
  locate() {
    if (this.data.busy) return;
    if (typeof wx.requirePrivacyAuthorize !== "function") {
      this.setData({ message: "客户端能力不足，请手工输入区域" }); return;
    }
    this.setData({ busy: true });
    wx.requirePrivacyAuthorize({
      success: () => {
        if (!this.alive) return;
        wx.getLocation({
          type: "gcj02",
          success: value => {
            if (this.alive) this.setData({
              region: `${value.latitude.toFixed(2)},${value.longitude.toFixed(2)}`,
              message: "粗粒度坐标仅暂存界面，不上传"
            });
          },
          fail: () => { if (this.alive) this.setData({ message: "位置未取得，可手工输入；设置需主动打开" }); },
          complete: () => { if (this.alive) this.setData({ busy: false }); }
        });
      },
      fail: () => { if (this.alive) this.setData({ busy: false, message: "隐私授权未完成，可手工输入" }); }
    });
  },
  settings() {
    wx.openSetting({
      success: value => this.setData({
        message: value.authSetting["scope.userLocation"] ? "位置已允许，可再次点击定位" : "仍未允许，可手工输入"
      }),
      fail: () => this.setData({ message: "设置打开失败，请手工输入" })
    });
  }
});
```

完整文件 `pages/privacy/index.wxml`：

```xml
<view>可选附近区域，不影响浏览商品</view>
<input value="{{region}}" bindinput="input" placeholder="手工输入区域" />
<button disabled="{{busy}}" bindtap="locate">本次使用位置</button>
<button bindtap="settings">主动打开权限设置</button>
<view>{{message}}</view>
<view wx:if="{{showPrivacy}}">
  <view>本次为填写区域请求位置，不上传精确坐标。请查看已配置隐私协议。</view>
  <button bindtap="openContract">查看平台隐私协议</button>
  <button id="agree-region" open-type="agreePrivacyAuthorization"
    bindagreeprivacyauthorization="agree">同意本次隐私授权</button>
  <button bindtap="disagree">暂不同意，手工输入</button>
</view>
```

导入后先填手工区域，应无定位请求；点击定位再走隐私与位置授权。
拒绝后可以继续输入。关闭页面释放 listener/resolver；停止工具项目即可，
只清此实验的授权记录用于重新测试，不注销真实账号。

<a id="s7"></a>
## 7. 邻里集市集成案例

Capstone 默认平台能力调用不自行强制弹协议；正式应用若采用本示例协调器，
将其移到 App 所有权，Taro 使用平台 Button openType 和明确微信 adapter。
发布页只在“使用位置”点击时调用，失败保留 region 输入。
location 返回粗粒度坐标仍可能是个人信息，不因为保留两位就称匿名；
正式地域功能优先用户选 regionId，并重新评审共享契约与用途。

<a id="s8"></a>
## 8. 常见错误与排查路径

故障实验：onUnload 不 off，返回页面重复监听；记录弹窗次数与 handler 数量，
恢复相同 listener 引用注销。将 privacy fail 当 success 会在拒绝后继续 getLocation，
用工具调用轨迹发现。配置错误、权限拒绝与 API 不存在分别报错，不统一写“用户拒绝”。

## 9. 课后题

1. 同意协议能直接定位吗？答案：系统权限仍需独立允许。
2. 为什么不用普通 button resolve agree？答案：必须遵循平台授权按钮与事件规范。
3. 每次 show 请求权限吗？答案：不，使用时触发，拒绝可走手工路径。

<a id="s10"></a>
## 10. 实践练习

- 基础：拒绝后手填。参考答案：message 提示未授权，region 可编辑，浏览与预约不受影响。
- 进阶：页面退出时正等待同意。参考答案：resolver disagree，注销监听，
  后续回调不 setData；新页面可重新使用能力。
- 故障注入：低基础库不支持 require API。参考答案：不执行定位、不假同意，
  显示能力不足与手工入口，并标记平台未验。

<a id="s11"></a>
## 11. 阶段验收

- [ ] 首次、已同意、拒绝和能力不存在都有记录。
- [ ] 没有启动强制授权、自动跳设置或后台连续采集。
- [ ] listener 归属与清理可观察，协议后台声明与实际用途一致。
- [ ] 微信工具/真机各自记录；没有账号/工具不勾平台通过。

## 12. 常见问题

requirePrivacyAuthorize 官方注明从基础库 2.32.3 支持，本卷核对日为 2026-10-12。
这不是本卷长期最低库锁定值；目标账号与工具另选可用版本。抖音、支付宝不能调用 wx
或复用微信同意记录，分别实现授权与平台审查。

## 13. 扩展阅读

[微信 requirePrivacyAuthorize](https://developers.weixin.qq.com/miniprogram/dev/api/open-api/privacy/wx.requirePrivacyAuthorize.html)、
[隐私开发指南](https://developers.weixin.qq.com/miniprogram/dev/framework/user-privacy/PrivacyAuthorize.html)、
[权限授权](https://developers.weixin.qq.com/miniprogram/dev/framework/open-ability/authorize.html)。

## 我现在能做到什么

我能分开隐私与权限门，在用户拒绝和能力缺失时保留可用流程并释放资源。

## 单元导航

[上一单元](../06-storage/02-quota-files-cleanup.md) ·
[下一单元](02-components-capability-fallback.md) · [本卷](../README.md)
