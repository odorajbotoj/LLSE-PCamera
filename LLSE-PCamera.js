/// <reference path="/home/odorajbotoj/workspace/mcbe/LiteLoaderSE-Aids/dts/helperlib/src/index.d.ts" />

// 注册插件
ll.registerPlugin("LLSE-PCamera", "LLSE Programmable Camera 可编程视角相机", [1, 9, 0, Version.Release], {
    "Author": "odorajbotoj"
});

// 数据路径
const DATAPATH = ".\\plugins\\LLSE-PCameraData\\";
const VERSION = "1.9.0-Rel";

// 数据库
const db = new KVDatabase(DATAPATH + "db");

// 配置文件
const conf = new JsonConfigFile(DATAPATH + "conf.json");
const PUB_POINT = conf.init("public_point", false); // 是否允许访问别人的点位
const PUB_SCRIPT = conf.init("public_script", false); // 是否允许执行别人的脚本

// 创建文件夹
File.mkdir(DATAPATH + "scripts");

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
                re[1] = str.substring(i + 1);
                break;
            } else {
                re[0] += c;
            }
        }
    }
    return re;
}

// “解释器”主逻辑
const sleep = (delay) => new Promise((resolve) => setTimeout(resolve, delay))
async function scriptInterpret(sArr, name, dim, rep) {
    // 这一部分重构过了，减少异步压力
    // 后来又重写了部分，减少了动态获取pl的次数，减小服务器压力
    var headStack = new Array();
    var tailStack = new Array();
    var delayStack = new Array();
    var endStack = new Array();
    var originStack = new Array();
    var suc = true;
    var otp = "";
    do {
        // 1.7修改：增加循环执行功能
        // 1.7.2修改：尝试修复未知的崩服bug
        headStack = [];
        tailStack = [];
        delayStack = [];
        endStack = [];
        originStack = [];
        suc = true;
        otp = "";
        for (var i in sArr) {
            // 决定是否继续执行
            if (!suc) {
                endStack = [];
                var pl = mc.getPlayer(name);
                if (pl != null) {
                    // 决定是否产生输出
                    pl.tell(otp);
                }
                // 1.7.3：还是这里！（笑哭
                rep = false;
                break;
            }
            // 检查lock状态
            // 1.7.2：就是这里！
            // lock释放，会导致一直break
            // 然后服务器就在for开头和break之间一直循环
            // 然后就进入假死状态
            // 解决方法是及时取消外层do-while
            var lock = db.get(`${name}.exec`);
            if (lock == null) {
                endStack = [];
                rep = false;
                break;
            }
            // 跳过空行
            if (sArr[i].startsWith("#") || sArr[i] == "") {
                continue;
            }
            // 解析流程语句
            if (sArr[i].startsWith("head ")) {
                // 支持head，以简化输入
                headStack.push(sArr[i].substring(5));
                endStack.push("head");
                continue;
            } else if (sArr[i].startsWith("tail ")) {
                // 支持tail，以简化输入
                tailStack.push(sArr[i].substring(5));
                endStack.push("tail");
                continue;
            } else if (sArr[i].startsWith("setdim ")) {
                // 支持setdim检查维度
                var d = parseInt(sArr[i].substring(7));
                if (d != 0 && d != 1 && d != 2) {
                    suc = false;
                    otp = `${Format.Red}Error: 无效的输入在第 ${parseInt(i) + 1} 行${Format.Clear}`;
                    continue;
                }
                if (d != dim) {
                    suc = false;
                    otp = `${Format.Red}Error: 维度不同${Format.Clear}`;
                    continue;
                }
                continue;
            } else if (sArr[i].startsWith("autodelay ")) {
                // 支持autodelay，以简化输入
                var des = parseFloat(sArr[i].substring(10));
                if (isNaN(des)) {
                    suc = false;
                    otp = `${Format.Red}Error: 无效的输入在第 ${parseInt(i) + 1} 行${Format.Clear}`;
                    continue;
                }
                delayStack.push(des);
                endStack.push("delay");
                continue;
            } else if (sArr[i].startsWith("origin ")) {
                originStack.push(sArr[i].substring(7));
                endStack.push("origin");
                continue;
            } else if (sArr[i] == "end") {
                // 闭合一个代码块
                switch (endStack[endStack.length - 1]) {
                    case "head":
                        headStack.pop();
                        break;
                    case "tail":
                        tailStack.pop();
                        break;
                    case "delay":
                        delayStack.pop();
                        break;
                    case "origin":
                        originStack.pop();
                }
                endStack.pop();
                continue;
            } else if (sArr[i].startsWith("delay ")) {
                // 设置延时，单位毫秒
                var des = parseFloat(sArr[i].substring(6));
                if (isNaN(des)) {
                    suc = false;
                    otp = `${Format.Red}Error: 无效的输入在第 ${parseInt(i) + 1} 行${Format.Clear}`;
                    continue;
                }
                await sleep(des * 1000);
                continue;
            }
            // 处理功能语句
            var s = headStack.join(" ") + " " + sArr[i] + " " + tailStack.join(" ");
            s = s.trim();
            // 解析功能语句
            if (s.startsWith("title ")) {
                // 发送一个标题
                var acti = readStr(s.substring(6));
                var para = acti[1].trim().split(" ");
                if (para.length != 4) {
                    suc = false;
                    otp = `${Format.Red}Error: 错误的参数数目在第 ${parseInt(i) + 1} 行${Format.Clear}`;
                    continue;
                }
                var p = [parseInt(para[0]), parseInt(para[1]), parseInt(para[2]), parseInt(para[3])];
                if (isNaN(p[0]) || isNaN(p[1]) || isNaN(p[2]) || isNaN(p[3])) {
                    suc = false;
                    otp = `${Format.Red}Error: 无效的输入在第 ${parseInt(i) + 1} 行${Format.Clear}`;
                    continue;
                }
                var pl = mc.getPlayer(name);
                if (pl != null) {
                    pl.setTitle(acti[0], p[0], p[1], p[2], p[3]);
                } else {
                    suc = false;
                    continue;
                }
            } else if (s.startsWith("toast ")) {
                // 发送一个toast
                var acti = readStr(s.substring(6));
                acti[1] = readStr(acti[1])[0];
                var pl = mc.getPlayer(name);
                if (pl != null) {
                    pl.sendToast(acti[0], acti[1]);
                } else {
                    suc = false;
                    continue;
                }
            } else if (s.startsWith("shake ")) {
                // 执行camerashake操作
                var acti = s.substring(6);
                var rst = mc.runcmdEx(`camerashake add "${name}" ${acti}`);
                suc = rst.success;
                otp = rst.output;
                if (!suc) {
                    continue;
                }
            } else if (s.startsWith("cam ")) {
                // 执行camera操作
                var cs = "";
                if (originStack.length != 0) {
                    cs = `execute at ${originStack[originStack.length - 1]} run `
                }
                var acti = s.substring(4);
                var rst = mc.runcmdEx(cs + `camera "${name}" ${acti}`);
                suc = rst.success;
                otp = rst.output;
                if (!suc) {
                    continue;
                }
            } else {
                suc = false;
                otp = `${Format.Red}Error: 未知的操作在第 ${parseInt(i) + 1} 行${Format.Clear}`;
                continue;
            }
            // autodelay
            if (delayStack.length != 0) {
                await sleep(delayStack[delayStack.length - 1] * 1000);
            }
        }
        if (endStack.length != 0) {
            var pl = mc.getPlayer(name);
            if (pl != null) {
                pl.tell(`${Format.Yellow}Warning: 有未闭合的代码块${Format.Clear}`);
            }
        }
    } while (rep);
    db.delete(`${name}.exec`);
}

// circle2d
function circle2d(res, arr) {
    // 画圆
    if (res.steps == 0) {
        return;
    }
    arr.push(`head cam set minecraft:free ease ${res.timePerStep} linear pos `);
    arr.push(`tail facing ${res.facing.x} ${res.facing.y} ${res.facing.z}`);
    arr.push(`autodelay ${res.timePerStep}`);
    var dif = res.toAng - res.fromAng;
    var stp = dif / res.steps;
    for (var i = 0; i <= res.steps; i++) {
        // 计算点位
        var rad = (res.fromAng + i * stp) * Math.PI / 180;
        arr.push(`${res.origin.x - Math.sin(rad) * res.radius} ${res.origin.y} ${res.origin.z + Math.cos(rad) * res.radius}`);
    }
    arr.push("end");
    arr.push("end");
    arr.push("end");
}

// circular_helix
function circular_helix(res, arr) {
    // 圆柱螺线
    if (res.steps == 0) {
        return;
    }
    arr.push(`head cam set minecraft:free ease ${res.timePerStep} linear pos `);
    arr.push(`autodelay ${res.timePerStep}`);
    var dif = res.toAng - res.fromAng;
    var stp = dif / res.steps;
    var hei = res.height / res.steps;
    for (var i = 0; i <= res.steps; i++) {
        // 计算点位
        var rad = (res.fromAng + i * stp) * Math.PI / 180;
        arr.push(`${res.origin.x - Math.sin(rad) * res.radius} ${res.origin.y + i * hei} ${res.origin.z + Math.cos(rad) * res.radius} facing ${res.origin.x} ${res.origin.y + i * hei} ${res.origin.z}`);
    }
    arr.push("end");
    arr.push("end");
}

// simple_circle
function simple_circle(res, pos, arr) {
    // 简单圆
    arr.push(`head cam set minecraft:free ease ${res.timePerStep} linear pos `);
    arr.push(`tail facing ${pos.x} ${pos.y} ${pos.z}`);
    arr.push(`autodelay ${res.timePerStep}`);
    for (var i = 0; i <= 360; i++) {
        // 计算点位
        var rad = i * Math.PI / 180;
        arr.push(`${pos.x - Math.sin(rad) * res.radius} ${pos.y} ${pos.z + Math.cos(rad) * res.radius}`);
    }
    arr.push("end");
    arr.push("end");
    arr.push("end");
}


mc.listen("onServerStarted", () => {
    // 注册指令pc, 别名cam
    const pc_cmd = mc.newCommand("pc", `${Format.Aqua}LLSE-PCamera 可编程视角相机${Format.Clear}`, PermType.Any, 0x80, "cam");

    // pc clear
    pc_cmd.setEnum("ClearAction", ["clear"]);
    pc_cmd.mandatory("action", ParamType.Enum, "ClearAction", "ClearAction", 1);
    pc_cmd.overload(["ClearAction"]);

    // pc me
    pc_cmd.setEnum("QueryAction", ["me"]);
    pc_cmd.mandatory("action", ParamType.Enum, "QueryAction", "QueryAction", 1);
    pc_cmd.overload(["QueryAction"]);

    // pc eval <cmd>
    pc_cmd.setEnum("EvalAction", ["eval"]);
    pc_cmd.mandatory("action", ParamType.Enum, "EvalAction", "EvalAction", 1);
    pc_cmd.mandatory("cmd", ParamType.RawText);
    pc_cmd.overload(["EvalAction", "cmd"]);

    // pc shake <cmd>
    pc_cmd.setEnum("ShakeAction", ["shake"]);
    pc_cmd.mandatory("action", ParamType.Enum, "ShakeAction", "ShakeAction", 1);
    pc_cmd.overload(["ShakeAction", "cmd"]);

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
    pc_cmd.optional("delay", ParamType.Float);
    pc_cmd.optional("owner", ParamType.String);
    pc_cmd.overload(["PointAction", "PointViewAction", "point", "delay", "owner"]);

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
    pc_cmd.mandatory("name", ParamType.String);
    pc_cmd.overload(["ScriptAction", "ScriptEditAction", "name"]);

    // pc script rm <name>
    pc_cmd.setEnum("ScriptRemoveAction", ["rm"]);
    pc_cmd.mandatory("scriptAction", ParamType.Enum, "ScriptRemoveAction", "ScriptRemoveAction", 1);
    pc_cmd.overload(["ScriptAction", "ScriptRemoveAction", "name"]);

    // pc script cat <name>
    pc_cmd.setEnum("ScriptCatAction", ["cat"]);
    pc_cmd.mandatory("scriptAction", ParamType.Enum, "ScriptCatAction", "ScriptCatAction", 1);
    pc_cmd.overload(["ScriptAction", "ScriptCatAction", "name"]);

    // pc script exec <name> [repeat] [delay] [owner]
    pc_cmd.setEnum("ScriptExecAction", ["exec"]);
    pc_cmd.mandatory("scriptAction", ParamType.Enum, "ScriptExecAction", "ScriptExecAction", 1);
    pc_cmd.optional("repeat", ParamType.Bool);
    pc_cmd.overload(["ScriptAction", "ScriptExecAction", "name", "repeat", "delay", "owner"]);

    // pc script ls
    pc_cmd.setEnum("ScriptListAction", ["ls"]);
    pc_cmd.mandatory("scriptAction", ParamType.Enum, "ScriptListAction", "ScriptListAction", 1);
    pc_cmd.overload(["ScriptAction", "ScriptListAction"]);

    // pc preset circle2d <origin> <radius> <fromAng> <toAng> <steps> <timePerStep> <facing> exec
    // pc preset circle2d <origin> <radius> <fromAng> <toAng> <steps> <timePerStep> <facing> save <name>
    pc_cmd.setEnum("PresetAction", ["preset"]);
    pc_cmd.mandatory("action", ParamType.Enum, "PresetAction", "PresetAction", 1);
    pc_cmd.setEnum("PresetCircle2dAction", ["circle2d"]);
    pc_cmd.mandatory("presetAction", ParamType.Enum, "PresetCircle2dAction", "PresetCircle2dAction", 1);
    pc_cmd.mandatory("origin", ParamType.Vec3);
    pc_cmd.mandatory("radius", ParamType.Float);
    pc_cmd.mandatory("fromAng", ParamType.Float);
    pc_cmd.mandatory("toAng", ParamType.Float);
    pc_cmd.mandatory("steps", ParamType.Int);
    pc_cmd.mandatory("timePerStep", ParamType.Float);
    pc_cmd.mandatory("facing", ParamType.Vec3);
    pc_cmd.setEnum("PresetExec", ["exec"]);
    pc_cmd.mandatory("presetToDo", ParamType.Enum, "PresetExec", "PresetExec", 1);
    pc_cmd.overload(["PresetAction", "PresetCircle2dAction", "origin", "radius", "fromAng", "toAng", "steps", "timePerStep", "facing", "PresetExec"]);
    pc_cmd.setEnum("PresetSave", ["save"]);
    pc_cmd.mandatory("presetToDo", ParamType.Enum, "PresetSave", "PresetSave", 1);
    pc_cmd.overload(["PresetAction", "PresetCircle2dAction", "origin", "radius", "fromAng", "toAng", "steps", "timePerStep", "facing", "PresetSave", "name"]);

    // pc preset circula_helix <origin> <radius> <fromAng> <toAng> <steps> <timePerStep> <height> exec
    // pc preset circula_helix <origin> <radius> <fromAng> <toAng> <steps> <timePerStep> <height> save <name>
    pc_cmd.setEnum("PresetCircularHelixAction", ["circular_helix"]);
    pc_cmd.mandatory("presetAction", ParamType.Enum, "PresetCircularHelixAction", "PresetCircularHelixAction", 1);
    pc_cmd.mandatory("height", ParamType.Float);
    pc_cmd.overload(["PresetAction", "PresetCircularHelixAction", "origin", "radius", "fromAng", "toAng", "steps", "timePerStep", "height", "PresetExec"]);
    pc_cmd.overload(["PresetAction", "PresetCircularHelixAction", "origin", "radius", "fromAng", "toAng", "steps", "timePerStep", "height", "PresetSave", "name"]);

    // pc preset simple_circle <radius> <timePerStep> exec
    // pc preset simple_clrcle <radius> <timePerStep> save <name>
    pc_cmd.setEnum("PresetSimpleCircleAction", ["simple_circle"]);
    pc_cmd.mandatory("presetAction", ParamType.Enum, "PresetSimpleCircleAction", "PresetSimpleCircleAction", 1);
    pc_cmd.overload(["PresetAction", "PresetSimpleCircleAction", "radius", "timePerStep", "PresetExec"]);
    pc_cmd.overload(["PresetAction", "PresetSimpleCircleAction", "radius", "timePerStep", "PresetSave", "name"]);

    // 设置回调函数
    pc_cmd.setCallback((_cmd, ori, out, res) => {
        // 仅能通过玩家执行
        if (ori.player == null) {
            return out.error("命令只能被玩家执行");
        }
        // 编辑模式下不可执行
        var ok = db.get(`${ori.player.name}.edit`);
        if (ok != null) {
            return out.error("命令不可用: 您正处于编辑模式");
        }
        // 获取玩家名
        var name = ori.player.name;
        switch (res.action) {
            case "clear":
                // clear选项, 清除相机效果，停止执行脚本
                db.delete(`${name}.exec`);
                mc.runcmdEx(`camera "${name}" clear`);
                mc.runcmdEx(`camerashake stop "${name}"`);
                return out.success("已清除所有相机效果");

            case "eval":
                // eval选项, 相当于下放camera指令
                var rst;
                rst = mc.runcmdEx(`camera "${name}" ${res.cmd}`);
                if (rst.success) {
                    return out.success(rst.output);
                } else {
                    return out.error(rst.output);
                }

            case "shake":
                // shake选项, 相当于下放camerashake add指令
                var rst = mc.runcmdEx(`camerashake add "${name}" ${res.cmd}`);
                if (rst.success) {
                    return out.success(rst.output);
                } else {
                    return out.error(rst.output);
                }

            case "me":
                // me子命令，查询自身坐标信息
                var pos = ori.player.pos;
                var ang = ori.player.direction;
                out.addMessage(`${Format.Aqua}x:${Format.Clear} ${pos.x}`);
                out.addMessage(`${Format.Aqua}y:${Format.Clear} ${pos.y}`);
                out.addMessage(`${Format.Aqua}z:${Format.Clear} ${pos.z}`);
                out.addMessage(`${Format.Blue}维度id:${Format.Clear} ${pos.dimid}`);
                out.addMessage(`${Format.Green}俯仰角:${Format.Clear} ${ang.pitch}`);
                out.addMessage(`${Format.Green}旋转角:${Format.Clear} ${ang.yaw}`);
                return out.success(`LLSE-PCamera v${VERSION}`);

            case "point":
                // point子命令，提供点位操作 
                switch (res.pointAction) {
                    case "save":
                        // save选项，将当前点保存至点位寄存器
                        var pos = ori.player.pos;
                        var ang = ori.player.direction;
                        var ok = db.set(`${name}.${res.point}`, `${pos.x} ${pos.y} ${pos.z} ${pos.dimid} ${ang.pitch} ${ang.yaw}`);
                        if (!ok) {
                            return out.error("无法存储点位至数据库");
                        }
                        ok = db.set(`${name}.${res.point}c`, res.comment);
                        if (!ok) {
                            return out.error("无法存储注释至数据库");
                        }
                        return out.success("点位已保存")

                    case "view":
                        // view选项，将视角切到选中点位
                        // 判断是不是访问别人的点位
                        var owner;
                        if (res.owner != null) {
                            if (name != res.owner && !PUB_POINT) {
                                return out.error("未开启此功能");
                            }
                            owner = res.owner;
                        } else {
                            owner = name;
                        }
                        // 设置延时
                        if (res.delay != null) {
                            if (res.delay < 0 || res.delay > 10) {
                                return out.error("无效的延时");
                            }
                            // 如果有延时，就设置延时执行。但是直接setTimeout是不行的，会拿不到对象
                            // 所以我们先保存id，之后再动态获取
                            if (res.delay != 0) {
                                setTimeoutWithArgs((name, poi, own) => {
                                    var pl = mc.getPlayer(name);
                                    if (pl != null) {
                                        pl.runcmd(`pc point view ${poi} 0 "${own}"`);
                                    }
                                }, res.delay * 1000, name, res.point, owner);
                                return;
                            }
                        }
                        var s = db.get(`${owner}.${res.point}`);
                        if (s == null) {
                            return out.error("点位未定义");
                        }
                        var p = s.split(" ");
                        if (ori.player.pos.dimid.toString() != p[3]) {
                            return out.error("维度不同");
                        }
                        var rst = mc.runcmdEx(`camera "${name}" set minecraft:free pos ${p[0]} ${p[1]} ${p[2]} rot ${p[4]} ${p[5]}`);
                        if (rst.success) {
                            return out.success(rst.output);
                        } else {
                            return out.error(rst.output);
                        }

                    case "rm":
                        // rm选项，删除点位信息
                        db.delete(`${name}.${res.point}`);
                        db.delete(`${name}.${res.point}c`);
                        return out.success("成功删除点位");

                    case "ls":
                        // ls选项，列出玩家所有点位
                        var sarr = new Array();
                        for (var i = 1; i < 9; i++) {
                            var s = db.get(`${name}.p${i}`);
                            if (s == null) {
                                sarr.push(`${Format.MinecoinGold}点位p${i}: Undefined.${Format.Clear}`);
                                continue;
                            }
                            var sa = s.split(" ");
                            var c = db.get(`${name}.p${i}c`);
                            sarr.push(`${Format.Yellow}点位p${i}:${Format.Clear}`);
                            sarr.push(`${Format.Aqua}x:${Format.Clear} ${sa[0]}`);
                            sarr.push(`${Format.Aqua}y:${Format.Clear} ${sa[1]}`);
                            sarr.push(`${Format.Aqua}z:${Format.Clear} ${sa[2]}`);
                            sarr.push(`${Format.Blue}维度id:${Format.Clear} ${sa[3]}`);
                            sarr.push(`${Format.Green}俯仰角:${Format.Clear} ${sa[4]}`);
                            sarr.push(`${Format.Green}旋转角:${Format.Clear} ${sa[5]}`);
                            sarr.push(`${Format.Gray}注释:${Format.Clear} ${c}`);
                        }
                        var fm = mc.newSimpleForm().setTitle(`${Format.Gold}玩家 ${name} 的点位信息:${Format.Clear}`).setContent(sarr.join("\n"));
                        ori.player.sendForm(fm, (_pl, _id) => { return });
                        return;

                    default:
                        // 无匹配项则报错
                        return out.error("pc: point: 未知的操作");
                }

            case "script":
                // script子命令，提供脚本操作
                switch (res.scriptAction) {
                    // edit选项，进入编辑模式
                    case "edit":
                        var path = DATAPATH + `scripts\\${name}\\`;
                        if (!File.checkIsDir(path)) {
                            File.mkdir(path)
                        }
                        db.set(`${name}.edit`, res.name);
                        if (File.exists(path + `${res.name}.txt`) && !File.checkIsDir(path + `${res.name}.txt`)) {
                            var f = File.readFrom(path + `${res.name}.txt`);
                            if (f != null) {
                                var fa = f.split(/\r?\n|(?<!\n)\r/);
                                fa.unshift(fa.length + 1);
                                db.set(`${name}.buf`, fa);
                            } else {
                                return out.error("读取旧的文件失败");
                            }
                        }
                        return out.success("已进入编辑模式");

                    case "rm":
                        // rm选项，删除脚本
                        var path = DATAPATH + `scripts\\${name}\\${res.name}.txt`;
                        if (File.exists(path) && !File.checkIsDir(path)) {
                            var ok = File.delete(path);
                            if (ok) {
                                return out.success("已成功删除");
                            } else {
                                return out.error("删除失败");
                            }
                        } else {
                            return out.error("脚本不存在");
                        }

                    case "cat":
                        // cat选项，列出脚本内容
                        var path = DATAPATH + `scripts\\${name}\\${res.name}.txt`;
                        if (File.exists(path) && !File.checkIsDir(path)) {
                            var f = File.readFrom(path);
                            if (f != null) {
                                var fa = f.split(/\r?\n|(?<!\n)\r/);
                                for (var i in fa) {
                                    fa[i] = (`${Format.Aqua}${parseInt(i) + 1} |${Format.Clear} ${fa[i]}`);
                                }
                                var fm = mc.newSimpleForm().setTitle(res.name).setContent(fa.join("\n"));
                                ori.player.sendForm(fm, (_pl, _id) => { return });
                                return;
                            } else {
                                return out.error("读取失败");
                            }
                        } else {
                            return out.error("脚本不存在");
                        }

                    case "exec":
                        // exec选项，执行脚本
                        // 这一段很多源码直接照搬上面的view
                        // 判断是不是访问别人的脚本
                        var owner;
                        if (res.owner != null) {
                            if (name != res.owner && !PUB_SCRIPT) {
                                return out.error("未开启此功能");
                            }
                            owner = res.owner;
                        } else {
                            owner = name;
                        }
                        // 设置延时
                        if (res.delay != null) {
                            if (res.delay < 0 || res.delay > 10) {
                                return out.error("无效的延时");
                            }
                            // 如果有延时，就设置延时执行。但是直接setTimeout是不行的，会拿不到对象
                            // 所以我们先保存id，之后再动态获取
                            if (res.delay != 0) {
                                setTimeoutWithArgs((name, scr, own) => {
                                    var pl = mc.getPlayer(name);
                                    if (pl != null) {
                                        pl.runcmd(`pc script exec ${scr} 0 "${own}"`);
                                    }
                                }, res.delay * 1000, name, res.name, owner);
                                return;
                            }
                        }
                        var path = DATAPATH + `scripts\\${owner}\\${res.name}.txt`;
                        if (File.exists(path) && !File.checkIsDir(path)) {
                            // 读取文件
                            var f = File.readFrom(path);
                            if (f != null) {
                                var fa = f.split(/\r?\n|(?<!\n)\r/);
                                out.addMessage(`开始读取并执行Script: ${res.name}`);
                                var loc = db.get(`${name}.exec`);
                                if (loc != null) {
                                    return out.error("已有脚本正在运行");
                                } else {
                                    // 加锁
                                    db.set(`${name}.exec`, true);
                                    // 丢给“解释器”就完事了
                                    scriptInterpret(fa, name, ori.player.pos.dimid, res.repeat);
                                    return out.success(`任务已添加`);
                                }
                            } else {
                                return out.error("读取失败");
                            }
                        } else {
                            return out.error("脚本不存在");
                        }

                    case "ls":
                        // ls选项，列出所有脚本
                        var path = DATAPATH + `scripts\\${name}\\`;
                        if (File.exists(path) && File.checkIsDir(path)) {
                            var f = File.getFilesList(path);
                            if (f.length != 0) {
                                for (var i in f) {
                                    f[i] = `${Format.Aqua}${parseInt(i) + 1} |${Format.Clear} ${f[i].slice(0, -4)}`;
                                }
                                var fm = mc.newSimpleForm().setTitle("Scripts").setContent(f.join("\n"));
                                ori.player.sendForm(fm, (_pl, _id) => { return });
                                return;
                            } else {
                                return out.error("目录下没有脚本");
                            }
                        } else {
                            return out.error("您未创建过脚本");
                        }

                    default:
                        // 无匹配项则删除
                        return out.error("pc: script: 未知的操作");
                }

            case "preset":
                // preset子命令，提供部分预设
                var arr = new Array();
                switch (res.presetAction) {
                    case "circle2d":
                        // circle2d选项，提供基础的画圆操作
                        arr.push("# circle2d vvv");
                        circle2d(res, arr);
                        arr.push("# circle2d ^^^");
                        break;
                    case "circular_helix":
                        // circularHelix选项，提供基础的圆柱螺线操作
                        arr.push("# circular_helix vvv")
                        circular_helix(res, arr);
                        arr.push("# circular_helix ^^^")
                        break;
                    case "simple_circle":
                        // simple_circle选项，简化画圆操作
                        arr.push("# simple_circle vvv")
                        simple_circle(res, ori.player.pos, arr);
                        arr.push("# simple_circle ^^^")
                        break;
                    default:
                        // 无匹配项则报错
                        return out.error("pc: preset: 未知的操作");
                }
                if (res.presetToDo == "exec") {
                    // 直接执行
                    out.addMessage(`开始执行Script`);
                    var loc = db.get(`${name}.exec`);
                    if (loc != null) {
                        return out.error("已有脚本正在运行");
                    } else {
                        // 加锁
                        db.set(`${name}.exec`, true);
                        // 丢给“解释器”就完事了
                        scriptInterpret(arr, name, ori.player.pos.dimid, false);
                        return out.success(`任务已添加`);
                    }
                } else {
                    // 写入脚本
                    var path = DATAPATH + `scripts\\${name}\\`;
                    if (!File.checkIsDir(path)) {
                        File.mkdir(path);
                    }
                    File.writeLine(path + `${res.name}.txt`, arr.join("\n"));
                    return out.success("已写入脚本");
                }
            default:
                // 无匹配项则报错
                return out.error("pc: 未知的操作");
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
            // 发送文字消息，不拦截
            return true;
        } else if (msg == ":q") {
            // 退出
            db.delete(`${name}.edit`);
            db.delete(`${name}.buf`);
            pl.tell("已退出编辑模式");
            return false;
        } else if (msg == ":p") {
            // 打印缓冲区
            var arr = db.get(`${name}.buf`);
            if (arr == null) {
                pl.sendToast("失败", "缓冲区为空");
                return false;
            }
            pl.tell(`${Format.Aqua}---缓冲区---${Format.Clear}`);
            for (var i = 1; i < arr.length; i++) {
                pl.tell(`${Format.Aqua}${i} |${Format.Clear} ${arr[i]}`);
            }
            pl.tell(`${Format.Aqua}---EOF---${Format.Clear}`);
            return false;
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
            return false;
        } else if (msg == ":w" || msg.startsWith(":w ")) {
            // 写入文件
            var na;
            if (msg != ":w") {
                na = msg.substring(3);
            }
            var arr = db.get(`${name}.buf`);
            if (arr == null) {
                pl.sendToast("失败", "缓冲区为空");
                return false;
            }
            if (na != null && na != "") {
                efn = na;
            }
            File.writeTo(DATAPATH + `scripts\\${name}\\${efn}.txt`, arr.slice(1).join("\n").trim());
            pl.tell("文件已写入");
            return false;
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
            if (arr <= 0 || arr.length < ln) {
                pl.sendToast("失败", "数值超出范围");
                return false;
            }
            arr.splice(ln, 1);
            pl.tell(`删除了第 ${ln} 行`);
            arr[0]--;
            db.set(`${name}.buf`, arr);
            return false;
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
            if (arr <= 0 || arr.length < ln) {
                pl.sendToast("失败", "数值超出范围");
                return false;
            }
            arr[0] = ln;
            pl.tell(`跳转至第 ${ln} 行`);
            db.set(`${name}.buf`, arr);
            return false;
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
            return false;
        }
    } else {
        return true;
    }
});
