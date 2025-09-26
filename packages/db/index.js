"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DbRedisManager = exports.CandleService = exports.prisma = void 0;
const prisma_1 = require("./generated/prisma");
exports.prisma = new prisma_1.PrismaClient();
var candleService_1 = require("./candleService");
Object.defineProperty(exports, "CandleService", { enumerable: true, get: function () { return candleService_1.CandleService; } });
var poller_1 = require("./poller");
Object.defineProperty(exports, "DbRedisManager", { enumerable: true, get: function () { return poller_1.RedisManager; } });
