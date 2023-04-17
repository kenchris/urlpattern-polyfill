import test from "ava";
import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { runTests } from "./wpt/wpt-test-runner.js";

import "urlpattern-polyfill";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const baseURL = "https://example.com";

let rawdata = readFileSync(path.resolve(__dirname, "urlpatterntestdata.json"));
let data = JSON.parse(rawdata);

runTests(data, test);