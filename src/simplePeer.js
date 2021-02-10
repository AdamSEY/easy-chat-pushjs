let clients = {};
module.exports.Server = p2pSocket

function p2pSocket (socket,roomName,io) {
    console.log('p2psocket reached');

    socket.join(roomName);

    // const privateSocketRoom = `${roomName}:${socket.id}`;
    // // because by default every users joined socket.id. so we're limiting it to webrtc only. to prevent users from sending private messages outside this.
    // socket.join(privateSocketRoom);// to send direct message to socket users.

    // console.log(Object.getOwnPropertyNames(clients));
    const connectedClients = io.sockets.adapter.rooms.get(roomName) ? Array.from(io.sockets.adapter.rooms.get(roomName)) : { length: 0 }
    let numberOfClients = connectedClients.length;

    socket.to(roomName).emit('initReceive', socket.id);

    socket.on('signal', data => {
        console.log('sending signal from ' + socket.id + ' to ', data)
        socket.to(data.socket_id).emit('signal', {
            socket_id: socket.id,
            signal: data.signal
        })
    })
    socket.on('initSend', init_socket_id => {
        console.log('INIT SEND by ' + socket.id + ' for ' + init_socket_id)
        socket.to(init_socket_id).emit('initSend', socket.id)
    })
    // following is not fired
    socket.on('disconnect', () => {
        console.log('socket disconnected ' + socket.id)
        socket.to(roomName).emit('removePeer', socket.id)
    })

    // todo implement onDisconnect

}
