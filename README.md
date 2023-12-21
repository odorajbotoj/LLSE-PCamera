# LLSE-PCamera

---

+ Programmable Camera 可编程视角相机 LiteLoaderBDS的Javascript插件

## 安装

+ 将 `ProgrammableCamera.js` 放进 `plugins/` 文件夹就行

## 配置

+ 在至少运行过一次后，生成的配置文件位于 `plugins/ProgrammableCameraData/conf.json`

+ `public_point` 决定是否可以查看他人点位。应为 `0` 或 `1`

+ `public_script` 决定是否可以执行他人脚本。应为 `0` 或 `1`

## 使用

+ `pc clear` 清除所有相机效果，中断执行脚本

+ `pc eval <text>` 相当于 `camera @s <text>`

+ `pc me` 打印当前所处坐标与视角信息

+ `pc point ls` 列出个人所有点位信息

+ `pc point rm <Point>` 删除一个点位

+ `pc point save <Point> [text]` 将当前位置保存到点位（共p1-p8有八个），可以加注释

+ `pc point view <Point> [int] [target]` 查看一个点位。可以设置延时（毫秒）。若 `public_point` 为真，则可以通过指定一个target查看他人的点位

+ `pc script cat <string>` 列出一个脚本的内容

+ `pc script edit <string>` 编辑脚本（详见“编辑脚本”）章节

+ `pc script exec <string> [target]` 执行一个脚本。若 `public_script` 为真，则可以通过指定一个target执行他人的脚本

+ `pc script ls` 列出个人所有脚本

+ `pc script rm <string>` 删除一个脚本

+ `pc shake <text>` 相当于 `camerashake add @s <text>`

## 脚本

+ `delay ms` 延时（毫秒）。所有的任务是异步执行的，故延时十分重要。

+ `title "content" type fadeInTime stayTime fadeOutTime` content为标题内容（支持反斜杠转义双引号），末尾三个参数分别是淡入、停留、淡出时间。type取值如下：

| type参数 | 消息类型 |
|---|---|
| 0 | 清空（Clear）
| 1 | 重设（Reset）
| 2 | 设置主标题（SetTitle）
| 3 | 设置副标题（SetSubTitle）
| 4 | 设置Actionbar（SetActionBar）
| 5 | 设置显示时间（SetDurations）
| 6 | Json型主标题（TitleTextObject）
| 7 | Json型副标题（SubtitleTextObject）
| 8 | Json型Actionbar（ActionbarTextObject）

+ `toast "text1" "text2"` text1和text2分别是toast上下两行内容（支持反斜杠转义双引号）。

+ `shake` 同上述 `pc shake`

+ `cam` 同上述 `pc eval`

## 编辑脚本

+ ` ` 内容前多输入一个空格即可正常发出，否则会被存进缓冲区

+ `:m` 同上述 `pc me`

+ `:p` 打印缓冲区

+ `:w` 写入文件

+ `:q` 退出编辑

+ `:d i` 删除某一行

+ `:j i` 跳转到某一行

## 开源

+ MIT LICENSE