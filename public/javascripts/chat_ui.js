function divEscapedContentElement(message) {
    return $('<div></div>').text(message)
}

function divSystemContentElement(message) {
    return $('<div></div>').html('<i>' + message + '</i>')
}

function processUserImput(chatApp, socket) {
    var message = $('#send-message').val()
    var systemMessage
    if (message.charAt(0) == '/') {
        systemMessage = chatApp.processCommand(message)
        if (systemMessage) {
            $('#message').append(divSystemContentElement(systemMessage))
        }
    } else {
        chatApp.sendMessage($('#room').text(), message)
        $('message').append(divEscapedContentElement(message))
        $('message').scrollTop($('#message').prop('scrollHeight'))
    }
    $('#send-message').val('')
}

var socket = io.connect()

$(document).ready(function() {
    var chatApp = new Chat(socket)
    socket.on('nameResult', function(result) {
        var message
        if (result.message) {
            message = 'You are now known as ' + result.name + '.'
        } else {
            message = result.message
        }
    })
})