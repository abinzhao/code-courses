# 21-React 复杂表单与校验

## 目标

表单是 Web 应用中密度最高的人机交互入口：登录、注册、下单、发布内容、修改设置，本质上都是“采集输入 → 校验 → 提交 → 处理结果”。简单表单用受控组件即可解决；当字段数量、跨字段规则、异步校验和服务端错误增多时，需要一套可维护的表单架构。

完成本知识单元后，学员应能够：

1. 区分受控组件与非受控组件，说明各自的数据来源、适用场景和性能差异，并能在一个表单中合理混用。
2. 描述字段级和表单级的状态模型（值、触碰、脏、校验中、错误），设计“何时展示错误”的交互规则。
3. 使用 React Hook Form 的 `useForm`、`register` 和 `Controller` 组织多字段表单，理解非受控注册如何减少重渲染。
4. 使用 Zod 描述校验 schema，通过 `zodResolver` 接入表单，并能处理跨字段规则与可选输入。
5. 实现可访问的错误提示：`label` 关联、`aria-invalid`、`aria-describedby`、错误焦点管理和不只依赖颜色的提示。
6. 实现提交中状态与防重复提交、脏表单离开确认、服务端字段错误回填，并保持“表单类型”与“后端实体类型”分离。

本单元的教学主线是“状态归属”和“错误体验”，而不是某个库的 API 清单。所有库 API 都可能升级，但字段状态模型和类型分层原则长期有效。

## 技术栈

| 工具或库 | 当前稳定版本线 | 用途 | 学习要求 |
|---|---|---|---|
| React | 19.x | UI 库 | 理解受控/非受控、Hooks 与组合 |
| TypeScript | 5.x 稳定版 | 类型系统 | 能为表单值、schema 推断结果和实体分别建模 |
| React Hook Form | 7.x 稳定版 | 表单状态管理 | 掌握 `useForm`、`register`、`Controller`、`handleSubmit`、`setError`、`reset` |
| `@hookform/resolvers` | 与 RHF 7.x 配套 | schema 适配层 | 掌握 `zodResolver` 的接入与选项 |
| Zod | 当前稳定主版本 | 声明式校验与类型推断 | 掌握 `object`、`string`、`number`、`enum`、`optional`、`refine`、`superRefine` |
| Vite | 当前稳定版 | 开发与构建 | 能启动项目、组织表单代码目录 |
| ESLint | 9.x flat config | 代码质量 | 保证表单代码符合团队规则 |

约定与说明：

- 本单元示例使用函数组件和 Hooks，不以 class component 作为主线。
- 示例中的 API 地址一律使用 `https://api.example.com` 这类占位域名，不出现真实令牌、Cookie 或密钥。
- 表单校验在前端执行用于即时反馈；后端必须独立重新校验，前端校验不能作为安全边界。
- 包管理器以 pnpm 为例，使用 npm 或 yarn 的学员对应替换命令即可。
- 浏览器原生校验（`required`、`type="email"` 产生的气泡提示）与自定义错误 UI 会相互干扰；教学项目中通过 `noValidate` 关闭原生气泡，由自定义 schema 统一控制错误体验。

## 详细的理论知识讲解和示例伪代码

### 1. 受控组件与非受控组件

#### 1.1 定义

受控组件（controlled component）指输入元素的值由 React 状态驱动：`value` 绑定 state，`onChange` 更新 state。React 是输入值的唯一事实源。

非受控组件（uncontrolled component）指输入值保存在 DOM 中，React 通过 ref 在需要时读取，初始值用 `defaultValue` 设置。

```tsx
import { useRef, useState } from 'react';

export function ControlledInput() {
  const [name, setName] = useState('');

  return (
    <label>
      姓名（受控）
      <input
        type="text"
        value={name}
        onChange={(event) => setName(event.target.value)}
      />
    </label>
  );
}

export function UncontrolledInput() {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleRead = () => {
    // 只在需要时从 DOM 读取，输入过程中 React 不参与
    console.log(inputRef.current?.value);
  };

  return (
    <label>
      姓名（非受控）
      <input type="text" ref={inputRef} defaultValue="" />
      <button type="button" onClick={handleRead}>
        读取值
      </button>
    </label>
  );
}
```

#### 1.2 与 Web 的关系

HTML 表单元素天生自带状态：用户在 `<input>` 中键入时，浏览器自己维护值，并不需要 JavaScript。受控组件实际上是 React 把 DOM 状态“镜像”到 JavaScript 状态中，每次键入都经历“DOM 事件 → setState → 重新渲染 → 写回 DOM”。

- 需要实时联动（搜索联想、字数统计、跨字段计算）时，使用受控组件。
- 字段很多、只在提交时取值时，非受控组件可以显著减少键入过程中的重渲染。
- 文件输入 `<input type="file">` 的值不能由程序设置，只能非受控。

#### 1.3 常见误区

> 误区：所有输入都必须受控，否则就是“不 React”。

React 官方明确支持非受控表单。React Hook Form 的核心优化正是基于非受控注册。反过来，认为受控组件“性能一定差”也是错误判断：三五个字段的表单，受控写法更直观；性能问题要用 Profiler 证据确认，而不是凭感觉。

### 2. 字段状态与错误模型

#### 2.1 定义

一个成熟表单字段至少包含以下状态维度：

```text
value        当前值
isTouched    用户是否触碰过（聚焦后离开）
isDirty      当前值是否与初始值不同
error        校验错误信息，没有错误时为空
isValidating 是否正在进行异步校验
```

表单级还有：`isValid`（整体是否合法）、`isSubmitting`（提交中）、`submitCount`（已提交次数）。错误展示的典型策略是：未触碰时不报错；触碰后失焦再校验；一旦尝试提交过，所有字段按变更实时校验。

#### 2.2 与 Web 的关系

用户在网页上填写长表单时，“刚键入第一个字符就看到红色报错”是非常糟糕的体验。字段状态机的价值是把“数据合法与否”和“是否向用户展示错误”分开：值可以一直非法，但错误提示只在合适的交互时机出现。

下面用纯 React 实现一个最小字段状态机，帮助理解库内部到底在做什么：

```tsx
import { FocusEvent, useState } from 'react';

type FieldMeta = {
  value: string;
  touched: boolean;
  error: string;
};

function validateName(value: string): string {
  if (value.trim() === '') return '姓名不能为空';
  if (value.trim().length < 2) return '姓名至少 2 个字符';
  return '';
}

export function NameField() {
  const [field, setField] = useState<FieldMeta>({
    value: '',
    touched: false,
    error: '',
  });

  const showError = field.touched && field.error !== '';

  const handleChange = (event: { target: { value: string } }) => {
    const { value } = event.target;
    setField((prev) => ({
      ...prev,
      value,
      // 触碰过后，随键入重新校验，及时解除错误
      error: prev.touched ? validateName(value) : prev.error,
    }));
  };

  const handleBlur = (_event: FocusEvent<HTMLInputElement>) => {
    setField((prev) => ({
      ...prev,
      touched: true,
      error: validateName(prev.value),
    }));
  };

  return (
    <label>
      姓名
      <input
        type="text"
        value={field.value}
        onChange={handleChange}
        onBlur={handleBlur}
        aria-invalid={showError}
      />
      {showError ? <span role="alert">{field.error}</span> : null}
    </label>
  );
}
```

#### 2.3 常见误区

> 误区一：字段状态只有“值”和“报错字符串”。

缺少 touched/dirty 会导致错误提示时机混乱，也无法实现离开提示。

> 误区二：提交成功或失败后不重置元状态。

失败后用户修正字段时错误应及时解除；成功提交后应使用 `reset` 把值和元状态一并复位，只清值会留下“已触碰”的陈旧状态。

### 3. React Hook Form：useForm 与 register

#### 3.1 定义

React Hook Form（下称 RHF）通过 ref 注册字段，输入过程默认不触发 React 重渲染；校验、触碰、脏值等元状态由库内部维护，并在需要时通过订阅暴露给组件。

```tsx
import { useForm } from 'react-hook-form';

type ProfileFormValues = {
  nickname: string;
  age: string;
  bio: string;
};

export function ProfileForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, touchedFields, isDirty },
  } = useForm<ProfileFormValues>({
    mode: 'onBlur', // 失焦首次校验，之后随键入校验
    defaultValues: {
      nickname: '',
      age: '',
      bio: '这个人很勤奋，还没有留下介绍。',
    },
  });

  const onSubmit = (values: ProfileFormValues) => {
    console.log('提交数据', values);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <label>
        昵称
        <input
          type="text"
          aria-invalid={Boolean(errors.nickname)}
          {...register('nickname', {
            required: '昵称不能为空',
            minLength: { value: 2, message: '昵称至少 2 个字符' },
          })}
        />
      </label>
      {errors.nickname ? (
        <span role="alert">{errors.nickname.message}</span>
      ) : null}

      <label>
        年龄
        <input
          type="number"
          {...register('age', {
            required: '请填写年龄',
            validate: (value) =>
              Number(value) >= 18 || '仅接受 18 岁以上用户';
          })}
        />
      </label>
      {errors.age ? <span role="alert">{errors.age.message}</span> : null}

      <p>昵称字段是否触碰过：{touchedFields.nickname ? '是' : '否'}</p>
      <p>表单是否有未保存修改：{isDirty ? '是' : '否'}</p>

      <button type="submit">保存</button>
    </form>
  );
}
```

#### 3.2 与 Web 的关系

`register` 返回的对象包含 `name`、`onChange`、`onBlur` 和 `ref`。展开到原生表单元素后，RHF 就能在 DOM 层面监听输入与失焦，这与浏览器表单的原生事件模型完全一致。常用模式配置：

| mode | 首次校验时机 | 适用场景 |
|---|---|---|
| `onSubmit`（默认） | 提交时 | 字段少、希望减少打扰 |
| `onBlur` | 失焦时 | 大多数业务表单 |
| `onChange` | 每次键入 | 规则简单、需要即时反馈的小表单 |
| `onTouched` | 首次失焦后改为随键入 | 与 onBlur 接近 |

#### 3.3 常见误区

> 误区一：解构 `formState` 时只取 `errors`，却订阅了整个对象导致大量重渲染。

RHF 对 `formState` 使用 Proxy 跟踪实际访问的字段，按需解构即可；但不要把整个 `formState` 透传给不需要的子组件。

> 误区二：动态字段忘记用 `FieldArray`，自己维护数组导致注册残留。

条目可增删的列表应使用 `useFieldArray`，库会处理注册、注销和 key 管理。

### 4. Controller：接入非标准受控输入

#### 4.1 定义

`register` 依赖 ref 和原生事件，只适用于能正确转发 ref、暴露标准事件的输入。对于自研组件、第三方选择器、滑块、富文本编辑器等“值不是字符串、变化事件不是标准 input 事件”的控件，需要使用 `Controller`，由它把外部受控接口翻译成 RHF 的内部状态。

```tsx
import { Controller, useForm } from 'react-hook-form';

type Visibility = 'private' | 'team' | 'public';

type ArticleFormValues = {
  title: string;
  visibility: Visibility;
  tags: string[];
};

type SegmentedControlProps = {
  value: Visibility;
  onChange: (next: Visibility) => void;
  onBlur: () => void;
  invalid: boolean;
};

function VisibilityControl(props: SegmentedControlProps) {
  const options: Visibility[] = ['private', 'team', 'public'];
  const labelMap: Record<Visibility, string> = {
    private: '仅自己',
    team: '团队可见',
    public: '公开',
  };

  return (
    <div role="radiogroup" aria-label="可见范围">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          role="radio"
          aria-checked={props.value === option}
          onBlur={props.onBlur}
          onClick={() => props.onChange(option)}
        >
          {labelMap[option]}
        </button>
      ))}
    </div>
  );
}

export function ArticleForm() {
  const { control, handleSubmit } = useForm<ArticleFormValues>({
    defaultValues: { title: '', visibility: 'private', tags: [] },
  });

  return (
    <form
      onSubmit={handleSubmit((values) => {
        console.log(values);
      })}
    >
      <Controller
        name="visibility"
        control={control}
        rules={{ required: '请选择可见范围' }}
        render={({ field, fieldState }) => (
          <VisibilityControl
            value={field.value}
            onChange={field.onChange}
            onBlur={field.onBlur}
            invalid={Boolean(fieldState.error)}
          />
        )}
      />
      <button type="submit">发布</button>
    </form>
  );
}
```

#### 4.2 与 Web 的关系

`Controller` 的 render prop 提供 `field`（含 `value`、`onChange`、`onBlur`、`name`、`ref`）和 `fieldState`（含 `error`、`isTouched`、`isDirty`）。它本质上是“受控适配层”：外部控件仍然按自己习惯的受控协议工作，RHF 在协议转换中保持统一的状态模型。配合 `useId` 或 RHF 提供的 id 工具，错误提示可以与任意自定义控件正确关联。

#### 4.3 常见误区

> 误区：给普通 `<input>` 也套一层 `Controller`。

普通输入用 `register` 更简单，也保留了非受控的性能优势。Controller 应只留给 register 无法描述的控件。另一个常见错误是在 `onChange` 中手动 `setValue`，与 Controller 的状态更新重复，造成双重写入。

### 5. Zod schema 与 zodResolver

#### 5.1 定义

Zod 是声明式、类型推断优先的校验库：先用代码描述数据形状，运行时负责校验，编译期自动导出 TypeScript 类型。`zodResolver` 把 Zod 的校验结果转换为 RHF 能识别的错误结构。

```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const profileFormSchema = z
  .object({
    nickname: z
      .string()
      .trim()
      .min(1, '昵称不能为空')
      .min(2, '昵称至少 2 个字符')
      .max(20, '昵称最多 20 个字符'),
    age: z.coerce
      .number({ invalid_type_error: '请填写年龄' })
      .int('年龄必须是整数')
      .gte(18, '仅接受 18 岁以上用户')
      .lte(120, '年龄数值不合理'),
    homepage: z
      .string()
      .trim()
      .optional()
      .refine(
        (value) => value === undefined || value === '' || /^https:\/\//.test(value),
        '主页地址必须以 https:// 开头',
      ),
    password: z.string().min(8, '密码至少 8 位'),
    confirmPassword: z.string().min(8, '请再次输入密码'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: '两次输入的密码不一致',
    path: ['confirmPassword'],
  });

type ProfileFormValues = z.infer<typeof profileFormSchema>;

export function ZodProfileForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    mode: 'onBlur',
    defaultValues: {
      nickname: '',
      age: undefined,
      homepage: '',
      password: '',
      confirmPassword: '',
    },
  });

  return (
    <form
      noValidate
      onSubmit={handleSubmit((values) => {
        console.log(values);
      })}
    >
      <label>
        昵称
        <input type="text" aria-invalid={Boolean(errors.nickname)} {...register('nickname')} />
      </label>
      {errors.nickname ? <span role="alert">{errors.nickname.message}</span> : null}

      <label>
        主页（可选）
        <input type="url" {...register('homepage')} />
      </label>
      {errors.homepage ? <span role="alert">{errors.homepage.message}</span> : null}

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? '保存中…' : '保存'}
      </button>
    </form>
  );
}
```

#### 5.2 与 Web 的关系

浏览器表单提交的所有值天然都是字符串，数字复选框等也不例外。Zod 的 `z.coerce.number()` 可以在解析阶段把字符串强制转换，避免“表单值类型”与“业务期望类型”在每个字段里手写转换。跨字段规则用对象级 `refine`，错误通过 `path` 精确挂到某个字段；更复杂的规则（一个值产生多个错误、依赖外部数据）可使用 `superRefine`。

#### 5.3 常见误区

> 误区一：把可选字段简单写成 `z.string().optional()`，用户输入空格后通过校验。

可编辑文本的“空”通常包含空串和纯空格，应结合 `trim`、空串转换或预处理，使“未填写”和“填写了内容”边界清晰。

> 误区二：前端 schema 与后端实体共用一份，却在里面写满 UI 文案。

校验规则可以前后端共享思路，但错误文案、强制转换策略服务于前端交互；建议在表单层定义独立 schema，后端保留面向 API 契约的 schema。

### 6. 错误提示的可访问性

#### 6.1 定义

可访问的错误提示要求屏幕阅读器和键盘用户能获得与视觉用户相同的信息：每个输入有可见 `label`；出错时通过 `aria-invalid="true"` 标记；错误文案通过 `aria-describedby` 与输入关联；提交失败时焦点移动到第一个错误字段或错误汇总区；颜色只作辅助，不单独承担信息。

```tsx
import { useId } from 'react';
import { FieldError } from 'react-hook-form';

type FormFieldProps = {
  label: string;
  error?: FieldError;
  children: (props: {
    describedBy: string | undefined;
    invalid: boolean;
  }) => React.ReactNode;
};

export function FormField(props: FormFieldProps) {
  const hintId = useId();
  const errorId = useId();
  const invalid = Boolean(props.error);

  return (
    <div>
      <label htmlFor={hintId}>{props.label}</label>
      {props.children({
        describedBy: invalid ? errorId : undefined,
        invalid,
      })}
      {invalid ? (
        <span id={errorId} role="alert" style={{ color: '#b00020' }}>
          {props.error.message}
        </span>
      ) : null}
    </div>
  );
}
```

提交后把焦点移动到第一个错误字段的示例：

```tsx
import { useEffect } from 'react';
import { UseFormSetFocus } from 'react-hook-form';

type Values = { email: string; password: string };

function useFocusFirstError(
  submitCount: number,
  fieldOrder: (keyof Values)[],
  errors: Partial<Record<keyof Values, unknown>>,
  setFocus: UseFormSetFocus<Values>,
) {
  useEffect(() => {
    if (submitCount === 0) return;
    const firstInvalid = fieldOrder.find((name) => Boolean(errors[name]));
    if (firstInvalid) {
      setFocus(firstInvalid);
    }
  }, [submitCount, errors, fieldOrder, setFocus]);
}
```

#### 6.2 与 Web 的关系

`role="alert"` 具有隐式的 `aria-live="assertive"`，错误出现时屏幕阅读器会主动播报；`aria-describedby` 让用户在字段内按辅助键时听到字段说明和错误。这些机制不依赖任何 UI 库，只依赖 HTML 与 ARIA 标准，也是 Testing Library 的 `getByRole`、`toHaveAccessibleDescription` 等查询能工作的前提。

#### 6.3 常见误区

> 误区一：错误只画成红色文字，不关联 label，不标记 aria。

色弱用户和屏幕阅读器用户将完全错过错误。

> 误区二：错误文案放在离输入很远的位置，且没有 DOM 关联。

视觉上看似“顶部汇总”，但焦点管理缺失时，键盘用户提交后仍停在原地，不知道上面发生了什么。汇总列表应同时提供，并把焦点移到汇总区或第一个错误字段。

### 7. 提交中状态、防重复提交与结果处理

#### 7.1 定义

防重复提交需要同时满足：请求期间按钮呈现提交中状态并禁用；即使按钮事件被异常快速触发两次，也只有一个在途请求；请求结束后（成功或失败）正确解除状态。

```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().trim().min(1, '请输入邮箱'),
  password: z.string().min(1, '请输入密码'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

type LoginResponse = {
  requestId: string;
};

async function postLogin(values: LoginFormValues): Promise<LoginResponse> {
  const response = await fetch('https://api.example.com/v1/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(values),
  });
  if (!response.ok) {
    throw new Error(`LOGIN_FAILED_${response.status}`);
  }
  return response.json();
}

export function LoginForm() {
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (values: LoginFormValues) => {
    try {
      const result = await postLogin(values);
      // 成功后复位值与元状态，再跳转
      reset();
      console.log('登录成功', result.requestId);
    } catch (error) {
      // 表单级错误挂到 root，避免误挂字段
      setError('root.serverError', {
        message: '登录服务暂时不可用，请稍后再试',
      });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <label>
        邮箱
        <input type="email" autoComplete="username" {...register('email')} />
      </label>
      {errors.email ? <span role="alert">{errors.email.message}</span> : null}

      <label>
        密码
        <input
          type="password"
          autoComplete="current-password"
          {...register('password')}
        />
      </label>
      {errors.password ? <span role="alert">{errors.password.message}</span> : null}

      {errors.root?.serverError ? (
        <p role="alert">{errors.root.serverError.message}</p>
      ) : null}

      <button type="submit" disabled={isSubmitting} aria-busy={isSubmitting}>
        {isSubmitting ? '登录中…' : '登录'}
      </button>
    </form>
  );
}
```

#### 7.2 与 Web 的关系

RHF 的 `handleSubmit` 会保证 `isSubmitting` 在异步提交函数执行期间为真，重复触发会被库拦截；这比手工维护 `useState` 布尔值更可靠，因为后者在极端快速双击下仍可能产生两个请求。`aria-busy` 让辅助技术知道区域正在更新；`disabled` 同时阻止键盘和鼠标操作。网络层还可以增加请求去重或幂等键（由后端约定），形成第二道防线。

#### 7.3 常见误区

> 误区一：提交函数不返回 Promise。

若 `onSubmit` 内部起了异步操作却不 `await`/返回，RHF 会立刻认为提交结束，`isSubmitting` 一闪而过。

> 误区二：失败后只弹 toast，不保留表单状态。

网络错误可以用 toast，但字段级错误必须回填；成功才 `reset`，失败时保留用户输入。

### 8. 脏表单离开确认、服务端错误回填与类型分层

#### 8.1 脏表单离开确认

需要拦截两类离开：关闭/刷新标签页（浏览器 `beforeunload` 事件），以及应用内路由切换。关闭页签的实现如下：

```tsx
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';

type DraftValues = { title: string; content: string };

function useBeforeUnload(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      // 现代浏览器要求设置 returnValue 才会弹出确认框，文案由浏览器决定
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [active]);
}

export function ArticleEditor() {
  const {
    register,
    handleSubmit,
    formState: { isDirty, isSubmitting },
  } = useForm<DraftValues>({
    defaultValues: { title: '', content: '' },
  });

  // 提交过程中不再提示，避免“保存成功跳转”被拦截
  useBeforeUnload(isDirty && !isSubmitting);

  return (
    <form onSubmit={handleSubmit((values) => console.log(values))}>
      <label>
        标题
        <input {...register('title', { required: '标题不能为空' })} />
      </label>
      <label>
        正文
        <textarea {...register('content')} />
      </label>
      <button type="submit">保存</button>
    </form>
  );
}
```

应用内路由拦截的概念伪代码（不同路由库 API 名称不同，原理一致）：

```text
当路由将要切换时:
    如果 表单是脏的 且 不在提交过程中:
        弹出确认框（离开 / 继续编辑）
        用户选择离开 -> 放行并清理离开监听
        用户选择留下 -> 阻止切换
    否则:
        直接放行
```

#### 8.2 服务端字段错误回填

服务端在 400 响应中返回结构化字段错误，前端把它映射到对应字段：

```tsx
type FieldErrorResponse = {
  code: 'VALIDATION_FAILED';
  issues: { field: string; message: string }[];
};

class ServerValidationError extends Error {
  constructor(public readonly issues: { field: string; message: string }[]) {
    super('SERVER_VALIDATION');
  }
}

async function saveArticle(values: DraftValues): Promise<void> {
  const response = await fetch('https://api.example.com/v1/articles', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(values),
  });

  if (response.status === 400) {
    const payload = (await response.json()) as FieldErrorResponse;
    // 通过特殊异常把结构化错误带给提交函数
    throw new ServerValidationError(payload.issues);
  }

  if (!response.ok) {
    throw new Error('SERVER_UNAVAILABLE');
  }
}

async function handleArticleSubmit(
  values: DraftValues,
  setError: (
    name: 'title' | 'content',
    error: { message: string },
    options?: { shouldFocus: boolean },
  ) => void,
) {
  try {
    await saveArticle(values);
  } catch (error) {
    if (error instanceof ServerValidationError) {
      error.issues.forEach((issue, index) => {
        if (issue.field === 'title' || issue.field === 'content') {
          setError(
            issue.field,
            { message: issue.message },
            { shouldFocus: index === 0 },
          );
        }
      });
      return;
    }
    throw error;
  }
}
```

#### 8.3 表单类型与实体类型分离

表单值是字符串与 UI 概念（空串、选项枚举、嵌套草稿），实体是后端契约（数字、ISO 时间戳、嵌套资源）。用两个类型和两个转换函数明确边界：

```tsx
// 表单形状：所有文本输入都是字符串，空值用空串表达
type ArticleFormValues = {
  title: string;
  tagsText: string;
  visibility: 'private' | 'public';
  publishAt: string; // datetime-local 给出的字符串
};

// 后端实体形状
type ArticleEntity = {
  title: string;
  tags: string[];
  visibility: 'private' | 'public';
  publishAt: string; // ISO 8601
};

function fromForm(values: ArticleFormValues): ArticleEntity {
  return {
    title: values.title.trim(),
    tags: values.tagsText
      .split(',')
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0),
    visibility: values.visibility,
    publishAt: new Date(values.publishAt).toISOString(),
  };
}

function toForm(entity: ArticleEntity): ArticleFormValues {
  // 编辑场景：把实体还原为适合输入控件的形状
  const localInputValue = entity.publishAt.slice(0, 16);
  return {
    title: entity.title,
    tagsText: entity.tags.join(', '),
    visibility: entity.visibility,
    publishAt: localInputValue,
  };
}
```

#### 8.4 与 Web 的关系

浏览器只负责采集字符串，后端需要强类型数据，这之间的鸿沟永远存在。把转换收敛在 `fromForm`/`toForm` 两个函数里，组件中不散落 `new Date()`、`split`、`trim`；当后端字段变化时，只需要修改转换层。服务端回填的错误结构也应在 API 层解析成统一类型，避免组件直接读取不可信的原始 JSON。

#### 8.5 常见误区

> 误区一：直接用实体类型作为表单值类型，数字输入里强塞 number。

键入过程中数字框会经历空串，强行用 number 会产生非法中间态。表单类型允许“字符串 + 待解析”，提交时再转换。

> 误区二：服务端错误回填后，用户修改字段错误不消失。

RHF 的字段错误会在该字段下一次变更时自动清除；如果是手动挂到 `root` 的错误，需要在合适时机手动清除。

## 课后题

1. 受控组件与非受控组件的事实源分别是什么？为什么 `<input type="file">` 只能使用非受控方式？
2. 请说明 `touched`、`dirty`、`error`、`isValidating` 四个字段状态的含义，并为“注册表单”设计一套错误展示时机规则。
3. React Hook Form 的 `register` 返回对象包含哪些成员？为什么基于 ref 注册可以减少键入过程中的重渲染？
4. `mode: 'onBlur'` 与 `mode: 'onChange'` 在用户首次输入、首次失焦和提交三个时点分别如何表现？
5. 场景分析：用户在一个 12 个字段的设置页中，刚输入昵称第一个字符就看到“昵称至少 2 个字符”。请指出问题、根因，并给出两种修复方案及其取舍。
6. 场景分析：表单提交返回 400，body 中 `issues` 包含两个字段错误。请描述从解析响应到用户看到提示、焦点落到第一个错误字段的完整链路。
7. 场景分析：用户填了一半表单点击站内导航跳到列表页，没有任何提示就丢失了内容；刷新页面时浏览器却弹出了确认框。为什么两种离开行为不一致？应如何统一处理？
8. 场景分析：某下单页在网络延迟较高时，用户双击“提交订单”生成了两笔订单。仅靠按钮 `disabled` 是否足够？请给出从 UI 到网络层的多层防重方案。
9. 为什么要把“表单类型”和“实体类型”分开？请结合数字输入框在清空瞬间的值，说明直接用实体类型会出现什么问题。
10. 可访问的错误提示需要哪些 HTML/ARIA 手段？如果错误文案只显示为红色，键盘用户和屏幕阅读器用户分别会遇到什么障碍？

## 实践练习题

### 练习 1：手写受控登录表单与字段状态机

#### 任务

不使用任何表单库，用 `useState` 实现登录表单，包含邮箱、密码两个字段，手写 touched 与错误状态机：未触碰不报错，失焦校验，提交时全量校验并阻止非法提交。

#### 步骤约束

1. 邮箱失焦时校验“非空 + 包含 `@`”，密码失焦时校验“至少 8 位”。
2. 触碰过后随键入重新校验，合法后错误立即消失。
3. 提交时若存在错误，焦点移动到第一个错误字段；合法提交只打印值，不发起真实请求。
4. 输入元素必须有 `label`、`aria-invalid`，错误使用 `role="alert"`。
5. 校验逻辑写成独立函数，不与组件混写。

#### 提交物

- `LoginForm.tsx` 及独立的校验函数文件；
- 字段状态转换的文字说明（未触碰、已触碰、已提交三种情形）；
- 非法提交与合法提交各一次的操作记录。

#### 验收标准

- 首次键入不报错，失焦后才出现错误；
- 修改合法后错误实时解除；
- 焦点管理和 ARIA 属性齐全；
- 组件中没有直接操作 DOM 更新业务值的代码。

### 练习 2：RHF 与 Zod 知识条目表单

#### 任务

使用 React Hook Form + Zod 实现“知识条目”发布表单：标题、分类、标签输入（逗号分隔文本）、正文、可见范围（自研分段控件）、发布时间（`datetime-local`）。

#### 步骤约束

1. 原生输入使用 `register`，可见范围分段控件使用 `Controller`。
2. Zod 规则：标题 2 至 60 字；正文至少 20 字；标签解析后最多 5 个；发布时间必填且不早于当前时间。
3. 使用 `zodResolver`，`mode` 设为 `onBlur`。
4. 提交中按钮禁用并显示“发布中…”；用一个延时 1.5 秒的异步函数模拟提交。
5. 封装统一的 `FormField` 组件处理 label、错误关联。

#### 提交物

- 表单组件、`FormField` 组件、schema 文件；
- `ArticleFormValues` 类型与字段规则清单；
- 模拟提交函数及成功/失败两条路径的演示记录。

#### 验收标准

- 所有规则由 Zod 单一来源描述，组件内不手写校验；
- Controller 只用于自研控件，普通输入无多余包装；
- 错误提示具备 label 关联与可访问属性；
- 防重复提交在双击场景下验证有效。

### 练习 3：脏表单确认、服务端回填与类型分层

#### 任务

在练习 2 的基础上完成生产化增强：脏表单离开确认、服务端字段错误回填、表单类型与实体类型分离，并为表单编写组件测试。

#### 步骤约束

1. 通过 `beforeunload` 拦截关闭页面；应用内路由切换按路由库能力拦截，提交过程中不拦截。
2. 实现模拟 API：标题包含“违规”二字时返回 400 和结构化 `issues`，前端回填到字段并聚焦第一个错误。
3. 定义 `ArticleFormValues` 与 `ArticleEntity`，实现 `fromForm`/`toForm`：标签文本与数组互转，时间与 ISO 字符串互转。
4. 使用 Testing Library 编写至少 4 条测试：失焦报错、修正后解除、400 回填、脏表单提示存在。
5. 组件中不得出现 `split(',')`、`new Date(value)` 等转换代码，全部收敛在转换函数中。

#### 提交物

- 完整表单目录（组件、schema、转换函数、模拟 API）；
- 测试文件与运行结果；
- 类型分层说明，含两个类型与转换方向示意；
- 一段脏表单尝试离开被拦截的演示记录。

#### 验收标准

- 两类离开行为都能正确拦截或放行；
- 服务端错误结构经统一解析后回填，组件不直接读原始 JSON；
- 类型转换只存在于转换层；
- 测试稳定通过，且不依赖内部状态变量名；
- 全程不出现真实密钥或真实接口调用。

## 阶段验收作业

### 作业名称

企业级知识条目编辑表单

### 作业场景

团队需要一个可用于新建和编辑两种模式的知识条目表单。它既要在交互上克制（错误提示时机合理、离开有保护），又要在工程上可维护（schema 单一来源、类型分层、服务端错误可回填），还要能被自动化测试稳定覆盖。

### 提交物

```text
article-form/
├── schema.ts            # Zod schema 与表单类型
├── types.ts             # 实体类型与通用错误类型
├── mappers.ts           # fromForm / toForm
├── api.ts               # 模拟提交与结构化错误
├── useArticleForm.ts    # useForm 组装与提交逻辑
├── ArticleForm.tsx      # 表单视图
├── FormField.tsx        # label 与错误关联封装
├── ArticleForm.test.tsx # 组件测试
└── README.md            # 运行方式与两种模式说明
```

提交要求：

1. 支持新建与编辑两种模式；编辑模式通过 `toForm` 从实体回填初始值。
2. 所有校验规则集中在 `schema.ts`，跨字段规则不少于一条。
3. 提交函数处理成功、字段错误、服务不可用三种结果。
4. README 写明启动、测试命令，以及如何模拟 400 场景；不包含真实域名之外的服务地址或任何凭据。

### 演示步骤

学员在 15 分钟内完成：

1. 展示新建模式：失焦触发错误，键入修正后错误解除。
2. 非法提交，展示焦点落到第一个错误字段、错误与输入正确关联。
3. 填入合法数据，双击提交按钮，证明只产生一次在途请求。
4. 制造脏表单：先切换站内路由被拦截，再刷新页面触发浏览器确认。
5. 让模拟 API 返回 400，展示服务端错误回填与聚焦。
6. 切换到编辑模式，展示实体经 `toForm` 回填、保存时经 `fromForm` 转换。
7. 运行组件测试并解释测试为什么不依赖实现细节。

### 评分标准

总分 100 分，70 分及以上通过。

| 维度 | 分值 | 满分要求 |
|---|---:|---|
| 表单架构 | 20 | register/Controller 选用合理，mode 与字段状态策略清晰，无重复状态 |
| 校验与类型 | 20 | Zod 单一来源，跨字段规则正确，表单类型与实体类型分离且转换收敛 |
| 错误体验与可访问性 | 20 | 错误时机合理，label/aria 齐全，提交失败有焦点管理，不仅靠颜色 |
| 提交与离开保护 | 15 | 防重复可靠，成功/失败状态处理正确，两类离开拦截完整 |
| 测试质量 | 15 | 覆盖失焦、修正、回填、离开等关键路径，查询来自用户视角 |
| 规范与文档 | 10 | 目录清晰，README 可复现，无敏感信息，ESLint 通过 |

细分规则：

- 表单架构 20 分：受控/非受控选择 6 分，RHF API 使用 8 分，状态机时机 6 分。
- 校验与类型 20 分：schema 完整性 8 分，跨字段规则 4 分，类型分层与转换函数 8 分。
- 错误体验 20 分：提示时机 5 分，ARIA 关联 8 分，焦点管理 4 分，不只依赖颜色 3 分。
- 提交与离开 15 分：防重复 6 分，结果三分支 5 分，脏表单两类拦截 4 分。
- 测试 15 分：场景覆盖 8 分，可维护性 4 分，运行稳定 3 分。
- 规范文档 10 分：README 4 分，目录与命名 3 分，lint 通过 3 分。

### 强制不通过条件

出现以下任一情况，本次验收不通过；修正后重新验收：

1. 提交成功路径实际上发起了两次或更多请求（防重复失效）。
2. 服务端返回的字段错误无法回填，或回填后修改字段错误不解除。
3. 表单类型直接使用实体类型，转换逻辑散落组件中，无法清晰说明边界。
4. 错误提示缺少 label 关联与可访问属性，或仅用红色表达错误。
5. 脏表单刷新或站内跳转均无确认，造成数据丢失。
6. 提交内容包含真实接口凭据、令牌或个人敏感信息。
7. 只提交截图或口述，代码无法在评审环境运行。
8. 组件测试依赖内部状态名或大量复制实现逻辑，重构即崩溃。

### 学习目标与验收映射

| 学习目标 | 验收证据 |
|---|---|
| 区分并合理使用受控与非受控组件 | register 与 Controller 的选用说明、表单架构现场讲解 |
| 描述字段与表单状态模型 | 错误展示时机演示、`useArticleForm.ts` 中的模式配置 |
| 使用 RHF 组织复杂表单 | 表单目录与动态字段处理、提交日志 |
| 使用 Zod 与 resolver 统一校验 | `schema.ts`、跨字段规则及类型推断结果 |
| 实现可访问错误提示 | ARIA 属性检查、失败提交焦点演示 |
| 提交保护、离开确认、错误回填与类型分层 | 演示步骤 3 至 6、`mappers.ts` 与 `api.ts` |

### 提交前自检

- [ ] 未触碰字段不显示错误，触碰后交互符合设计。
- [ ] 所有规则只在 schema 中描述一遍。
- [ ] 双击提交只产生一个请求，成功后状态正确复位。
- [ ] 刷新与站内切换两类离开均有脏表单保护。
- [ ] 400 错误经解析回填，焦点进入第一个错误字段。
- [ ] 组件内不存在标签解析、日期转换等代码。
- [ ] README 可指导他人复现，无真实密钥与个人信息。
- [ ] `pnpm lint` 与组件测试在本机通过。
