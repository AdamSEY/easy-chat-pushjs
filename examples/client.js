let socket = io.connect('http://localhost:3000' , {
    path:'/websocket' , // don't change
    forceNew:false,
    query: {
        token: "TOKEN created by createUserToken function"
    },
    transports: ['websocket']
});

socket.on('reconnect_attempt', (attemptNumber) => {
    socket.io.opts.transports = ['polling', 'websocket'];
    //you can generate a new token in here as well
    socket.io.opts.query = {
        token: 'NEW_TOKEN'
    }
    console.log('trying to reconnect number', attemptNumber);
});
socket.on('connect_error', (e) => { // fired upon connection error
    console.log('connect_error', e);
});
socket.on('connect', () => { // successfully connected
    console.log('successfully connected' ,socket.id ); // 'G5p5...'
});
socket.on('error', (errorJSON) => { // fired in case of a failed authentication
    console.log('received an error' , JSON.parse(errorJSON));
    //errors: {error: "authentication failed", code: 1}
    //errors: {error: "authentication failed - Version Mismatch", code: 3}
    //errors: {error: "authentication failed - already Connected", code: 2}
    socket.disconnect();
});
socket.on('disconnect', () => { // server disconnected us
    console.log('disconnected from the server');
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

