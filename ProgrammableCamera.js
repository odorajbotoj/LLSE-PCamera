// 注册插件
ll.registerPlugin("ProgrammableCamera", "Programmable Camera 可编程视角相机", [1, 0, 1, Version.Release], {
    "Author": "odorajbotoj"
});

// 数据库
const db = new KVDatabase(".\\plugins\\ProgrammableCameraData\\db");

// 配置文件
const conf = new JsonConfigFile(".\\plugins\\ProgrammableCameraData\\conf.json");
const PUB_POINT = conf.init("public_point", false); // 是否允许访问别人的点位
const PUB_SCRIPT = conf.init("public_script", false); // 是否允许执行别人的脚本

// 创建文件夹
File.mkdir(".\\plugins\\ProgrammableCameraData\\scripts");

// 这个函数是从网上搜索到的。自己理解了之后贴出来了
function setTimeoutWithArgs(callback, timeout, param) {
    var args = Array.prototype.slice.call(arguments, 2); // 截去前两个参数，把后面的变成一个切片，保存至args
    var _cb = () => callback.apply(null, args);
    return setTimeout(_cb, timeout);
}

// 读一个包在半角双引号里面的字符串
function readStr(str) {
    var re = ["", ""];
    var flag1 = false;
    var flag2 = false;
    for (var i = 0; i < str.length; i++) {
        var c = str.charAt(i);
        if (flag2) {
            re[0] += c;
            flag2 = false;
            continue;
        }
        if (!flag1) {
            if (c != "\"") {
                continue;
            } else {
                flag1 = true;
            }
        } else {
            if (c == "\\") {
                flag2 = true;
                continue;
            } else if (c == "\"") {
                flag1 = false;
                re[1] = str.substring(i+1);
                break;
            } else {
                re[0] += c;
            }
        }
    }
    return re;
}

// “解释器”主逻辑
function scriptInterpret(sArr, pl, out) {
    //
    var id = pl.uniqueId.toString();
    var globalDelay = 0;
    var tArr = new Array();
    for (var i in sArr) {
        if (sArr[i].startsWith("title ")) {
            // 发送一个标题
            var acti = readStr(sArr[i].substring(6));
            var para = acti[1].trim().split(" ");
            if (para.length != 4) {
                out.error(`错误的参数数目在第 ${parseInt(i)+1} 行`);
                continue;
            }
            var p = [parseInt(para[0]), parseInt(para[1]), parseInt(para[2]), parseInt(para[3])];
            if (isNaN(p[0]) || isNaN(p[1]) || isNaN(p[2]) || isNaN(p[3])) {
                out.error(`无效的输入在第 ${parseInt(i)+1} 行`);
                continue;
            }
            var tid = setTimeoutWithArgs((id, acti, p) => {
                var pl = mc.getPlayer(id);
                if (pl != null) {
                    pl.setTitle(acti[0], p[0], p[1], p[2], p[3]);
                }
            }, globalDelay, id, acti, p);
            tArr.push(tid);
        } else if (sArr[i].startsWith("toast ")) {
            // 发送一个toast
            var acti = readStr(sArr[i].substring(6));
            acti[1] = readStr(acti[1])[0];
            var tid = setTimeoutWithArgs((id, acti) => {
                var pl = mc.getPlayer(id);
                if (pl != null) {
                    pl.sendToast(acti[0], acti[1]);
                }
            }, globalDelay, id, acti);
            tArr.push(tid);
        } else if (sArr[i].startsWith("shake ")) {
            // 执行camerashake操作
            var acti = sArr[i].substring(6);
            var tid = setTimeoutWithArgs((id, acti) => {
                var pl = mc.getPlayer(id);
                if (pl != null) {
                    pl.runcmd(`pc shake ${acti}`);
                }
            }, globalDelay, id, acti);
            tArr.push(tid);
        } else if (sArr[i].startsWith("cam ")) {
            // 执行camera操作
            var acti = sArr[i].substring(4);
            var tid = setTimeoutWithArgs((id, acti) => {
                var pl = mc.getPlayer(id);
                if (pl != null) {
                    pl.runcmd(`pc eval ${acti}`);
                }
            }, globalDelay, id, acti);
            tArr.push(tid);
        } else if (sArr[i].startsWith("delay ")) {
            // 设置延时，单位毫秒
            var dems = parseInt(sArr[i].substring(6));
            if (isNaN(dems)) {
                out.error(`无效的输入在第 ${parseInt(i)+1} 行`);
                continue;
            }
            globalDelay += dems;
        } else if (sArr[i] == "") {
            continue;
        } else {
            out.error(`未知的操作在第 ${parseInt(i)+1} 行`);
        }
    }
    db.set(`${pl.name}.task`, tArr);
}

mc.listen("onServerStarted", () => {
    // 注册指令pc, 别名cam
    const pc_cmd = mc.newCommand("pc", `${Format.Aqua}Programmable Camera 可编程视角相机${Format.Clear}`, PermType.Any, 0x80, "cam");

    // pc clear
    pc_cmd.setEnum("ClearAction", ["clear"]);
    pc_cmd.mandatory("action", ParamType.Enum, "ClearAction", "ClearAction", 1);
    pc_cmd.overload(["ClearAction"]);

    // pc me
    pc_cmd.setEnum("QueryAction", ["me"]);
    pc_cmd.mandatory("action", ParamType.Enum, "QueryAction", "QueryAction", 1);
    pc_cmd.overload(["QueryAction"]);

    // pc eval <cam_cmd>
    pc_cmd.setEnum("EvalAction", ["eval"]);
    pc_cmd.mandatory("action", ParamType.Enum, "EvalAction", "EvalAction", 1);
    pc_cmd.mandatory("cam_cmd", ParamType.RawText);
    pc_cmd.overload(["EvalAction", "cam_cmd"]);

    // pc shake <cam_cmd>
    pc_cmd.setEnum("ShakeAction", ["shake"]);
    pc_cmd.mandatory("action", ParamType.Enum, "ShakeAction", "ShakeAction", 1);
    pc_cmd.mandatory("shake_cmd", ParamType.RawText);
    pc_cmd.overload(["ShakeAction", "shake_cmd"]);

    // pc point save <p1|p2|p3|p4|p5|p6|p7|p8> [comment]
    pc_cmd.setEnum("PointAction", ["point"]);
    pc_cmd.mandatory("action", ParamType.Enum, "PointAction", "PointAction", 1);
    pc_cmd.setEnum("PointSaveAction", ["save"]);
    pc_cmd.mandatory("pointAction", ParamType.Enum, "PointSaveAction", "PointSaveAction", 1);
    pc_cmd.setEnum("Point", ["p1", "p2", "p3", "p4", "p5", "p6", "p7", "p8"]);
    pc_cmd.mandatory("point", ParamType.Enum, "Point", "Point", 1);
    pc_cmd.optional("comment", ParamType.RawText);
    pc_cmd.overload(["PointAction", "PointSaveAction", "point", "comment"]);

    // pc point view <p1|p2|p3|p4|p5|p6|p7|p8> [delay] [owner]
    pc_cmd.setEnum("PointViewAction", ["view"]);
    pc_cmd.mandatory("pointAction", ParamType.Enum, "PointViewAction", "PointViewAction", 1);
    pc_cmd.optional("delay", ParamType.Int);
    pc_cmd.optional("p_owner", ParamType.Player);
    pc_cmd.overload(["PointAction", "PointViewAction", "point", "delay", "p_owner"]);

    // pc point rm <p1|p2|p3|p4|p5|p6|p7|p8>
    pc_cmd.setEnum("PointRemoveAction", ["rm"]);
    pc_cmd.mandatory("pointAction", ParamType.Enum, "PointRemoveAction", "PointRemoveAction", 1);
    pc_cmd.overload(["PointAction", "PointRemoveAction", "point"]);

    // pc point ls
    pc_cmd.setEnum("PointListAction", ["ls"]);
    pc_cmd.mandatory("pointAction", ParamType.Enum, "PointListAction", "PointListAction", 1);
    pc_cmd.overload(["PointAction", "PointListAction"]);

    // pc script edit <name>
    pc_cmd.setEnum("ScriptAction", ["script"]);
    pc_cmd.mandatory("action", ParamType.Enum, "ScriptAction", "ScriptAction", 1);
    pc_cmd.setEnum("ScriptEditAction", ["edit"]);
    pc_cmd.mandatory("scriptAction", ParamType.Enum, "ScriptEditAction", "ScriptEditAction", 1);
    pc_cmd.mandatory("s_name", ParamType.String);
    pc_cmd.overload(["ScriptAction", "ScriptEditAction", "s_name"]);

    // pc script rm <name>
    pc_cmd.setEnum("ScriptRemoveAction", ["rm"]);
    pc_cmd.mandatory("scriptAction", ParamType.Enum, "ScriptRemoveAction", "ScriptRemoveAction", 1);
    pc_cmd.overload(["ScriptAction", "ScriptRemoveAction", "s_name"]);

    // pc script cat <name>
    pc_cmd.setEnum("ScriptCatAction", ["cat"]);
    pc_cmd.mandatory("scriptAction", ParamType.Enum, "ScriptCatAction", "ScriptCatAction", 1);
    pc_cmd.overload(["ScriptAction", "ScriptCatAction", "s_name"]);

    // pc script exec <name> [delay] [owner]
    pc_cmd.setEnum("ScriptExecAction", ["exec"]);
    pc_cmd.mandatory("scriptAction", ParamType.Enum, "ScriptExecAction", "ScriptExecAction", 1);
    pc_cmd.optional("s_owner", ParamType.Player);
    pc_cmd.overload(["ScriptAction", "ScriptExecAction", "s_name", "delay", "s_owner"]);

    // pc script ls
    pc_cmd.setEnum("ScriptListAction", ["ls"]);
    pc_cmd.mandatory("scriptAction", ParamType.Enum, "ScriptListAction", "ScriptListAction", 1);
    pc_cmd.overload(["ScriptAction", "ScriptListAction"]);

    // 设置回调函数
    pc_cmd.setCallback((_cmd, ori, out, res) => {
        // 仅能通过玩家执行
        if (ori.player == null) {
            out.error("命令只能被玩家执行");
        } else {
            // 获取玩家名
            var name = ori.player.name;
            switch (res.action) {
                // clear选项, 清除相机效果，停止执行脚本
                case "clear":
                    var tArr = db.get(`${name}.task`);
                    if (tArr != null) {
                        for (var i in tArr) {
                            clearInterval(tArr[i]);
                        }
                        db.delete(`${name}.task`);
                    }
                    mc.runcmdEx(`camera ${name} clear`);
                    mc.runcmdEx(`camerashake stop ${name}`);
                    out.success("已清除所有相机效果");
                    break;

                // eval选项, 相当于下放camera ${name}指令
                case "eval":
                    var cam_cmd = res.cam_cmd;
                    var rst = mc.runcmdEx(`camera ${name} ${cam_cmd}`);
                    if (rst.success) {
                        out.success(rst.output);
                    } else {
                        out.error(rst.output);
                        return;
                    }
                    break;

                // shake选项, 相当于下放camerashake add ${name}指令
                case "shake":
                    var shake_cmd = res.shake_cmd;
                    var rst = mc.runcmdEx(`camerashake add ${name} ${shake_cmd}`);
                    if (rst.success) {
                        out.success(rst.output);
                    } else {
                        out.error(rst.output);
                        return;
                    }
                    break;

                // me子命令，查询自身坐标信息
                case "me":
                    var pos = ori.player.pos;
                    var ang = ori.player.direction;
                    out.addMessage(`${Format.Aqua}x:${Format.Clear} ${pos.x}`);
                    out.addMessage(`${Format.Aqua}y:${Format.Clear} ${pos.y}`);
                    out.addMessage(`${Format.Aqua}z:${Format.Clear} ${pos.z}`);
                    out.addMessage(`${Format.Blue}维度id:${Format.Clear} ${pos.dimid}`);
                    out.addMessage(`${Format.Green}俯仰角:${Format.Clear} ${ang.pitch}`);
                    out.addMessage(`${Format.Green}旋转角:${Format.Clear} ${ang.yaw}`);
                    break;
                // point子命令，提供点位操作 
                case "point":
                    switch (res.pointAction) {
                        // save选项，将当前点保存至点位寄存器
                        case "save":
                            var pos = ori.player.pos;
                            var ang = ori.player.direction;
                            var ok = db.set(`${name}.${res.point}`, `${pos.x} ${pos.y} ${pos.z} ${pos.dimid} ${ang.pitch} ${ang.yaw}`);
                            if (!ok) {
                                out.error("无法存储点位至数据库");
                                return;
                            }
                            ok = db.set(`${name}.${res.point}c`, res.comment);
                            if (!ok) {
                                out.error("无法存储注释至数据库");
                                return;
                            }
                            out.success("点位已保存")
                            break;

                        // view选项，将视角切到选中点位
                        case "view":
                            // 判断是不是访问别人的点位
                            var owner;
                            if (res.p_owner != null) {
                                if (res.p_owner.length == 0) {
                                    out.error("找不到玩家对象");
                                    return;
                                }
                                if (res.p_owner.length > 1) {
                                    out.error("不可选中多个玩家");
                                    return;
                                }
                                owner = res.p_owner[0].name;
                                if (name != owner && !PUB_POINT) {
                                    out.error("未开启此功能");
                                    return;
                                }
                            } else {
                                owner = name;
                            }
                            // 设置延时
                            if (res.delay != null) {
                                if (res.delay < 0 || res.delay > 10000) {
                                    out.error("无效的延时");
                                    return;
                                }
                                // 如果有延时，就设置延时执行。但是直接setTimeout是不行的，会拿不到对象
                                // 所以我们先保存id，之后再动态获取
                                if (res.delay != 0) {
                                    setTimeoutWithArgs((id, poi, own) => {
                                        var pl = mc.getPlayer(id.toString());
                                        if (pl != null) {
                                            pl.runcmd(`pc point view ${poi} 0 ${own}`);
                                        }
                                    }, res.delay, ori.player.uniqueId, res.point, owner);
                                    return;
                                }
                            }
                            var s = db.get(`${owner}.${res.point}`);
                            if (s == null) {
                                out.error("点位未定义");
                                return;
                            }
                            var p = s.split(" ");
                            if (ori.player.pos.dimid.toString() != p[3]) {
                                out.error("维度不同");
                                return;
                            }
                            var rst = mc.runcmdEx(`camera ${name} set minecraft:free pos ${p[0]} ${p[1]} ${p[2]} rot ${p[4]} ${p[5]}`);
                            if (rst.success) {
                                out.success(rst.output);
                            } else {
                                out.error(rst.output);
                                return;
                            }
                            break;

                        // rm选项，删除点位信息
                        case "rm":
                            var ok1 = db.delete(`${name}.${res.point}`);
                            if (!ok1) {
                                out.error("无法删除点位数据");
                            }
                            var ok2 = db.delete(`${name}.${res.point}c`);
                            if (!ok2) {
                                out.error("无法删除点位注释");
                            }
                            if (ok1 && ok2) {
                                out.success("成功删除点位");
                            }
                            break;

                        // ls选项，列出玩家所有点位
                        case "ls":
                            out.addMessage(`${Format.Gold}玩家 ${name} 的点位信息:${Format.Clear}`);
                            for (var i = 1; i < 9; i++) {
                                var s = db.get(`${name}.p${i}`);
                                if (s == null) {
                                    out.addMessage(`${Format.MinecoinGold}点位p${i}: Undefined.${Format.Clear}`);
                                    continue;
                                }
                                var sa = s.split(" ");
                                var c = db.get(`${name}.p${i}c`);
                                out.addMessage(`${Format.Yellow}点位p${i}:${Format.Clear}`);
                                out.addMessage(`${Format.Aqua}x:${Format.Clear} ${sa[0]}`);
                                out.addMessage(`${Format.Aqua}y:${Format.Clear} ${sa[1]}`);
                                out.addMessage(`${Format.Aqua}z:${Format.Clear} ${sa[2]}`);
                                out.addMessage(`${Format.Blue}维度id:${Format.Clear} ${sa[3]}`);
                                out.addMessage(`${Format.Green}俯仰角:${Format.Clear} ${sa[4]}`);
                                out.addMessage(`${Format.Green}旋转角:${Format.Clear} ${sa[5]}`);
                                out.addMessage(`${Format.Gray}注释:${Format.Clear} ${c}`);
                            }
                            break;

                        // 无匹配项则报错
                        default:
                            out.error("pc: point: 未知的操作");
                    }
                    break;

                // script子命令，提供脚本操作
                case "script":
                    switch (res.scriptAction) {
                        // edit选项，进入编辑模式
                        case "edit":
                            var path = `.\\plugins\\ProgrammableCameraData\\scripts\\${name}\\`;
                            if (!File.exists(`.\\plugins\\ProgrammableCameraData\\scripts\\${name}\\`)) {
                                File.mkdir(`.\\plugins\\ProgrammableCameraData\\scripts\\${name}\\`)
                            }
                            db.set(`${name}.edit`, res.s_name);
                            if (File.exists(`.\\plugins\\ProgrammableCameraData\\scripts\\${name}\\${res.s_name}.txt`) && !File.checkIsDir(`.\\plugins\\ProgrammableCameraData\\scripts\\${name}\\${res.s_name}.txt`)) {
                                var f = File.readFrom(`.\\plugins\\ProgrammableCameraData\\scripts\\${name}\\${res.s_name}.txt`);
                                if (f != null) {
                                    var fa = f.split(/\r?\n|(?<!\n)\r/);
                                    fa.unshift(fa.length);
                                    db.set(`${name}.buf`, fa);
                                } else {
                                    out.error("读取旧的文件失败");
                                }
                            } else {
                                db.delete(`${name}.buf`);   
                            }
                            out.success("已进入编辑模式");
                            break;

                        // rm选项，删除脚本
                        case "rm":
                            var path = `.\\plugins\\ProgrammableCameraData\\scripts\\${name}\\${res.s_name}.txt`;
                            if (File.exists(path) && !File.checkIsDir(path)) {
                                var ok = File.delete(path);
                                if (ok) {
                                    out.success("已成功删除");
                                } else {
                                    out.error("删除失败");
                                }
                            } else {
                                out.error("脚本不存在");
                            }
                            break;
                        
                        // cat选项，列出脚本内容
                        case "cat":
                            var path = `.\\plugins\\ProgrammableCameraData\\scripts\\${name}\\${res.s_name}.txt`;
                            if (File.exists(path) && !File.checkIsDir(path)) {
                                var f = File.readFrom(path);
                                if (f != null) {
                                    var fa = f.split(/\r?\n|(?<!\n)\r/);
                                    out.addMessage(`---Script: ${res.s_name}---`);
                                    for (var i in fa) {
                                        out.addMessage(`${Format.Aqua}${parseInt(i)+1} |${Format.Clear} ${fa[i]}`);
                                    }
                                    out.success(`${Format.Aqua}---EOF---${Format.Clear}`);
                                } else {
                                    out.error("读取失败");
                                }
                            } else {
                                out.error("脚本不存在");
                            }
                            break;
                        
                        // exec选项，执行脚本
                        case "exec":
                            // 这一段很多源码直接照搬上面的view
                            // 判断是不是访问别人的脚本
                            var owner;
                            if (res.s_owner != null) {
                                if (res.s_owner.length == 0) {
                                    out.error("找不到玩家对象");
                                    return;
                                }
                                if (res.s_owner.length > 1) {
                                    out.error("不可选中多个玩家");
                                    return;
                                }
                                owner = res.s_owner[0].name;
                                if (name != owner && !PUB_SCRIPT) {
                                    out.error("未开启此功能");
                                    return;
                                }
                            } else {
                                owner = name;
                            }
                            // 设置延时
                            if (res.delay != null) {
                                if (res.delay < 0 || res.delay > 10000) {
                                    out.error("无效的延时");
                                    return;
                                }
                                // 如果有延时，就设置延时执行。但是直接setTimeout是不行的，会拿不到对象
                                // 所以我们先保存id，之后再动态获取
                                if (res.delay != 0) {
                                    setTimeoutWithArgs((id, scr, own) => {
                                        var pl = mc.getPlayer(id.toString());
                                        if (pl != null) {
                                            pl.runcmd(`pc script exec ${scr} 0 ${own}`);
                                        }
                                    }, res.delay, ori.player.uniqueId, res.s_name, owner);
                                    return;
                                }
                            }
                            var path = `.\\plugins\\ProgrammableCameraData\\scripts\\${name}\\${res.s_name}.txt`;
                            if (File.exists(path) && !File.checkIsDir(path)) {
                                // 读取文件
                                var f = File.readFrom(path);
                                if (f != null) {
                                    var fa = f.split(/\r?\n|(?<!\n)\r/);
                                    out.addMessage(`开始读取并执行Script: ${res.s_name}`);
                                    // 丢给“解释器”就完事了
                                    scriptInterpret(fa, ori.player, out);
                                    out.success(`任务已添加`);
                                } else {
                                    out.error("读取失败");
                                }
                            } else {
                                out.error("脚本不存在");
                            }
                            break;

                        // ls选项，列出所有脚本
                        case "ls":
                            var path = `.\\plugins\\ProgrammableCameraData\\scripts\\${name}\\`;
                            if (File.exists(path) && File.checkIsDir(path)) {
                                var f = File.getFilesList(path);
                                if (f.length != 0) {
                                    out.addMessage(`---Scripts:---`);
                                    for (var i in f) {
                                        out.addMessage(`${Format.Aqua}${parseInt(i)+1} |${Format.Clear} ${f[i].slice(0, -4)}`);
                                    }
                                    out.success(`${Format.Aqua}---END---${Format.Clear}`)
                                } else {
                                    out.error("目录下没有脚本");
                                }
                            } else {
                                out.error("您未创建过脚本");
                            }
                            break;
                        
                        // 无匹配项则删除
                        default:
                            out.error("pc: script: 未知的操作");
                    }
                    break;

                // 无匹配项则报错
                default:
                    out.error("pc: 未知的操作");
            }
        }
    });

    // 安装命令
    pc_cmd.setup();
});

// 游戏内脚本编辑器
mc.listen("onChat", (pl, msg) => {
    var name = pl.name;
    var efn = db.get(`${name}.edit`);
    if (efn != null) {
        if (msg.startsWith(" ")) {
            return true;
        } else if (msg == ":q") {
            db.delete(`${name}.edit`);
            pl.sendToast("退出", "您已退出编辑模式");
        } else if (msg == ":w") {
            // 写入文件
            var arr = db.get(`${name}.buf`);
            if (arr == null) {
                pl.sendToast("失败", "缓冲区为空");
                return false;
            }
            File.writeTo(`.\\plugins\\ProgrammableCameraData\\scripts\\${name}\\${efn}.txt`,arr.slice(1).join("\n").trim());
            db.delete(`${name}.buf`);
            pl.sendToast("成功", "文件已写入");
        } else if (msg == ":p") {
            // 打印缓冲区
            pl.tell(`${Format.Aqua}--- 缓冲区 ---${Format.Clear}`);
            var arr = db.get(`${name}.buf`);
            if (arr == null) {
                pl.sendToast("失败", "缓冲区为空");
                return false;
            }
            for (var i = 1; i < arr.length; i++) {
                pl.tell(`${Format.Aqua}${i} |${Format.Clear} ${arr[i]}`);
            }
            pl.tell(`${Format.Aqua}--- ${arr[0]} Line(s) ---${Format.Clear}`);
        } else if (msg == ":m") {
            // 查询自己当前位置
            var pos = pl.pos;
            var ang = pl.direction;
            pl.tell(`${Format.Aqua}x:${Format.Clear} ${pos.x}`);
            pl.tell(`${Format.Aqua}y:${Format.Clear} ${pos.y}`);
            pl.tell(`${Format.Aqua}z:${Format.Clear} ${pos.z}`);
            pl.tell(`${Format.Blue}维度id:${Format.Clear} ${pos.dimid}`);
            pl.tell(`${Format.Green}俯仰角:${Format.Clear} ${ang.pitch}`);
            pl.tell(`${Format.Green}旋转角:${Format.Clear} ${ang.yaw}`);
        } else if (msg.startsWith(":d ")) {
            // 删除一行
            var ln = parseInt(msg.substring(3));
            if (isNaN(ln)) {
                pl.sendToast("失败", "无效的输入");
                return false;
            }
            var arr = db.get(`${name}.buf`);
            if (arr == null) {
                pl.sendToast("失败", "缓冲区为空");
                return false;
            }
            if (arr.length < ln) {
                pl.sendToast("失败", "数值超出范围");
                return false;
            }
            arr.splice(ln, 1);
            pl.tell(`删除了第 ${ln} 行`);
            arr[0]--;
            db.set(`${name}.buf`, arr);
        } else if (msg.startsWith(":j ")) {
            // 跳转到行
            var ln = parseInt(msg.substring(3));
            if (isNaN(ln)) {
                pl.sendToast("失败", "无效的输入");
                return false;
            }
            var arr = db.get(`${name}.buf`);
            if (arr == null) {
                pl.sendToast("失败", "缓冲区为空");
                return false;
            }
            if (arr.length < ln) {
                pl.sendToast("失败", "数值超出范围");
                return false;
            }
            arr[0] = ln;
            pl.tell(`跳转至第 ${ln} 行`);
            db.set(`${name}.buf`, arr);
        } else {
            // 写入缓冲区
            var arr = db.get(`${name}.buf`);
            if (arr == null) {
                arr = new Array();
                arr[0] = 1;
            }
            arr.splice(arr[0], 0, msg);
            pl.tell(`${Format.Aqua}[${Format.Green}+${Format.Aqua}]${Format.Green}${arr[0]} ${Format.Aqua}| ${Format.Clear}${arr[arr[0]]}`);
            arr[0]++;
            db.set(`${name}.buf`, arr);
        }
        return false;
    }
    return true;
});

// 编辑模式下阻断执行pc命令
mc.listen("onPlayerCmd", (pl, cmd) => {
    var ok = db.get(`${pl.name}.edit`);
    if (ok != null) {
        if (cmd.startsWith("pc") || cmd.startsWith("cam")) {
            pl.sendToast("命令不可用", "您正处于编辑模式");
            return false;
        }
    }
    return true;
});
