"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class default_1 extends Error {
    constructor(props, data = [], extra = {}) {
        super(props);
        this.data = data;
        this.extra = extra;
        console.log({ props, data, extra });
    }
}
exports.default = default_1;
