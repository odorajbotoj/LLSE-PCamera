# LLSE-PCamera

---

+ Programmable Camera 可编程视角相机 LiteLoaderBDS的Javascript插件

+ **重要：由于文件及部分内容重命名，您可能需要更改某些文件，或对文件夹重命名**

+ **重要：现行脚本中，延时统一使用秒作为单位。您可能需要修改您的脚本**

+ *提示：根据个人测试得出结论，玩家视距范围之外的相机将不会加载画面*

## 安装

+ 将 `LLSE-PCamera.js` 放进 `plugins/` 文件夹就行

## 配置

+ 在至少运行过一次后，生成的配置文件位于 `plugins/LLSE-PCameraData/conf.json`

+ `public_point` 决定是否可以查看他人点位。应为 `0` 或 `1`

+ `public_script` 决定是否可以执行他人脚本。应为 `0` 或 `1`

## 使用

+ `pc clear` 清除所有相机效果，中断执行脚本

+ `pc eval <text> [dimension]` 相当于带维度的 `camera @s <text>` ，但是这个维度并没有什么用。

+ `pc me` 打印当前所处坐标与视角信息

+ `pc point ls` 列出个人所有点位信息

+ `pc point rm <Point>` 删除一个点位

+ `pc point save <Point> [text]` 将当前位置保存到点位（共p1-p8有八个），可以加注释

+ `pc point view <Point> [int] [target]` 查看一个点位。可以设置延时（毫秒）。若 `public_point` 为真，则可以通过指定一个target查看他人的点位

+ `pc script cat <string>` 列出一个脚本的内容

+ `pc script edit <string>` 编辑脚本（详见“编辑脚本”）章节

+ `pc script exec <string> [delay] [target]` 执行一个脚本。可以设置延时（毫秒）。若 `public_script` 为真，则可以通过指定一个target执行他人的脚本

+ `pc script ls` 列出个人所有脚本

+ `pc script rm <string>` 删除一个脚本

+ `pc shake <text>` 相当于 `camerashake add @s <text>`

## 脚本

+ `delay s` 延时（秒）。语句操作不会阻塞等待结果，故延时十分重要。

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

+ `head` 在遇到下一个 `end` 或结尾前使用相同前缀

+ `tail` 在遇到下一个 `end` 或结尾前使用相同后缀

+ `autodelay` 在遇到下一个 `end` 或结尾前每一条指令后都执行delay

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