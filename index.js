
const fs = require("fs");
const path = require("path")
const readline = require('readline');
const iconv = require('iconv-lite');
const exec = require("child_process").exec;
const { shell } = require('electron');

var configuration = require('./configuration');
var folderArr = [];
var folderEleArr = [];
var folderArrIdx = 0;
var defaultFolderArr = [];
var defaultTableData = [];
var tableData = [];
var alert_like;
var defaultNavTab = 0;
var g_data_changed = -1;
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
            //如果照片目录变了，清除缓存
            if (defaultTableData[1] != folderArr[1]) {
                delete allPicFiles;
            }
            //如果二维码目录变了，清除二维码缓存
            if (defaultTableData[2] != folderArr[2]) {
                delete allQrcodeFiles;
            }
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
            delete enabledColumn;//清除缓存
            configuration.saveSettings("tableData", JSON.stringify(tableData))
            defaultTableData = [].concat(tableData);
            if (checkFolder(true)) { //如果目录设置已经Ok，开启查找文件功能
                $("#btnFindFile").removeAttr("disabled").removeClass("disabled");
            }
            alert("数据已经保存");
            g_data_changed = -1;
        }
    }
}
function loadDefaultConfig() {
    var folderArr = configuration.readSettings("folderArr");
    if (folderArr) {
        defaultFolderArr = JSON.parse(folderArr);
    }
    var tableData = configuration.readSettings("tableData");
    if (tableData) {
        defaultTableData = JSON.parse(tableData);
    }
    defaultNavTab = configuration.readSettings("defaultNavTab") || 0;
}

function selectAll(obj, id) {
    $("#" + id + " input:checkbox").each((idx, chk) => {
        chk.checked = obj.checked
        $(chk).change();
    })
}

function getFiles(sourceDir, includeSubFolder, filetypes) {
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
                var extname = path.extname(fPath)
                if (typeof filetypes == "string") {
                    if (filetypes === "*" || extname == filetypes) {
                        allfiles.push({ filepath: fPath, size: stat.size });
                    }
                } else if (typeof filetypes == "object" && filetypes.includes && filetypes.includes(extname)) {
                    allfiles.push({ filepath: fPath, size: stat.size });
                };
            }
        });
    }
    findFiles(sourceDir, includeSubFolder, filetypes);
    return allfiles;
}

function openFile(idx) {
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
            alert("没有找到数据文件，当前只查找后缀\"" + filetype + "\"的文件，切换成\"所有文件\"试试");
        } else {
            alert("没有找到数据文件，请确认源数据目录是否正确");
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

var imgExtArr = [".jpg", ".JPG", ".jpeg", ".JPEG", ".png", ".PNG", ".gif", ".GIF", ".bmp", ".BMP"];
//所有照片文件，所有二维码文件，估计会有点大
//找个机会缓存起来，方便后面的取值判断
var allPicFiles, allQrcodeFiles;
//空数据
var EMPTY, EMPTYOBJ;
//照片字段的下标 二维码字段的下标 允许输出的列下标
var picIndex = -1, qrcodeIndex = -1, enabledColumn;
//记录进度
var progressData = { len: 0, size: 0, currSize: 0, lastProgress: 0 };
function analyticHandle(file, inputEl) {
    var totalSize = file.size;

    var tds = $(inputEl).parent().siblings();
    //单个文件里所有的数据， 数据内容：{学院1:[],学院2:[]}
    var allDataInFile = {};
    //单个文件里所有合格的数据生成的串，可以直接输出到ok.txt文件里
    var allOkStrInFile = {};
    var readObj = readline.createInterface({
        input: fs.createReadStream(file.filepath)
    });
    var filename = path.basename(file.filepath);
    var ext = path.extname(file.filepath);
    var okFilepath = path.join(folderArr[3], ext == "" ? filename + ".ok.txt" : filename.replace(ext, ".ok.txt"));
    var errFilepath = path.join(folderArr[4], path.basename(okFilepath).replace(".ok.txt", ".err.txt"));
    if (fs.existsSync(okFilepath)) {
        fs.unlinkSync(okFilepath);
    }
    if (fs.existsSync(errFilepath)) {
        fs.unlinkSync(errFilepath);
    }
    var sumlen = 0;
    var lineCount = 0;
    var lastProgress = "";
    var errCount = 0;
    if (!enabledColumn) {
        enabledColumn = {};
        EMPTY = "";
        EMPTYOBJ = {};
        for (var i = 0; i < tableData.length; i++) {
            var config = tableData[i];
            if (config["启用"]) {
                if (config["照片"]) {
                    picIndex = i;
                }
                if (config["二维码"]) {
                    qrcodeIndex = i;
                }
                enabledColumn["_" + i] = parseInt(config["排序号"]);
                EMPTY += "0,";
                EMPTYOBJ[config["内容"]] = "0";
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

    // 一行一行地读取文件
    readObj.on('line', function (line) {
        if (errCount == -1) {
            return;
        }
        var lineLen = getByteLen(line) + 2;
        sumlen += lineLen;
        progressData.currSize += lineLen;
        line = line.replace(/["'\s]/g, "");
        if (line.length > 0 && line[0] != 'k') {
            lineCount++;
            var currProgress = Math.floor((sumlen * 100 / totalSize));
            if (lastProgress != currProgress) {
                if(currProgress > 90){
                    tds[1].innerText = "统计中";
                }else{
                    tds[1].innerText = "[" + currProgress + "%]";
                }
                lastProgress = currProgress;
            }
            var progress = Math.floor((progressData.currSize * 100 / progressData.size));
            if (progress != progressData.lastProgress) {
                setProgressbar(progress);
                progressData.lastProgress = progress;
            }
            var columns = line.split(/,/);
            if (columns.length == 1) {
                columns = line.split(/[\t]/g);
            }
            if (columns.length != tableData.length) {
                alert("文件" + file.filepath + " 第" + lineCount + "行 数据缺失，与定义字段的个数不一致！");
                /*, "数据错误", function () {
                    readObj.resume();
                }, function () {
                    readObj.close();
                });
                readObj.pause();*/
                errCount = -1;
                readObj.close();
                return false;
            }
            var outputData = [];
            let hasErrPic = false, hasErrQrcode = false;
            let picFilepath = false, qrcodeFilepath = false;
            let currData = {};
            for (var i = 0; i < columns.length; i++) {
                var sortNum = enabledColumn["_" + i];
                if (sortNum) {
                    currData[tableData[i]["内容"]] = columns[i];
                    outputData[sortNum] = columns[i];
                }
            }
            if (picIndex != -1) {
                // if(!allPicFiles){
                //     allPicFiles={};
                //     var tmp = getFiles(folderArr[1],true,imgExtArr);
                //     tmp.forEach(file=>{
                //         var filename = path.basename(file.filepath);
                //         var extname = path.extname(filename);
                //         var basename = filename.replace(extname,"");
                //         allPicFiles[basename]=filename;
                //     });
                // }
                // picFilepath =allPicFiles[ columns[picIndex]];
                if (fs.existsSync(path.join(folderArr[1], columns[picIndex] + ".jpg"))) {
                    picFilepath = columns[picIndex] + ".jpg";
                }
                if (!picFilepath) {
                    hasErrPic = true;
                } else {
                    outputData[tableData.length + 1] = picFilepath;
                    currData["照片"] = picFilepath;
                }
            }

            if (qrcodeIndex != -1) {
                // if(!allQrcodeFiles){
                //     allQrcodeFiles={};
                //     var tmp = getFiles(folderArr[2],true,imgExtArr);
                //     tmp.forEach(file=>{
                //         var filename = path.basename(file.filepath);
                //         var extname = path.extname(filename);
                //         var basename = filename.replace(extname,"");
                //         allQrcodeFiles[basename]=filename;
                //     });
                // }
                // qrcodeFilepath =allQrcodeFiles[ columns[qrcodeIndex]];
                if (fs.existsSync(path.join(folderArr[2], columns[qrcodeIndex] + ".jpg"))) {
                    qrcodeFilepath = columns[qrcodeIndex] + ".jpg";
                }
                if (!qrcodeFilepath) {
                    hasErrQrcode = true;
                } else {
                    outputData[tableData.length + 2] = qrcodeFilepath;
                    currData["二维码"] = qrcodeFilepath;
                }
            }

            var errMsg = "";
            if (hasErrPic) {
                errMsg = " #####照片[" + path.join(folderArr[1], columns[picIndex] + ".jpg") + "]不存在 ";
            }
            if (hasErrQrcode) {
                errMsg += " #####二维码[" + path.join(folderArr[2], columns[qrcodeIndex] + ".jpg") + "]不存在";
            }
            var finalData = [];
            for (var i = 0; i < outputData.length; i++) {
                if (outputData[i]) {
                    finalData.push(outputData[i]);
                }
            }
            if (errMsg != "") {
                errCount++;
                finalData.push(errMsg);
                fs.appendFileSync(errFilepath, finalData.join("\t") + "\r\n")
            } else {
                //ks_ssxx 学校代码
                //dm_mc 学校名称
                if (!allOkStrInFile[currData["ks_ssxx"]]) {
                    allOkStrInFile[currData["ks_ssxx"]] = [];
                }
                allOkStrInFile[currData["ks_ssxx"]].push(finalData.join(","));
            }
            if (!allDataInFile[currData["ks_ssxx"]]) {
                allDataInFile[currData["ks_ssxx"]] = [];
            }
            allDataInFile[currData["ks_ssxx"]].push(currData);
        }
    });
    // 读取完成后
    readObj.on('close', function (e) {
        if (errCount == -1) {
            return;
        }
        //同步
        var pakFilepath = okFilepath.replace(".ok.txt", ".pak.txt");
        if (fs.existsSync(pakFilepath)) {
            fs.unlinkSync(pakFilepath);
        }
        
        console.log(okFilepath + " saving...");
        // wait(0.2);

        //输出统计表格
        var tables = [];
        for (var key in allOkStrInFile) {
            //打印矩阵数据，每4个一组
            var tmpArr = [[], [], [], []];
            var list = allOkStrInFile[key];
            var size = Math.floor(list.length / 4);
            var mod = list.length % 4;
            var sizeArr = [size, size, size, size];
            for (var pakNo = 0; pakNo < mod; pakNo++) {
                sizeArr[pakNo] += 1;
            }
            var idx = 0;
            for (var pakNo = 0; pakNo < list.length; pakNo++) {
                var data = list[pakNo];
                tmpArr[idx].push(data);
                if (tmpArr[idx].length == sizeArr[idx]) {//到了最大值，开始装下一个数组
                    idx = idx + 1;
                }
            }
            if (mod != 0) {
                for (var pakNo = mod; pakNo < 4; pakNo++) {
                    tmpArr[pakNo].push(EMPTY);
                }
            }
            var maxSize = tmpArr[0].length;

            //输出到合格文件
            for (var k = 0; k < maxSize; k++) {
                for (var pakNo = 0; pakNo < 4; pakNo++) {
                    fs.appendFileSync(okFilepath, iconv.encode(tmpArr[pakNo][k] + "\r\n", 'gbk'), "binary");
                }
            }
        }
        for (var key in allDataInFile) {
            var listData = allDataInFile[key];
            var currData = listData[0];
            var bmxq = currData["ks_bmxq"];//校区代码
            var yyjb = currData["ks_yyjb"];//语言级别
            var dm_mc = currData["dm_mc"];//学校名称

            // 【生成的文件 *.pak.txt 字段】
            // no    num  ks_ssxx ks_bmxq ks_yyjb count ks_zsh ks_zsh dm_mc
            // 条码,包号,学校代码,校区代码,语言级别,证书数量,起始证书编号,终止证书编号,学校名称
            //每包500个

            var pakSize = Math.floor(listData.length / 500);
            var pakSizeMod = listData.length % 500;
            var orderNum = parseInt(key) * 1000;

            var pakInfoArr = [];
            for (var pakNo = 1; pakNo <= pakSize; pakNo++) {
                var row = [];
                row.push(orderNum + pakNo);
                row.push(pakNo);
                row.push(key);
                row.push(bmxq);
                row.push(yyjb);
                row.push(500);
                var firstNum = parseInt(listData[(pakNo - 1) * 500]["ks_zsh"]);//当前组的第一个
                var lastNum = parseInt(listData[pakNo * 500 - 1]["ks_zsh"]);//当前组的最后一个
                row.push(firstNum);
                row.push(lastNum);
                row.push(dm_mc);
                pakInfoArr.push({ pakNum: pakNo, firstNum, lastNum });
                fs.appendFileSync(pakFilepath, iconv.encode(row.join(",") + ("\r\n"), 'gbk'), "binary");
            }
            if (pakSizeMod > 0) {
                var row = [];
                row.push(orderNum + pakSize + 1);
                row.push(pakSize + 1);
                row.push(key);
                row.push(bmxq);
                row.push(yyjb);
                row.push(pakSizeMod);
                var firstNum = parseInt(listData[pakSize * 500]["ks_zsh"]);//当前组的第一个
                var lastNum = parseInt(listData[listData.length - 1]["ks_zsh"]);//当前组的最后一个
                row.push(firstNum);//当前组的第一个
                row.push(lastNum);//当前组的最后一个
                row.push(dm_mc);
                pakInfoArr.push({ pakNum: pakSize + 1, firstNum, lastNum });
                fs.appendFileSync(pakFilepath, iconv.encode(row.join(",") + ("\r\n"), 'gbk'), "binary");
            }


            //按院系名称[ks_xy_dm]校区代码[ks_bmxq]分组
            var yxGroup = {};
            listData.forEach(currData => {
                var nkey = currData["ks_xy_dm"] + "-" + (currData["ks_bmxq"] == "" ? "0" : currData["ks_bmxq"]);
                if (!yxGroup[nkey]) {
                    yxGroup[nkey] = [];
                }
                yxGroup[nkey].push(currData);
            });
            var rows = [];
            for (var dm in yxGroup) {
                var xy_dm = dm.split("-")[0];
                bmxq = dm.split("-")[1];
                var yxList = yxGroup[dm];
                row = [];
                row.push(bmxq);
                row.push(xy_dm);
                row.push(dm_mc);
                row.push(yxList.length);
                var firstNum = parseInt(yxList[0]["ks_zsh"]);
                var lastNum = parseInt(yxList[yxList.length - 1]["ks_zsh"]);
                var pakNos = [];
                // yxList.forEach(currData=>{
                //     var zsh =  currData["ks_zsh"];
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
            tables.push({ "学校名称": dm_mc, "学校代码": key, "rows": rows, "size": listData.length });
        }
        var ks_date = $("#ks_date").val();
        var ks_type = $("#ks_type").val();
        var tableInfo = "考试成绩单统计表 ";
        var tHead = '<table width=100% cellspacing=0 cellpadding=2 class=table><tr><td width=10% class=header>所属校区</td><td width=10% class=header>院系代码</td><td width=25% class=header>院系名称</td><td width=10% class=header>数量</td><td width=10% class=header>所在包号</td><td width=35% class=header>号段</td></tr>';
        var tFooter = '<br clear=all style=\'mso-special-character:line-break;page-break-before:always\'>';
        var html = [];
        tables.forEach(table => {
            html.push('<p class=title>' + ks_date + ' &nbsp;&nbsp;&nbsp; ' + ks_type + '  &nbsp;&nbsp;&nbsp; ' + tableInfo + ' &nbsp;&nbsp;&nbsp; 学校代码：'
                + table["学校代码"] + ' &nbsp;&nbsp;&nbsp; 学校名称：' + table["学校名称"] + '</p>');
            html.push(tHead);
            table.rows.forEach(row => {
                html.push('<tr><td>' + row[0] + '</td><td>' + row[1] + '</td><td>' + row[2] + '</td><td>' + row[3] + '</td><td>' + row[4] + '</td><td>' + row[5] + '</td></tr>');
            });
            html.push('</table>合计：' + table.size);
            html.push(tFooter);
        });
        var xxtjpath = okFilepath.replace(".ok.txt", ".学校统计.html");
        fs.writeFileSync(xxtjpath, templateHtml.replace("###content###", html.join("")));
        html = null;


        tds[1].innerText = "完成";
        var html = "共" + lineCount + "记录，";
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
var layerLoadIdx;
function doit(obj) {
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
        progressData = { len: 0, size: 0, currSize: 0, lastProgress: 0 };
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

    }, 500);
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
                    tableData.push({ "说明": "字段" + size, "内容": c, "启用": false, "排序号": size, "照片": false, "二维码": false })
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
            if (tableData[value]['照片'] != defaultTableData[value]['照片']) {
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
            if (tableData[value]['二维码'] != defaultTableData[value]['二维码']) {
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

module.exports = {
    save, loadDefaultConfig, setFolder, restore, nextStep, alert, timeClose, selectAll, findFile, doit, autoID, chooseFile
}