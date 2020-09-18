let socket = io.connect('http://localhost:3000' , {
    path:'/websocket' ,
    forceNew:true,
    query: {
        token: "TOKEN created by createUserToken function"
    }
});

// Emit chat event
function sendMessage(message){
    socket.emit('chat', {
        message: message,
    });
}

// Listen for events
socket.on('chat', function(data){
   console.log('a message from the server received', data);
});

socket.on('push', function(data){
    console.log('a push notification received', data);
});

