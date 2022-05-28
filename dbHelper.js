const mysql = require('mysql')
const async = require("async");
// "Exam123!@#."
// 创建数据池
const pool = mysql.createPool({
    host: '56f2cff845240.gz.cdb.myqcloud.com',   // 数据库地址
    port: 17816,
    // user: 'tg_user',    // 数据库用户
    user : "cdb_outerroot" ,
    password :  "cdb_outerroot",
    database: 'db_tg'  // 选中数据库
})


let query = function (sql, values) {
    // 返回一个 Promise
    return new Promise((resolve, reject) => {
        pool.getConnection(function (err, connection) {
            if (err) {
                reject(err)
            } else {
                connection.query(sql, values, (err, rows) => {
                    if (err) {
                        reject(err)
                    } else {
                        resolve(rows)
                    }
                    // 结束会话
                    connection.release()
                })
            }
        })
    })
}



function execTrans(sqlparamsEntities, callback) {
    pool.getConnection(function (err, connection) {
        if (err) {
            return callback(err, null);
        }
        connection.beginTransaction(function (err) {
            if (err) {
                return callback(err, null);
            }
            // console.log("开始执行transaction，共执行" + sqlparamsEntities.length + "条数据");
            var funcAry = [];
            sqlparamsEntities.forEach(function (sql_param) {
                var temp = function (cb) {
                    var sql = sql_param.sql;
                    var param = sql_param.params;
                    connection.query(sql, param, function (tErr, rows, fields) {
                        if (tErr) {
                            connection.rollback(function () {
                                console.log("事务失败，" + sql_param + "，ERROR：" + tErr);
                                throw tErr;
                            });
                        } else {
                            return cb(null, 'ok');
                        }
                    })
                };
                funcAry.push(temp);
            });

            async.series(funcAry, function (err, result) {
                if (err) {
                    connection.rollback(function (err) {
                        console.log("transaction error: " + err);
                        connection.release();
                        return callback(err, null);
                    });
                } else {
                    connection.commit(function (err, info) {
                        // console.log("transaction info: " + JSON.stringify(info));
                        if (err) {
                            console.log("执行事务失败，" + err);
                            connection.rollback(function (err) {
                                console.log("transaction error: " + err);
                                connection.release();
                                return callback(err, null);
                            });
                        } else {
                            connection.release();
                            return callback(null, info);
                        }
                    })
                }
            })
        });
    });
}

// 错误信息显示
function disperr(e) {
    console.log("******************************************************");
    console.log("* ERROR:", e.code, '\n* ', e.sqlMessage, '\n* ', e.sql, '\n* ', "ROLLBACK TRANSACTION");
    console.log("******************************************************");
}

// msg = {
//     message_id: 373,
//     from: {
//       id: 1078046742,
//       is_bot: false,
//       first_name: 'JACK908070',
//       username: 'jack908070',
//       language_code: 'zh-hans'
//     },
//     chat: { id: -1001619001089, title: '测试2', type: 'supergroup' },
//     date: 1651589338,
//     text: '23'
//   };
//   chatId = -1001619001089;
// query("insert into t_msg (jsondata,chat_id) values(?,?)",[JSON.stringify(msg),chatId]);
// query("select * from t_group_config where is_del = 0").then(rows=>{
//     console.info(rows);
//   })
module.exports = { query, execTrans }