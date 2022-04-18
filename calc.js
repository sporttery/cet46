let config={
    "计算题数量":100,
    "多少以内的数":20,
    "几次":2
};
function getNum(){
return Math.floor(Math.random()*config.多少以内的数);
}
let flags = ['+','-'];//允许的算术符号
let numberCount = [1,2,1,2,1,2,1,2];//可能算术包括数的个数 
let allData = []
for(var c=0;c<config.几次;c++){
    for(var i=0;i<config.计算题数量;i++){
        while(true){
            var fNum = getNum();
            if(fNum ==0){
                continue;
            }
            var str = [fNum];
            var nnnnc=Math.floor(Math.random()*10000)%2;
            var nc = numberCount[nnnnc+1];
            // console.log(nnnnc,nc)
            for(var j=0;j<nc;){
                var nFlag=flags[Math.floor(Math.random()*10000)%flags.length];
                var nextNum = getNum();
                if(nextNum==0){
                    continue;
                }
                var rs = eval(str[str.length-1]+" "+nFlag +" "+ nextNum);
                if(rs <0 || rs > config.多少以内的数){
                    continue;
                }
                str.push(nFlag)
                str.push(nextNum)
                j++;
            }
            str = str.join("")

            result = eval(str)            
            if(result>0 && result <= config.多少以内的数){
                allData.push(str+" =");
                break;
            }
        }
    }
}

var access = require("fs").createWriteStream('C:\\Users\\hongbo-zw\\Desktop\\'+config.多少以内的数+'以内加减法.txt');
process.stdout.write = process.stderr.write = access.write.bind(access);
if(config.计算题数量 == 20){

    for(var i=0;i<allData.length;i++){ 
        
        while(allData[i].length<19){
            allData[i]+=" ";
        }
        process.stdout.write(allData[i]);
        if(i < allData.length-1){
            var count = i+1;
            if(count%80==0){
                process.stdout.write("\n")
            }else if(count%20 == 0 ){
                process.stdout.write("\n\n\n\n")
                
            }else if(count%4==0 ){
                process.stdout.write("\n\n")
            }
        }
        // console.log(allData.slice(i,i+5).join("\t"));
    }
}else if(config.计算题数量 == 100){
    for(var i=0;i<allData.length;i++){ 
        
        while(allData[i].length<14){
            allData[i]+=" ";
        }
        var count = i+1;
        if(count%100==1){
            process.stdout.write("\n\n  年级__________ 姓名__________ 时间_________ 分数_______\n\n\n")
        }
        process.stdout.write(allData[i]);
        if(i < allData.length-1){
             if(count%100 == 0){
                process.stdout.write("\n\n")
            }else 
            if(count%5==0 ){
                process.stdout.write("\n\n")
            }
        }
        // console.log(allData.slice(i,i+5).join("\t"));
    }
}