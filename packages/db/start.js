"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("./index");
console.log("Starting DB Service...");
index_1.DbRedisManager.getInstance().pricePoller();
console.log("DB Service started");
