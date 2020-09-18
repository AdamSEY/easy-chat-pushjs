class SocketError extends Error{
    constructor(props, data = [], extra = {}) {
        super(props);
        this.data = data;
        this.extra = extra;
        console.log({props, data, extra})
    }
}