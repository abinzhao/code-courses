#!/usr/bin/env node
/**
 * check-links.js — 校验 Markdown 框架文档中的相对链接是否指向真实文件。
 *
 * 用法：
 *   node check-links.js <file.md> [<file2.md> ...]
 *
 * 规则：
 *   - 只检查相对链接（./、../、无前缀），忽略 http(s) 与页内 # 锚点。
 *   - 基于每个文档自身所在目录解析相对路径。
 *   - 存在断链时退出码为 1，便于在 CI / 门禁中使用。
 */

const fs = require('fs');
const path = require('path');

const files = process.argv.slice(2);

if (files.length === 0) {
  console.error('用法: node check-links.js <file.md> [<file2.md> ...]');
  process.exit(2);
}

let total = 0;
const broken = [];

// 匹配 Markdown 链接 ](target)，允许带 #anchor
const linkRe = /\]\(([^)#]+)(?:#[^)]*)?\)/g;

for (const relFile of files) {
  const file = path.resolve(relFile);
  if (!fs.existsSync(file)) {
    broken.push(`${relFile} -> 文档自身不存在`);
    continue;
  }

  const content = fs.readFileSync(file, 'utf8');
  let match;
  while ((match = linkRe.exec(content)) !== null) {
    const target = match[1].trim();
    if (/^(https?:|mailto:|tel:)/.test(target)) continue;
    total += 1;
    const resolved = path.resolve(path.dirname(file), target);
    if (!fs.existsSync(resolved)) {
      broken.push(`${relFile} -> ${target}`);
    }
  }
}

console.log('检查相对链接总数:', total);
console.log('断链数量:', broken.length);

if (broken.length > 0) {
  broken.forEach((b) => console.log('BROKEN:', b));
  process.exit(1);
}

console.log('OK: 无断链');
