# LLSE-PCamera
+ Programmable Camera 可编程视角相机 LiteLoaderBDS的Javascript插件
+ *提示：根据个人测试得出结论，玩家视距范围之外的相机将不会加载画面*

## v1.9.0更新说明
+ 修复玩家名中有空格导致runcmd无法正确执行
+ 分离解释和执行逻辑，脚本解释后产生中间缓存

## 安装
+ 将 `LLSE-PCamera.js` 放进 `plugins/` 文件夹就行

## 配置
+ 在至少运行过一次后，生成的配置文件位于 `plugins/LLSE-PCameraData/conf.json`
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
+ `pc preset circle2d <origin> <radius> <fromAng> <toAng> <steps> <timePerStep> <facing> { exec | save <name> }` 以origin为圆心，radius为半径，从fromAng到toAng，以timePerStep为延时走steps步，面向facing坐标，生成圆弧轨迹并执行或追加写入名为name的脚本中
+ `pc preset circula_helix <origin> <radius> <fromAng> <toAng> <steps> <timePerStep> <height> { exec | save <name> }` 以origin为圆心，radius为半径，从fromAng到toAng，以timePerStep为延时走steps步，面向轴心，升高（正）或降低（负）height绝对值高度，生成圆柱螺线轨迹并执行或追加写入名为name的脚本中
+ `pc preset simple_clrcle <radius> <timePerStep> { exec | save <name> }` 以自身为圆心，radius为半径，从0到360度，以timePerStep为延时走360步，面向圆心，生成圆轨迹并执行或追加写入名为name的脚本中
+ `pc script cat <string>` 列出一个脚本的内容
+ `pc script edit <string>` 编辑脚本（详见“编辑脚本”）章节
+ `pc script exec <string> [repeat] [delay] [target]` 执行一个脚本。可以设置延时（毫秒），也可以循环执行（repeat设置为true）。若 `public_script` 为真，则可以通过指定一个target执行他人的脚本
+ `pc script ls` 列出个人所有脚本
+ `pc script rm <string>` 删除一个脚本
+ `pc shake <text>` 相当于 `camerashake add @s <text>`

## 脚本
+ `delay <s: float>` 延时（秒）。语句操作不会阻塞等待结果，故延时十分重要。
+ `title <content: string> <type: int> <fadeInTick: int> <stayTick: int> <fadeOutTick: int>` content为双引号包裹的标题内容（支持反斜杠转义双引号），末尾三个参数（未知原因已失效）分别是淡入、停留、淡出时间。type取值如下：

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

+ `toast <text1: string> <text2: string>` text1和text2分别是双引号包裹的toast上下两行内容（支持反斜杠转义双引号）。
+ `shake <string>` 同上述 `pc shake`
+ `cam <string>` 同上述 `pc eval`
+ `head <string>` 在遇到下一个 `end` 或结尾前使用相同前缀
+ `tail <string>` 在遇到下一个 `end` 或结尾前使用相同后缀
+ `autodelay <s: int>` 在遇到下一个 `end` 或结尾前每一条指令后都执行delay
+ `origin <name: string>` 在遇到下一个 `end` 或结尾之前修饰 `cam` 选项，即变成 `execute at <target> run cam <name> <string>` 。这意味着 `cam` 里面的 `pos` 和 `facing` 将支持绝对坐标/相对坐标/局部坐标/玩家名称。
+ `setdim <dim: int>` 设置脚本执行的维度，不在同一维度的玩家将无法执行其之后的内容。建议设置在开头。可选值为0（主世界），1（地狱），2（末地）
+ `! <string>` 表示本行string内容不受head和tail修饰

## 编辑脚本
+ ` ` 内容前多输入一个空格即可正常发出，否则会被存进缓冲区
+ `:m` 同上述 `pc me`
+ `:p` 打印缓冲区
+ `:w [name]` 写入文件或另存为
+ `:q` 退出编辑
+ `:d i` 删除某一行
+ `:j i` 跳转到某一行

## 开源
+ MIT LICENSE