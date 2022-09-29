const fs = require("fs");
const path = require("path");
const iconv = require('iconv-lite');
dir="D:\\soft\\WeChat Files\\booyean\\FileStorage\\File\\2022-04\\包签\\"

const nnFile = path.join(dir, "重复编号.txt");
fs.existsSync(nnFile) && fs.unlinkSync(nnFile);
let files = fs.readdirSync(dir);
let nnFiles=[] ;
let nndata = {};
let nnContents = {};
for(var idx in files){
    let fPath = path.join(dir, files[idx]);
    if(!fPath.endsWith(".pak.txt")){
        continue;
    }
    var buffer = Buffer.from(fs.readFileSync(fPath, { encoding: 'binary' }), 'binary');
    var patchFileTxt = iconv.decode(buffer, 'GBK').trim();//使用GBK解码
    let patchFileLines = patchFileTxt.split("\r\n");
    nndata[fPath]=[];
    // console.info(files[idx] );
    
    for(var lineIdx = 0; lineIdx < patchFileLines.length;lineIdx++){
        var line = patchFileLines[lineIdx];
        var parts = line.split(",");
        if(parts.length==11){
            var code = parts[0];
            if(nndata[fPath].includes(code)){
                if(!nnContents[fPath]){
                    nnContents[fPath] = patchFileLines;
                }
                var str = files[idx] + "第"+(lineIdx+1)+"行重复编号 "+code;
                console.info(str );                
                // fs.appendFileSync(nnFile, iconv.encode(str+"\n", 'gbk'), "binary");
                nnFiles.push({fPath,code,lineIdx});
            }else{
                nndata[fPath].push(code);
            }
        }
        // console.info(line.split(",").length)
    }
    // console.info(files[idx] , patchFileLines.length);
}

for(var idx = 0;idx < nnFiles.length;idx++){
    var fPath = nnFiles[idx].fPath;    
    var lineIdx = nnFiles[idx].lineIdx;    
    let patchFileLines = nnContents[fPath] ;
    var line = patchFileLines[lineIdx];
    var parts = line.split(",");
    parts[0] = parts[6];
    patchFileLines[lineIdx] = parts.join(",");
}
for(var fPath in nnContents){
    let patchFileLines = nnContents[fPath] ;
    fs.writeFileSync(fPath+"-new.txt", iconv.encode(patchFileLines.join("\r\n"), 'gbk'), "binary");
}