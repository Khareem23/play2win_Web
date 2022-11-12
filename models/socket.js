const _ = require("underscore"),
    db = require("./db"),
    multiplayer = require("./multiplayer");

module.exports = (httpsServer) => {
    var server = require('http', { transports: ['websocket'] }).createServer().listen(8081);
    // let io = require('socket.io').listen(server, {
    //     'transports': [
    //         'flashsocket',
    //         'htmlfile',
    //         'xhr-polling',
    //         'jsonp-polling',
    //         'polling',
    //         // 'websocket'
    //     ],
    //     pingInterval: 6000,
    //     pingTimeout: 60000,
    //     rejectUnauthorized: false,
    //     reconnection: true,
    //     upgrade: false
    // })
    let ioServer = require("socket.io");
    let comServ = new ioServer();
    comServ.attach(httpsServer);
    comServ.attach(server);
    let io = comServ.sockets;
    // comServ.listen(8081)
    console.log("Server socket initialized")

    // io.set();

    // implementation of online and offline status of user
    let userOnline = {}
    let establishedSockets = {}
    let userOffline = []

    multiplayer(io)

    io.on("connection", function (socket) {
        var ipAddress = socket.handshake.address;
        console.log({ ipAddress })
        socket.on("logout", (user) => {
            delete userOnline[user]
            socket.broadcast.emit("loggedout", user)
        })
        socket.on("message", (user) => {
            userOnline[user] = user
            if (user != null) {
                establishedSockets[user] = socket.id
            }
            socket.broadcast.send(userOnline)
        })

        socket.on('disconnect', async function () {
            let offline = await (_.invert(establishedSockets))[this.id]
            if (offline != undefined) {
                delete establishedSockets[offline]
                if (!userOffline.includes(offline))
                    userOffline.push(offline)
                socket.broadcast.emit("loggedout", offline)
            }
        });

        socket.on('notification', function (data) {
            db.insertNotification(data)
            socket.broadcast.emit('broadcast', data)
        })

        socket.on('fcmtoken', function (data) {
            data = JSON.parse(data)
            console.log(data)
            try {
                db.query(`UPDATE users SET notification_token = ? WHERE id=?`, [data.token, data.id])
            } catch (err) {
                console.log(err)
            }
        })

        setInterval(async function () {
            userOffline.forEach(async (user, index) => {
                if (!Object.keys(establishedSockets).includes(user)) {
                    updateUserStatus = await db.updateActivity('n', user)
                    userOffline.splice(index, 1)
                }
            })
        }, 30000)
    })
}
