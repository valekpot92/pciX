/* Валидатор данных пациентов: структура, ветвление, полный перебор всех путей диалога. */
import { PATIENTS } from "../src/data";
import { DIAGNOSES } from "../src/data/diagnoses";
import type { ActionId } from "../src/game/types";

let errors = 0;
const fail = (msg: string) => {
  errors++;
  console.error("  ✗ " + msg);
};

const ACTIONS: ActionId[] = ["treat", "home", "police"];

console.log(`Пациентов: ${PATIENTS.length}`);
if (PATIENTS.length !== 15) fail(`Ожидалось 15 пациентов, найдено ${PATIENTS.length}`);

const ids = new Set<number>();
const names = new Set<string>();

for (const p of PATIENTS) {
  console.log(`\n[${p.id}] ${p.name}`);
  if (ids.has(p.id)) fail(`дубликат id ${p.id}`);
  ids.add(p.id);
  if (names.has(p.name)) fail(`дубликат имени ${p.name}`);
  names.add(p.name);

  if (!DIAGNOSES[p.diagnosis]) fail(`неизвестный диагноз ${p.diagnosis}`);
  if (!ACTIONS.includes(p.action)) fail(`неверное действие ${p.action}`);
  if (p.action === "police" && !p.danger) fail("опасный пациент без поля danger");
  if (p.options.length !== 6) fail(`опций диагноза ${p.options.length}, нужно 6`);
  if (!p.options.includes(p.diagnosis)) fail("верный диагноз отсутствует в опциях");
  for (const k of p.options) if (!DIAGNOSES[k]) fail(`неизвестная опция ${k}`);
  if (p.moods.length !== 10) fail(`moods: ${p.moods.length}, нужно 10`);
  if (p.why.length < 4) fail("слишком мало ключевых признаков");
  if (!p.whyDiag || p.whyDiag.length < 40) fail("whyDiag слишком короткий");

  // аватар
  const a = p.avatar;
  if (a.hair < 0 || a.hair > 9) fail(`hair=${a.hair} вне диапазона 0..9`);
  for (const c of [a.skin, a.hairColor, a.eye, a.shirt, a.bg]) if (!/^#[0-9a-fA-F]{6}$/.test(c)) fail(`цвет ${c} не hex`);
  const ACCS = ["none", "glasses", "round", "beard", "stubble", "earrings", "scarf", "mole"];
  if (!ACCS.includes(a.acc)) fail(`аксессуар ${a.acc} неизвестен`);

  // структура этапов
  if (p.stages.length !== 10) {
    fail(`этапов ${p.stages.length}, нужно 10`);
    continue; // дальше проверять нечего — структура сломана
  }
  if (p.stages[0].length !== 1) fail(`на этапе 1 узлов ${p.stages[0].length}, нужен 1`);
  for (let s = 1; s < 10; s++) if (p.stages[s].length !== 3) fail(`на этапе ${s + 1} узлов ${p.stages[s].length}, нужно 3`);

  for (let s = 0; s < p.stages.length; s++) {
    for (let v = 0; v < p.stages[s].length; v++) {
      const node = p.stages[s][v];
      if (node.length !== 3) fail(`этап ${s + 1} узел ${v}: опций ${node.length}, нужно 3`);
      node.forEach((opt, i) => {
        const [q, ans, next] = opt;
        if (typeof q !== "string" || q.trim().length < 5) fail(`[${p.name}] этап ${s + 1} узел ${v} опция ${i}: короткий вопрос «${q}»`);
        if (typeof ans !== "string" || ans.trim().length < 5) fail(`[${p.name}] этап ${s + 1} узел ${v} опция ${i}: пустой ответ`);
        if (/[a-zA-Z]{3,}|第二次/.test(q + ans)) {
          const m = (q + ans).match(/[a-zA-Z]{3,}/);
          fail(`[${p.name}] этап ${s + 1} узел ${v} опция ${i}: латиница «${m && m[0]}» — «${(q + ans).slice(0, 70)}»`);
        }
        if (s < 9) {
          if (!Number.isInteger(next) || next < 0 || next >= p.stages[s + 1].length)
            fail(`этап ${s + 1} узел ${v} опция ${i}: next=${next} вне диапазона 0..${p.stages[s + 1].length - 1}`);
        } else if (next !== 0 && next !== 1 && next !== 2) {
          fail(`этап 10 узел ${v} опция ${i}: next=${next} некорректен`);
        }
      });
    }
  }

  // полный перебор всех путей: stages[0] -> 3^9 путей
  let paths = 0;
  let minLen = Infinity;
  let maxLen = 0;
  const dfs = (s: number, v: number, depth: number) => {
    const node = p.stages[s][v];
    if (s === 9) {
      paths++;
      minLen = Math.min(minLen, depth);
      maxLen = Math.max(maxLen, depth);
      return;
    }
    for (const opt of node) dfs(s + 1, opt[2], depth + 1);
  };
  dfs(0, 0, 1);
  if (paths !== 19683) fail(`путей ${paths}, ожидалось 19683 (3^9)`);
  if (minLen !== 10 || maxLen !== 10) fail(`длина пути ${minLen}..${maxLen}, нужно ровно 10`);
  console.log(`  ✓ 28 узлов, 84 реплики, все ${paths} путей проходят ровно 10 этапов`);
}

// сводка по вердиктам
const police = PATIENTS.filter((p) => p.action === "police").map((p) => p.name);
const home = PATIENTS.filter((p) => p.action === "home").map((p) => p.name);
console.log(`\nПолиция (${police.length}): ${police.join(", ")}`);
console.log(`Домой (${home.length}): ${home.join(", ")}`);
console.log(`Лечение: ${PATIENTS.length - police.length - home.length}`);

if (errors > 0) {
  console.error(`\nОШИБОК: ${errors}`);
  process.exit(1);
}
console.log("\n✔ ВСЕ ПРОВЕРКИ ПРОЙДЕНЫ");
