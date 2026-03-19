"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const app_1 = __importDefault(require("../src/app"));
describe('API Endpoints', () => {
    it('GET /api/recipes should return a list of recipes', async () => {
        const res = await (0, supertest_1.default)(app_1.default).get('/api/recipes');
        expect(res.status).toEqual(200);
        expect(res.body.length).toBeGreaterThan(0);
    });
    it('GET /health should return OK', async () => {
        const res = await (0, supertest_1.default)(app_1.default).get('/health');
        expect(res.status).toEqual(200);
        expect(res.text).toEqual('OK');
    });
});
