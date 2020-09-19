export default class extends Error {
    private data: any;
    private extra: Object;
    constructor(props: any, data: any = [], extra: Object = {}) {
        super(props);
        this.data = data;
        this.extra = extra;
        console.log({ props, data, extra });
    }
}

