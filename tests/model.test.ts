import { test } from 'node:test';
import assert from 'node:assert/strict';
import { budgetLevel, convert, parseAmount, parseBackup, serializeBackup, emptyData, summarize, toCSV } from '../src/model.ts';

test('parseAmount đọc kiểu Việt', () => {
  assert.equal(parseAmount('1.500.000'), 1500000);
  assert.equal(parseAmount('25,5'), 25.5);
  assert.equal(parseAmount('25.5'), 25.5);
  assert.equal(parseAmount('850k'), 850000);
  assert.equal(parseAmount('2tr'), 2000000);
  assert.ok(Number.isNaN(parseAmount('abc')));
});

test('convert dùng tỷ giá lưu cùng khoản', () => {
  assert.equal(convert({ amount: 10, currency: 'CNY', rate: 3500 }, 'VND'), 35000);
  assert.equal(convert({ amount: 35000, currency: 'VND', rate: 3500 }, 'CNY'), 10);
});

test('summarize và budgetLevel', () => {
  const d = emptyData();
  d.transactions = [
    { id: 'a', type: 'income', amount: 3_550_000, currency: 'VND', rate: 3550, categoryId: 'salary', note: '', date: '2026-11-01', createdAt: 1 },
    { id: 'b', type: 'expense', amount: 100, currency: 'CNY', rate: 3550, categoryId: 'food', note: '', date: '2026-11-02', createdAt: 2 },
  ];
  assert.deepEqual(summarize(d.transactions, '2026-11', 'CNY'), { income: 1000, expense: 100, balance: 900 });
  assert.equal(budgetLevel(79, 100), 'ok');
  assert.equal(budgetLevel(80, 100), 'warn');
  assert.equal(budgetLevel(101, 100), 'over');
  assert.equal(parseBackup(serializeBackup(d)).transactions.length, 2);
  assert.throws(() => parseBackup('{}'));
  assert.ok(toCSV(d).startsWith('﻿Ngày'));
});
