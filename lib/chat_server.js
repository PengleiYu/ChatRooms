var socketio = require('socket.io')
var io

var guesttNum = 1 // 当前访客数
var nickNames = {} // 昵称字典，记录每个socket的昵称
var namesUsed = {} // 使用中的昵称列表
var currentRoom = {} // 房间字典，记录每个socket加入的房间

/**
 * 对外暴露的方法
 */
exports.listen = function(server) {
    io = socketio.listen(server)
    io.set('log level', 1)
    io.sockets.on('connect', function(socket) {
        guesttNum = assignGuestName(socket, guesttNum, nickNames, namesUsed)
        joinRoom(socket, 'Lobby')
        handleMessageBroadcasting(socket, nickNames)
        handleNameChangeAttempts(socket, nickNames, namesUsed)
        handleRoomJoining(socket)
        socket.on('rooms', function() {
            socket.emit('rooms', io.sockets.manager.rooms)
        })
        handleClientDisconnection(socket, nickNames, namesUsed)
    })
}

/**
 * 为房客自动分配昵称
 * @param {访客序号} guesttNum 
 * @param {昵称字典} nickNames 
 * @param {已使用昵称列表} namesUsed 
 */
function assignGuestName(socket, guesttNum, nickNames, namesUsed) {
    var name = 'Guest' + guesttNum
    nickNames[socket.id] = name
    socket.emit('nameResult', {
        success: true,
        name: name
    })
    namesUsed.push(name)
}

/**
 * 加入聊天室
 */
function joinRoom(socket, room) {
    socket.join(room)
    currentRoom[socket.id] = room
    socket.emit('joinResult', { room: room })
    socket.broadcast.to(room).emit('message', {
        text: nickNames[socket.id] + ' has joined ' + room + '.'
    })

    var usersInRoom = io.sockets.clients(room)
    if (usersInRoom.length > 1) {
        var usersInRoomSummary = 'Users currently in ' + room + ':'
        for (const index in object) {
            var userSocketId = usersInRoom[index].id
            if (userSocketId != socket.id) {
                if (index > 0) {
                    usersInRoomSummary += ','
                }
                usersInRoomSummary += nickNames[userSocketId]
            }
        }
        usersInRoomSummary += '.'
        socket.emit('message', { text: usersInRoomSummary })
    }
}

/**
 * 处理改名请求
 * @param {*} socket 
 * @param {昵称字典} nickNames 
 * @param {被占用的名字列表} namesUsed 
 */
function handleNameChangeAttempts(socket, nickNames, namesUsed) {
    let nameResult = 'nameResult'
    socket.on('nameAttempt', function(name) {
        if (name.indexOf('Guest') == 0) {
            socket.emit(nameResult, { success: false, message: 'Name cannot begin with "Guest".' })
        } else {
            if (namesUsed.indexOf(name) == -1) {
                var previousName = nickNames[socket.id]
                var previousNameIndex = namesUsed.indexOf(previousName)
                namesUsed.push(name)
                nickNames[socket.id] = name
                delete namesUsed[previousNameIndex]
                socket.emit(nameResult, { success: true, name: name })
                socket.broadcast.to(currentRoom[socket.id])
                    .emit('message', { text: previousName + ' is now known as ' + name + '.' })
            } else {
                socket.emit(nameResult, { success: false, message: 'That name is already in use.' })
            }
        }
    })
}

/**
 * 将用户信息广播给房间所有人
 */
function handleMessageBroadcasting(socket) {
    socket.on('message', function(message) {
        socket.broadcast.to(message.room).emit('message', {
            text: nickNames[socket.id] + ': ' + message.text
        })
    })
}

/**
 * 处理用户加入房间
 */
function handleRoomJoining(socket) {
    socket.on('join', function(room) {
        socket.leave(currentRoom[socket.id])
        joinRoom(socket, room.newRoom)
    })
}

/**
 * 处理用户断开连接
 */
function handleClientDisconnection(socket) {
    socket.on('disconnect', function() {
        var nameIndex = namesUsed.indexOf(nickNames[socket.id])
        delete namesUsed[nameIndex]
        delete nickNames[socket.id]
    })
}