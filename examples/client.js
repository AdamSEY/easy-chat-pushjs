// please don't forget to add socket.io script tags to your html file for socket.io v3 & simplePeer (if you gonna use peer2peer connection)
const jwtToken = 'TOKEN created by createUserToken function';
let socket = io.connect('http://localhost:3000' , {
    path:'/websocket' , // don't change
    forceNew:false,
    query: {
        token: jwtToken
    },
    transports: ['websocket']
});
socket.on('reconnect_attempt', (attemptNumber) => {
    socket.io.opts.transports = ['polling', 'websocket'];
    //in case the token expired or something, get a new token from the server and update it here.
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

// ======================== PEER 2 PEER / WebRTC ==============================//

/*
Make sure to enable it while creating a token in order to work
 */
let peers = {};
function init() {

    socket.on('initReceive', socket_id => {
        console.log('INIT RECEIVE ' + socket_id)
        addPeer(socket_id, false)
        socket.emit('initSend', socket_id)
    })

    socket.on('initSend', socket_id => {
        console.log('INIT SEND ' + socket_id)
        addPeer(socket_id, true)
    })


    socket.on('signal', data => {
        peers[data.socket_id].signal(data.signal)
    })

    socket.on('disconnect', (socket_id) => {
        console.log('GOT DISCONNECTED')
        removePeer(socket_id)
    })
}
let sendMessageRTC = ()=>{
    throw new Error('Not Ready Yet!');
}
function addPeer(socket_id, am_initiator) {
    const iceServers = {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' },
            { urls: 'stun:stun3.l.google.com:19302' },
            { urls: 'stun:stun4.l.google.com:19302' },
        ],
    }

    console.log('adding peers');
    peers[socket_id] = new SimplePeer({
        initiator: am_initiator,
        // stream: localStream,
        config: iceServers
    })

    peers[socket_id].on('signal', data => {
        socket.emit('signal', {
            signal: data,
            socket_id: socket_id
        })
    })

    peers[socket_id].on('connect', () => {
        console.log("connected to peer to peer");
        sendMessageRTC = (message) =>{
            peers[socket_id].send(message);
        }

    })

    peers[socket_id].on('data', data => {
        // got a data channel message
        console.log('Peer2Peer Message: got a message: ' + data);
    })

}
function parseJwt (token) {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));

    return JSON.parse(jsonPayload);
}
const userInfo = parseJwt(jwtToken);
if (userInfo.webRtcRoom) init(); // start peer 2 peer signalling if user enabled webRtc by setting a room name while creating a token.
// you can ignore this check if you want, but nothing will happen because the server isn't expecting this user to start a peer to peer
// connection so, the negotiation will be ignored.