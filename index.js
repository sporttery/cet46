
const fs = require("fs");
const path = require("path")
const readline = require('readline');
const iconv = require('iconv-lite');
const exec = require("child_process").exec;
const { shell } = require('electron');

var configuration = require('./configuration');
//目录，长度为5，
// 0 源文件目录
// 1 照片目录
// 2 二维码目录
// 3 合格文件目录
// 4 错误文件目录
var folderArr = [];
//目录对应的input元素
var folderEleArr = [];
var folderArrIdx = 0;
//从配置文件里读出来的
var defaultFolderArr = [];
var defaultTableData = [];
//表格数据列
var tableData = [];
var alert_like;
var defaultNavTab = 0;
var g_data_changed = -1;
var layerLoadIdx, chk_tlmk;
var templateHtml = '<html>\
<head>\
  <meta http-equiv=Content-Type content="text/html; charset=utf8">\
  <style>\
  <!--\
   /* Font Definitions */\
  @page Section1\
      {size:11.0in 8.5in;\
      mso-page-orientation:landscape;\
      margin:1.25in 1.0in 1.25in 1.0in;\
      mso-header-margin:35.4pt;\
      mso-footer-margin:35.4pt;\
      mso-paper-source:0;}\
  div.Section1\
      {page:Section1;}\
  -->\
  </style>\
  <style>\
    .title {font-family: "宋体"; font-size:12pt; font-weight:bold;}\
    .table {border-bottom: 1px solid black; border-top: 1px solid black;}\
    .header {border-bottom: 1px solid black;}\
    div, td {font-size: 10.5pt;}\
  </style>\
</head>\
<body>\
<div class=Section1 style="mso-page-orientation:landscape;">###content###</div></body></html>';
function setFolder() {
    var filepath = document.getElementById("folderBtn").files[0].path;
    folderArr[folderArrIdx] = filepath;
    folderEleArr[folderArrIdx].val(filepath);
    document.getElementById("folderBtn").value = "";
    g_data_changed = 0;
}
function checkFolder(noAlert) {
    if (folderArr.length == 0) {
        !noAlert && alert("请先完成数据配置");
        folderEleArr[0][0].focus();
        return false;
    }
    for (var i = 0; i < folderEleArr.length; i++) {
        var checked = true;
        var msg = "未完成";
        if (!folderArr[i] || folderArr[i] == "") {
            checked = false;
        }
        if (checked) {
            checked = fs.existsSync(folderArr[i]);
            msg = folderArr[i] + " 无效路径";
        }
        if (checked) {
            var statsObj = fs.statSync(folderArr[i])
            checked = statsObj.isDirectory();
            msg = folderArr[i] + " 不是文件夹";
        }
        if (!checked) {
            !noAlert && alert("<span style=\"color:red;font-weight:bold\">" + folderEleArr[i].prev().text() + "</span>" + msg);
            folderEleArr[i][0].focus();
            return false;
        }
    }
    return true;
}
function nextStep(n) {
    if (g_data_changed != -1) {
        alert("数据有变化，请先保存或者重置！");
        $(".nav a")[g_data_changed].click();
        return;
    }
    if (n === 0) {
        if (checkFolder()) {
            if (tableData.length == 0) {
                $(".nav-tabs .active").next().next().find("a")[0].click();
            } else {
                $("#btnFindFile").removeAttr("disabled").removeClass("disabled");
                $(".nav-tabs .active").next().find("a")[0].click();
            }
        }
    } else {
        if (tableData.length == 0) {
            alert("请先设置数据定义");
        } else {
            $("#btnFindFile").removeAttr("disabled").removeClass("disabled");
            $(".nav-tabs .active").prev().find("a")[0].click();
        }
    }
}
function timeClose(id, seconds) {
    if (!seconds) {
        seconds = 4;
    }
    setTimeout(function () {
        $('#' + id).modal('hide');
    }, seconds * 1000);
}
function alert(msg, title, callback, cancelFn) {
    if (!title) {
        layer.alert(msg);
        return;
    }
    if (!alert_like) {
        alert_like = $("#alert_like");
    }
    if (title) {
        alert_like.find("#myModalLabel").html(title);
    }
    alert_like.find("#modal_con").html("<p>" + msg + "</p>");
    alert_like.modal();
    if (callback) {
        alert_like.find(".close").removeAttr("data-dismiss").click(() => {
            callback();
            if (alert_like.is(":visible")) {
                alert_like.modal("hide");
            }
        });
        alert_like.find("#ok_btn").removeAttr("data-dismiss").click(() => {
            callback();
            if (alert_like.is(":visible")) {
                alert_like.modal("hide");
            }
        });
        if (cancelFn) {
            alert_like.find(".modal-footer").append('<button id="cancel_btn" class="btn btn-sm btn-warning">退 出</button>');
            alert_like.find("#cancel_btn").click(() => {
                cancelFn();
                if (alert_like.is(":visible")) {
                    alert_like.modal("hide");
                }
            });
        }
    } else {
        alert_like.find(".close").attr("data-dismiss", "modal");
        alert_like.find("#ok_btn").attr("data-dismiss", "modal");
        alert_like.find("#cancel_btn").remove();
    }
}

function restore(flag) {
    if (flag) {
        tableData = [].concat(defaultTableData);
        setTableData();
        document.getElementById("fileBtn").value = "";
    } else {
        for (var i = 0; i < folderEleArr.length; i++) {
            if (defaultFolderArr[i]) {
                folderEleArr[i].val(defaultFolderArr[i]);
                folderArr[i] = defaultFolderArr[i];
            } else {
                folderEleArr[i].val('');
                folderArr[i] = '';
            }
        }
        document.getElementById("folderBtn").value = "";
    }
    g_data_changed = -1;
}
function checkFileColumns(noAlert) {
    var allNo = [];
    //排序号不能重复
    for (var i = 0; i < tableData.length; i++) {
        var config = tableData[i];
        config["排序号"] = parseInt(config["排序号"]);
        if (isNaN(config["排序号"])) {
            !noAlert && alert("第" + (i + 1) + "项排序号不是数字，请重新指定一个");
            return false;
        }

        if (allNo.includes(config["排序号"])) {
            !noAlert && alert("第" + (i + 1) + "项排序号已经存在，排序号不能重复，请重新指定一个");
            return false;
        }
        if ((config["照片"] || config["二维码"]) && !config["启用"]) {
            !noAlert && alert("第" + (i + 1) + "项配置错误，在未启用的字段上配置照片或者二维码!");
            return false;
        }
        allNo.push(config["排序号"]);
    }
    return true;
}
function save(flag) {
    if (!flag) {
        if (checkFolder()) {
            configuration.saveSettings("folderArr", JSON.stringify(folderArr))
            defaultFolderArr = [].concat(folderArr);
            if (tableData.length > 0) { //如果数据定义已经Ok，开启查找文件功能
                $("#btnFindFile").removeAttr("disabled").removeClass("disabled");
            }
            alert("数据已经保存");
            g_data_changed = -1;
        }
    } else {
        if (checkFileColumns()) {
            //如果列发生了变化，清除缓存
            cleanCache();
            var ks_type = $("#ks_type").val();
            var ks_date = $("#ks_date").val();
            var tableKey = "tableData_" + ks_date + "_" + ks_type;
            configuration.saveSettings(tableKey, JSON.stringify(tableData))
            defaultTableData = [].concat(tableData);
            if (checkFolder(true)) { //如果目录设置已经Ok，开启查找文件功能
                $("#btnFindFile").removeAttr("disabled").removeClass("disabled");
            }
            alert("数据已经保存");
            g_data_changed = -1;
        }
    }
}
function tlmkChage() {
    chk_tlmk = $("#chk_tlmk")[0].checked;
    var ks_type = $("#ks_type").val();
    var ks_date = $("#ks_date").val();
    var tlmk_key = "chk_tlmk_" + ks_date + "_" + ks_type;
    configuration.saveSettings(tlmk_key, chk_tlmk);
}
function loadDefaultConfig() {
    var ks_type = $("#ks_type").val();
    var ks_date = $("#ks_date").val();
    var tableKey = "tableData_" + ks_date + "_" + ks_type;
    var folderArr = configuration.readSettings("folderArr");
    if (folderArr) {
        defaultFolderArr = JSON.parse(folderArr);
    } else {
        defaultFolderArr = [];
    }
    var tableData = configuration.readSettings(tableKey);
    if (tableData) {
        defaultTableData = JSON.parse(tableData);
    } else {
        defaultTableData = [];
    }
    defaultNavTab = configuration.readSettings("defaultNavTab") || 0;
    var tlmk_key = "chk_tlmk_" + ks_date + "_" + ks_type;
    chk_tlmk = configuration.readSettings(tlmk_key);
}

function selectAll(obj, id) {
    $("#" + id + " input:checkbox").each((idx, chk) => {
        chk.checked = obj.checked
        $(chk).change();
    })
}

// 科目级别	文件名
// 英语四级	CET4.CSV
// 英语六级	CET6.CSV
// 日语四级	CJT4.CSV
// 日语六级	CJT6.CSV
// 德语四级	CGT4.CSV
// 德语六级	CGT6.CSV
// 俄语四级	CRT4.CSV
// 俄语六级	CRT6.CSV
// 法语四级	CFT4.CSV

const allowFileName = {
    "CET4|英语四级": 1, "CET6|英语六级": 1, "CJT4|日语四级": 1, "CJT6|日语六级": 1, "CGT4|德语四级": 1, "CGT6|德语六级": 1, "CRT4|俄语四级": 1, "CRT6|俄语六级": 1, "CFT4|法语四级": 1, "CFT6|法语六级": 1
};
function getFiles(sourceDir, includeSubFolder, filetypes) {
    const allowFileNameReg = new RegExp("^(" + $("#ks_type").val() + ")_\\d+\\..*$");
    let allfiles = [];
    function findFiles(dir, includeSubFolder, filetypes) {
        let files = fs.readdirSync(dir);
        files.forEach(function (item, index) {
            let fPath = path.join(dir, item);
            let stat = fs.statSync(fPath);
            if (stat.isDirectory() === true && includeSubFolder) {
                findFiles(fPath, includeSubFolder, filetypes);
            }
            if (stat.isFile() === true) {
                var extname = path.extname(fPath);
                var basename = path.basename(fPath);
                if (typeof filetypes == "string") {//filetypes 是字符串
                    if (filetypes === "*" || extname == filetypes) {
                        if (allowFileNameReg.test(basename)) {
                            allfiles.push({ filepath: fPath, size: stat.size });
                        }
                    }
                } else if (typeof filetypes == "object" && filetypes.includes && filetypes.includes(extname)) {//filetypes 是数组
                    if (allowFileNameReg.test(basename)) {
                        allfiles.push({ filepath: fPath, size: stat.size });
                    }
                };
            }
        });
    }
    findFiles(sourceDir, includeSubFolder, filetypes);
    return allfiles;
}

function openFile(idx) {
    if (!idx) {
        return;
    }
    var filepath;
    if (isNaN(idx)) {
        filepath = idx;
    } else {
        filepath = allDataFiles[idx].filepath;
    }
    // var cmd = "start notepad \"" + filepath + "\"";
    // console.log(cmd);
    // exec(cmd);
    shell.openItem(filepath);
}

function openDir(idx) {
    if (!idx) {
        return;
    }
    var dir;
    if (isNaN(idx)) {
        dir = idx;
    } else {
        dir = path.dirname(allDataFiles[idx].filepath);
    }
    // cmd = "start explorer \"" + dir + "\"";
    // console.log(cmd);
    // exec(cmd);
    shell.openItem(dir);
}

const Kilobyte = 1024;
const Megabyte = 1024 * Kilobyte;
const Gigabyte = 1024 * Megabyte;
const Terabyte = 1024 * Gigabyte;
function getFileSize(len) {
    if (len > Terabyte) {
        return (len / Terabyte).toFixed(2) + " TB";
    } else if (len > Gigabyte) {
        return (len / Gigabyte).toFixed(2) + " GB";
    } else if (len > Megabyte) {
        return (len / Megabyte).toFixed(2) + " MB";
    } else if (len > Kilobyte) {
        return (len / Kilobyte).toFixed(2) + " KB";
    } else {
        return len + " B";
    }
}
var allDataFiles = [];
function findFile(obj) {
    allDataFiles = [];
    $(obj).attr("disabled", "disabled").addClass("disabled");
    var includeSubFolder = $("#includeSubFolder")[0].checked;
    var filetype = $("#filetype").val();
    allDataFiles = getFiles(folderArr[0], includeSubFolder, filetype);

    //fileData
    var html = [];
    allDataFiles.forEach((file, idx) => {
        var filepath = file.filepath;
        html.push("<tr>");
        html.push('<td><input type="checkbox" class="filecbx" onchange="filecbxChange()" value="' + idx + '" id="fileIdx' + idx + '" style="cursor:pointer;width:20px;height:20px"/></td>');
        html.push('<td title="' + filepath + '"><a href="javascript:openFile(' + idx + ')" class="btn btn-link">' + path.basename(filepath) + '</a>' + getFileSize(file.size) +
            ' <a href="javascript:openDir(' + idx + ')" title="打开所在目录 ' + path.dirname(filepath) + '">目录</a></td>');
        html.push('<td>未开始</td>');
        html.push('<td>未开始</td>');
        html.push("</tr>");
    })
    if (html.length > 0) {
        $("#fileData").html(html.join(""));
    } else {
        if (filetype != "*") {
            alert("没有找到数据文件，当前只查找后缀\"" + filetype + "\"的文件，切换成\"所有文件\"试试<p>文件名必须以<p>" + Object.keys(allowFileName).join(",") + "</p>开头,【_省份】 结尾 ， 如 【CET4_12.csv】");
        } else {
            alert("没有找到数据文件，请确认源数据目录是否正确,<p>文件名必须以<p>" + Object.keys(allowFileName).join(",") + "</p>开头,【_省份】 结尾 ， 如 【CET4_12.csv】");
        }
    }
    $(obj).removeAttr("disabled", "disabled").removeClass("disabled");
}
function filecbxChange() {
    var len = $(".filecbx:checked").length;
    if (len > 0) {
        $("#btnData").removeAttr("disabled", "disabled").removeClass("disabled");
    } else {
        $("#btnData").attr("disabled", "disabled").addClass("disabled");
    }
}
var progressbar;
function setProgressbar(value, txt) {
    // console.log(value)
    if (!progressbar) {
        progressbar = $("#progressbar")[0];
    }
    if (value == 0) {
        progressbar.style.width = value + "%";
        progressbar.innerText = "";
    } else {
        if (!txt) {
            txt = value + "%";
        }
        progressbar.style.width = value + "%";
        progressbar.innerText = txt;
    }
}
function getByteLen(str) {
    //编码为GBK时，非ASCII字符占用两个字节宽
    return str.replace(/[^\x00-\xff]/g, 'xxx').length;
    //编码为UTF-8时，非ASCII字符占用三个字节宽
}

function wait(second) {
    // execSync 属于同步方法；异步方式请根据需要自行查询 node.js 的 child_process 相关方法；

    let ChildProcess_ExecSync = require('child_process').execSync;
    try {
        ChildProcess_ExecSync('powershell sleep ' + second);
    } catch (error) {
        try {
            ChildProcess_ExecSync('sleep ' + second);
        } catch (error) {

        }
    }
};
/**
 * 1.省份代码应为笔试准考证号前两位。
2.语言级别代码应为笔试准考证号的第十位。
3.英语四级和六级，语言级别=1时，口试准考证第一位是否为‘F’，语言级别=2时，口试准考证号一位须等于‘S’。
4.英语四级和六级，口语成绩只能是A，A+，B，B+，C，C+或‘--’
5.日语四级总分与成绩之间的关系为：
Zf>=40 and <50 成绩=一级
Zf>=50 and <60 成绩=二级
Zf>=60 and <70 成绩=三级
Zf>=70，成绩=四级
6.除日语四级以外的总分与成绩之间的关系：
Zf>=60 and <85 成绩=合格
Zf>=85 成绩=优秀
英语四级	CET4.CSV
英语六级	CET6.CSV
日语四级	CJT4.CSV
日语六级	CJT6.CSV
德语四级	CGT4.CSV
德语六级	CGT6.CSV
俄语四级	CRT4.CSV
俄语六级	CRT6.CSV
法语四级	CFT4.CSV
 */
var kyDataMap = { "A": 1, "A+": 1, "B": 1, "B+": 1, "C": 1, "C+": 1, "--": 1 };
var checkDataFun = {
    "DEFAULT": function (currData, sf) {
        //准考证号
        var ks_zkz = currData["KS_ZKZ"];
        var _sf = ks_zkz.substring(0, 2);
        var err = [];
        if (_sf != sf) {
            err.push("准考证号的省份不一致");
        }
        //省代码（报名号前2位）\学校代码（报名号前5位）\校区代码（报名号第6位）\语言级别代码（报名号第7位）\报名号.jpg
        //报名号
        var ks_bmh = currData["KS_BMH"];
        var _xxdm = ks_bmh.substring(0, 5);
        var _xqdm = ks_bmh[5];
        var _yyjb = ks_bmh[6];
        // if (currData["KS_SSXX"] && _xxdm != currData["KS_SSXX"]) { //学校代码不一致
        //     err.push("学校代码不一致");
        // }
        // if (currData["KS_BMXQ"] && _xqdm != currData["KS_BMXQ"]) { //校区代码不一致
        //     err.push("校区代码不一致");
        // }
        // if (currData["KS_YYJB"] && _yyjb != currData["KS_YYJB"]) { //语言级别代码不一致
        //     err.push("语言级别代码不一致");
        // }
        if (picIndex != -1) {
            picFolder = path.join(folderArr[1], sf, _xxdm, _xqdm, _yyjb);
            if (fs.existsSync(path.join(picFolder, currData["照片"] + ".jpg"))) {
                currData["照片"] = path.join(sf, _xxdm, _xqdm, _yyjb, currData["照片"] + ".jpg");
            } else if (fs.existsSync(path.join(picFolder, currData["照片"] + ".png"))) {
                currData["照片"] = path.join(sf, _xxdm, _xqdm, _yyjb, currData["照片"] + ".png");
            } else {
                err.push("照片不存在 [" + path.join(picFolder, currData["照片"] + ".jpg") + "]");
            }
        }
        if (qrcodeIndex != -1) {
            picFolder = path.join(folderArr[2], sf, _xxdm, _xqdm, _yyjb);
            if (fs.existsSync(path.join(picFolder, currData["二维码"] + ".jpg"))) {
                currData["二维码"] = path.join(sf, _xxdm, _xqdm, _yyjb, currData["二维码"] + ".jpg");
            } else if (fs.existsSync(path.join(picFolder, currData["二维码"] + ".png"))) {
                currData["二维码"] = path.join(sf, _xxdm, _xqdm, _yyjb, currData["二维码"] + ".png");
            } else {
                err.push("二维码不存在 [" + path.join(picFolder, currData["二维码"] + ".jpg") + "]");
            }
        }
        if (currData["KS_ZKZ_XS"]) {
            if (currData["KS_ZKZ_XS"].length == 15) {
                currData["笔试考试时间"] = "2021年12月";
            } else if (currData["KS_ZKZ_XS"] == "--") {
                currData["笔试考试时间"] = "--";
            } else {
                err.push("笔试考试时间所需要字段(ks_zkz_xs)值不符合要求");
            }
        } else {
            currData["笔试考试时间"] = "--";
        }
        if (currData["KY_ZKZ"]) {
            if (currData["KY_ZKZ"].length == 15) {
                currData["口语考试时间"] = "2021年11月";
            } else if (currData["KY_ZKZ"] == "--") {
                currData["口语考试时间"] = "--";
            } else {
                err.push("口语考试时间所需要字段(ky_zkz)值不符合要求");
            }
        } else {
            currData["口语考试时间"] = "--";
        }
        if (err.length > 0) {
            return err.join(",");
        }
        return "";
    }
};
checkDataFun["CET"] = function (currData, sf) {
    var defalutCheckResult = checkDataFun.DEFAULT(currData, sf);
    if (defalutCheckResult != "") {
        return defalutCheckResult;
    }
    //准考证号
    var ks_zkz = currData["KS_ZKZ"];
    //口语准考证
    var ky_zkz = currData["KY_ZKZ"];
    //口语成绩
    var ky_sco = currData["KY_SCO"];
    var err = [];
    var _yyjb = ks_zkz[9];
    if (ky_zkz != "--" && _yyjb == 1 && ky_zkz[0] != 'F') {
        err.push("语言级别和口试准考证第一位没有对应");
    }
    if (ky_zkz != "--" && _yyjb == 2 && ky_zkz[0] != 'S') {
        err.push("语言级别和口试准考证第一位没有对应");
    }
    if (!kyDataMap[ky_sco]) {
        err.push("口语成绩[" + ky_sco + "]不符合");
    }
    if (err.length > 0) {
        return err.join(",");
    }
    return "";
}
checkDataFun["CET4"] = checkDataFun["CET"]
checkDataFun["CET6"] = checkDataFun["CET"]
checkDataFun["英语四级"] = checkDataFun["CET"]
checkDataFun["英语六级"] = checkDataFun["CET"]

//空数据
var EMPTY, EMPTYOBJ;
//照片字段的下标 二维码字段的下标 允许输出的列下标
var picIndex = -1, qrcodeIndex = -1, enabledColumns;
//记录进度
var progressData = { len: 0, size: 0, currSize: 0, lastProgress: 0 };
function cleanCache() {
    delete EMPTY;
    delete EMPTYOBJ;
    enabledColumns = false;
    progressData = { len: 0, size: 0, currSize: 0, lastProgress: 0 };
    chk_tlmk = $("#chk_tlmk")[0].checked;
}
function analyticHandle(file, inputEl) {
    let totalSize = file.size;
    let nowStr = "." +getDateStr();
    // let nowStr = "";
    let tds = $(inputEl).parent().siblings();
    $(tds[tds.length - 1]).text("准备中");
    //单个文件里所有的数据， 数据内容：{学院1:[],学院2:[]}
    let allDataInFile = {};
    //单个文件里所有合格的数据生成的串，可以直接输出到ok.csv文件里
    let allOkStrInFile = {};
    let filename = path.basename(file.filepath);
    let ext = path.extname(file.filepath);
    //合格数据文件
    let okFilepath = path.join(folderArr[3], ext == "" ? filename +  nowStr + ".ok.csv" : filename.replace(ext,  nowStr + ".ok.csv"));
    //错误数据文件
    let errFilepath = path.join(folderArr[4], path.basename(okFilepath).replace(".ok.csv", ".err.csv"));
    /*
    if(fs.existsSync(okFilepath)){
        fs.unlinkSync(okFilepath);
    }
    if(fs.existsSync(errFilepath)){
        fs.unlinkSync(errFilepath);
    }*/
    //省份代码
    let sf = filename.split(/[_.]/g)[1];
    let lang = filename.substring(0, 4);
    let validFun = checkDataFun[lang];
    if (!validFun) {
        validFun = checkDataFun["DEFAULT"];
    }

    let sumlen = 0;
    let lineCount = 0;
    let lastProgress = "";
    let errCount = 0;
    let head = [];//表头
    if (!enabledColumns) {
        enabledColumns = {};
        EMPTY = "0,";
        EMPTYOBJ = { "PageNo": "0" };
        for (let i = 0; i < tableData.length; i++) {
            let config = tableData[i];
            if (config["启用"]) {
                if (config["照片"]) {
                    picIndex = i;
                }
                if (config["二维码"]) {
                    qrcodeIndex = i;
                }
                enabledColumns["_" + i] = parseInt(config["排序号"]);
                EMPTY += "0,";
                EMPTYOBJ[config["内容"]] = "0";
                head[parseInt(config["排序号"])] = config["内容"];
            }
        }
        if (picIndex != -1) {
            EMPTY += "empty.jpg,";
            EMPTYOBJ["照片"] = "empty.jpg";
        }
        if (qrcodeIndex != -1) {
            EMPTY += "empty.jpg";
            EMPTYOBJ["二维码"] = "empty.jpg";
        }
        if (picIndex == -1 && qrcodeIndex == -1) {
            EMPTY = EMPTY.substring(0, EMPTY.length - 1);
        }
    }
    let headLine = ["PageNo"];
    for (var i = 0; i < head.length; i++) {
        if (head[i]) {
            headLine.push(head[i]);
        }
    }
    headLine.push("照片");
    headLine.push("二维码");
    headLine.push("笔试考试时间");
    headLine.push("口语考试时间");

    if (chk_tlmk) {
        headLine.push("chk_tlmk");
        EMPTYOBJ["chk_tlmk"] = "0";
        EMPTY += ",0";
    }
    let headLineStr = "\"" + headLine.join("\",\"") + "\"\r\n";
    fs.appendFileSync(okFilepath, iconv.encode(headLineStr, 'gbk'), "binary");
    $(tds[tds.length - 1]).text("进行中");
    let readObj = readline.createInterface({
        input: fs.createReadStream(file.filepath)
    });
    // 一行一行地读取文件
    readObj.on('line', function (line) {
        if (errCount == -1) {
            return;
        }
        let lineLen = getByteLen(line) + 2;
        sumlen += lineLen;
        progressData.currSize += lineLen;
        line = line.replace(/["']/g, "").trim();
        if (line.length > 0 && line[0].toUpperCase() != 'K') { //列头不处理
            lineCount++;
            //设置进度
            let currProgress = Math.floor((sumlen * 100 / totalSize));
            if (lastProgress != currProgress) {
                if (currProgress > 90) {
                    tds[1].innerText = "统计中";
                } else {
                    tds[1].innerText = "[" + currProgress + "%]";
                }
                lastProgress = currProgress;
            }
            let progress = Math.floor((progressData.currSize * 100 / progressData.size));
            if (progress != progressData.lastProgress) {
                setProgressbar(progress);
                progressData.lastProgress = progress;
            }
            //结束进度
            let columns = line.split(/[,\t]/g); //有可能豆号，有可能\t分隔            
            if (columns.length != tableData.length) { //无法也字段对应，不处理
                alert("文件" + file.filepath + " 第" + lineCount + "行 数据缺失，与定义字段的个数不一致！");
                /*, "数据错误", function () {
                    readObj.resume();
                }, function () {
                    readObj.close();
                });
                readObj.pause();*/
                errCount = -1;
                readObj.close();
                layer.close(layerLoadIdx);
                return false;
            }
            let outputData = []; //按排序号的排序的内容
            let currData = {};//全部内容
            for (let i = 0; i < columns.length; i++) {
                let sortNum = enabledColumns["_" + i];
                currData[tableData[i]["内容"]] = columns[i].replace(".00", "");
                if (sortNum) {
                    outputData[sortNum] = columns[i].replace(".00", "");
                    if (picIndex == i) {
                        currData["照片"] = columns[i];
                    }
                    if (qrcodeIndex == i) {
                        currData["二维码"] = columns[i];
                    }
                }
            }
            let errMsg = validFun(currData, sf);
            if (errMsg == "") {
                outputData[tableData.length + 1] = currData["照片"];
                outputData[tableData.length + 2] = currData["二维码"];
                outputData[tableData.length + 3] = currData["笔试考试时间"];
                outputData[tableData.length + 4] = currData["口语考试时间"];
                if (chk_tlmk) {
                    if (currData["KS_TLMK"] == "0") {
                        outputData[tableData.length + 5] = " ";
                    } else if (currData["KS_TLMK"] == "1") {
                        outputData[tableData.length + 5] = "该考生为听力残疾，听力部分免考，分数经折算计入笔试总分。";
                    }
                }

            } else {
                // console.log(" 第" + lineCount + "行 报错" + errMsg + " -> " + line);
            }

            let finalData = [];
            let kddm = currData["KS_ZKZ"].substring(0,5);
            let ks_ssxx = currData["KS_SSXX"];
            for (let i = 0; i < outputData.length; i++) {
                if (typeof outputData[i] != "undefined") {
                    finalData.push(outputData[i]);
                }
            }
            var csvLineStr = "\"" + finalData.join("\",\"") + "\"";
            if (errMsg != "") {
                errCount++;
                csvLineStr = csvLineStr + ",\"" + errMsg + "\"";
                fs.appendFileSync(errFilepath, csvLineStr + "\r\n")
            } else {
                //ks_ssxx 学校代码
                //dm_mc 学校名称
                //kddm考点代码
                if (!allOkStrInFile[kddm]) {
                    allOkStrInFile[kddm] = {};
                }
                if(!allOkStrInFile[kddm][ks_ssxx]){
                    allOkStrInFile[kddm][ks_ssxx]=[];
                }
                allOkStrInFile[kddm][ks_ssxx].push(csvLineStr);
            }
            if (!allDataInFile[kddm]) {
                allDataInFile[kddm] = {};
            }
            if(!allDataInFile[kddm][ks_ssxx]){
                allDataInFile[kddm][ks_ssxx]=[];
            }
            allDataInFile[kddm][ks_ssxx].push(currData);
        }
    });
    // 读取完成后
    readObj.on('close', function (e) {
        if (errCount == -1) {
            return;
        }
        //同步
        let pakFilepath = okFilepath.replace(".ok.csv", ".pak.txt");
        if (fs.existsSync(pakFilepath)) {
            fs.unlinkSync(pakFilepath);
        }

        console.log(okFilepath + " saving...");
        // wait(0.2);

        //输出统计表格

        let tables = [];
        for (let kddm in allOkStrInFile) {
            
            for(let ssxx in allOkStrInFile[kddm]){
                //打印矩阵数据，每4个一组
                let tmpArr = [[], [], [], []];
                let list = allOkStrInFile[kddm][ssxx];
                let size = Math.floor(list.length / tmpArr.length);
                let mod = list.length % tmpArr.length;
                let sizeArr = [size, size, size, size];
                for (let pakNo = 0; pakNo < mod; pakNo++) {
                    sizeArr[pakNo] += 1;
                }
                let idx = 0;
                for (let pakNo = 0; pakNo < list.length; pakNo++) {
                    let data = list[pakNo];
                    tmpArr[idx].push(data);
                    if (tmpArr[idx].length == sizeArr[idx]) {//到了最大值，开始装下一个数组
                        idx = idx + 1;
                    }
                }
                if (mod != 0) {
                    for (let pakNo = mod; pakNo < 4; pakNo++) {
                        tmpArr[pakNo].push(EMPTY);
                    }
                }
                let maxSize = tmpArr[0].length;
    
                //输出到合格文件
                for (let k = 0; k < maxSize; k++) {
                    var pageNo = k + 1;
                    for (let pakNo = 0; pakNo < 4; pakNo++) {
                        fs.appendFileSync(okFilepath, iconv.encode("\"" + pageNo + "\"," + tmpArr[pakNo][k] + "\r\n", 'gbk'), "binary");
                    }
                }
            }
        }
        let oNum1=1;
        for (let kddm in allDataInFile) {
            let oNum2=0;
            for(let ssxx in allDataInFile[kddm]){
                let oNum3=0;
                let listData = allDataInFile[kddm][ssxx];
                listData.sort((a,b)=>{
                    if(a["KS_BMXQ"] > b["KS_BMXQ"]){
                        return 1;
                    }else if(a["KS_BMXQ"] < b["KS_BMXQ"]){
                        return -1;
                    }else if(a["DM_MC"] > b["DM_MC"]){
                        return 1;
                    }else if(a["DM_MC"] < b["DM_MC"]){
                        return -1;
                    }else {
                        return 0;
                    }
                })

                
                let currData = listData[0];
                let bmxq = currData["KS_BMXQ"];//校区代码
                let yyjb = currData["KS_YYJB"];//语言级别
                let dm_mc = currData["DM_MC"];//学校名称
    
                // 【生成的文件 *.pak.txt 字段】
                // no    num  ks_ssxx ks_bmxq ks_yyjb count ks_zsh ks_zsh dm_mc
                // 条码,包号,学校代码,校区代码,语言级别,证书数量,起始证书编号,终止证书编号,学校名称
                //每包500个
    
                let pakSize = Math.floor(listData.length / 500);
                let pakSizeMod = listData.length % 500;
                let orderNum = parseInt(kddm) + oNum1++*1000 + oNum2++*100 + oNum3++*10;
    
                let pakInfoArr = [];
                for (let pakNo = 1; pakNo <= pakSize; pakNo++) {
                    let row = [];
                    row.push(orderNum + pakNo);
                    row.push(pakNo);
                    row.push(kddm);
                    row.push(bmxq);
                    row.push(yyjb);
                    row.push(500);
                    let startIdx = (pakNo - 1) * 500;
                    let endIdx = pakNo * 500 ;
                    let currListData = listData.slice(startIdx,endIdx);
                    let firstNum = parseInt(currListData[0]["KS_ZSH"]);//当前组的第一个
                    let lastNum = parseInt(currListData[currListData.length-1]["KS_ZSH"]);//当前组的最后一个
                    let yxmzList="";
                    for(var i=0,j=1;i<currListData.length;i++){
                        let ymxz_ = currListData[i]["KS_XY_DM"] ;
                        if (!ymxz_){
                            ymxz_ = currListData[i]["KS_XY"];
                        }  
                        if(yxmzList.indexOf(ymxz_)==-1){
                            yxmzList += j++ +"、"+ymxz_ + "    "
                        }
                    }
                    row.push(firstNum);
                    row.push(lastNum);
                    row.push(dm_mc);
                    row.push(yxmzList);
                    pakInfoArr.push({ pakNum: pakNo, firstNum, lastNum });
                    fs.appendFileSync(pakFilepath, iconv.encode(row.join(",") + ("\r\n"), 'gbk'), "binary");
                }
                if (pakSizeMod > 0) {
                    let row = [];
                    row.push(orderNum + (pakSize+2));
                    row.push(pakSize + 1);
                    row.push(kddm);
                    row.push(bmxq);
                    row.push(yyjb);
                    row.push(pakSizeMod);
                    let startIdx = pakSize * 500;
                    let currListData = listData.slice(startIdx);
                    let firstNum = parseInt(currListData[0]["KS_ZSH"]);//当前组的第一个
                    let lastNum = parseInt(currListData[currListData.length-1]["KS_ZSH"]);//当前组的最后一个
                    let yxmzList="";
                    for(var i=0,j=1;i<currListData.length;i++){
                        let ymxz_ = currListData[i]["KS_XY_DM"] ;
                        if (!ymxz_){
                            ymxz_ = currListData[i]["KS_XY"];
                        }  
                        if(yxmzList.indexOf(ymxz_)==-1){
                            yxmzList += j++ +"、"+ymxz_ + "    "
                        }
                    }
                    row.push(firstNum);
                    row.push(lastNum);
                    row.push(dm_mc);
                    row.push(yxmzList);
                    pakInfoArr.push({ pakNum: pakSize + 1, firstNum, lastNum });
                    fs.appendFileSync(pakFilepath, iconv.encode(row.join(",") + ("\r\n"), 'gbk'), "binary");
                }
    
    
                //按院系名称[KS_XY_DM]校区代码[KS_BMXQ]分组
                let yxGroup = {};
                listData.forEach(currData => {
                    let nkey = (currData["KS_XY_DM"] ? currData["KS_XY_DM"] : currData["KS_XY"] ? currData["KS_XY"] : "--") + "-" + (currData["KS_BMXQ"] == "" ? "0" : currData["KS_BMXQ"]);
                    if (!yxGroup[nkey]) {
                        yxGroup[nkey] = [];
                    }
                    yxGroup[nkey].push(currData);
                });
                let rows = [];
                for (let dm in yxGroup) {
                    let xy_dm = dm.split("-")[0];
                    bmxq = dm.split("-")[1];
                    let yxList = yxGroup[dm];
                    row = [];
                    row.push(bmxq);
                    row.push(xy_dm);
                    row.push(dm_mc);
                    row.push(yxList.length);
                    let firstNum = parseInt(yxList[0]["KS_ZSH"]);
                    let lastNum = parseInt(yxList[yxList.length - 1]["KS_ZSH"]);
                    let pakNos = [];
                    // yxList.forEach(currData=>{
                    //     var zsh =  currData["KS_ZSH"];
                    //     pakInfoArr.forEach(pak=>{
                    //         if(pak.firstNum <= zsh && pak.lastNum >= zsh){
                    //             pakNos.push(pak.pakNum);
                    //         }
                    //     })
                    // });
                    pakInfoArr.forEach(pak => {
                        if (pak.firstNum <= firstNum && pak.lastNum >= firstNum) {
                            pakNos.push(pak.pakNum);
                        }
                        if (pak.firstNum <= lastNum && pak.lastNum >= lastNum) {
                            pakNos.push(pak.pakNum);
                        }
                    })
                    row.push(pakNos.join("-"));
                    row.push(firstNum + "-" + lastNum);
                    rows.push(row);
                }
                tables.push({ "学校名称": dm_mc, "考点代码": kddm, "rows": rows, "size": listData.length });
            }
        }
        let ks_date = $("#ks_date").val();
        let ks_type = $("#ks_type").val();
        let tableInfo = "考试成绩单统计表 ";
        let tHead = '<table width=100% cellspacing=0 cellpadding=2 class=table><tr><td width=10% class=header>所属校区</td><td width=10% class=header>院系代码</td><td width=25% class=header>院系名称</td><td width=10% class=header>数量</td><td width=10% class=header>所在包号</td><td width=35% class=header>号段</td></tr>';
        let tFooter = '<br clear=all style=\'mso-special-character:line-break;page-break-before:always\'>';
        let html = [];
        tables.forEach(table => {
            html.push('<p class=title>' + ks_date + ' &nbsp;&nbsp;&nbsp; ' + ks_type + '  &nbsp;&nbsp;&nbsp; ' + tableInfo + ' &nbsp;&nbsp;&nbsp; 考点代码：'
                + table["考点代码"] + ' &nbsp;&nbsp;&nbsp; 学校名称：' + table["学校名称"] + '</p>');
            html.push(tHead);
            table.rows.forEach(row => {
                html.push('<tr><td>' + row[0] + '</td><td>' + row[1] + '</td><td>' + row[2] + '</td><td>' + row[3] + '</td><td>' + row[4] + '</td><td>' + row[5] + '</td></tr>');
            });
            html.push('</table>合计：' + table.size);
            html.push(tFooter);
        });
        let xxtjpath = okFilepath.replace(".ok.csv", ".学校统计.html");
        fs.writeFileSync(xxtjpath, templateHtml.replace("###content###", html.join("")));
        html = null;


        tds[1].innerText = "完成";
        html = "共" + lineCount + "记录，";
        okFilepath = okFilepath.replace(/[\\]/g, "\\\\");
        errFilepath = errFilepath.replace(/[\\]/g, "\\\\");
        xxtjpath = xxtjpath.replace(/[\\]/g, "\\\\");
        if (errCount == 0) {
            html += "数据<a href=\"javascript:openFile('" + okFilepath + "')\" title=\"点击查看输出的合格文件\">正确</a>，无异常数据"
        } else {
            html += "数据<a href=\"javascript:openFile('" + okFilepath + "')\" title=\"点击查看合格文件\">" + (lineCount - errCount) + "条正确</a><br/>" +
                "<a href=\"javascript:openFile('" + errFilepath + "')\" title=\"点击查看错误文件\" style=\"color:red\">" + errCount + "条错误</a>" +
                "&nbsp;<a href=\"javascript:openFile('" + xxtjpath + "')\" title=\"点击查看学校统计\">学校统计</a>";
        }
        tds[2].innerHTML = html;
        progressData.len--;
        if (progressData.len <= 0) {
            setProgressbar(100);
            $("#btnData").removeAttr("disabled", "disabled").removeClass("disabled");
            layer.close(layerLoadIdx);
            alert("所有数据已处理完成", "消息");
        }
    });
}

function doit(obj) {
    cleanCache();
    if (tableData.length == 0) {
        alert("还没有进行数据定义，请先设置数据");
        $(".nav-tabs li:last").find("a")[0].click();
        return;
    }
    if (g_data_changed != -1) {
        alert("设置被修改了，但并没有保存，请先你保存再继续！");
        $(".nav a")[g_data_changed].click();
        return;
    }
    var allCheckboxes = $("#fileData .filecbx:checked");
    if (allCheckboxes.length == 0) {
        alert("没有要处理的文件");
        return;
    }
    layerLoadIdx = layer.load(1);
    $(obj).attr("disabled", "disabled").addClass("disabled");
    // 能到这里，说明已经配置过数据了，保存当前标签序号，下次直接到这个界面
    defaultNavTab = 1;
    configuration.saveSettings("defaultNavTab", defaultNavTab);
    setTimeout(() => {
        setProgressbar(0, "");

        allCheckboxes.each((idx, input) => {
            var cIdx = parseInt(input.value);
            var file = allDataFiles[cIdx]
            if (file) {
                progressData.len++;
                progressData.size += file.size;
            }
        });
        allCheckboxes.each((idx, input) => {
            var cIdx = parseInt(input.value);
            var file = allDataFiles[cIdx]
            if (file) {
                analyticHandle(file, input);
            }
        });
        setTimeout(() => {
            if (progressData.len <= 0) {
                setProgressbar(100);
                $("#btnData").removeAttr("disabled", "disabled").removeClass("disabled");
                layer.close(layerLoadIdx);
                alert("所有数据已处理完成", "消息");
            }
        }, 1000 * 10);

    }, 500);
}

function doPatch() {
    let patchFile = $("#patchFile").val();
    if (patchFile == "") {
        alert("请先选择数据文件");
        return;
    }
    let lines = $("#patchTxt").val().trim().split(/[\n]/g);
    if (lines.length == 0) {
        alert("请按照补号格式输入补号内容");
        return;
    }
    var buffer = Buffer.from(fs.readFileSync(patchFile, { encoding: 'binary' }), 'binary');
    var patchFileTxt = iconv.decode(buffer, 'GBK').trim();//使用GBK解码
    let patchFileLines = patchFileTxt.split("\r\n");
    let okLines = [];
    let EMPTY;
    for (var i = 0; i < lines.length; i++) {
        let line = lines[i].trim();
        if (line.split("-") == 2) {
            let start = line.split("-")[0];
            let end = line.split("-")[1];
            okLines = okLines.concat(patchFileLines.filter(patchLine => {
                if (patchLine.trim().indexOf(",") == -1) {
                    return false;
                }
                var zsh = patchLine.split(",")[1].replace(/["']/g, "").trim();
                if (zsh == "0" && !EMPTY) {
                    EMPTY = patchLine;
                }
                return zsh != "" && start <= zsh && end >= zsh;
            }));
        } else if (line.split("+") == 3) {
            var arr = line.split("+");
            var startIdx;
            for (startIdx = 1; startIdx < patchFileLines.length; startIdx++) {
                var patchLine = patchFileLines[startIdx];
                if (patchLine.trim().indexOf(",") == -1) {
                    continue;
                }
                var zsh = patchLine.split(",")[1].replace(/["']/g, "").trim();
                if (zsh == "0" && !EMPTY) {
                    EMPTY = patchLine;
                }
                if (arr[0] == zsh) {
                    break;
                }
            }
            var count = parseInt(arr[2]);
            var add = parseInt(arr[1]);
            okLines.push(arr[0]);
            var okIdx = add + startIdx;
            for (var n = 1; n < count; n++) {
                okLines.push(patchFileLines[okIdx]);
                okIdx += add;
            }
        } else {
            var numArr = line.split(/[,，]/g);
            if (numArr.length > 0) {
                okLines = okLines.concat(patchFileLines.filter(patchLine => {
                    if (patchLine.trim().indexOf(",") == -1) {
                        return false;
                    }
                    var zsh = patchLine.split(",")[1].replace(/["']/g, "").trim();
                    if (zsh == "0" && !EMPTY) {
                        EMPTY = patchLine;
                    }
                    return zsh != "" && numArr.indexOf(zsh) != -1;
                }));
            }
        }
    }
    // okLines.unshift(patchFileLines[0]);
    var filepath = patchFile.split(".ok")[0] + ".patch" + (patchFile.split(".ok")[1] || "");
    fs.appendFileSync(filepath, iconv.encode(patchFileLines[0] + ("\r\n"), 'gbk'), "binary");
    if (!EMPTY) {
        let firstLine = okLines[0];
        let tmp = firstLine.split(",");
        EMPTY = "";
        let len = 2;
        if (chk_tlmk) {
            len = 3;
        }
        for (var i = 0; i < tmp.length - len; i++) {
            EMPTY += "0,";
        }
        if (tmp[tmp.length - len].indexOf(".") != -1) {
            EMPTY += "empty.jpg,";
        } else {
            EMPTY += "0,";
        }
        if (tmp[tmp.length - len - 1].indexOf(".") != -1) {
            EMPTY += "empty.jpg";
        } else {
            EMPTY += "0";
        }
        if (len == 3) {
            EMPTY += ",0";
        }
    }
    //打印矩阵数据，每4个一组
    let tmpArr = [[], [], [], []];
    let list = okLines;
    let size = Math.floor(list.length / tmpArr.length);
    let mod = list.length % tmpArr.length;
    let sizeArr = [size, size, size, size];
    for (let pakNo = 0; pakNo < mod; pakNo++) {
        sizeArr[pakNo] += 1;
    }
    let idx = 0;
    for (let pakNo = 0; pakNo < list.length; pakNo++) {
        let data = list[pakNo];
        tmpArr[idx].push(data);
        if (tmpArr[idx].length == sizeArr[idx]) {//到了最大值，开始装下一个数组
            idx = idx + 1;
        }
    }
    if (mod != 0) {
        for (let pakNo = mod; pakNo < 4; pakNo++) {
            tmpArr[pakNo].push(EMPTY);
        }
    }
    let maxSize = tmpArr[0].length;

    //输出到合格文件
    for (let k = 0; k < maxSize; k++) {
        var pageNo = k + 1;
        for (let pakNo = 0; pakNo < 4; pakNo++) {
            fs.appendFileSync(filepath, iconv.encode("\"" + pageNo + "\"," + tmpArr[pakNo][k].split(",").slice(1).join(",") + "\r\n", 'gbk'), "binary");
        }
    }
    alert("补打文件已经生成：" + filepath);
}

function getDateStr() {
    var now = new Date();
    var year = now.getFullYear();
    var month = now.getMonth() + 1;
    var date = now.getDate();
    var hour = now.getHours();
    var minute = now.getMinutes();
    var second = now.getSeconds();
    var datetimestr = "" + year + (month < 10 ? "0" + month : month) + (date < 10 ? "0" + date : date) + (hour < 10 ? "0" + hour : hour) + (minute < 10 ? "0" + minute : minute) + (second < 10 ? "0" + second : second);
    return datetimestr;
}

function autoID() {
    document.getElementById("fileBtn").click();
}

function chooseFile() {
    g_data_changed = 2;
    var filepath = document.getElementById("fileBtn").files[0].path;
    var msg = "";
    if (!filepath) {
        msg = "请选择文件";
    } else if (filepath == "" || !fs.existsSync(filepath)) {
        msg = filepath + " 无效路径";
    } else {
        var statsObj = fs.statSync(filepath)
        if (!statsObj.isFile()) {
            msg = filepath + " 不是有效文件";
        }
    }
    if (msg != "") {
        alert("<span style=\"color:red;font-weight:bold\">" + msg + "</span>");
    } else {
        fs.readFile(filepath, 'utf-8', function (err, data) {
            if (err) {
                alert("<span style=\"color:red;font-weight:bold\">" + JSON.stringify(err) + "</span>");
            } else {
                var index = data.indexOf('\n');
                if (index != -1) {
                    data = data.substring(0, index);
                }
                data = data.split(/[\r\n]/g)[0];
                var columns = data.split(/,/);
                if (columns.length == 1) {
                    columns = data.split(/[\t]/g);
                }
                tableData = [];
                columns.forEach(column => {
                    var c = column.replace(/["']/g, "").trim();
                    var size = (tableData.length + 1);
                    tableData.push({ "说明": "字段" + size, "内容": c.toUpperCase(), "启用": false, "排序号": size, "照片": false, "二维码": false })
                });
                setTableData();
            }
        })
    }
}

function picChange() {
    var value = $("input:radio[name=chk_pic]:checked").val();
    console.log("picChange 当前值" + value);
    if (value != "") {
        value = parseInt(value);
        if (value != -1) {
            for (var i = 0; i < tableData.length; i++) {
                if (i == value) {
                    tableData[value]['照片'] = this.checke;
                } else {
                    tableData[value]['照片'] = !this.checke;
                }
            }
            if (!defaultTableData[value]) {
                g_data_changed = 2;
            } else if (tableData[value]['照片'] != defaultTableData[value]['照片']) {
                g_data_changed = 2;
            }
        } else {
            for (var i = 0; i < tableData.length; i++) {
                tableData[i]['照片'] = false;
            }
        }
    }
}


function qrcodeChange() {
    var value = $("input:radio[name=chk_qrcode]:checked").val();
    console.log("qrcodeChange 当前值" + value);
    if (value != "") {
        value = parseInt(value);
        if (value != -1) {
            for (var i = 0; i < tableData.length; i++) {
                if (i == value) {
                    tableData[value]['二维码'] = this.checke;
                } else {
                    tableData[value]['二维码'] = !this.checke;
                }
            }
            if (!defaultTableData[value]) {
                g_data_changed = 2;
            } else if (tableData[value]['二维码'] != defaultTableData[value]['二维码']) {
                g_data_changed = 2;
            }
        } else {
            for (var i = 0; i < tableData.length; i++) {
                tableData[i]['二维码'] = false;
            }
        }
    }
}

function setTableData() {
    var html = [];
    var hasPic = false, hasQrcode = false;
    tableData.forEach((item, idx) => {

        html.push('<tr id="' + idx + '">');
        html.push('<td>' + item["内容"] + '</td>');
        html.push('<td><input type="text" value="' + item["说明"] + '" onchange="tableData[' + idx + '][\'说明\']=this.value;g_data_changed=2;" maxlength=15 />');
        html.push('<input type="radio" name="chk_pic" id="chk_pic_' + idx + '" value="' + idx + '" ' + (!hasPic && item["照片"] ? " checked " : "") + ' onchange="picChange();"/><label for="chk_pic_' + idx + '">照片</label>');
        html.push('<input type="radio" name="chk_qrcode" id="chk_qrcode_' + idx + '" value="' + idx + '" ' + (!hasQrcode && item["二维码"] ? " checked " : "") + ' onchange="qrcodeChange()"/><label for="chk_qrcode_' + idx + '">二维码</label>');
        // html.push('<input type="checkbox" id="judge_' + idx + '" value="' + idx + '" ' + (item["判定"] ? " checked " : "") + ' /><label for="judge_' + idx + '">判定</label>');
        html.push('</td><td><input type="checkbox" id="chk_' + idx + '" ' + (item["启用"] ? " checked " : "") + ' onchange="tableData[' + idx + '][\'启用\']=this.checked;g_data_changed=2;"/><label for="chk_' + idx + '">启用</label></td>');
        html.push('<td><input type="number" style="width:50px" value="' + item["排序号"] + '" onchange="tableData[' + idx + '][\'排序号\']=parseInt(this.value);g_data_changed=2;"/> </td>');
        html.push('</tr>');
        if (!hasPic && item["照片"]) {
            hasPic = true;
        }
        if (!hasQrcode && item["二维码"]) {
            hasQrcode = true;
        }
    });
    if (!hasPic) {
        $("#chk_pic_no").next()[0].click();
    }
    if (!hasQrcode) {
        $("#chk_qrcode_no").next()[0].click();
    }
    $("#tableData").html(html.join(""));
}

function splitFile() {
    $("#splitFileBtn").addClass("disabled").attr("disabled", "disabled");
    $("#splitFilesSelect").click();
}

function doSplitFile() {
    var files = document.querySelector("#splitFilesSelect").files;
    if (files.length > 0) {
        layerLoadIdx = layer.load(1);
        var msg = [];
        for (var j = 0; j < files.length; j++) {
            var file = files[j];
            var fullpath = file.path;
            var extName = path.extname(fullpath);
            var fullpath_0 = fullpath.replace(extName, "");
            var content = fs.readFileSync(fullpath, "utf8").toString();
            var lines = content.split("\n");
            var headLine = lines[0].trim();
            var sfLines = {};
            for (var i = 1; i < lines.length; i++) {
                var line = lines[i].trim();
                if (line.length == "") {
                    continue;
                }
                var fields = line.split(",");
                if (fields.length < 2) {
                    console.info("无效行--->行号：" + i + ",内容：" + line);
                    continue;
                }
                var sf = fields[2].replace("\"", "").substring(0, 2);
                var arr = sfLines[sf];
                if (!arr) {
                    arr = [headLine]
                    sfLines[sf] = arr;
                }
                arr.push(line);
            }
            for (var sf in sfLines) {
                var filepath_ = fullpath_0 + "_" + sf + extName;
                msg.push("创建文件 " + path.basename(filepath_));
                fs.writeFileSync(filepath_, sfLines[sf].join("\r\n"));
            }
        };
        layer.close(layerLoadIdx);
        alert(msg.join("<br/>"), "分隔文件处理完成");
        $("#btnFindFile").click();
    }
    $("#splitFileBtn").removeClass("disabled").removeAttr("disabled");
}

module.exports = {
    save, loadDefaultConfig, setFolder, restore, nextStep, alert, timeClose, selectAll, findFile, doit, autoID, chooseFile
}