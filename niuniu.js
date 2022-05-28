const db = require("./dbHelper")
const trade_type = ["未知", "上分", "下分", "下注", "中奖", "赔付"];
const tradeStatus = { "未处理": 0, "成功": 1, "驳回": 2 };
function shangfen() {
    var username = $("#shangfen input[name=username]").val()
    var userId = parseInt($("#shangfen input[name=userid]").val())
    var id = parseInt($("#shangfen input[name=id]").val())
    var where =[];
    var val = [];
    if(username.trim()!=""){
        val.push(username);
        where .push("u.username=?");
    }
    if(userId){
        val.push(userId);
        where .push("u.user_id=?");
    }
    if(id){
        val.push(id);
        where .push("u.id=?");
    }
    
    const shangfenSql = `select ub.id,ub.user_id,u.username,ub.amount,ub.trade_type,u.balance,ub.chat_id,ub.msg_id from t_user_bill ub 
    inner join t_user u on ub.user_id = u.user_id where ${where.join("and ")} ub.trade_type in (1,2) 
    and ub.status = 0 and u.user_id is not null order by ub.id desc`;
    db.query(shangfenSql,val).then(rows => {
        var html = [];
        if(rows.length>0){
            rows.forEach((info,index) => {
                html.push('<tr>');
                html.push(`<td>${index+1}</td><td>${info.user_id}<br>${info.username}</td>`);
                html.push(`<td>${info.balance}</td><td>${trade_type[info.trade_type]}</td><td>${info.amount}</td>`);
                html.push(`<td><a onclick="process(${index},1)" href="javascript:void(0);" class="btn btn-link">处理</a> `);
                html.push(`<a onclick="process(${index},2)" href="javascript:void(0);"  class="btn btn-link">驳回</a></<td>`);
                html.push('</tr>');
            })
            $("#fileData").attr("data",JSON.stringify(rows)).html(html.join(""));
        }else{
            $("#fileData").attr("data","").html(`<tr>
            <td colspan="6" style="text-align: center;">暂无数据</td>
        </tr>`);
        }
    })
}
// function selectAll(checked) {
//     $(".cbk").each((idx, cbk) => {
//         cbk.checked = checked;
//     });
// }
function process(ndx, type) {
    var rows =  JSON.parse($("#fileData").attr("data"))
    var info = rows[ndx];
    if(type == 1){
        layer.open({
            id: 1,
            type: 1,
            title: '请确认操作',
            style: 'width:80%;height:auto;',
            content: "<div>" + trade_type[info.trade_type] + "金额:<input type='text' id='sureamount' value='" + info.amount + "'/><br/></div>",
            btn: ['确定' + trade_type[info.trade_type], '取消'],
            btn1: function (index, layero) {
                amount = parseInt(document.querySelector("#sureamount").value);
                $("#sureamount").remove();
                if (isNaN(amount) || amount < 0) {
                    layer.alert("金额不符合，请输入大于0的正整数");
                    return;
                }
                var remain_amount = info.balance + info.amount ;
                if(info.trade_type==2){
                    remain_amount = info.balance  - info.amount ;
                    if(remain_amount < 0){
                        layer.alert("余额小于0，不能执行");
                        return;
                    }
                }
                var sqlparamsEntities = [];
                sqlparamsEntities.push({
                    sql: "UPDATE t_user_bill SET STATUS = ?, opt_user_id =?, trade_amount = ? WHERE id = ?;",
                    params: [tradeStatus.成功, '0', info.amount, info.id]
                });
                sqlparamsEntities.push({
                    sql: "INSERT INTO t_user_trade ( user_id, amount, remain_amount, trade_type, union_id ,bot_id) values (?,?,?,?,?,?) ",
                    params: [info.user_id, info.amount, remain_amount, info.trade_type, info.id, 0]
                });
                sqlparamsEntities.push({
                    sql: "UPDATE t_user u 	SET u.balance = ? 	WHERE 	u.user_id = ? ",
                    params: [remain_amount, info.user_id]
                });
    
                db.execTrans(sqlparamsEntities, function (err, ninfo) {
                    if (err) {
                        console.error("事务执行失败", err,ninfo);
                        layer.alert("操作失败，请与技术人员联系");
                    } else {
                        console.info(ninfo);
                        layer.alert(trade_type[info.trade_type]+"完成 用户：" + info.username + " , 原分值为：" + info.balance + " , " + trade_type[info.trade_type] + ": " + amount + " ,当前分为：" + remain_amount);
                        // console.log("done.");
                        // ctx.deleteMessage();
                        // var sxftxt = trade_type == tradeType.上分 ? "上分" : "下分";
                        // ctx.reply(sxftxt + "完成 用户：" + username + " , 原分值为：" + balance + " , " + sxftxt + ": " + amount + " ,当前分为：" + remain_amount);
                        // gotosf(ctx);
                        // if (chat_id && msg_id) {
                        //     sf_bot.telegram.sendMessage(chat_id, `成功${sxftxt} ${amount},当前余额：${remain_amount}`, { reply_to_message_id: msg_id });
                        // }
                        shangfen();
                    }
                })
                layer.close(index)
            },
            btn2: function (index, layero) {
                $("#sureamount").remove();
                layer.close(index);
            }
        });
    }else{
        layer.prompt({
            formType: 2,
            title: '请输入驳回理由',
            value: '1-512个字符',
            area:['500px','300px'],
        }, function (value, index, elem) {
            if (value.length == 0 || value.length > 512 || value == '1-512个字符') {
                layer.close(index);
                setTimeout(() => {
                    layer.alert("驳回理由不符合要求");
                }, 200);
                return;
            }
            db.query("UPDATE t_user_bill SET STATUS = ?, opt_user_id =?, trade_amount = ?,status_text=? WHERE id = ?",
             [tradeStatus.驳回, 0, info.amount, value, info.id]).then(res=>{
                 console.info(res);
                 if(res.affectedRows > 0){
                     layer.alert("成功驳回");
                 }else{
                    layer.alert("成功失败");
                 }
                 shangfen();
             });            
        });
    }
}



const user_type = {"1": "正常" ,"0": "测试"}
const yesOrNo = {"0": "否" ,"1": "是"}
function changeme(obj){
    var value= obj.value;
    var type = value.replace(/\d/g,"");
    var id = value.replace(/\D/g,"");
    db.query(`update t_user set can_${type}=${obj.checked?1:0} where id=${id}`).then(res=>{
        if(res.affectedRows!=1){
            layer.alert("修改状态失败");
        }else{
            layer.tips("修改成功",obj,{tips:1});
        }
    });
}
function userlist(){
    var username = $("#userlist input[name=username]").val()
    var userId = parseInt($("#userlist input[name=userid]").val())
    var where = [];
    var val = [];
    if(username.trim()!=""){
        val.push(username);
        where.push("username=?");
    }
    if(userId){
        val.push(userId);
        where.push("user_id=?");
    }
    
    
    var sql = `select id,user_id,username,balance,can_bet,can_msg,can_img,can_video,can_link,can_audio,can_file,is_live,user_type,\
    date_format(insert_time,'%Y-%m-%d %H:%i:%s') insert_time,date_format(update_time,'%Y-%m-%d %H:%i:%s') update_time from t_user
     ${where.length > 0 ? " where "+where.join(" and "):""} order by id desc`;
    db.query(sql,val).then(rows=>{
        var html=[];
        if(rows.length>0){
            rows.forEach((info,index)=>{
                html.push(`<tr id='${info.id}'>`);
                html.push(`<td>${index+1}</td><td>${info.user_id}<br>${info.username.replace("undefined","")}</td>`);
                html.push(`<td>${info.balance}</td><td>${user_type[info.user_type]}</td><td>${yesOrNo[info.is_live]}</td>`);
                html.push(`<td>${info.insert_time}<br>${!info.update_time?'--':info.update_time}</td>`);
                html.push(`<td><input type=checkbox value="img${info.id}" onchange="changeme(this)" ${info.can_img==1?"checked":""} id="img${info.id}"><label for="img${info.id}">图片</label>`);
                html.push(` <input type=checkbox  value="msg${info.id}" onchange="changeme(this)" ${info.can_msg==1?"checked":""} id="msg${info.id}"><label for="msg${info.id}">文字</label> `);
                html.push(`<input type=checkbox  value="video${info.id}" onchange="changeme(this)" ${info.can_video==1?"checked":""} id="video${info.id}"><label for="video${info.id}">视频</label><br> `);
                html.push(`<input type=checkbox  value="link${info.id}" onchange="changeme(this)" ${info.can_link==1?"checked":""} id="link${info.id}"><label for="link${info.id}">网址</label> `);
                html.push(`<input type=checkbox  value="audio${info.id}"onchange="changeme(this)"  ${info.can_audio==1?"checked":""} id="audio${info.id}"><label for="audio${info.id}">音频</label> `);
                html.push(`<input type=checkbox  value="file${info.id}" onchange="changeme(this)" ${info.can_file==1?"checked":""} id="file${info.id}"><label for="file${info.id}">文件</label><br> `);
                html.push(`<input type=checkbox value="bet${info.id}" onchange="changeme(this)" ${info.can_bet==1?"checked":""} id="bet${info.id}"><label for="bet${info.id}">投注</label></td>`);
                html.push(`<td><a onclick="showUserBet(${info.user_id})" href="javascript:void(0);" class="btn btn-link">投注记录</a> `);
                html.push(`<a onclick="showUserBill(${info.user_id})" href="javascript:void(0);" class="btn btn-link">充值记录</a> `);
                html.push(`<a onclick="showUserTrade(${info.user_idex})" href="javascript:void(0);"  class="btn btn-link">交易流水</a></<td>`);
                html.push('</tr>');
            });
            $("#fillDataUser").attr("data",JSON.stringify(rows)).html(html.join(""));
            
        }else{
            $("#fillDataUser").attr("data","").html(`<tr>
                <td colspan="8" style="text-align: center;">暂无数据</td>
            </tr>`);
        }
    });
}
function toNumStr(num){
    if(num<10){
        return "000"+num;
    }else if(num < 100){
        return "00"+num;
    }else if(num < 1000){
        return "0"+num;
    }
    return num;
}
function getStatus(status,win_amount){
    if(status == 0){
        return "未开"
    }else if(status == 1){
        return "输"
    }else if(status == 2){
        return win_amount;
    }
    return "未知";
}
function betlist(){
    var username = $("#betlist input[name=username]").val()
    var issue = $("#betlist input[name=issue]").val().replace(/\D/g,"")
    var id = $("#betlist input[name=id]").val().replace(/\D/g,"")
    var userId = $("#betlist input[name=userid]").val()
    var status = $("#betlist select[name=status]").val()
    var where =[];
    var val = [];
    if(username.trim()!=""){
        val.push(username);
        where .push("u.username=?");
    }
    if(userId!="" && !isNaN(userId)){
        val.push(userId);
        where .push("ub.user_id=?");
    }
    if(status!="" && !isNaN(status)){
        val.push(status);
        where .push("ub.status=?");
    }
    if(id!="" && !isNaN(id)){
        val.push(id);
        where .push("ub.id=?");
    }
    if(issue){
        where.push("issue=? and num=?")
        if(issue.length==8){
            val.push(new Date().getFullYear().toString()+issue.substring(0,4));
            val.push(parseInt(issue.substring(4)));
        }else if(issue.length==10){
            val.push(new Date().getFullYear().toString().substring(2)+issue.substring(0,6));
            val.push(parseInt(issue.substring(6)));
        }else if(issue.length==12){
            val.push(issue.substring(0,8));
            val.push(parseInt(issue.substring(8)));
        }else{
            layer.alert("期号格式错误 ");
            return;
        }
    }
    
    const betsql = `select u.user_id,u.username,ub.bet_str,ub.bet_money,ub.status,ub.win_amount,
    date_format(ub.insert_time,'%Y-%m-%d %H:%i:%s') insert_time,
    ub.issue,ub.num,ub.bot_id from t_user_bet ub inner join t_user u on ub.user_id = u.user_id
    ${where.length > 0 ? "where "+where.join("and "):""} order by ub.id desc`;
    console.info(betsql);
    db.query(betsql,val).then(rows => {
        var html = [];
        if(rows.length>0){
            rows.forEach((info,index) => {
                html.push('<tr>');
                html.push(`<td>${index+1}</td><td>${info.user_id}<br>${info.username}</td>`);
                html.push(`<td>${info.bet_str}</td><td>${info.bet_money}</td>`);
                html.push(`<td>${info.insert_time}</td>`);
                html.push(`<td>${info.issue}${toNumStr(info.num)}</td>`);
                html.push(`<td>${getStatus(info.status,info.win_amount)}</<td>`);
                html.push('</tr>');
            })
            $("#fillUserBet").attr("data",JSON.stringify(rows)).html(html.join(""));
        }else{
            $("#fillUserBet").attr("data","").html(`<tr>
            <td colspan="7" style="text-align: center;">暂无数据</td>
        </tr>`);
        }
    })
}
const tradeTypeData = {"1":"上分", "2": "下分" ,"3" :"投注" ,"4": "中奖" ,"5": "赔付"};
var opt = ['<option value="">全部</option>'];
for(var key in tradeTypeData){
    opt.push(`<option value="${key}">${tradeTypeData[key]}</option>`)
}
$("#tradeType").html(opt.join(""));
function tradelist(){
    var username = $("#tradelist input[name=username]").val()
    var userId = $("#tradelist input[name=userid]").val().replace(/\D/g,"")
    var tradeType = $("#tradelist select[name=tradeType]").val().replace(/\D/g,"")
    var where =[];
    var val = [];
    if(username.trim()!=""){
        val.push(username);
        where .push("u.username=?");
    }
    if(userId!="" && !isNaN(userId)){
        val.push(userId);
        where .push("ut.user_id=?");
    }
    if(tradeType!="" && !isNaN(tradeType)){
        val.push(tradeType);
        where .push("ut.trade_type=?");
    }
    const tradesql = `select u.user_id,u.username,ut.amount,ut.remain_amount,ut.trade_type,ut.union_id,
    date_format(ut.insert_time,'%Y-%m-%d %H:%i:%s') insert_time,ut.bot_id from t_user_trade ut 
    inner join t_user u on ut.user_id = u.user_id
    ${where.length > 0 ? "where "+where.join("and "):""} order by ut.id desc`;
    console.info(tradesql);
    db.query(tradesql,val).then(rows => {
        var html = [];
        if(rows.length>0){
            rows.forEach((info,index) => {
                html.push('<tr>');
                html.push(`<td>${index+1}</td><td>${info.user_id}<br>${info.username}</td>`);
                html.push(`<td>${info.amount}</td><td>${tradeTypeData[info.trade_type]||"未知"}</td><td>${info.remain_amount}</td>`);
                html.push(`<td>${info.insert_time}</td>`);
                html.push(`<td>${info.union_id}</td>`);
                html.push('</tr>');
            })
            $("#fillUserTrade").attr("data",JSON.stringify(rows)).html(html.join(""));
        }else{
            $("#fillUserTrade").attr("data","").html(`<tr>
            <td colspan="7" style="text-align: center;">暂无数据</td>
        </tr>`);
        }
    })
}

function tongji(){
    var username = $("#tradelist input[name=username]").val()
    var userId = $("#tradelist input[name=userid]").val().replace(/\D/g,"")
    var where =[];
    var val = [];
    if(username.trim()!=""){
        val.push(username);
        where .push("u.username=?");
    }
    if(userId!="" && !isNaN(userId)){
        val.push(userId);
        where .push("ut.user_id=?");
    }
    const tongjiSql = `select u.user_id,u.username,trade_type,count(*) as c,sum(amount) as amount from t_user_trade ut 
    inner join t_user u on ut.user_id = u.user_id ${where.length > 0 ? "where "+where.join("and "):""} 
    group by u.user_id,u.username,trade_type order by u.user_id desc`;
    console.info(tongjiSql);
    db.query(tongjiSql,val).then(rows => {
        var html = [];
        if(rows.length>0){
            var kkdata = {};
            rows.map((info)=>{
                if(!kkdata[info.user_id]){
                    kkdata[info.user_id] = {};
                }
                var trade_type = tradeTypeData[info.trade_type] || "其他";
                kkdata[info.user_id].user_id = info.user_id;
                kkdata[info.user_id].username = info.username;
                kkdata[info.user_id][trade_type] = {c:info.c,a:info.amount};                
            });
            console.info(kkdata);
            var index = 1;
            for(var key in kkdata){
                var info = kkdata[key];
                html.push('<tr>');
                html.push(`<td>${index++}</td><td>${info.user_id}<br>${info.username}</td>`);
                html.push(`<td>${info["上分"]?info["上分"].c:0}</td><td>${info["投注"]?info["投注"].c:0}</td><td>${info["下分"]?info["下分"].c:0}</td><td>${info["中奖"]?info["中奖"].c:0}</td><td>${info["赔付"]?info["赔付"].c:0}</td><td>${info["其他"]?info["其他"].c:0}</td>`);
                html.push(`<td>${info["上分"]?info["上分"].a:0}</td><td>${info["投注"]?info["投注"].a:0}</td><td>${info["下分"]?info["下分"].a:0}</td><td>${info["中奖"]?info["中奖"].a:0}</td><td>${info["赔付"]?info["赔付"].a:0}</td><td>${info["其他"]?info["其他"].a:0}</td>`);
                html.push('</tr>');
            }
            
            $("#fillTongji").attr("data",JSON.stringify(rows)).html(html.join(""));
        }else{
            $("#fillTongji").attr("data","").html(`<tr>
            <td colspan="12" style="text-align: center;">暂无数据</td>
        </tr>`);
        }
    })
}

function showUserBet(userId){
    $("#betlist input[name=userid]").val(userId);
    $(".tabbetlist").click();
    betlist();
}

function showUserBill(userId){
    $("#shangfen input[name=userid]").val(userId);
    $(".tabshangfen").click();
    shangfen();
}


function showUserTrade(userId){
    $("#tradelist input[name=userid]").val(userId);
    $(".tradelist").click();
    tradelist();
}